# Fern documentation

The source for Fern's documentation, published at [buildwithfern.com/learn](https://buildwithfern.com/learn).

## Quickstart

### Prerequisites

- [Node.js](https://nodejs.org/) 22 or higher (includes [npm](https://www.npmjs.com/) 10+)

### Run the docs locally

1. Install the Fern CLI:
   ```bash
   npm install -g fern-api
   ```
2. Clone this repo and start the dev server:
   ```bash
   git clone https://github.com/fern-api/docs.git
   cd docs
   fern docs dev
   ```
3. Open [http://localhost:3000](http://localhost:3000). The server reloads on save.

Every PR also gets a preview link so you can verify your changes before merge ([example](https://github.com/fern-api/docs/pull/1784)).

## Contribution guide

Thanks for contributing!

### Writing tips

- **Write for your audience.** Explain the use case, focus on clarity, and add examples or code snippets where they help.
- **Help users get something done.** Skip marketing language like "amazing features" or "the best solution."
- **Avoid time-specific language** ("just released", "newest"). It ages badly.
- **Use clear, concise [active voice](https://developers.google.com/style/voice).** Short sentences, friendly tone, minimal jargon.
- **Use [Fern's documentation components](https://buildwithfern.com/learn/docs/writing-content/components/overview)** wherever you can.
- **When editing an existing page,** match its heading structure, tone, and level of detail.
- **Show, don't tell.** Use [Mermaid](https://buildwithfern.com/learn/docs/writing-content/markdown-media#diagrams) diagrams to illustrate workflows.
- **Use [sentence case](https://developers.google.com/style/capitalization)** for headings.

Our style is influenced by [Google's developer documentation style guide](https://developers.google.com/style) and [Microsoft's writing style guide](https://learn.microsoft.com/en-us/style-guide/welcome/).

> "Break any of these rules sooner than say anything outright barbarous."
>
> —George Orwell, "Politics and the English Language"

### Style checking with Vale

We use [Vale](https://vale.sh/docs) to check `.mdx` files for grammar and style. Our [config](https://github.com/fern-api/docs/blob/main/.vale.ini) extends the [Microsoft style guide](https://github.com/errata-ai/Microsoft) with Fern-specific rules. Vale runs automatically on PRs (non-blocking).

<details>
<summary>Style guidelines enforced by Vale</summary>

**Language and tone**
- Avoid unnecessary adverbs (very, really, extremely)
- Don't use "please"
- Use first person (I, me) sparingly; avoid "we", "our", "let's"
- Write in an objective, instructional tone

**Time-relative language**
- Avoid terms that age: currently, presently, now, future, soon, latest, upcoming, old

**Headings**
- Sentence case (capitalize only the first word and proper nouns)
- No end punctuation

**Acronyms**
- Define on first use, e.g., "Application Programming Interface (API)". Common acronyms like API, SDK, CLI, HTTP, and JSON are exempt.

**Terminology**
- Use "Fern Editor" (not "Visual Editor")
- Use "API Reference" and "API Explorer" — capitalized

**Formatting**
- Don't hyphenate adverbs ending in -ly (e.g., "quickly moving")
</details>

<details>
<summary>Run Vale locally</summary>

Catch issues before you commit:

1. Install pre-commit: `brew install pre-commit`
2. Install the hook: `pre-commit install`
</details>

### Getting changes reviewed

- **New page or large structural change:** [file an issue](https://github.com/fern-api/docs/issues) and assign [@devalog](https://github.com/devalog) so we can confirm it fits the docs strategy.
- **All other changes:** open a PR directly — a Fern docs member will review.

Spotted something wrong but don't know how to fix it? [File an issue](https://github.com/fern-api/docs/issues) or reach out to [@devalog](https://github.com/devalog).
