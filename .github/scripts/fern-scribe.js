const { Octokit } = require('@octokit/rest');
const fs = require('fs').promises;
const path = require('path');

class FernScribe {
  constructor() {
    this.octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });
    this.turbopufferEndpoint = process.env.TURBOPUFFER_ENDPOINT;
    this.turbopufferApiKey = process.env.TURBOPUFFER_API_KEY;
    this.anthropicApiKey = process.env.ANTHROPIC_API_KEY;
    this.slackToken = process.env.SLACK_USER_TOKEN;
    
    this.owner = process.env.REPOSITORY.split('/')[0];
    this.repo = process.env.REPOSITORY.split('/')[1];
    this.issueNumber = process.env.ISSUE_NUMBER;
    this.issueBody = process.env.ISSUE_BODY;
    this.issueTitle = process.env.ISSUE_TITLE;
    
    this.systemPrompt = null;
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
    
    sections.forEach(section => {
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
        parsed.changelogRequired = content.includes('Yes, include changelog');
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
      console.log('Could not parse Slack URL:', slackUrl);
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
      console.log(`📱 Fetched Slack thread with ${messages.length} messages and extracted file content`);
      return fullThreadContent;

    } catch (error) {
      console.error('Failed to fetch Slack thread:', error);
      return '';
    }
  }

  async queryTurbopuffer(query, opts = {}) {
    if (!query || query.trimStart().length === 0) {
      console.log('🔧 Empty query provided to Turbopuffer');
      return [];
    }

    try {
      console.log('🔧 Querying Turbopuffer with options:', JSON.stringify(opts, null, 2));
      
      // Create embedding for the query
      const embeddingResponse = await this.createEmbedding(query);
      if (!embeddingResponse) {
        console.error('🔧 Failed to create embedding for query');
        return [];
      }

      const requestBody = {
        query_embedding: embeddingResponse,
        top_k: opts.topK || 10,
        namespace: opts.namespace,
        ...(opts.documentIdsToIgnore && { document_ids_to_ignore: opts.documentIdsToIgnore }),
        ...(opts.urlsToIgnore && { urls_to_ignore: opts.urlsToIgnore })
      };

      console.log('🔧 Turbopuffer request body (without embedding):', {
        ...requestBody,
        query_embedding: `[${embeddingResponse.length} dimensions]`
      });

      const response = await fetch(this.turbopufferEndpoint, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.turbopufferApiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('🔧 Turbopuffer API error details:', errorText);
        throw new Error(`Turbopuffer API error: ${response.status}`);
      }

      const data = await response.json();
      console.log('🔧 Turbopuffer response structure:', Object.keys(data));
      console.log('🔧 Turbopuffer results count:', data.results?.length || 0);
      
      return data.results || [];
    } catch (error) {
      console.error('🔧 Turbopuffer query failed:', error);
      return [];
    }
  }

  async createEmbedding(text) {
    try {
      console.log('🔧 Creating embedding for text of length:', text.length);
      
      // Using OpenAI's embedding model
      const response = await fetch('https://api.openai.com/v1/embeddings', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'text-embedding-3-small',
          input: text
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('🔧 Embedding API error details:', errorText);
        throw new Error(`Embedding API error: ${response.status}`);
      }

      const data = await response.json();
      console.log('🔧 Embedding created successfully, dimensions:', data.data[0]?.embedding?.length);
      return data.data[0]?.embedding;
    } catch (error) {
      console.error('🔧 Embedding creation failed:', error);
      return null;
    }
  }

  async getFernDocsStructure() {
    try {
      const response = await fetch('https://buildwithfern.com/learn/llms.txt');
      return await response.text();
    } catch (error) {
      console.error('Failed to fetch Fern docs structure:', error);
      return '';
    }
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

Provide the complete updated file content:`;

    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'x-api-key': this.anthropicApiKey,
          'Content-Type': 'application/json',
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
    if (!context.changelogRequired) return null;

    const prompt = `Generate a changelog entry for the following documentation update:

Request: ${context.requestDescription}
Priority: ${context.priority}
Additional Context: ${context.additionalContext}

Format as a standard changelog entry with appropriate category (Added, Changed, Fixed, etc.) and concise description.`;

    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'x-api-key': this.anthropicApiKey,
          'Content-Type': 'application/json',
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: 'claude-3-5-sonnet-20241022',
          max_tokens: 200,
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
      return data.content[0]?.text || null;
    } catch (error) {
      console.error('Changelog generation failed:', error);
      return null;
    }
  }

  async getCurrentFileContent(filePath) {
    try {
      const { data } = await this.octokit.rest.repos.getContent({
        owner: this.owner,
        repo: this.repo,
        path: filePath
      });

      return Buffer.from(data.content, 'base64').toString('utf-8');
    } catch (error) {
      if (error.status === 404) {
        return ''; // File doesn't exist, will be created
      }
      throw error;
    }
  }

  async createBranch(branchName) {
    try {
      const { data: mainBranch } = await this.octokit.rest.repos.getBranch({
        owner: this.owner,
        repo: this.repo,
        branch: 'main'
      });

      await this.octokit.rest.git.createRef({
        owner: this.owner,
        repo: this.repo,
        ref: `refs/heads/${branchName}`,
        sha: mainBranch.commit.sha
      });
    } catch (error) {
      if (error.status !== 422) { // Branch might already exist
        throw error;
      }
    }
  }

  async updateFile(filePath, content, branchName, commitMessage) {
    try {
      let sha;
      try {
        const { data } = await this.octokit.rest.repos.getContent({
          owner: this.owner,
          repo: this.repo,
          path: filePath,
          ref: branchName
        });
        sha = data.sha;
      } catch (error) {
        // File doesn't exist, will be created
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
    } catch (error) {
      console.error(`Failed to update ${filePath}:`, error);
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
      
      console.log('🌿 Fern Scribe starting...');
      
      const context = this.parseIssueBody(this.issueBody);
      console.log('📝 Parsed issue context:', context);

      // Fetch Slack thread if URL provided
      let slackThreadContent = '';
      if (context.slackThread) {
        console.log('📱 Fetching Slack thread content...');
        slackThreadContent = await this.fetchSlackThread(context.slackThread);
        console.log('📱 Slack thread content length:', slackThreadContent.length);
        console.log('📱 Full Slack thread content:');
        console.log('--- SLACK THREAD START ---');
        console.log(slackThreadContent);
        console.log('--- SLACK THREAD END ---');
      }

      // Create enhanced query text that includes both request description and Slack context
      const enhancedQuery = [
        context.requestDescription,
        slackThreadContent ? `\n\nSlack Discussion Context:\n${slackThreadContent}` : '',
        context.additionalContext ? `\n\nAdditional Context:\n${context.additionalContext}` : ''
      ].filter(Boolean).join('\n');

      // Debug logging
      console.log('🔍 Enhanced query length:', enhancedQuery.length);
      console.log('🔍 Full enhanced query:');
      console.log('--- ENHANCED QUERY START ---');
      console.log(enhancedQuery);
      console.log('--- ENHANCED QUERY END ---');
      console.log('🔍 Namespace:', process.env.TURBOPUFFER_NAMESPACE || 'default');

      // Query TurboBuffer for relevant files
      console.log('🔍 Querying TurboBuffer for relevant files...');
      const searchResultURLs = new Set();
      const searchResults = [];
      
      const turbopufferResults = await this.queryTurbopuffer(enhancedQuery, {
        namespace: process.env.TURBOPUFFER_NAMESPACE || 'default',
        topK: 3
      });

      console.log('🔍 Turbopuffer results count:', turbopufferResults.length);
      if (turbopufferResults.length > 0) {
        console.log('🔍 First result preview:', JSON.stringify(turbopufferResults[0], null, 2));
      }

      // Deduplicate results by URL (following the original logic)
      for (const result of turbopufferResults) {
        const url = result.attributes?.url || 
                   `https://${result.attributes?.domain}${result.attributes?.pathname}${result.attributes?.hash || ''}`;
        
        if (result.attributes?.url) {
          if (!searchResultURLs.has(result.attributes.url)) {
            searchResultURLs.add(result.attributes.url);
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

      console.log(`📁 Found ${searchResults.length} relevant files`);

      // Get Fern docs structure
      const fernStructure = await this.getFernDocsStructure();

      // Create branch
      const branchName = `fern-scribe/issue-${this.issueNumber}`;
      await this.createBranch(branchName);
      console.log(`🌱 Created branch: ${branchName}`);

      const filesUpdated = [];

      // Process each relevant file
      for (const result of searchResults) {
        const filePath = result.attributes?.pathname || result.path;
        if (!filePath) continue;

        console.log(`📄 Processing: ${filePath}`);
        
        const currentContent = await this.getCurrentFileContent(filePath);
        const contextWithDocument = {
          ...context,
          currentDocument: result.attributes?.document || '',
          slackThreadContent
        };
        
        const updatedContent = await this.generateContent(filePath, currentContent, contextWithDocument, fernStructure);
        
        if (updatedContent && updatedContent !== currentContent) {
          await this.updateFile(
            filePath, 
            updatedContent, 
            branchName, 
            `docs: update ${filePath} via Fern Scribe`
          );
          filesUpdated.push(filePath);
        }
      }

      // Generate changelog if requested
      if (context.changelogRequired) {
        const changelogEntry = await this.generateChangelogEntry(context);
        if (changelogEntry) {
          const changelogPath = 'CHANGELOG.md';
          const currentChangelog = await this.getCurrentFileContent(changelogPath);
          const updatedChangelog = this.addChangelogEntry(currentChangelog, changelogEntry);
          
          await this.updateFile(
            changelogPath,
            updatedChangelog,
            branchName,
            'docs: add changelog entry via Fern Scribe'
          );
          filesUpdated.push(changelogPath);
        }
      }

      // Create PR
      const pr = await this.createPullRequest(branchName, context, filesUpdated);
      
      if (pr) {
        console.log(`✅ Created PR: ${pr.html_url}`);
        
        // Comment on issue with PR link
        await this.octokit.rest.issues.createComment({
          owner: this.owner,
          repo: this.repo,
          issue_number: this.issueNumber,
          body: `🌿 **Fern Scribe has completed your request!**\n\nI've created a draft PR with the documentation updates: ${pr.html_url}\n\nFiles updated:\n${filesUpdated.map(file => `- \`${file}\``).join('\n')}\n\nPlease review the changes and merge when ready.`
        });
      }

    } catch (error) {
      console.error('❌ Fern Scribe failed:', error);
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
const fernScribe = new FernScribe();
fernScribe.run().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});