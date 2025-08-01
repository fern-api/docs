const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');
const { Octokit } = require('@octokit/rest');

const OUTPUT_FILE = path.join(__dirname, 'my-mappings.md');
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const REPOSITORY = process.env.REPOSITORY;
const BRANCH = 'main';

if (!GITHUB_TOKEN || !REPOSITORY) {
  console.error('GITHUB_TOKEN and REPOSITORY env vars are required.');
  process.exit(1);
}

const [owner, repo] = REPOSITORY.split('/');
const octokit = new Octokit({ auth: GITHUB_TOKEN });

async function listDir(pathInRepo) {
  try {
    const res = await Promise.race([
      octokit.repos.getContent({
        owner,
        repo,
        path: pathInRepo,
        ref: BRANCH
      }),
      new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 10000))
    ]);
    return Array.isArray(res.data) ? res.data : [];
  } catch (e) {
    return [];
  }
}

async function getFileContent(pathInRepo) {
  try {
    const res = await Promise.race([
      octokit.repos.getContent({
        owner,
        repo,
        path: pathInRepo,
        ref: BRANCH
      }),
      new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 10000))
    ]);
    if (res.data && res.data.content) {
      return Buffer.from(res.data.content, 'base64').toString('utf-8');
    }
    return null;
  } catch (e) {
    return null;
  }
}

function slugify(str) {
  return String(str)
    .replace(/(-def|-reference|-docs|-api)$/i, '') // Only remove at the end
    .replace(/_/g, '-')
    .replace(/\s+/g, '-')
    .toLowerCase();
}

async function findDocsYml(productDir) {
  // Try <dir>.yml, docs.yml, or any .yml in the product dir
  const files = await listDir(`fern/products/${productDir}`);
  const candidates = [
    `${productDir}.yml`,
    `docs.yml`
  ];
  for (const candidate of candidates) {
    if (files.find(f => f.name === candidate)) {
      return candidate;
    }
  }
  // fallback: first .yml file
  const yml = files.find(f => f.name.endsWith('.yml'));
  return yml ? yml.name : null;
}

async function findPageFile(productDir, page) {
  // Try to find the .mdx file in pages/ recursively using the API
  async function walk(dir) {
    console.log(`[DEBUG] Listing directory: ${dir}`);
    const items = await listDir(dir);
    for (const item of items) {
      if (item.type === 'dir') {
        const found = await walk(item.path);
        if (found) return found;
      } else if (item.name.replace(/\.mdx$/, '') === page) {
        console.log(`[DEBUG] Found page file: ${item.path} for page: ${page}`);
        return item.path;
      }
    }
    return null;
  }
  return await walk(`fern/products/${productDir}/pages`);
}

