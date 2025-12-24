# Deployment Hook Task List

This task list tracks the configuration of the optional `DEPLOY_HOOK_URL` for backend automation.

## 1. Provider Selection
- [x] **Choose Provider:** Identify where the backend is hosted (Render, Railway, Custom).
    *   *Selected:* **Railway** (Using Railway CLI Action as recommended).

## 2. Obtain Railway Token
- [ ] **Railway:** Go to Settings > Tokens. Generate/Copy Token.

## 3. Configure GitHub Secret
- [ ] **Navigate:** Repo Settings > Secrets and variables > Actions.
- [ ] **Add Secret:** Name: `RAILWAY_TOKEN`, Value: `[Your-Token]`.

## 4. Verification
- [ ] **Workflow Verification:** Push to `main` or manually trigger the `Deploy Backend` workflow.
- [ ] **Check Logs:** Verify the "Deploy" step in GitHub Actions logs shows successful execution.
- [ ] **Check Dashboard:** Confirm a new deployment appears in the Railway dashboard.
