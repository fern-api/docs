const { Octokit } = require('@octokit/rest');
const fs = require('fs').promises;
const path = require('path');

class FernScribe {
  constructor() {
    this.octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });
    this.turbopufferEndpoint = process.env.TURBOPUFFER_ENDPOINT;
    this.turbopufferApiKey = process.env.TURBOPUFFER_API_KEY;
    this.anthropicApiKey = process.env.ANTHROPIC_API_KEY;
    
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

  async queryTurbopuffer(query, opts = {}) {
    if (!query || query.trimStart().length === 0) {
      return [];
    }

    try {
      // Create embedding for the query
      const embeddingResponse = await this.createEmbedding(query);
      if (!embeddingResponse) {
        console.error('Failed to create embedding for query');
        return [];
      }

      const requestBody = {
        query_embedding: embeddingResponse,
        top_k: opts.topK || 10,
        namespace: opts.namespace,
        ...(opts.documentIdsToIgnore && { document_ids_to_ignore: opts.documentIdsToIgnore }),
        ...(opts.urlsToIgnore && { urls_to_ignore: opts.urlsToIgnore })
      };

      const response = await fetch(this.turbopufferEndpoint, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.turbopufferApiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        throw new Error(`Turbopuffer API error: ${response.status}`);
      }

      const data = await response.json();
      return data.results || [];
    } catch (error) {
      console.error('Turbopuffer query failed:', error);
      return [];
    }
  }

  async createEmbedding(text) {
    try {
      // Using OpenAI's embedding model as fallback - you can switch this to your preferred embedding service
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
        throw new Error(`Embedding API error: ${response.status}`);
      }

      const data = await response.json();
      return data.data[0]?.embedding;
    } catch (error) {
      console.error('Embedding creation failed:', error);
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

## Fern Docs Structure Reference
${fernStructure}

## Current File Content
${existingContent}

## Instructions
Update this file to address the documentation request. Follow Fern documentation best practices and maintain consistency with the existing structure.

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

      // Query TurboBuffer for relevant files
      console.log('🔍 Querying TurboBuffer for relevant files...');
      const searchResultURLs = new Set();
      const searchResults = [];
      
      const turbopufferResults = await this.queryTurbopuffer(context.requestDescription, {
        namespace: process.env.TURBOPUFFER_NAMESPACE || 'default',
        topK: 3
      });

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
          currentDocument: result.attributes?.document || ''
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