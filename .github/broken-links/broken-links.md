@devin-ai-integration Please fix the broken links detected by the scheduled link checker.

**Instructions:**
1. For each URL listed below, identify the source file containing the broken link
2. Try to find the correct replacement URL. Common fixes include:
   - Updating outdated commit SHAs to the latest commit
   - Fixing URL-encoded paths
   - Updating renamed file paths
3. **IMPORTANT: If you cannot confidently find a correct replacement** (e.g., the only signal is a 5xx/503 error, connection reset, or rate limiting), **do NOT remove or modify the link**. Instead, leave it unchanged and add a PR comment on the relevant line asking for manual validation.
4. Only update links/paths contained in this PR, not other links that follow a similar pattern
5. Run `fern docs dev` locally to verify your changes don't break anything
6. Push your fix to this PR branch
7. After CI posts a preview link, use it to verify that your changes actually fix the underlying issue, then post a comment to the PR mentioning that you have tested it using the preview link
8. When the PR is ready for review, request a review from @davidkonigsberg in GitHub and send a message in the Devin session that includes "<!here>" to alert everyone in the channel. 
9. Delete the scaffold file (.github/broken-links/broken-links.md) as part of your fix

**Broken Links:**


## Non-429 Broken Links

- [404] https://buildwithfern.com/learn/zh/cli-generator/get-started/overview
- [404] https://buildwithfern.com/learn/zh/docs/preview-publish/multi-source-docs
- [404] https://buildwithfern.com/learn/zh/docs/seo/robots-txt

---
[View workflow run](https://github.com/fern-api/docs/actions/runs/25729569649)
