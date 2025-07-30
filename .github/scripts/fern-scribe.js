const { Octokit } = require('@octokit/rest');
const Turbopuffer = require('@turbopuffer/turbopuffer').default;
const fs = require('fs').promises;
const path = require('path');
const yaml = require('js-yaml');

class FernScribeGitHub {
  constructor() {
    this.octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });
    this.turbopuffer = new Turbopuffer({
      apiKey: process.env.TURBOPUFFER_API_KEY,
      region: "gcp-us-east4",
    });
    this.anthropicApiKey = process.env.ANTHROPIC_API_KEY;
    this.slackToken = process.env.SLACK_USER_TOKEN;
    
    this.owner = process.env.REPOSITORY.split('/')[0];
    this.repo = process.env.REPOSITORY.split('/')[1];
    this.issueNumber = process.env.ISSUE_NUMBER;
    this.issueBody = process.env.ISSUE_BODY;
    this.issueTitle = process.env.ISSUE_TITLE;
    
    this.systemPrompt = null;
    
    // Initialize dynamic path mapping
    this.dynamicPathMapping = new Map();
    this.isPathMappingLoaded = false;
  }

  async init() {
    this.systemPrompt = await fs.readFile(path.join(__dirname, 'system-prompt.md'), 'utf-8');
  }

  parseIssueBody(body) {
    const parsed = {
      requestDescription: '',
      slackThread: '',
      existingInstructions: '',
      whyNotWork: '',
      changelogRequired: false,
      priority: 'Medium',
      additionalContext: ''
    };

    // Parse the issue body (GitHub issue form format)
    const sections = body.split('###');
    
    sections.forEach((section, index) => {
      const lines = section.trim().split('\n');
      const title = lines[0]?.toLowerCase();
      const content = lines.slice(1).join('\n').trim();

      if (title.includes('what do you want fern scribe')) {
        parsed.requestDescription = content;
      } else if (title.includes('slack thread')) {
        parsed.slackThread = content;
      } else if (title.includes('existing instructions')) {
        parsed.existingInstructions = content;
      } else if (title.includes('why they didn\'t work')) {
        parsed.whyNotWork = content;
      } else if (title.includes('changelog')) {
        // Check for checked checkbox format: [x] Yes, include changelog
        const yesChecked = content.includes('[x] Yes, include changelog');
        const noChecked = content.includes('[x] No changelog');
        parsed.changelogRequired = yesChecked && !noChecked;
        
        // Debug logging for changelog parsing
        console.log(`📋 Changelog parsing: yesChecked=${yesChecked}, noChecked=${noChecked}, changelogRequired=${parsed.changelogRequired}`);
      } else if (title.includes('priority')) {
        parsed.priority = content;
      } else if (title.includes('additional context')) {
        parsed.additionalContext = content;
      }
    });

    return parsed;
  }

  parseSlackUrl(url) {
    if (!url || !url.includes('slack.com')) return null;
    
    // Parse Slack URL formats:
    // https://workspace.slack.com/archives/C1234567890/p1234567890123456
    // https://workspace.slack.com/archives/C1234567890/p1234567890123456?thread_ts=1234567890.123456
    
    const regex = /https:\/\/([^.]+)\.slack\.com\/archives\/([A-Z0-9]+)\/p(\d+)(?:\?thread_ts=(\d+\.\d+))?/;
    const match = url.match(regex);
    
    if (!match) return null;
    
    const [, workspace, channelId, messageTs, threadTs] = match;
    
    // Convert message timestamp format (p1234567890123456 -> 1234567890.123456)
    const timestamp = messageTs.slice(0, 10) + '.' + messageTs.slice(10);
    
    return {
      workspace,
      channelId,
      messageTs: timestamp,
      threadTs: threadTs || timestamp // Use thread_ts if available, otherwise use message timestamp
    };
  }

  async fetchSlackFile(file) {
    if (!file.url_private || !this.slackToken) return null;

    try {
      // Download the file content
      const response = await fetch(file.url_private, {
        headers: {
          'Authorization': `Bearer ${this.slackToken}`
        }
      });

      if (!response.ok) return null;

      // Handle different file types
      const mimeType = file.mimetype || '';
      const fileName = file.name || '';
      const fileExtension = fileName.split('.').pop()?.toLowerCase();

      // Text-based files - return content directly
      if (mimeType.startsWith('text/') || 
          ['txt', 'md', 'json', 'yaml', 'yml', 'csv', 'log'].includes(fileExtension)) {
        return await response.text();
      }

      // Code files - return content with language hint
      if (['js', 'ts', 'py', 'java', 'go', 'rs', 'cpp', 'c', 'php', 'rb', 'sh', 'sql', 'html', 'css', 'xml'].includes(fileExtension)) {
        const content = await response.text();
        return `// File: ${fileName}\n${content}`;
      }

      // Configuration files
      if (['env', 'config', 'ini', 'toml', 'properties'].includes(fileExtension) || fileName === 'Dockerfile') {
        const content = await response.text();
        return `# Configuration: ${fileName}\n${content}`;
      }

      // For binary files, return file info instead of content
      return `[Binary file: ${fileName} (${file.size || 0} bytes, ${mimeType})]`;

    } catch (error) {
      console.error(`Failed to fetch file ${file.name}:`, error);
      return `[Could not fetch file: ${file.name}]`;
    }
  }

  async describeImage(imageUrl) {
    if (!imageUrl || !this.anthropicApiKey) return null;

    try {
      // Download image and convert to base64
      const response = await fetch(imageUrl, {
        headers: {
          'Authorization': `Bearer ${this.slackToken}`
        }
      });

      if (!response.ok) return null;

      const imageBuffer = await response.arrayBuffer();
      const base64Image = Buffer.from(imageBuffer).toString('base64');
      const mimeType = response.headers.get('content-type') || 'image/jpeg';

      // Use Claude to describe the image
      const claudeResponse = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'x-api-key': this.anthropicApiKey,
          'Content-Type': 'application/json',
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: 'claude-3-5-sonnet-20241022',
          max_tokens: 300,
          messages: [{
            role: 'user',
            content: [
              {
                type: 'image',
                source: {
                  type: 'base64',
                  media_type: mimeType,
                  data: base64Image
                }
              },
              {
                type: 'text',
                text: 'Describe this image in detail, focusing on any text, code, diagrams, or technical content that might be relevant for documentation purposes.'
              }
            ]
          }]
        })
      });

      if (!claudeResponse.ok) return null;

      const data = await claudeResponse.json();
      return data.content[0]?.text || null;

    } catch (error) {
      console.error('Failed to describe image:', error);
      return null;
    }
  }

  async fetchSlackThread(slackUrl) {
    if (!slackUrl || !this.slackToken) return '';
    
    const parsedUrl = this.parseSlackUrl(slackUrl);
    if (!parsedUrl) {
      return '';
    }

    try {
      // Fetch the thread replies
      const response = await fetch(`https://slack.com/api/conversations.replies?${new URLSearchParams({
        channel: parsedUrl.channelId,
        ts: parsedUrl.threadTs,
        inclusive: 'true'
      })}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.slackToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Slack API error: ${response.status}`);
      }

      const data = await response.json();
      
      if (!data.ok) {
        console.error('Slack API error:', data.error);
        return '';
      }

      // Format the thread messages with files and attachments
      const messages = data.messages || [];
      const threadContent = await Promise.all(messages.map(async (msg, index) => {
        const timestamp = new Date(parseFloat(msg.ts) * 1000).toLocaleString();
        const user = msg.user || 'Unknown';
        let text = msg.text || '';
        
        // Preserve code blocks exactly as-is
        const codeBlockRegex = /```([^`]*?)```/gs;
        const codeBlocks = [];
        text = text.replace(codeBlockRegex, (match, code) => {
          const placeholder = `__CODE_BLOCK_${codeBlocks.length}__`;
          codeBlocks.push(code.trim());
          return placeholder;
        });

        // Clean up other Slack formatting but preserve structure
        const cleanText = text
          .replace(/<@[UW][A-Z0-9]+(\|[^>]+)?>/g, '@user') // Replace user mentions
          .replace(/<#[CD][A-Z0-9]+\|([^>]+)>/g, '#$1') // Replace channel mentions
          .replace(/<([^|>]+)\|([^>]+)>/g, '$2') // Replace links with text
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>')
          .replace(/&amp;/g, '&');

        // Restore code blocks
        let finalText = cleanText;
        codeBlocks.forEach((code, i) => {
          finalText = finalText.replace(`__CODE_BLOCK_${i}__`, `\`\`\`\n${code}\n\`\`\``);
        });

        let messageContent = `[${timestamp}] ${index === 0 ? '(Original)' : ''} ${user}: ${finalText}`;

        // Handle file attachments - convert all to text
        if (msg.files && msg.files.length > 0) {
          messageContent += '\n\n**Attached Files:**';
          
          for (const file of msg.files) {
            messageContent += `\n\n--- File: ${file.name} ---`;
            
            // Extract text content from file
            const fileContent = await this.fetchSlackFile(file);
            if (fileContent) {
              messageContent += `\n${fileContent}`;
            }

            // Describe images using Claude
            if (file.mimetype && file.mimetype.startsWith('image/')) {
              const imageDescription = await this.describeImage(file.url_private);
              if (imageDescription) {
                messageContent += `\n[Image Description: ${imageDescription}]`;
              }
            }
          }
        }

        // Handle code snippets (Slack's snippet feature)
        if (msg.attachments && msg.attachments.length > 0) {
          for (const attachment of msg.attachments) {
            if (attachment.text) {
              messageContent += `\n\n**Code Snippet:**\n\`\`\`\n${attachment.text}\n\`\`\``;
            }
          }
        }

        return messageContent;
      }));

      const fullThreadContent = (await Promise.all(threadContent)).join('\n\n---\n\n');
      return fullThreadContent;

    } catch (error) {
      console.error('Failed to fetch Slack thread:', error);
      return '';
    }
  }

  async createEmbedding(text) {
    const response = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        input: text,
        model: 'text-embedding-3-large',
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    return data.data[0].embedding;
  }

  reciprocalRankFusion(semanticResults, bm25Results, k = 60) {
    const scoreMap = new Map();
    
    // Add semantic search scores
    semanticResults.forEach((result, index) => {
      const id = result.id;
      const rank = index + 1;
      const score = 1 / (k + rank);
      scoreMap.set(id, (scoreMap.get(id) || 0) + score);
    });
    
    // Add BM25 scores
    bm25Results.forEach((result, index) => {
      const id = result.id;
      const rank = index + 1;
      const score = 1 / (k + rank);
      scoreMap.set(id, (scoreMap.get(id) || 0) + score);
    });
    
    // Create combined results with scores
    const allResults = new Map();
    [...semanticResults, ...bm25Results].forEach(result => {
      if (!allResults.has(result.id)) {
        allResults.set(result.id, {
          ...result,
          fusedScore: scoreMap.get(result.id)
        });
      }
    });
    
    // Sort by fused score and return
    return Array.from(allResults.values())
      .sort((a, b) => b.fusedScore - a.fusedScore);
  }

  async queryTurbopuffer(query, opts = {}) {
    if (!query || query.trimStart().length === 0) {
      return [];
    }

    try {
      const {
        namespace,
        topK = 10,
        mode = "hybrid",
        documentIdsToIgnore = [],
        urlsToIgnore = []
      } = opts;

      const ns = this.turbopuffer.namespace(namespace);

      // Create embedding for the query
      const vector = await this.createEmbedding(query);
      if (!vector) {
        console.error('Failed to create embedding for query');
        return [];
      }

      // Build filters
      const documentIdFilters = documentIdsToIgnore.map((id) => ["id", "NotEq", id]);
      const urlFilters = urlsToIgnore.map((url) => ["url", "NotEq", url]);
      
      const allFilters = [...documentIdFilters, ...urlFilters];
      const queryFilters = allFilters.length > 0 
        ? (allFilters.length === 1 ? allFilters[0] : ["And", allFilters])
        : undefined;

      // Semantic search (vector similarity)
      const semanticResponse = mode !== "bm25" ? await ns.query({
        rank_by: ["vector", "ANN", vector],
        top_k: topK,
        include_attributes: true,
        filters: queryFilters,
      }) : { rows: [] };

      // BM25 search (keyword matching) - search across multiple text fields
      const bm25Response = mode !== "semantic" && query.length < 1024 ? await ns.query({
        rank_by: [
          "Sum",
          [
            ["chunk", "BM25", query],
            ["title", "BM25", query],
            ["keywords", "BM25", query],
          ],
        ],
        top_k: topK,
        include_attributes: true,
        filters: queryFilters,
      }) : { rows: [] };

      const semanticResults = semanticResponse.rows || [];
      const bm25Results = bm25Response.rows || [];

      // Combine results using reciprocal rank fusion
      const fusedResults = this.reciprocalRankFusion(semanticResults, bm25Results);
      
      return fusedResults;
    } catch (error) {
      console.error('Turbopuffer query failed:', error);
      return [];
    }
  }

  async getFernDocsStructure() {
    // This would normally fetch the actual Fern docs structure
    // For now, return a simple structure
    return {
      products: ['SDKs', 'Docs', 'API Reference'],
      sections: ['Getting Started', 'Configuration', 'Advanced']
    };
  }

  async generateContent(filePath, existingContent, context, fernStructure) {
    const prompt = `${this.systemPrompt}

## Context
File: ${filePath}
Request: ${context.requestDescription}
Existing Instructions: ${context.existingInstructions}
Why Current Approach Doesn't Work: ${context.whyNotWork}
Additional Context: ${context.additionalContext}
${context.slackThreadContent ? `\n## Slack Discussion Context\n${context.slackThreadContent}` : ''}

## Fern Docs Structure Reference
${fernStructure}

## Current File Content
${existingContent}

## Instructions
Update this file to address the documentation request. Use the Slack discussion context to understand the specific pain points and requirements mentioned by users. Follow Fern documentation best practices and maintain consistency with the existing structure.

IMPORTANT: Return ONLY the clean file content. Do not include any explanatory text, meta-commentary, or descriptions about what you're doing. Start directly with the frontmatter (---) or first line of the file content.

Complete updated file content:`;

    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'x-api-key': this.anthropicApiKey,
          'content-type': 'application/json',
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: 'claude-3-5-sonnet-20241022',
          max_tokens: 4096,
          messages: [{
            role: 'user',
            content: prompt
          }]
        })
      });

      if (!response.ok) {
        throw new Error(`Anthropic API error: ${response.status}`);
      }

      const data = await response.json();
      return data.content[0]?.text || '';
    } catch (error) {
      console.error('Claude API error:', error);
      return existingContent; // Return original if AI fails
    }
  }

  async generateChangelogEntry(context) {
    const prompt = `Generate a changelog entry for the following documentation update:

Request: ${context.requestDescription}
Additional Context: ${context.additionalContext}

Please create a concise changelog entry that describes what was changed/added/improved. Format it as a markdown list item suitable for insertion into a CHANGELOG.md file.

Example format:
- **[Section]** Description of the change ([#123](link-to-pr))

Changelog entry:`;

    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'x-api-key': this.anthropicApiKey,
          'content-type': 'application/json',
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: 'claude-3-5-sonnet-20241022',
          max_tokens: 500,
          messages: [
            {
              role: 'user',
              content: prompt
            }
          ]
        })
      });

      if (!response.ok) {
        throw new Error(`Anthropic API error: ${response.status}`);
      }

      const data = await response.json();
      return data.content[0]?.text || null;
    } catch (error) {
      console.error('Changelog generation failed:', error);
      return null;
    }
  }

  // Load dynamic path mapping from Fern docs structure
  async loadDynamicPathMapping() {
    if (this.isPathMappingLoaded) return;
    
    try {
      console.log('Loading Fern docs structure for dynamic path mapping...');
      
      // Load main docs.yml
      const docsContent = await this.fetchFileContent('fern/docs.yml');
      if (!docsContent) return;
      
      const docsConfig = yaml.load(docsContent);
      if (!docsConfig.products) return;
      
      // Process each product
      for (const product of docsConfig.products) {
        if (!product.path) continue;
        
        // Resolve relative path
        let resolvedPath = product.path;
        if (resolvedPath.startsWith('./')) {
          resolvedPath = `fern/${resolvedPath.substring(2)}`;
        } else if (!resolvedPath.startsWith('fern/')) {
          resolvedPath = `fern/${resolvedPath}`;
        }
        
        // Determine the effective slug for URL generation
        let effectiveSlug = null;
        if (product['skip-slug'] === true) {
          // Skip slug entirely - pages will be at root level
          effectiveSlug = '';
        } else if (product.slug) {
          // Use explicit slug
          effectiveSlug = product.slug;
        } else {
          // Derive slug from path or display-name
          const pathBasename = product.path.split('/').pop().replace(/\.yml$/, '');
          effectiveSlug = pathBasename;
        }
        
        // Load product config
        const productContent = await this.fetchFileContent(resolvedPath);
        if (!productContent) continue;
        
        const productConfig = yaml.load(productContent);
        if (!productConfig.navigation) continue;
        
        // Process navigation structure
        await this.processNavigation(productConfig, effectiveSlug, resolvedPath);
      }
      
      this.isPathMappingLoaded = true;
      console.log(`Loaded ${this.dynamicPathMapping.size} dynamic path mappings`);
    } catch (error) {
      console.error('Failed to load dynamic path mapping:', error);
    }
  }
  
  async processNavigation(config, productSlug, configPath, parentSections = []) {
    if (!config.navigation) return;

    // Extract the directory path from the config file path
    // e.g., "fern/products/fern-def.yml" -> "products/fern-def"
    const basePath = configPath.replace(/\.yml$/, '').replace('fern/', '');
    
    for (const navItem of config.navigation) {
      if (navItem.page) {
        // It's a page - check if it has a custom path
        let pageFilePath;
        if (navItem.path) {
          // Use custom path
          pageFilePath = `fern/${basePath}/pages/${navItem.path}`;
        } else {
          // Default path based on page name
          pageFilePath = `fern/${basePath}/pages/${navItem.page}`;
        }
        
        // Build URL with parent sections
        const urlParts = [productSlug, ...parentSections, navItem.page].filter(Boolean);
        const pageUrl = `/${urlParts.join('/')}`;
        this.dynamicPathMapping.set(pageUrl, pageFilePath);
      } else if (navItem.section) {
        // It's a section with pages - create section-based URLs
        const sectionSlug = navItem.section.toLowerCase().replace(/\s+/g, '-');
        const newParentSections = [...parentSections, sectionSlug];
        
        for (const pageItem of navItem.contents || []) {
          if (pageItem.page) {
            let pageFilePath;
            if (pageItem.path) {
              // Use custom path
              pageFilePath = `fern/${basePath}/pages/${pageItem.path}`;
            } else {
              // Default path based on page name
              pageFilePath = `fern/${basePath}/pages/${pageItem.page}`;
            }
            
            // Build URL with all parent sections
            const urlParts = [productSlug, ...newParentSections, pageItem.page].filter(Boolean);
            const sectionUrl = `/${urlParts.join('/')}`;
            this.dynamicPathMapping.set(sectionUrl, pageFilePath);
            
            // Also create direct URL for backwards compatibility (without parent sections)
            const directUrlParts = [productSlug, pageItem.page].filter(Boolean);
            const directUrl = `/${directUrlParts.join('/')}`;
            if (!this.dynamicPathMapping.has(directUrl)) {
              this.dynamicPathMapping.set(directUrl, pageFilePath);
            }
          } else if (pageItem.section) {
            // Handle nested sections recursively
            const nestedSectionSlug = pageItem.section.toLowerCase().replace(/\s+/g, '-');
            const nestedParentSections = [...newParentSections, nestedSectionSlug];
            
            // Create a temporary config object for recursive processing
            const nestedConfig = { navigation: pageItem.contents || [] };
            await this.processNavigation(nestedConfig, productSlug, configPath, nestedParentSections);
          }
        }
      }
    }
  }
  
  // Transform Turbopuffer URLs to actual GitHub file paths
  transformTurbopufferUrlToPath(turbopufferUrl) {
    // Remove /learn prefix and clean up trailing slashes
    let urlPath = turbopufferUrl.replace('/learn', '').replace(/\/$/, '');
    
    // First try to use dynamic mapping
    if (this.dynamicPathMapping.has(urlPath)) {
      const mappedPath = this.dynamicPathMapping.get(urlPath);
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

  // Simple file content fetcher for dynamic mapping (without path transformation)
  async fetchFileContent(filePath) {
    try {
      const { data } = await this.octokit.rest.repos.getContent({
        owner: this.owner,
        repo: this.repo,
        path: filePath
      });
      
      if (Array.isArray(data)) {
        // It's a directory
        return `Directory: ${data.length} files/folders`;
      } else if (data.content) {
        // It's a file
        return Buffer.from(data.content, 'base64').toString('utf-8');
      }
      return null;
    } catch (error) {
      return null;
    }
  }

  async getCurrentFileContent(filePath) {
    try {
      // Map Turbopuffer path to actual GitHub path
      const actualPath = await this.mapTurbopufferPathToGitHub(filePath);
      console.log(`   📥 Fetching content from GitHub: ${filePath} -> ${actualPath}`);
      
      const { data } = await this.octokit.rest.repos.getContent({
        owner: this.owner,
        repo: this.repo,
        path: actualPath
      });

      const content = Buffer.from(data.content, 'base64').toString('utf-8');
      console.log(`   ✅ Successfully fetched ${content.length} characters from ${actualPath}`);
      return content;
    } catch (error) {
      if (error.status === 404) {
        console.log(`   ⚠️  File not found: ${filePath} (will be created)`);
        return ''; // File doesn't exist, will be created
      }
      console.error(`   ❌ Error fetching ${filePath}:`, error.message);
      throw error;
    }
  }

  async createBranch(branchName) {
    try {
      // Get the latest commit SHA from main branch
      const { data: mainBranch } = await this.octokit.rest.repos.getBranch({
        owner: this.owner,
        repo: this.repo,
        branch: 'main'
      });

      // Create new branch
      await this.octokit.rest.git.createRef({
        owner: this.owner,
        repo: this.repo,
        ref: `refs/heads/${branchName}`,
        sha: mainBranch.commit.sha
      });

      return true;
    } catch (error) {
      if (error.status !== 422) { // Branch might already exist
        throw error;
      }
      return true;
    }
  }

  async updateFile(filePath, content, branchName, commitMessage) {
    try {
      // Try to get the current file to get its SHA (needed for updates)
      let sha = null;
      try {
        const { data: currentFile } = await this.octokit.rest.repos.getContent({
          owner: this.owner,
          repo: this.repo,
          path: filePath,
          ref: branchName
        });
        sha = currentFile.sha;
      } catch (error) {
        // File doesn't exist, that's okay for creation
      }

      await this.octokit.rest.repos.createOrUpdateFileContents({
        owner: this.owner,
        repo: this.repo,
        path: filePath,
        message: commitMessage,
        content: Buffer.from(content).toString('base64'),
        branch: branchName,
        ...(sha && { sha })
      });

      return true;
    } catch (error) {
      console.error(`Failed to update ${filePath}:`, error);
      return false;
    }
  }

  async createPullRequest(branchName, context, filesUpdated) {
    const title = `🌿 Fern Scribe: ${context.requestDescription.substring(0, 50)}...`;
    const body = `## 🌿 Fern Scribe Documentation Update

**Original Request:** ${context.requestDescription}

**Files Updated:**
${filesUpdated.map(file => `- \`${file}\``).join('\n')}

**Priority:** ${context.priority}

${context.slackThread ? `**Related Discussion:** ${context.slackThread}` : ''}

${context.additionalContext ? `**Additional Context:** ${context.additionalContext}` : ''}

---
*This PR was automatically generated by Fern Scribe based on issue #${this.issueNumber}*

**Please review the changes carefully before merging.**`;

    try {
      const { data: pr } = await this.octokit.rest.pulls.create({
        owner: this.owner,
        repo: this.repo,
        title,
        body,
        head: branchName,
        base: 'main',
        draft: true
      });

      return pr;
    } catch (error) {
      console.error('Failed to create PR:', error);
      return null;
    }
  }

  async run() {
    try {
      await this.init();
      
      console.log('🌿 Fern Scribe GitHub starting...');
      
      const context = this.parseIssueBody(this.issueBody);

      // Fetch Slack thread if URL provided
      let slackThreadContent = '';
      if (context.slackThread) {
        slackThreadContent = await this.fetchSlackThread(context.slackThread);
      }

      // Create enhanced query text that includes both request description and Slack context
      const enhancedQuery = [
        context.requestDescription,
        slackThreadContent ? `\n\nSlack Discussion Context:\n${slackThreadContent}` : '',
        context.additionalContext ? `\n\nAdditional Context:\n${context.additionalContext}` : ''
      ].filter(Boolean).join('\n');

      // Query TurboBuffer for relevant files
      console.log('🔍 Querying TurboBuffer for relevant files...');
      const searchResultURLs = new Set();
      const searchResults = [];
      
      const turbopufferResults = await this.queryTurbopuffer(enhancedQuery, {
        namespace: process.env.TURBOPUFFER_NAMESPACE || 'default',
        topK: 3
      });

      console.log(`\n📁 Found ${turbopufferResults.length} relevant files from Turbopuffer:`);
      
      turbopufferResults.forEach((result, index) => {
        const path = result.pathname || result.url || 'Unknown path';
        const title = result.title || 'Untitled';
        const url = result.url || `https://${result.domain || ''}${result.pathname || ''}`;
        const relevance = result.$dist !== undefined ? (1 - result.$dist).toFixed(3) : 'N/A';
        
        console.log(`${index + 1}. ${path}`);
        console.log(`   Title: ${title}`);
        console.log(`   URL: ${url}`);
        console.log(`   Relevance Score: ${relevance}`);
      });
      console.log('');

      // Deduplicate results by URL
      for (const result of turbopufferResults) {
        const url = result.url || `https://${result.domain}${result.pathname}${result.hash || ''}`;
        
        if (result.url) {
          if (!searchResultURLs.has(result.url)) {
            searchResultURLs.add(result.url);
            searchResults.push(result);
          }
        } else {
          searchResults.push(result);
        }
      }
      
      if (searchResults.length === 0) {
        console.log('❌ No relevant files found');
        return;
      }

      console.log(`📁 Processing ${searchResults.length} relevant files for documentation updates...`);
      
      // Filter and preview files to be processed
      const filesToProcess = searchResults.filter(result => {
        const filePath = result.pathname || result.path;
        if (!filePath) return false;
        if (!context.changelogRequired && filePath.includes('/changelog/')) {
          console.log(`   📄 Will skip changelog file: ${filePath} (changelog not requested)`);
          return false;
        }
        return true;
      });
      
      console.log(`📁 Will process ${filesToProcess.length} files (skipped ${searchResults.length - filesToProcess.length} changelog files)`);

      // Get Fern docs structure for context
      const fernStructure = await this.getFernDocsStructure();

      // Analyze each relevant file and suggest changes
      console.log('\n📋 Analyzing files and suggesting changes...\n');
      
      const analysisResults = [];
      
      for (const result of filesToProcess) {
        const filePath = result.pathname || result.path;
        if (!filePath) continue;

        console.log(`📄 Analyzing: ${filePath}`);
        console.log(`   Title: ${result.title}`);
        console.log(`   URL: ${result.url}`);
        
        try {
          const currentContent = await this.getCurrentFileContent(filePath);
          
          const contextWithDocument = {
            ...context,
            currentDocument: result.document || '',
            slackThreadContent
          };
          
          console.log(`   🤖 Generating AI suggestions based on context...`);
          const suggestedContent = await this.generateContent(filePath, currentContent, contextWithDocument, fernStructure);
          
          if (suggestedContent && suggestedContent !== currentContent) {
            analysisResults.push({
              filePath,
              currentContent,
              suggestedContent,
              title: result.title,
              url: result.url
            });
            
            console.log(`   ✅ Changes suggested for: ${filePath}`);
            console.log(`   📊 Original: ${currentContent.length} chars → Suggested: ${suggestedContent.length} chars`);
          } else {
            console.log(`   ℹ️  No changes suggested for this file`);
          }
        } catch (error) {
          console.error(`   ❌ Error analyzing ${filePath}:`, error.message);
        }
        
        console.log(''); // Add spacing between files
      }
      
      // Generate changelog entry if requested
      let changelogEntry = null;
      if (context.changelogRequired) {
        console.log('📋 Changelog update requested - generating entry...\n');
        try {
          changelogEntry = await this.generateChangelogEntry(context);
          if (changelogEntry) {
            console.log('   ✅ Changelog entry generated');
          } else {
            console.log('   ℹ️  No changelog entry generated');
          }
        } catch (error) {
          console.error('   ❌ Error generating changelog:', error.message);
        }
      } else {
        console.log('📋 Changelog update not requested (changelogRequired: false)');
      }
      
      // Log analysis summary to console
      console.log('\n' + '='.repeat(80));
      console.log('📋 ANALYSIS SUMMARY');
      console.log('='.repeat(80));
      
      console.log('\n## Request Context');
      console.log(`- **Issue**: ${context.requestDescription}`);
      console.log(`- **Priority**: ${context.priority}`);
      console.log(`- **Changelog Required**: ${context.changelogRequired}`);
      console.log(`- **Existing Instructions**: ${context.existingInstructions}`);
      console.log(`- **Why Current Approach Doesn't Work**: ${context.whyNotWork}`);
      
      console.log('\n## Slack Discussion Summary');
      if (slackThreadContent) {
        console.log('Key points from Slack discussion:');
        console.log(slackThreadContent.substring(0, 500) + '...');
      } else {
        console.log('No Slack discussion provided');
      }
      
      console.log('\n## Files Analyzed');
      filesToProcess.forEach((result, index) => {
        const relevance = result.$dist !== undefined ? (1 - result.$dist).toFixed(3) : 'N/A';
        console.log(`${index + 1}. **${result.pathname}**`);
        console.log(`   - Title: ${result.title}`);
        console.log(`   - URL: ${result.url}`);
        console.log(`   - Relevance Score: ${relevance}`);
      });
      
      console.log('\n## Analysis Results');
      if (analysisResults.length > 0) {
        console.log(`Generated suggestions for ${analysisResults.length} files:`);
        analysisResults.forEach((result, index) => {
          console.log(`${index + 1}. ${result.filePath} (${result.currentContent.length} → ${result.suggestedContent.length} chars)`);
        });
      } else {
        console.log('No changes suggested for any files');
      }
      
      if (changelogEntry) {
        console.log('\n## Changelog Entry');
        console.log(changelogEntry);
      }
      
      console.log('\n' + '='.repeat(80));
      
      // Create GitHub PR with suggested changes
      if (analysisResults.length > 0) {
        console.log('\n🚀 Creating GitHub PR with suggested changes...');
        
        const branchName = `fern-scribe-${this.issueNumber}-${Date.now()}`;
        const filesUpdated = [];
        
        try {
          // Create a new branch
          console.log(`   🌿 Creating branch: ${branchName}`);
          await this.createBranch(branchName);
          
          // Update files with suggested content
          for (const result of analysisResults) {
            try {
              const actualPath = await this.mapTurbopufferPathToGitHub(result.filePath);
              
              console.log(`   📝 Updating file: ${actualPath}`);
              await this.updateFile(
                actualPath,
                result.suggestedContent,
                branchName,
                `Update ${path.basename(actualPath)} based on issue #${this.issueNumber}`
              );
              
              filesUpdated.push(actualPath);
            } catch (error) {
              console.error(`   ⚠️  Could not update ${result.filePath}: ${error.message}`);
            }
          }
          
          // Update changelog if requested
          if (context.changelogRequired && changelogEntry) {
            try {
              // Find the main changelog file
              const changelogPath = 'CHANGELOG.md'; // or detect dynamically
              
              try {
                const currentChangelog = await this.fetchFileContent(changelogPath);
                const updatedChangelog = this.addChangelogEntry(currentChangelog, changelogEntry);
                
                console.log(`   📋 Updating changelog: ${changelogPath}`);
                await this.updateFile(
                  changelogPath,
                  updatedChangelog,
                  branchName,
                  `Add changelog entry for issue #${this.issueNumber}`
                );
                
                filesUpdated.push(changelogPath);
              } catch (error) {
                console.error(`   ⚠️  Could not update changelog: ${error.message}`);
              }
            } catch (error) {
              console.error(`   ⚠️  Error processing changelog: ${error.message}`);
            }
          }
          
          // Create draft pull request
          if (filesUpdated.length > 0) {
            console.log(`   🔗 Creating draft PR with ${filesUpdated.length} file(s)...`);
            const pr = await this.createPullRequest(branchName, context, filesUpdated);
            
            if (pr && pr.html_url) {
              console.log(`   ✅ Draft PR created: ${pr.html_url}`);
            } else {
              console.log(`   ⚠️  PR creation failed`);
            }
          } else {
            console.log(`   ℹ️  No files were updated, skipping PR creation`);
          }
          
        } catch (error) {
          console.error(`   ❌ GitHub operations failed: ${error.message}`);
        }
      } else {
        console.log('\n ℹ️  No changes suggested, skipping PR creation');
      }
      
      console.log('\n✅ Fern Scribe GitHub workflow complete!');

    } catch (error) {
      console.error('❌ Fern Scribe GitHub failed:', error);
      throw error;
    }
  }

  addChangelogEntry(currentChangelog, newEntry) {
    // Add new entry to the top of the changelog
    const lines = currentChangelog.split('\n');
    const unreleasedIndex = lines.findIndex(line => line.includes('## [Unreleased]'));
    
    if (unreleasedIndex !== -1) {
      lines.splice(unreleasedIndex + 1, 0, '', newEntry);
    } else {
      // If no unreleased section, add at top
      lines.splice(0, 0, '## [Unreleased]', '', newEntry, '');
    }
    
    return lines.join('\n');
  }
}

// Run the script
const fernScribeGitHub = new FernScribeGitHub();
fernScribeGitHub.run().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
}); 