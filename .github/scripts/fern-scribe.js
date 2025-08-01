const { Octokit } = require('@octokit/rest');
const Turbopuffer = require('@turbopuffer/turbopuffer').default;
const fs = require('fs').promises;
const path = require('path');
const yaml = require('js-yaml');
const https = require('https');
const http = require('http');
const FernUrlMapper = require('./fern-url-mapper');
const fsSync = require('fs'); // For synchronous read

// Parse the Product Root Directories section from my-mappings.md
function parseProductRootMapping(mappingsPath = path.join(__dirname, 'my-mappings.md')) {
  const slugToDir = {};
  if (!fsSync.existsSync(mappingsPath)) return slugToDir;
  const content = fsSync.readFileSync(mappingsPath, 'utf-8');
  const rootSection = content.split('## Product Root Directories')[1]?.split('##')[0] || '';
  rootSection.split('\n').forEach(line => {
    const match = line.match(/^([\w-]+):\s*([\w-]+)/);
    if (match) {
      slugToDir[match[1].trim()] = match[2].trim();
    }
  });
  return slugToDir;
}

// Helper to parse my-mappings.md and build slug->dir mapping
function buildProductSlugToDirMap(mappingsPath = path.join(__dirname, 'my-mappings.md')) {
  const slugToDir = {};
  if (!fsSync.existsSync(mappingsPath)) return slugToDir;
  const content = fsSync.readFileSync(mappingsPath, 'utf-8');
  // Regex: /learn/<slug>... → fern/products/<dir>/pages
  const regex = /\/learn\/([\w-]+)[^`]*?→\s*fern\/products\/([\w-]+)\/pages/g;
  let match;
  while ((match = regex.exec(content)) !== null) {
    const slug = match[1];
    const dir = match[2];
    slugToDir[slug] = dir;
  }
  return slugToDir;
}

// Parse all /learn/... → file path mappings from my-mappings.md
function parseLearnToFileMapping(mappingsPath = path.join(__dirname, 'my-mappings.md')) {
  const learnToFile = {};
  if (!fsSync.existsSync(mappingsPath)) return learnToFile;
  const content = fsSync.readFileSync(mappingsPath, 'utf-8');
  const mappingLines = content.split('\n').filter(line => line.trim().startsWith('- `'));
  for (const line of mappingLines) {
    const match = line.match(/- `([^`]+)` → `([^`]+)`/);
    if (match) {
      learnToFile[match[1].trim()] = match[2].trim();
    }
  }
  return learnToFile;
}

// Helper function to replace fetch with Node.js built-in modules
function httpRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const isHttps = urlObj.protocol === 'https:';
    const lib = isHttps ? https : http;
    
    const requestOptions = {
      hostname: urlObj.hostname,
      port: urlObj.port || (isHttps ? 443 : 80),
      path: urlObj.pathname + urlObj.search,
      method: options.method || 'GET',
      headers: options.headers || {},
    };

    const req = lib.request(requestOptions, (res) => {
      const chunks = [];
      
      res.on('data', chunk => {
        chunks.push(chunk);
      });
      
      res.on('end', () => {
        const buffer = Buffer.concat(chunks);
        const data = buffer.toString('utf8');
        
        const response = {
          ok: res.statusCode >= 200 && res.statusCode < 300,
          status: res.statusCode,
          headers: {
            get: (name) => res.headers[name.toLowerCase()]
          },
          json: () => Promise.resolve(JSON.parse(data)),
          text: () => Promise.resolve(data),
          arrayBuffer: () => Promise.resolve(buffer)
        };
        resolve(response);
      });
    });

    req.on('error', reject);
    
    if (options.body) {
      req.write(options.body);
    }
    
    req.end();
  });
}

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
    
    // Use centralized URL mapper
    this.urlMapper = new FernUrlMapper(process.env.GITHUB_TOKEN, process.env.REPOSITORY);
    this.productSlugToDir = parseProductRootMapping();
    this.learnToFile = parseLearnToFileMapping();
    
    // Track files that failed MDX validation
    this.mdxValidationFailures = [];
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
      const response = await httpRequest(file.url_private, {
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
      const response = await httpRequest(imageUrl, {
        headers: {
          'Authorization': `Bearer ${this.slackToken}`
        }
      });

      if (!response.ok) return null;

      const imageBuffer = await response.arrayBuffer();
      const base64Image = Buffer.from(imageBuffer).toString('base64');
      const mimeType = response.headers.get('content-type') || 'image/jpeg';

      // Use Claude to describe the image
      const claudeResponse = await httpRequest('https://api.anthropic.com/v1/messages', {
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
      const response = await httpRequest(`https://slack.com/api/conversations.replies?${new URLSearchParams({
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

  // Estimate tokens (rough approximation: ~4 chars per token for English)
  estimateTokens(text) {
    return Math.ceil(text.length / 4);
  }

  // Truncate query intelligently to fit within token limits
  truncateQuery(text, maxTokens = 8000) { // Leave some buffer below 8192
    const estimatedTokens = this.estimateTokens(text);
    
    if (estimatedTokens <= maxTokens) {
      return text;
    }

    console.log(`⚠️  Query too long (${estimatedTokens} tokens), truncating to fit within ${maxTokens} tokens...`);
    
    // Try to parse the enhanced query structure
    const sections = text.split('\n\n');
    let truncatedText = '';
    let currentTokens = 0;
    
    // Prioritize sections: core request first, Slack discussion last
    const prioritizedSections = [];
    
    for (const section of sections) {
      if (section.includes('Add a comprehensive list') || section.startsWith('Issue:') || section.startsWith('Request:')) {
        prioritizedSections.unshift(section); // High priority - add to beginning
      } else if (section.includes('AI-suggested terms:')) {
        prioritizedSections.splice(1, 0, section); // Medium-high priority
      } else if (section.includes('Additional Context:')) {
        prioritizedSections.splice(-1, 0, section); // Medium priority
      } else if (section.includes('Slack Discussion Context:')) {
        prioritizedSections.push(section); // Low priority - add to end
      } else {
        prioritizedSections.push(section); // Default priority
      }
    }
    
    // Build truncated query by adding sections until we hit the limit
    for (const section of prioritizedSections) {
      const sectionTokens = this.estimateTokens(section);
      
      if (currentTokens + sectionTokens <= maxTokens) {
        if (truncatedText) truncatedText += '\n\n';
        truncatedText += section;
        currentTokens += sectionTokens;
      } else {
        // If this is a Slack discussion, try to include a truncated version
        if (section.includes('Slack Discussion Context:')) {
          const remainingTokens = maxTokens - currentTokens;
          const remainingChars = remainingTokens * 4;
          
          if (remainingChars > 200) { // Only add if we have meaningful space
            const truncatedSection = section.slice(0, remainingChars - 50) + '\n\n[... Slack discussion truncated for token limit ...]';
            if (truncatedText) truncatedText += '\n\n';
            truncatedText += truncatedSection;
          }
        }
        break;
      }
    }
    
    const finalTokens = this.estimateTokens(truncatedText);
    console.log(`✂️  Truncated query: ${text.length} → ${truncatedText.length} chars (${estimatedTokens} → ${finalTokens} tokens)`);
    
    return truncatedText;
  }

  async createEmbedding(text) {
    console.log(`🔍 Creating embedding for text (${text.length} chars)...`);
    
    try {
      // Truncate if necessary to fit within token limits
      const truncatedText = this.truncateQuery(text);
      
      const response = await httpRequest('https://api.openai.com/v1/embeddings', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          input: truncatedText,
          model: 'text-embedding-3-large',
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ OpenAI API error details:', errorText);
        
        // Try to parse the error as JSON for better understanding
        try {
          const errorData = JSON.parse(errorText);
          console.error('📋 Parsed error data:', JSON.stringify(errorData, null, 2));
        } catch (e) {
          console.error('📋 Raw error text:', errorText);
        }
        
        throw new Error(`OpenAI API error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      console.log(`✅ Embedding created successfully (${data.data[0]?.embedding?.length} dimensions)`);
      return data.data[0].embedding;
      
    } catch (error) {
      console.error('❌ createEmbedding failed:', error.message);
      console.error('📝 Query preview (first 200 chars):', text.slice(0, 200));
      console.error('🔑 API Key present:', process.env.OPENAI_API_KEY ? `Yes (${process.env.OPENAI_API_KEY.length} chars)` : 'No');
      throw error;
    }
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
    // Check if content needs chunking
    const CHUNK_THRESHOLD = 12000; // Chars threshold to decide when to chunk
    if (existingContent.length <= CHUNK_THRESHOLD) {
      return this.generateSingleContent(filePath, existingContent, context, fernStructure);
    } else {
      console.log(`   📊 Large file detected (${existingContent.length} chars) - using chunked processing`);
      return this.generateChunkedContent(filePath, existingContent, context, fernStructure);  
    }
  }

  async generateSingleContent(filePath, existingContent, context, fernStructure) {
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
${context.isNewFile ? 
  'Create a new documentation file to address the documentation request. Use the Slack discussion context to understand the specific pain points and requirements mentioned by users. Follow Fern documentation best practices and create a well-structured guide.' :
  'Update this file to address the documentation request. Use the Slack discussion context to understand the specific pain points and requirements mentioned by users. Follow Fern documentation best practices and maintain consistency with the existing structure.'
}

CRITICAL MDX SYNTAX REQUIREMENTS:
- ALL opening tags MUST have corresponding closing tags (e.g., <ParamField> must have </ParamField>)
- Self-closing tags must use proper syntax (e.g., <ParamField param="value" />)
- Preserve existing MDX component structure exactly
- When adding new ParamField, CodeBlock, or other components, ensure they are properly closed
- Check that every < has a matching >
- Validate that nested components are properly structured

IMPORTANT: Return ONLY the clean file content. Do not include any explanatory text, meta-commentary, or descriptions about what you're doing. Start directly with the frontmatter (---) or first line of the file content.

Complete updated file content:`;

    try {
      const response = await httpRequest('https://api.anthropic.com/v1/messages', {
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
        const errorText = await response.text();
        console.error('❌ Anthropic API error details (generateContent):', errorText);
        throw new Error(`Anthropic API error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      const generatedContent = data.content[0]?.text || '';
      
      // Basic MDX validation
      const validationResult = this.validateMDXContent(generatedContent);
      if (!validationResult.isValid) {
        console.warn(`⚠️  MDX validation warnings for ${filePath}:`, validationResult.warnings);
      }
      
      return generatedContent;
    } catch (error) {
      console.error('Claude API error:', error);
      return existingContent; // Return original if AI fails
    }
  }

  async generateChunkedContent(filePath, existingContent, context, fernStructure) {
    const chunks = this.chunkContent(existingContent, 8000);
    const updatedChunks = [];
    let hasChanges = false;

    console.log(`   🧩 Processing ${chunks.length} chunks for ${filePath}`);

    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      console.log(`   📝 Processing chunk ${i + 1}/${chunks.length}${chunk.section ? ` (${chunk.section})` : ''}`);

      const chunkPrompt = `${this.systemPrompt}

## Context
File: ${filePath}
Chunk: ${i + 1} of ${chunks.length}${chunk.section ? ` - Section: "${chunk.section}"` : ''}
Request: ${context.requestDescription}
Existing Instructions: ${context.existingInstructions}
Why Current Approach Doesn't Work: ${context.whyNotWork}
Additional Context: ${context.additionalContext}
${context.slackThreadContent ? `\n## Slack Discussion Context\n${context.slackThreadContent}` : ''}

## Fern Docs Structure Reference
${fernStructure}

## Current Chunk Content
${chunk.content}

## Instructions
${context.isNewFile ? 
  `This is chunk ${i + 1} of ${chunks.length} for a new documentation file. Create comprehensive content for this section to address the documentation request.` :
  chunk.isComplete ? 
    'This is the final chunk of the file. Update this section to address the documentation request.' :
    `This is chunk ${i + 1} of ${chunks.length} from a larger file. Update only this section as needed to address the documentation request. Do not add or remove section headers unless specifically needed for this chunk.`
}

Focus on:
- Addressing the specific documentation gaps mentioned in the request
- Improving clarity and completeness within this chunk
- Maintaining consistency with Fern documentation patterns
- Preserving the existing structure and flow

CRITICAL MDX SYNTAX REQUIREMENTS:
- ALL opening tags MUST have corresponding closing tags (e.g., <ParamField> must have </ParamField>)
- Self-closing tags must use proper syntax (e.g., <ParamField param="value" />)
- Preserve existing MDX component structure exactly
- When adding new ParamField, CodeBlock, or other components, ensure they are properly closed
- Check that every < has a matching >
- Validate that nested components are properly structured

IMPORTANT: Return ONLY the updated chunk content. Do not include any explanatory text, meta-commentary, or descriptions about what you're doing.

Updated chunk content:`;

      try {
        const response = await httpRequest('https://api.anthropic.com/v1/messages', {
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
              content: chunkPrompt
            }]
          })
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error(`❌ Anthropic API error for chunk ${i + 1}:`, errorText);
          updatedChunks.push(chunk.content); // Use original chunk
          continue;
        }

        const data = await response.json();
        const updatedChunkContent = data.content[0]?.text || chunk.content;
        
        // Validate the chunk
        const validationResult = this.validateMDXContent(updatedChunkContent);
        if (!validationResult.isValid) {
          console.warn(`⚠️  MDX validation warnings for chunk ${i + 1}:`, validationResult.warnings);
          updatedChunks.push(chunk.content); // Use original chunk if validation fails
        } else {
          updatedChunks.push(updatedChunkContent);
          if (updatedChunkContent !== chunk.content) {
            hasChanges = true;
            console.log(`   ✅ Updated chunk ${i + 1} (${chunk.content.length} → ${updatedChunkContent.length} chars)`);
          } else {
            console.log(`   ℹ️  No changes for chunk ${i + 1}`);
          }
        }

      } catch (error) {
        console.error(`❌ Error processing chunk ${i + 1}:`, error.message);
        updatedChunks.push(chunk.content); // Use original chunk
      }

      // Add a small delay between chunks to be respectful to the API
      if (i < chunks.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    // Reassemble the chunks
    const finalContent = this.reassembleChunks(updatedChunks, chunks);
    
    console.log(`   🔧 Reassembled content: ${existingContent.length} → ${finalContent.length} chars`);
    
    return hasChanges ? finalContent : existingContent;
  }

  reassembleChunks(updatedChunks, originalChunks) {
    // If there's only one chunk, return it directly
    if (updatedChunks.length === 1) {
      return updatedChunks[0];
    }

    // For multiple chunks, we need to carefully reassemble
    let reassembled = '';
    
    for (let i = 0; i < updatedChunks.length; i++) {
      const chunk = updatedChunks[i];
      const originalChunk = originalChunks[i];
      
      if (i === 0) {
        // First chunk should include frontmatter if present
        reassembled = chunk;
      } else {
        // For subsequent chunks, remove frontmatter if it was duplicated
        let cleanChunk = chunk;
        if (cleanChunk.startsWith('---\n') && reassembled.includes('---\n')) {
          // Remove frontmatter from subsequent chunks
          const frontmatterEnd = cleanChunk.indexOf('---\n', 4);
          if (frontmatterEnd !== -1) {
            cleanChunk = cleanChunk.substring(frontmatterEnd + 4);
          }
        }
        
        // Add proper spacing between chunks
        if (reassembled.trim() && cleanChunk.trim()) {
          reassembled += '\n\n' + cleanChunk;
        } else {
          reassembled += cleanChunk;
        }
      }
    }

    return reassembled;
  }

  // Basic MDX validation to catch common issues
  validateMDXContent(content) {
    const warnings = [];
    
    // Check for unclosed ParamField tags
    const paramFieldMatches = content.match(/<ParamField[^>]*>/g) || [];
    const paramFieldCloses = content.match(/<\/ParamField>/g) || [];
    if (paramFieldMatches.length !== paramFieldCloses.length) {
      warnings.push(`Mismatched ParamField tags: ${paramFieldMatches.length} opening, ${paramFieldCloses.length} closing`);
    }
    
    // Check for unclosed CodeBlock tags
    const codeBlockMatches = content.match(/<CodeBlock[^>]*>/g) || [];
    const codeBlockCloses = content.match(/<\/CodeBlock>/g) || [];
    if (codeBlockMatches.length !== codeBlockCloses.length) {
      warnings.push(`Mismatched CodeBlock tags: ${codeBlockMatches.length} opening, ${codeBlockCloses.length} closing`);
    }
    
    // Check for other common unclosed tags
    const commonTags = ['Accordion', 'AccordionItem', 'Tab', 'Tabs', 'Card'];
    for (const tag of commonTags) {
      const openTags = content.match(new RegExp(`<${tag}[^>]*>`, 'g')) || [];
      const closeTags = content.match(new RegExp(`<\/${tag}>`, 'g')) || [];
      if (openTags.length !== closeTags.length) {
        warnings.push(`Mismatched ${tag} tags: ${openTags.length} opening, ${closeTags.length} closing`);
      }
    }
    
    return {
      isValid: warnings.length === 0,
      warnings
    };
  }

  // Intelligent content chunking for large files
  chunkContent(content, maxChunkSize = 8000) {
    // If content is small enough, return as single chunk
    if (content.length <= maxChunkSize) {
      return [{ content, isComplete: true, chunkIndex: 0, totalChunks: 1 }];
    }

    const chunks = [];
    const lines = content.split('\n');
    let currentChunk = '';
    let frontmatter = '';
    let inFrontmatter = false;
    let frontmatterEnded = false;

    // Extract frontmatter first
    if (lines[0] === '---') {
      inFrontmatter = true;
      for (let i = 0; i < lines.length; i++) {
        if (i > 0 && lines[i] === '---') {
          inFrontmatter = false;
          frontmatterEnded = true;
          frontmatter = lines.slice(0, i + 1).join('\n') + '\n';
          break;
        }
      }
    }

    // Start processing from after frontmatter
    const startIndex = frontmatterEnded ? lines.findIndex((line, idx) => idx > 0 && line === '---') + 1 : 0;
    const contentLines = lines.slice(startIndex);

    let sectionBuffer = [];
    let currentSection = null;

    for (let i = 0; i < contentLines.length; i++) {
      const line = contentLines[i];
      
      // Detect section headers (## or ###)
      if (line.match(/^#{2,3}\s+/)) {
        // If we have accumulated content and adding this section would exceed limit
        if (sectionBuffer.length > 0 && (currentChunk + sectionBuffer.join('\n')).length > maxChunkSize) {
          // Save current chunk
          chunks.push({
            content: (chunks.length === 0 ? frontmatter : '') + currentChunk.trim(),
            isComplete: false,
            chunkIndex: chunks.length,
            section: currentSection,
            hasMore: true
          });
          currentChunk = '';
          currentSection = null;
        }
        
        // Start new section
        currentSection = line.replace(/^#+\s+/, '').trim();
        sectionBuffer = [line];
      } else {
        sectionBuffer.push(line);
      }

      // Check if we need to break at this point
      const potentialChunk = currentChunk + sectionBuffer.join('\n') + '\n';
      if (potentialChunk.length > maxChunkSize && currentChunk.length > 0) {
        // Save current chunk without the current section
        chunks.push({
          content: (chunks.length === 0 ? frontmatter : '') + currentChunk.trim(),
          isComplete: false,
          chunkIndex: chunks.length,
          section: chunks.length > 0 ? currentSection : null,
          hasMore: true
        });
        currentChunk = sectionBuffer.join('\n') + '\n';
        sectionBuffer = [];
      } else {
        currentChunk += sectionBuffer.join('\n') + '\n';
        sectionBuffer = [];
      }
    }

    // Add remaining content as final chunk
    if (currentChunk.trim()) {
      chunks.push({
        content: (chunks.length === 0 ? frontmatter : '') + currentChunk.trim(),
        isComplete: true,
        chunkIndex: chunks.length,
        section: currentSection,
        hasMore: false
      });
    }

    // Update totalChunks for all chunks
    chunks.forEach(chunk => {
      chunk.totalChunks = chunks.length;
    });

    console.log(`   📊 Split content into ${chunks.length} chunks (${content.length} chars total)`);
    chunks.forEach((chunk, i) => {
      console.log(`      Chunk ${i + 1}: ${chunk.content.length} chars${chunk.section ? ` (${chunk.section})` : ''}`);
    });

    return chunks;
  }

  async analyzeDocumentationNeeds(context) {
    if (!this.anthropicApiKey) {
      console.log('⚠️ No Anthropic API key provided - skipping documentation analysis');
      return { recommendations: [], reasoning: '' };
    }

    const prompt = `You are a documentation expert analyzing a GitHub issue and Slack discussion to identify exactly which documentation sections need updates.

## Issue Context
Title: ${this.issueTitle || 'No title'}
Description: ${context.requestDescription || 'No description'}
Additional Context: ${context.additionalContext || 'None'}

## Slack Discussion
${context.slackThreadContent || 'No Slack discussion provided'}

## Your Task
Analyze this issue and discussion to:
1. Identify the core problem or missing documentation
2. Determine which specific documentation sections/pages should be updated
3. Suggest additional search terms that would find the right pages

Be specific about page paths. For example:
- If it's about images, suggest "/learn/docs/writing-content/markdown" (which covers images)
- If it's about API configuration, suggest specific product pages like "/learn/sdks/generators/[language]/configuration"
- If it's about navigation features, suggest "/learn/docs/navigation/*" pages

Output your response as JSON:
{
  "coreIssue": "Brief description of what's missing or broken",
  "suggestedPages": [
    {
      "path": "/learn/docs/path/to/page",
      "reason": "Why this page should be updated",
      "priority": "high|medium|low"
    }
  ],
  "additionalSearchTerms": ["term1", "term2", "term3"],
  "reasoning": "Your detailed analysis of why these pages were chosen"
}`;

    try {
      const response = await httpRequest('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'x-api-key': this.anthropicApiKey,
          'Content-Type': 'application/json',
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: 'claude-3-5-sonnet-20241022',
          max_tokens: 2000,
          messages: [{
            role: 'user',
            content: prompt
          }]
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Anthropic API error details (analyzeDocumentationNeeds):', errorText);
        throw new Error(`Anthropic API error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      const analysisText = data.content[0]?.text || '{}';
      
      try {
        const analysis = JSON.parse(analysisText);
        console.log(`💡 Core Issue: ${analysis.coreIssue}`);
        console.log(`🎯 Suggested ${analysis.suggestedPages?.length || 0} specific pages for updates`);
        return analysis;
      } catch (parseError) {
        console.log('⚠️ Could not parse analysis response as JSON, using fallback');
        return { 
          coreIssue: analysisText.slice(0, 200) + '...',
          suggestedPages: [],
          additionalSearchTerms: [],
          reasoning: analysisText 
        };
      }
    } catch (error) {
      console.error('❌ Documentation analysis failed:', error);
      return { recommendations: [], reasoning: '' };
    }
  }

  async enhanceResultsWithAnalysis(turbopufferResults, analysis) {
    if (!analysis.suggestedPages || analysis.suggestedPages.length === 0) {
      return turbopufferResults;
    }

    console.log('🔍 Searching for AI-suggested documentation pages...');
    const enhancedResults = [...turbopufferResults];
    const existingPaths = new Set(turbopufferResults.map(r => r.pathname || r.url));

    // Search for each suggested page
    for (const suggestion of analysis.suggestedPages) {
      if (existingPaths.has(suggestion.path)) {
        console.log(`   ✅ Already found: ${suggestion.path}`);
        continue;
      }

      // Try to find the suggested page using targeted search
      console.log(`   🔍 Searching for suggested page: ${suggestion.path}`);
      
      // Extract search terms from the path and reason
      const searchTerms = [
        suggestion.path.split('/').filter(Boolean).join(' '),
        suggestion.reason,
        ...suggestion.path.split('/').slice(-2) // Last two path segments
      ].join(' ');

      const targetedResults = await this.queryTurbopuffer(searchTerms, {
        namespace: process.env.TURBOPUFFER_NAMESPACE || 'default',
        topK: 3
      });

      // Look for exact or close matches to the suggested path
      let foundMatch = false;
      for (const result of targetedResults) {
        const resultPath = result.pathname || result.url || '';
        if (resultPath.includes(suggestion.path) || 
            suggestion.path.includes(resultPath.replace('/learn', ''))) {
          console.log(`   ✅ Found suggested page: ${resultPath}`);
          enhancedResults.push({
            ...result,
            aiSuggested: true,
            priority: suggestion.priority,
            reason: suggestion.reason
          });
          existingPaths.add(resultPath);
          foundMatch = true;
          break;
        }
      }

      // If no good match found, suggest creating a new file
      if (!foundMatch && this.shouldSuggestNewFile(suggestion, turbopufferResults)) {
        console.log(`   💡 Suggesting new file creation: ${suggestion.path}`);
        enhancedResults.push({
          pathname: suggestion.path,
          url: suggestion.path,
          title: this.generateTitleFromPath(suggestion.path),
          isNewFile: true,
          aiSuggested: true,
          priority: suggestion.priority,
          reason: suggestion.reason,
          document: '', // Empty content for new file
        });
      }
    }

    return enhancedResults;
  }

  shouldSuggestNewFile(suggestion, existingResults) {
    // Only suggest new files for high priority suggestions
    if (suggestion.priority !== 'high') return false;
    
    // Check if we have very few relevant results (weak matches)
    const highRelevanceResults = existingResults.filter(r => r.$dist && (1 - r.$dist) > 0.7);
    if (highRelevanceResults.length >= 2) return false;
    
    // Check if the suggested path looks like it should exist based on the pattern
    const pathSegments = suggestion.path.split('/').filter(Boolean);
    if (pathSegments.length < 3) return false; // Need at least /learn/product/page
    
    return true;
  }

  generateTitleFromPath(path) {
    const segments = path.split('/').filter(Boolean);
    const lastSegment = segments[segments.length - 1];
    return lastSegment
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
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
      const response = await httpRequest('https://api.anthropic.com/v1/messages', {
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
        const errorText = await response.text();
        console.error('❌ Anthropic API error details (generateChangelogEntry):', errorText);
        throw new Error(`Anthropic API error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      return data.content[0]?.text || null;
    } catch (error) {
      console.error('Changelog generation failed:', error);
      return null;
    }
  }

  // Map Turbopuffer URLs to actual GitHub file paths (using centralized mapper)
  async mapTurbopufferPathToGitHub(turbopufferPath) {
    return await this.urlMapper.mapTurbopufferPathToGitHub(turbopufferPath);
  }

  // Returns the canonical product file path for a new file, using the mapping from my-mappings.md
  getCanonicalProductFilePath(slugOrUrl, relPath) {
    // Try to construct the /learn/... URL
    let slug = null;
    if (slugOrUrl) {
      const match = /learn\/([\w-]+)/.exec(slugOrUrl);
      if (match) slug = match[1];
    }
    if (!slug) slug = slugOrUrl;
    // Build the canonical /learn/... URL
    let learnUrl = `/learn/${slug}/${relPath.replace(/\.mdx$/, '').replace(/\/+/, '/')}`;
    // Remove any double slashes
    learnUrl = learnUrl.replace(/\/+/g, '/');
    // Remove trailing .mdx if present
    learnUrl = learnUrl.replace(/\.mdx$/, '');
    
    // Look up the mapping first
    const mappedPath = this.learnToFile[learnUrl];
    if (mappedPath) {
      console.log(`[DEBUG] Using existing mapping: ${learnUrl} → ${mappedPath}`);
      return mappedPath;
    } 
    
    // Fallback: generate path based on product structure patterns
    const fallbackPath = this.generateFallbackPath(slug, relPath);
    if (fallbackPath) {
      console.log(`[DEBUG] Using fallback mapping: ${learnUrl} → ${fallbackPath}`);
      return fallbackPath;
    }
    
    console.warn(`[DEBUG] No mapping found for ${learnUrl}, skipping file creation.`);
    return null;
  }
  
  // Generate fallback path for new files based on existing patterns
  generateFallbackPath(slug, relPath) {
    // Map learn slugs to product directories (from my-mappings.md patterns)
    const productMap = {
      'sdks': 'sdks',
      'docs': 'docs', 
      'openapi-definition': 'openapi-def',
      'fern-definition': 'fern-def',
      'cli-api': 'cli-api-reference',
      'asyncapi-definition': 'asyncapi-def',
      'openrpc-definition': 'openrpc-def',
      'grpc-definition': 'grpc-def',
      'ask-fern': 'ask-fern',
      'home': 'home'
    };
    
    const productDir = productMap[slug];
    if (!productDir) {
      return null;
    }
    
    // Clean up the relative path
    let cleanRelPath = relPath.replace(/\.mdx$/, '');
    if (!cleanRelPath.endsWith('.mdx')) {
      cleanRelPath += '.mdx';
    }
    
    // For SDKs, check if it's a generator-specific path
    if (slug === 'sdks' && cleanRelPath.includes('generators/')) {
      // Handle generator-specific paths: generators/typescript/... -> overview/typescript/...
      const generatorPath = cleanRelPath.replace('generators/', 'overview/');
      return `fern/products/${productDir}/${generatorPath}`;
    }
    
    // Default pattern: fern/products/{product}/pages/{path}
    return `fern/products/${productDir}/pages/${cleanRelPath}`;
  }

  // Find the appropriate product YAML file based on the file path
  getProductYamlPath(filePath) {
    if (filePath.includes('openapi-def') || filePath.includes('openapi-definition')) {
      return 'fern/products/openapi-def/openapi-def.yml';
    } else if (filePath.includes('fern-def') || filePath.includes('fern-definition')) {
      return 'fern/products/fern-def/fern-def.yml';
    } else if (filePath.includes('sdks')) {
      return 'fern/products/sdks/sdks.yml';
    } else if (filePath.includes('docs')) {
      return 'fern/products/docs/docs.yml';
    } else if (filePath.includes('ask-fern')) {
      return 'fern/products/ask-fern/ask-fern.yml';
    } else if (filePath.includes('cli-api-reference')) {
      return 'fern/products/cli-api-reference/cli-api-reference.yml';
    } else if (filePath.includes('asyncapi-def')) {
      return 'fern/products/asyncapi-def/asyncapi-def.yml';
    } else if (filePath.includes('openrpc-def')) {
      return 'fern/products/openrpc-def/openrpc-def.yml';
    } else if (filePath.includes('grpc-def')) {
      return 'fern/products/grpc-def/grpc-def.yml';
    }
    return null;
  }

  // Extract the page information from a file path for YAML navigation
  extractPageInfo(filePath, title) {
    const pathParts = filePath.split('/');
    const fileName = pathParts[pathParts.length - 1].replace('.mdx', '');
    
    // Create a slug from the file name
    const slug = fileName;
    
    // Extract the relative path after 'fern/products/[product]/'
    let relativePath = null;
    const fernProductsIndex = pathParts.indexOf('products');
    if (fernProductsIndex >= 0 && fernProductsIndex + 2 < pathParts.length) {
      // Get the path after 'fern/products/[product-name]/'
      const pathAfterProduct = pathParts.slice(fernProductsIndex + 2).join('/');
      relativePath = './' + pathAfterProduct;
    }
    
    // Try to find the appropriate section based on path
    let section = null;
    if (filePath.includes('extensions')) {
      section = 'extensions';
    } else if (filePath.includes('configuration')) {
      section = 'configuration';
    } else if (filePath.includes('generators')) {
      section = 'generators';
    } else if (filePath.includes('overview')) {
      section = 'overview';
    }
    
    return {
      slug,
      title: title || fileName.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
      section,
      path: relativePath
    };
  }

  // Update product YAML file to include new page
  async updateProductYaml(filePath, pageTitle, newPageCreated = false) {
    if (!newPageCreated) {
      return; // Only update YAML for new pages
    }

    const yamlPath = this.getProductYamlPath(filePath);
    if (!yamlPath) {
      console.log(`   ⚠️  Could not determine product YAML for ${filePath}`);
      return;
    }

    try {
      console.log(`   📝 Updating product navigation: ${yamlPath}`);
      
      // Fetch current YAML content
      const currentYaml = await this.fetchFileContent(yamlPath);
      if (!currentYaml) {
        console.log(`   ⚠️  Could not fetch YAML file: ${yamlPath}`);
        return;
      }

      // Parse YAML
      const yamlData = yaml.load(currentYaml);
      const pageInfo = this.extractPageInfo(filePath, pageTitle);
      
      // Find the appropriate section to add the new page
      let targetSection = null;
      if (yamlData.navigation) {
        // Look for existing section
        for (const item of yamlData.navigation) {
          if (item.section === pageInfo.section) {
            targetSection = item;
            break;
          }
        }
        
        // If no specific section found, add to the end
        if (!targetSection && yamlData.navigation.length > 0) {
          // Find a good parent section or create one
          if (pageInfo.section === 'extensions') {
            targetSection = yamlData.navigation.find(item => 
              item.section === 'extensions' || 
              item.title?.toLowerCase().includes('extension')
            );
          }
          
          if (!targetSection) {
            // Add to the last section that has children
            targetSection = yamlData.navigation.find(item => item.contents);
          }
        }
      }

      // Add the new page
      const newPageEntry = {
        page: pageInfo.title,
        path: pageInfo.path
      };

      if (targetSection && targetSection.contents) {
        targetSection.contents.push(newPageEntry);
      } else if (yamlData.navigation) {
        // Create a new section if needed
        yamlData.navigation.push({
          section: pageInfo.section || 'other',
          contents: [newPageEntry]
        });
      } else {
        // Fallback: create basic navigation structure
        yamlData.navigation = [{
          section: pageInfo.section || 'main',
          contents: [newPageEntry]
        }];
      }

      // Convert back to YAML
      const updatedYaml = yaml.dump(yamlData, { 
        indent: 2,
        lineWidth: -1,
        noRefs: true
      });

      console.log(`   ✅ Added page "${pageInfo.title}" to ${yamlPath}`);
      return { yamlPath, updatedYaml };

    } catch (error) {
      console.error(`   ❌ Error updating YAML for ${filePath}:`, error.message);
      return null;
    }
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
    
    // Build the main PR body
    let body = `## 🌿 Fern Scribe Documentation Update

**Original Request:** ${context.requestDescription}

**Files Updated:**
${filesUpdated.map(file => `- \`${file}\``).join('\n')}

**Priority:** ${context.priority}

${context.slackThread ? `**Related Discussion:** ${context.slackThread}` : ''}

${context.additionalContext ? `**Additional Context:** ${context.additionalContext}` : ''}`;

    // Add section for files that failed MDX validation
    if (this.mdxValidationFailures.length > 0) {
      body += `\n\n## ⚠️ Files with MDX Validation Issues

The following files could not be updated due to MDX validation failures after 3 attempts:

${this.mdxValidationFailures.map((failure, index) => {
  const warnings = failure.warnings.map(w => `  - ${w}`).join('\n');
  const truncatedContent = failure.suggestedContent && failure.suggestedContent.length > 4000 
    ? failure.suggestedContent.substring(0, 4000) + '\n\n... [Content truncated due to length]'
    : failure.suggestedContent;
  
  return `### ${index + 1}. **\`${failure.filePath}\`** (${failure.title || 'Untitled'})

- **URL**: ${failure.url || 'N/A'}
- **Validation Issues**:
${warnings}

**Suggested Content** (needs manual MDX fixes):

\`\`\`mdx
${truncatedContent || 'No suggested content available'}
\`\`\``;
}).join('\n\n')}

**Note**: These files require manual review and correction of their MDX component structure before the content can be applied.`;
    }

    body += `\n\n---
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
      context.slackThreadContent = slackThreadContent;

      // Analyze the issue and Slack discussion to determine documentation gaps
      console.log('🧠 Analyzing issue and discussion to identify documentation gaps...');
      const documentationAnalysis = await this.analyzeDocumentationNeeds(context);
      
      // Create enhanced query text that includes both request description and Slack context
      const enhancedQuery = [
        context.requestDescription,
        slackThreadContent ? `\n\nSlack Discussion Context:\n${slackThreadContent}` : '',
        context.additionalContext ? `\n\nAdditional Context:\n${context.additionalContext}` : '',
        documentationAnalysis.additionalSearchTerms ? `\n\nAI-suggested terms: ${documentationAnalysis.additionalSearchTerms.join(', ')}` : ''
      ].filter(Boolean).join('\n');

      // Query TurboBuffer for relevant files
      console.log('🔍 Querying TurboBuffer for relevant files...');
      const searchResultURLs = new Set();
      const searchResults = [];
      
      const turbopufferResults = await this.queryTurbopuffer(enhancedQuery, {
        namespace: process.env.TURBOPUFFER_NAMESPACE || 'default',
        topK: 3
      });

      // Enhance results with AI-identified sections
      const enhancedResults = await this.enhanceResultsWithAnalysis(turbopufferResults, documentationAnalysis);

      console.log(`\n📁 Found ${enhancedResults.length} relevant files (${turbopufferResults.length} from Turbopuffer + ${enhancedResults.length - turbopufferResults.length} AI-suggested):`);
      
      enhancedResults.forEach((result, index) => {
        const path = result.pathname || result.url || 'Unknown path';
        const title = result.title || 'Untitled';
        const url = result.url || `https://${result.domain || ''}${result.pathname || ''}`;
        const relevance = result.$dist !== undefined ? (1 - result.$dist).toFixed(3) : 'N/A';
        const aiSuggested = result.aiSuggested ? ' 🤖 AI-suggested' : '';
        const isNewFile = result.isNewFile ? ' 📄 NEW FILE' : '';
        
        console.log(`${index + 1}. ${path}${aiSuggested}${isNewFile}`);
        console.log(`   Title: ${title}`);
        console.log(`   URL: ${url}`);
        console.log(`   Relevance Score: ${relevance}`);
        if (result.reason) {
          console.log(`   AI Reason: ${result.reason}`);
        }
        if (result.isNewFile) {
          console.log(`   📝 Will create new documentation file`);
        }
      });
      console.log('');

      // Deduplicate results by URL
      for (const result of enhancedResults) {
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
        console.log('❌ No relevant files found from search');
        
        // Try to suggest a new file based on the documentation analysis
        if (documentationAnalysis.suggestedPages && documentationAnalysis.suggestedPages.length > 0) {
          console.log('💡 Suggesting new file creation based on AI analysis...');
          const highPrioritySuggestion = documentationAnalysis.suggestedPages.find(p => p.priority === 'high') || 
                                         documentationAnalysis.suggestedPages[0];
          
          searchResults.push({
            pathname: highPrioritySuggestion.path,
            url: highPrioritySuggestion.path,
            title: this.generateTitleFromPath(highPrioritySuggestion.path),
            isNewFile: true,
            aiSuggested: true,
            priority: highPrioritySuggestion.priority,
            reason: highPrioritySuggestion.reason,
            document: '', // Empty content for new file
          });
          
          console.log(`   📄 Suggested new file: ${highPrioritySuggestion.path}`);
        } else {
          console.log('❌ No relevant files found and no suggestions for new files');
          return;
        }
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
          let currentContent;
          if (result.isNewFile) {
            console.log(`   💡 New file suggested - generating from scratch`);
            currentContent = '';
          } else {
            currentContent = await this.getCurrentFileContent(filePath);
          }
          
          const contextWithDocument = {
            ...context,
            currentDocument: result.document || '',
            slackThreadContent,
            isNewFile: result.isNewFile || false
          };
          
          console.log(`   🤖 Generating AI suggestions based on context...`);
          let suggestedContent = null;
          let valid = false;
          let attempts = 0;
          while (attempts < 3 && !valid) {
            suggestedContent = await this.generateContent(filePath, currentContent, contextWithDocument, fernStructure);
            const validationResult = this.validateMDXContent(suggestedContent);
            if (validationResult.isValid) {
              valid = true;
            } else {
              attempts++;
              console.warn(`⚠️  MDX validation failed for ${filePath} (attempt ${attempts}):`, validationResult.warnings);
              // Optionally: try to auto-fix here (not implemented yet)
            }
          }
          if (!valid) {
            const validationResult = this.validateMDXContent(suggestedContent);
            const msg = `❌ Skipping file due to invalid MDX after 3 attempts: ${filePath}\nWarnings: ${JSON.stringify(validationResult.warnings)}`;
            console.warn(msg);
            
            // Track this failure for the PR description
            this.mdxValidationFailures.push({
              filePath,
              warnings: validationResult.warnings,
              attempts: 3,
              url: result.url,
              title: result.title,
              suggestedContent: suggestedContent // Store the suggested content despite validation issues
            });
            
            // If running in GitHub Actions, comment on the issue
            if (process.env.GITHUB_TOKEN && process.env.REPOSITORY && process.env.ISSUE_NUMBER) {
              const [owner, repo] = process.env.REPOSITORY.split('/');
              const octokit = this.octokit;
              await octokit.rest.issues.createComment({
                owner,
                repo,
                issue_number: this.issueNumber,
                body: msg
              });
            }
            continue; // Skip this file
          }
          
          if (suggestedContent && (suggestedContent !== currentContent || result.isNewFile)) {
            analysisResults.push({
              filePath,
              currentContent,
              suggestedContent,
              title: result.title,
              url: result.url,
              isNewFile: result.isNewFile || false
            });
            
            if (result.isNewFile) {
              console.log(`   ✅ New file content generated: ${filePath}`);
              console.log(`   📊 Generated: ${suggestedContent.length} chars`);
            } else {
              console.log(`   ✅ Changes suggested for: ${filePath}`);
              console.log(`   📊 Original: ${currentContent.length} chars → Suggested: ${suggestedContent.length} chars`);
            }
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
              let actualPath;
              const isNewFile = result.isNewFile || result.currentContent.length === 0;
              if (isNewFile) {
                // Use mapping to get correct product directory for new files
                let slug = null;
                if (result.url) {
                  const match = /learn\/([\w-]+)/.exec(result.url);
                  if (match) slug = match[1];
                }
                if (!slug && result.filePath) {
                  const match = /learn\/([\w-]+)/.exec(result.filePath);
                  if (match) slug = match[1];
                }
                // Extract relative path after /learn/<slug>/
                let relPath = '';
                if (result.url) {
                  const relMatch = result.url.match(/learn\/[\w-]+\/(.*)/);
                  if (relMatch) relPath = relMatch[1];
                }
                if (!relPath && result.filePath) {
                  const relMatch = result.filePath.match(/learn\/[\w-]+\/(.*)/);
                  if (relMatch) relPath = relMatch[1];
                }
                relPath = relPath.replace(/\.mdx$/, '') + '.mdx';
                actualPath = this.getCanonicalProductFilePath(slug, relPath);
                if (!actualPath) {
                  console.warn(`[DEBUG] Skipping file creation for ${result.url || result.filePath} (no mapping found)`);
                  continue;
                }
              } else {
                actualPath = await this.mapTurbopufferPathToGitHub(result.filePath);
              }
              
              console.log(`   📝 Updating file: ${actualPath}${isNewFile ? ' (new file)' : ''}`);
              await this.updateFile(
                actualPath,
                result.suggestedContent,
                branchName,
                `${isNewFile ? 'Create' : 'Update'} ${path.basename(actualPath)} based on issue #${this.issueNumber}`
              );
              
              filesUpdated.push(actualPath);
              
              // Update product YAML if this is a new file
              if (isNewFile) {
                const yamlUpdate = await this.updateProductYaml(actualPath, result.title, true);
                if (yamlUpdate) {
                  console.log(`   📝 Updating navigation: ${yamlUpdate.yamlPath}`);
                  await this.updateFile(
                    yamlUpdate.yamlPath,
                    yamlUpdate.updatedYaml,
                    branchName,
                    `Add ${result.title} page to navigation`
                  );
                  filesUpdated.push(yamlUpdate.yamlPath);
                }
              }
            } catch (error) {
              console.error(`   ⚠️  Could not update ${result.filePath}: ${error.message}`);
            }
          }
          
          // Create new changelog entry if requested
          if (context.changelogRequired && changelogEntry) {
            try {
              // Create a new changelog entry file instead of updating existing changelog
              const timestamp = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
              const changelogPath = `changelog-entries/${timestamp}-issue-${this.issueNumber}.md`;
              
              const changelogContent = `# Changelog Entry - Issue #${this.issueNumber}

**Date**: ${timestamp}
**Priority**: ${context.priority}
**Issue**: ${context.requestDescription}

## Entry

${changelogEntry}

## Files Updated

${filesUpdated.map(file => `- \`${file}\``).join('\n')}

---
*Generated by Fern Scribe for issue #${this.issueNumber}*
`;
              
              console.log(`   📋 Creating changelog entry: ${changelogPath}`);
              await this.updateFile(
                changelogPath,
                changelogContent,
                branchName,
                `Add changelog entry for issue #${this.issueNumber}`
              );
              
              filesUpdated.push(changelogPath);
            } catch (error) {
              console.error(`   ⚠️  Error creating changelog entry: ${error.message}`);
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