async function walkNav(nav, parentSlugs, pages, productDir, canonicalSlug, depth = 0) {
  for (const item of nav) {
    let sectionSlug = '';
    if (item['skip-slug']) {
      sectionSlug = '';
      console.log(`[DEBUG] [${'  '.repeat(depth)}] Skipping slug for section: ${item.section || ''}`);
    } else if (item.slug === true && item.section) {
      sectionSlug = slugify(item.section);
      console.log(`[DEBUG] [${'  '.repeat(depth)}] Section with slug:true: ${sectionSlug}`);
    } else if (typeof item.slug === 'string') {
      sectionSlug = slugify(item.slug);
      console.log(`[DEBUG] [${'  '.repeat(depth)}] Section with explicit slug: ${sectionSlug}`);
    } else if (item.section) {
      sectionSlug = slugify(item.section);
      console.log(`[DEBUG] [${'  '.repeat(depth)}] Section with name: ${sectionSlug}`);
    }
    const newSlugs = sectionSlug ? [...parentSlugs, sectionSlug] : parentSlugs;
    if (item.contents) {
      console.log(`[DEBUG] [${'  '.repeat(depth)}] Entering section: ${sectionSlug || '(no slug)'} with path: /learn/${[canonicalSlug, ...newSlugs].join('/')}`);
      await walkNav(item.contents, newSlugs, pages, productDir, canonicalSlug, depth + 1);
      console.log(`[DEBUG] [${'  '.repeat(depth)}] Exiting section: ${sectionSlug || '(no slug)'}`);
    }
    if (item.page) {
      let pageSlug = typeof item.slug === 'string' ? slugify(item.slug) : slugify(item.page);
      // Only add pageSlug if it's not the same as the last section slug
      let urlSegments = ['/learn', canonicalSlug, ...newSlugs];
      if (newSlugs[newSlugs.length - 1] !== pageSlug) {
        urlSegments.push(pageSlug);
      }
      const learnUrl = urlSegments.filter(Boolean).join('/');
      if (item.path) {
        // Remove leading './' if present
        let repoPath = item.path.replace(/^\.\//, '');
        // Always make it relative to fern/products/<productDir>
        if (!repoPath.startsWith('fern/products/')) {
          repoPath = `fern/products/${productDir}/${repoPath}`;
        }
        pages.push({ learnUrl, repoPath });
        console.log(`[DEBUG] [${'  '.repeat(depth)}] Mapping: ${learnUrl} → ${repoPath}`);
      } else {
        console.warn(`[DEBUG] [${'  '.repeat(depth)}] Skipping page: ${item.page} in product: ${productDir} (missing path)`);
      }
    }
  }
}

async function main() {
  // Step 1: Find and parse the root docs.yml
  const rootDocsYmlContent = await getFileContent('fern/docs.yml');
  if (!rootDocsYmlContent) {
    console.error('Could not find fern/docs.yml in the repo.');
    process.exit(1);
  }
  const rootDocsYml = yaml.load(rootDocsYmlContent);

  // Step 2: Get the root URL subpath (e.g., /learn)
  let rootUrlSubpath = '';
  if (rootDocsYml.url) {
    const url = rootDocsYml.url;
    const match = url.match(/https?:\/\/[^/]+(\/.*)/);
    rootUrlSubpath = match ? match[1].replace(/\/$/, '') : '';
    console.log(`[DEBUG] Root URL subpath: ${rootUrlSubpath}`);
  }
  if (!rootUrlSubpath) rootUrlSubpath = '/learn';
  console.log(`[DEBUG] rootUrlSubpath: "${rootUrlSubpath}"`);

  // Step 3: Parse products from root docs.yml
  const products = rootDocsYml.products || [];
  let rootMappingLines = ['## Product Root Directories', ''];
  let slugToDir = {};
  let allPages = [];
  for (const product of products) {
    if (!product.path || !product.slug) {
      console.warn(`[DEBUG] Skipping product with missing path or slug: ${JSON.stringify(product)}`);
      continue;
    }
    // product.path is like ./products/openapi-def/openapi-def.yml
    const productDir = product.path.split('/')[2];
    const productYmlPath = product.path.replace('./', 'fern/');
    const ymlContent = await getFileContent(productYmlPath);
    if (!ymlContent) {
      console.warn(`[DEBUG] Could not fetch product YAML: ${productYmlPath}`);
      continue;
    }
    const productYml = yaml.load(ymlContent);
    const canonicalSlug = slugify(product.slug);
    slugToDir[canonicalSlug] = productDir;
    rootMappingLines.push(`${canonicalSlug}: ${productDir}`);
    console.log(`[DEBUG] Product: ${productDir}, Slug: ${canonicalSlug}, YAML: ${productYmlPath}`);
    if (productYml && productYml.navigation) {
      await walkNav(productYml.navigation, [], allPages, productDir, canonicalSlug);
    } else {
      console.warn(`[DEBUG] No navigation found in ${productYmlPath}`);
    }
  }
  rootMappingLines.push('');

  let lines = [
    '# Fern URL Mappings',
    '',
    `Generated on: ${new Date().toISOString()}`,
    '',
    ...rootMappingLines,
    '## Products',
    ''
  ];
  let total = 0;
  for (const slug in slugToDir) {
    lines.push(`## ${slug.charAt(0).toUpperCase() + slug.slice(1)}`);
    lines.push('');
    const pages = allPages.filter(p => p.learnUrl.startsWith(`/learn/${slug}/`));
    if (pages.length === 0) {
      lines.push('_No .mdx files found for this product._');
    }
    for (const { learnUrl, repoPath } of pages) {
      lines.push(`- \`${learnUrl}\` → \`${repoPath}\``);
      console.log(`[DEBUG] Mapping: ${learnUrl} → ${repoPath}`);
      total++;
    }
    lines.push('');
  }
  lines[3] = `Total mappings: ${total}`;
  fs.writeFileSync(OUTPUT_FILE, lines.join('\n'), 'utf-8');
  console.log(`Wrote ${total} mappings to ${OUTPUT_FILE}`);
  if (total === 0) {
    console.warn('Warning: No mappings were generated. Check your repo structure and permissions.');
  }
}

main();