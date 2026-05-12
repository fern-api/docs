# Fern documentation

Source for Fern's documentation site at [buildwithfern.com/learn](https://buildwithfern.com/learn).

## Quickstart

Prerequisites:
- [Node.js](https://nodejs.org/) 22 or higher
- [npm](https://www.npmjs.com/) 10 or higher (included with Node.js 22)

Run the docs locally:

```bash
npm install -g fern-api
git clone https://github.com/fern-api/docs.git
cd docs
fern docs dev
```

Open [http://localhost:3000](http://localhost:3000). The dev server reloads on save.

Every PR generates a preview link so you can verify your changes in production-like rendering. See [this PR](https://github.com/fern-api/docs/pull/1784) for an example.

## Contributing

### Writing tips

- **Write for the reader's task.** Explain the use case, then show how to do it. Skip marketing language.
- **Be clear and concise.** Use [active voice](https://developers.google.com/style/voice), short sentences, and a friendly tone. Avoid jargon.
- **Avoid time-relative phrasing** like "currently" or "newest" — it goes stale fast.
- **Match existing pages** when editing. Mirror the heading structure, tone, and depth.
- **Use [Fern's components](https://buildwithfern.com/learn/docs/writing-content/components/overview)** instead of plain Markdown where one fits.
- **Use [Mermaid diagrams](https://buildwithfern.com/learn/docs/writing-content/markdown-media#diagrams)** to illustrate workflows.
- **Use [sentence case](https://developers.google.com/style/capitalization)** for headings.

Our style is influenced by [Google's](https://developers.google.com/style) and [Microsoft's](https://learn.microsoft.com/en-us/style-guide/welcome/) developer documentation style guides.

### Style checking with Vale

[Vale](https://vale.sh/docs) runs on PRs that touch `.mdx` files and posts non-blocking style suggestions. The [config](https://github.com/fern-api/docs/blob/main/.vale.ini) extends the [Microsoft style guide](https://github.com/errata-ai/Microsoft) with Fern-specific rules.

<details>
<summary>Style guidelines enforced by Vale</summary>

**Language and tone**
- Avoid unnecessary adverbs (very, really, extremely)
- Don't use "please" in technical documentation
- Use first person (I, me) sparingly
- Avoid first-person plural (we, our, let's)
- Write in an objective, instructional tone

**Time-relative language**
- Avoid terms that go stale: currently, presently, now, future, soon, latest, upcoming, old

**Headings**
- Use sentence-case capitalization
- No end punctuation

**Acronyms**
- Define acronyms on first use unless they're in the exceptions list (API, SDK, CLI, HTTP, JSON, etc.)
- Format: "Application Programming Interface (API)"

**Terminology**
- "Fern Editor" (not "Visual Editor")
- "API Reference" and "API Explorer" (capitalized)

**Formatting**
- Don't hyphenate adverbs ending in -ly (e.g., "quickly moving", not "quickly-moving")
</details>

<details>
<summary>Run Vale locally</summary>

Run Vale on every commit:

1. Install pre-commit: `brew install pre-commit`
2. Install the hook: `pre-commit install`
</details>

### Getting changes reviewed

- **New pages or large structural changes:** [File an issue](https://github.com/fern-api/docs/issues) and assign [@devalog](https://github.com/devalog) so we can confirm fit before you invest time.
- **Everything else:** Open a PR. A Fern docs maintainer will review.

Found something wrong or out of date that you can't fix? [File an issue](https://github.com/fern-api/docs/issues) or ping [@devalog](https://github.com/devalog).
