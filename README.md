# Fern documentation

Welcome to the Fern documentation! This repository contains the source code for Fern's comprehensive documentation site, currently live at [buildwithfern.com/learn](https://buildwithfern.com/learn).

## Quickstart 🚀 

### Prerequisites

Before you begin, make sure you have the following installed:
- [Node.js](https://nodejs.org/) (version 16 or higher)
- [npm](https://www.npmjs.com/) (comes with Node.js)

### Installation

1. **Install the Fern CLI globally:**
   ```bash
   npm install -g fern-api
   ```

2. **Clone this repository:**
   ```bash
   git clone https://github.com/fern-api/docs.git
   cd docs
   ```

### Editing documentation

To run the documentation site locally:

1. **Start the development server:**
   ```bash
   fern docs dev
   ```

2. **Open your browser and navigate to:**
   ```
   http://localhost:3000
   ```

The development server will automatically reload when you make changes to the documentation files.

Finally, when you make a PR to update the docs, a PR preview link will be generated which will allow you
to test if your changes came out as intended. [Here](https://github.com/fern-api/docs/pull/1784) is a sample PR with a preview link.

## Contribution guide

Thanks for contributing to Fern's documentation!

### Writing tips

Keep the following principles in mind:

- **Write for your audience** - Consider why users are reading your documentation and explain the use case clearly. Focus on clarity and completeness without being verbose. Add examples and code snippets when relevant.
- **Help users get something done**. Don't try to sell users on the product, and avoid marketing language like "amazing features" or "the best solution."
- **Avoid time-specific language**. Don't mention a product or feature was just released or is the newest form, as this will quickly lead to stale documentation.
- **Write in clear, concise language**, using [active voice](https://developers.google.com/style/voice) whenever possible. Keep sentences and paragraphs short and to the point. Use a conversational and friendly tone. Stay away from jargon as much as you can.
- **Use [Fern’s documentation components](https://buildwithfern.com/learn/docs/writing-content/components/overview)** whenever you can.
- **When editing an existing page** - Match the existing heading structure, tone, and level of detail to ensure your changes integrate as seamlessly as possible.
- **Use diagrams when it makes sense** – Show, don't tell! Use [Mermaid](https://buildwithfern.com/learn/docs/writing-content/markdown-media#diagrams), a Markdown-like diagramming syntax, to illustrate a workflow. 
- [**Use sentence case**](https://developers.google.com/style/capitalization) for page and section headings. 

> "Break any of these rules sooner than say anything outright barbarous."
> 
> —George Orwell, "Politics and the English Language"

Our style guide is influenced by [Google's developer documentation style guide](https://developers.google.com/style) and Microsoft's [writing style guide](https://learn.microsoft.com/en-us/style-guide/welcome/).

### Style checking with Vale

We use [Vale](https://vale.sh/docs) to check contributions for grammar, style consistency, and adherence to our writing guidelines. Our [Vale configuration](https://github.com/fern-api/docs/blob/main/.vale.ini) uses the [Microsoft style guide](https://github.com/errata-ai/Microsoft) plus custom rules for Fern's style and terminology.

Vale runs automatically on PRs that modify `.mdx` files and comments with style suggestions (non-blocking).

<details>
<summary>Style guidelines enforced by Vale</summary>

The Vale linter enforces the following style guidelines:

**Language and tone**
- Avoid unnecessary adverbs (very, really, extremely, etc.) that don't add meaning
- Don't use "please" in technical documentation
- Use first person (I, me) sparingly
- Avoid first-person plural (we, our, let's)
- Write in an objective, instructional tone

**Time-relative language**
- Avoid terms that become outdated: currently, presently, now, future, soon, latest, upcoming, old
- Write documentation that remains accurate over time

**Headings**
- Use sentence-case capitalization (capitalize only the first word and proper nouns)
- Don't use end punctuation (periods, question marks, exclamation points)

**Acronyms**
- Define acronyms on first use unless they're in the exceptions list (common technical acronyms like API, SDK, CLI, HTTP, JSON, etc.)
- Format: "Application Programming Interface (API)"

**Terminology**
- Use "Fern Editor" instead of "Visual Editor"
- Use "API Reference" (capitalized) consistently
- Use "API Explorer" (capitalized) consistently

**Formatting**
- Don't hyphenate adverbs ending in -ly (e.g., "quickly moving" not "quickly-moving")
</details>

<details>
<summary>Use Vale locally</summary>
To catch issues earlier in your workflow, set up Vale to run automatically on your machine when you commit:

1. Install pre-commit: `brew install pre-commit`
2. Install the hook: `pre-commit install`
</details>

### Getting changes reviewed

If you want to **add a new page or make a large structural change**:
- [File an issue in GitHub](https://github.com/fern-api/docs/issues) and assign [@devalog](https://github.com/devalog). We'll review your issue to make sure your proposed page fits with Fern's overall documentation strategy and isn't duplicating any ongoing work. 

For **all other changes**:
-  Submit a PR directly with your suggested changes. A Fern docs member will review and confirm.

If you see something that is wrong or outdated in the documentation but don't know how to fix it, [file an issue](https://github.com/fern-api/docs/issues) or reach out to [@devalog](https://github.com/devalog).
