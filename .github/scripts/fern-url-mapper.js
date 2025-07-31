const { Octokit } = require('@octokit/rest');
const yaml = require('js-yaml');
const fs = require('fs').promises;

class FernUrlMapper {
  constructor(githubToken = null, repository = null) {
    this.dynamicPathMapping = new Map();
    this.isPathMappingLoaded = false;
    
    // Initialize GitHub client if credentials provided
    if (githubToken && repository) {
      this.octokit = new Octokit({ auth: githubToken });
      this.owner = repository.split('/')[0];
      this.repo = repository.split('/')[1];
    } else if (process.env.GITHUB_TOKEN && process.env.REPOSITORY) {
      this.octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });
      this.owner = process.env.REPOSITORY.split('/')[0];
      this.repo = process.env.REPOSITORY.split('/')[1];
    } else {
      throw new Error('GitHub credentials not provided. Either pass them as parameters or set GITHUB_TOKEN and REPOSITORY environment variables.');
    }
  }

  // Fetch file content from GitHub API
  async fetchFileContent(filePath) {
    try {
      const { data } = await this.octokit.rest.repos.getContent({
        owner: this.owner,
        repo: this.repo,
        path: filePath
      });
      
      if (data.content) {
        return Buffer.from(data.content, 'base64').toString('utf-8');
      }
      return null;
    } catch (error) {
      console.log(`Could not fetch ${filePath}: ${error.message}`);
      return null;
    }
  }

  // Load dynamic path mapping from Fern docs structure
  async loadDynamicPathMapping() {
    if (this.isPathMappingLoaded) return;
    
    try {
      console.log('Loading Fern docs structure for dynamic path mapping...');
      
      // Read the root docs.yml file
      const rootDocsContent = await this.fetchFileContent('fern/docs.yml');
      if (!rootDocsContent) {
        console.log('Could not fetch fern/docs.yml');
        return;
      }

      const rootConfig = yaml.load(rootDocsContent);
      
      // Process root navigation if it exists
      if (rootConfig.navigation) {
        await this.processNavigation(rootConfig.navigation, '', 'fern', []);
      }

      // Process products if they exist
      if (rootConfig.products && Array.isArray(rootConfig.products)) {
        for (const product of rootConfig.products) {
          await this.processProduct(product);
        }
      }
      
      this.isPathMappingLoaded = true;
      console.log(`Loaded ${this.dynamicPathMapping.size} dynamic path mappings`);
    } catch (error) {
      console.error('Failed to load dynamic path mapping:', error);
    }
  }

  async processProduct(product) {
    // Determine the product slug
    let productSlug = '';
    if (product['skip-slug'] === true) {
      productSlug = '';
    } else if (product.slug) {
      productSlug = product.slug;
    } else {
      // Derive slug from path or display-name
      const pathBasename = product.path.split('/').pop().replace(/\.yml$/, '');
      productSlug = pathBasename;
    }

    // Resolve the product config path
    let configPath = product.path;
    // Remove leading ./ if present
    if (configPath.startsWith('./')) {
      configPath = configPath.substring(2);
    }
    // Add fern/ prefix if not present
    if (!configPath.startsWith('fern/')) {
      configPath = `fern/${configPath}`;
    }

    console.log(`Loading product config: ${configPath} (slug: ${productSlug})`);

    // Load the product configuration
    const productConfigContent = await this.fetchFileContent(configPath);
    if (!productConfigContent) {
      return;
    }

    const productConfig = yaml.load(productConfigContent);
    
    // Process the product's navigation
    if (productConfig.navigation) {
      // Extract just the directory path from the config file
      const productBasePath = configPath.replace(/\.yml$/, '');
      await this.processNavigation(productConfig.navigation, productSlug, productBasePath, []);
    }
  }
  
  async processNavigation(navigation, productSlug, basePath, parentSections = []) {
    for (const navItem of navigation) {
      if (navItem.page) {
        // It's a direct page
        await this.processPage(navItem, productSlug, basePath, parentSections);
      } else if (navItem.section) {
        // It's a section with contents
        await this.processSection(navItem, productSlug, basePath, parentSections);
      }
    }
  }

  async processPage(pageItem, productSlug, basePath, parentSections) {
    const pageName = pageItem.page;
    let pageFilePath;

    // Build file path based on whether there's a custom path
    if (pageItem.path) {
      // Custom path - handle relative paths
      let customPath = pageItem.path;
      if (customPath.startsWith('./')) {
        customPath = customPath.substring(2);
      }
      // Don't add pages/ when there's an explicit path - it's relative to basePath
      pageFilePath = `${basePath}/${customPath}`;
    } else {
      // Default path based on page name - use pages/ subdirectory
      pageFilePath = `${basePath}/pages/${pageName}`;
    }

    // Add .mdx extension if not present
    if (!pageFilePath.endsWith('.mdx') && !pageFilePath.includes('.')) {
      pageFilePath += '.mdx';
    }

    // Normalize the file path to remove duplications and fix structure
    pageFilePath = this.normalizeFilePath(pageFilePath);

    // Convert pageName to URL slug (lowercase, hyphenated)
    const pageSlug = this.toUrlSlug(pageName);

    // Build the URL
    const urlParts = [productSlug, ...parentSections, pageSlug].filter(Boolean);
    const pageUrl = `/learn/${urlParts.join('/')}`;

    this.dynamicPathMapping.set(pageUrl, pageFilePath);

    // Also create direct mapping (without sections) for backward compatibility
    if (parentSections.length > 0) {
      const directUrlParts = [productSlug, pageSlug].filter(Boolean);
      const directUrl = `/learn/${directUrlParts.join('/')}`;
      if (!this.dynamicPathMapping.has(directUrl)) {
        this.dynamicPathMapping.set(directUrl, pageFilePath);
      }
    }
  }

  async processSection(sectionItem, productSlug, basePath, parentSections) {
    const sectionName = sectionItem.section;
    
    // Convert section name to URL slug (lowercase, hyphenated)
    const sectionSlug = this.toUrlSlug(sectionName);
    const newParentSections = [...parentSections, sectionSlug];

    // Process contents of this section
    if (sectionItem.contents && Array.isArray(sectionItem.contents)) {
      for (const contentItem of sectionItem.contents) {
        if (contentItem.page) {
          await this.processPage(contentItem, productSlug, basePath, newParentSections);
        } else if (contentItem.section) {
          // Nested section - recursive processing
          await this.processSection(contentItem, productSlug, basePath, newParentSections);
        }
      }
    }
  }

  normalizeFilePath(filePath) {
    // Remove relative path markers and normalize
    let normalized = filePath.replace(/\/\.\//g, '/');
    
    // Fix duplicated directory names (e.g., docs/docs -> docs)
    const parts = normalized.split('/');
    const cleanParts = [];
    let previousPart = '';
    
    for (const part of parts) {
      if (part && part !== previousPart) {
        cleanParts.push(part);
      }
      previousPart = part;
    }
    
    return cleanParts.join('/');
  }

  toUrlSlug(text) {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-') // Replace non-alphanumeric with hyphens
      .replace(/^-+|-+$/g, ''); // Remove leading/trailing hyphens
  }
  
  // Transform Turbopuffer URLs to actual GitHub file paths
  transformTurbopufferUrlToPath(turbopufferUrl) {
    // Clean up trailing slashes but keep the /learn prefix for dynamic mapping lookup
    let cleanUrl = turbopufferUrl.replace(/\/$/, '');
    
    // First try to use dynamic mapping with full URL (including /learn)
    if (this.dynamicPathMapping.has(cleanUrl)) {
      const mappedPath = this.dynamicPathMapping.get(cleanUrl);
      // Add .mdx extension if not present and not already a complete path
      if (!mappedPath.endsWith('.mdx') && !mappedPath.endsWith('/')) {
        // Check if it's a known directory case (like changelog)
        if (mappedPath.endsWith('/changelog') || (mappedPath.includes('/changelog') && !mappedPath.includes('.'))) {
          return mappedPath; // Return as directory
        }
        return `${mappedPath}.mdx`;
      }
      return mappedPath;
    }
    
    // Remove /learn prefix for fallback logic
    let urlPath = turbopufferUrl.replace('/learn', '').replace(/\/$/, '');
    
    // Fallback to hardcoded logic for backwards compatibility
    const pathParts = urlPath.split('/').filter(p => p);
    if (pathParts.length === 0) return null;
    
    const product = pathParts[0]; // docs, sdks, etc.
    const remainingPath = pathParts.slice(1).join('/');
    
    // Build the file path
    let basePath = `fern/products/${product}`;
    
    // Handle special cases and path mapping
    if (product === 'docs') {
      if (remainingPath === 'changelog') {
        // Special case: changelog is a folder
        return `${basePath}/pages/changelog`;
      } else if (remainingPath.startsWith('navigation/')) {
        // navigation/* maps directly
        const navPath = remainingPath.replace('navigation/', '');
        return `${basePath}/pages/navigation/${navPath}.mdx`;
      } else {
        // Other docs paths
        return `${basePath}/pages/${remainingPath}.mdx`;
      }
    } else if (product === 'sdks') {
      if (remainingPath.startsWith('generators/')) {
        // sdks/generators/* maps to overview/
        const generatorPath = remainingPath.replace('generators/', '');
        return `${basePath}/overview/${generatorPath}.mdx`;
      } else {
        return `${basePath}/pages/${remainingPath}.mdx`;
      }
    } else {
      // Default mapping for other products
      return `${basePath}/pages/${remainingPath}.mdx`;
    }
  }

  // Map Turbopuffer URLs to actual GitHub file paths (now using dynamic mapping)
  async mapTurbopufferPathToGitHub(turbopufferPath) {
    // Ensure dynamic mapping is loaded
    await this.loadDynamicPathMapping();
    
    // Use the improved transformation logic that prioritizes dynamic mapping
    return this.transformTurbopufferUrlToPath(turbopufferPath) || turbopufferPath;
  }

  // Get all mappings as an object for external use
  async getAllMappings() {
    await this.loadDynamicPathMapping();
    const mappings = {};
    for (const [url, path] of this.dynamicPathMapping) {
      mappings[url] = path;
    }
    return mappings;
  }

  // Output all mappings to a markdown file
  async outputMappingsToMarkdown(filename = 'fern-url-mappings.md') {
    await this.loadDynamicPathMapping();
    
    const timestamp = new Date().toISOString();
    let content = `# Fern URL Mappings\n\n`;
    content += `Generated on: ${timestamp}\n`;
    content += `Total mappings: ${this.dynamicPathMapping.size}\n\n`;
    
    // Group by product for better organization
    const productGroups = {};
    for (const [url, path] of this.dynamicPathMapping) {
      const product = url.split('/')[2] || 'root'; // Extract product from URL
      if (!productGroups[product]) {
        productGroups[product] = [];
      }
      productGroups[product].push({ url, path });
    }
    
    // Sort products alphabetically
    const sortedProducts = Object.keys(productGroups).sort();
    
    for (const product of sortedProducts) {
      content += `## ${product.charAt(0).toUpperCase() + product.slice(1)}\n\n`;
      
      // Sort URLs within each product
      productGroups[product].sort((a, b) => a.url.localeCompare(b.url));
      
      for (const { url, path } of productGroups[product]) {
        content += `- \`${url}\` → \`${path}\`\n`;
      }
      content += '\n';
    }
    
    // Write to file
    await fs.writeFile(filename, content, 'utf-8');
    console.log(`✅ Mappings written to ${filename}`);
    
    return filename;
  }

  // Test specific URL mappings
  async testMappings(testUrls = []) {
    await this.loadDynamicPathMapping();
    
    console.log('\n=== TESTING URL MAPPINGS ===');
    
    if (testUrls.length === 0) {
      // Default test URLs
      testUrls = [
        '/learn/docs/writing-content/markdown',
        '/learn/sdks/generators/python/configuration',
        '/learn/openapi-definition/overlay-customizations'
      ];
    }
    
    for (const testUrl of testUrls) {
      const mappedPath = this.transformTurbopufferUrlToPath(testUrl);
      console.log(`${testUrl} → ${mappedPath || 'NOT FOUND'}`);
    }
    
    return testUrls.map(url => ({
      url,
      mappedPath: this.transformTurbopufferUrlToPath(url)
    }));
  }
}

// CLI interface when run directly
async function main() {
  const args = process.argv.slice(2);
  const shouldOutputToFile = args.includes('--output') || args.includes('-o');
  const outputFile = args.find((arg, index) => 
    (args[index - 1] === '--output' || args[index - 1] === '-o') && !arg.startsWith('-')
  ) || 'fern-url-mappings.md';
  
  const shouldTest = args.includes('--test') || args.includes('-t');
  const testUrls = args.filter(arg => arg.startsWith('/learn/'));
  
  try {
    const mapper = new FernUrlMapper();
    
    if (shouldTest) {
      await mapper.testMappings(testUrls.length > 0 ? testUrls : undefined);
    }
    
    if (shouldOutputToFile) {
      await mapper.outputMappingsToMarkdown(outputFile);
    } else {
      // Just load and show stats
      await mapper.loadDynamicPathMapping();
      console.log(`✅ Loaded ${mapper.dynamicPathMapping.size} URL mappings`);
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

// Export the class for use in other modules
module.exports = FernUrlMapper;

// Run CLI if this file is executed directly
if (require.main === module) {
  main().catch(console.error);
} 