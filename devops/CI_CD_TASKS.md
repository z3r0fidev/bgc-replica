# CI/CD Prerequisite Tasks

This task list covers the necessary setup on GitHub to enable the CI/CD pipelines defined in the implementation guide.

## 1. GitHub Repository Setup
- [x] **Create Repository:** Repository "bgc-replica" is created at `https://github.com/z3r0fidev/bgc-replica.git`.
- [x] **Verify Remote:** Ensure your local repository is linked to the GitHub remote:
  ```powershell
  git remote add origin https://github.com/z3r0fidev/bgc-replica.git
  git remote -v
  ```
- [x] **Push Initial Code:** Push the current branch to GitHub:
  ```powershell
  git push -u origin 007-production-readiness-secops
  ```

## 2. Configure Repository Secrets
*Navigate to your repository on GitHub, then go to **Settings > Secrets and variables > Actions**.*

- [x] **Add `DATABASE_URL`:**
    - Click **New repository secret**.
    - **Name:** `DATABASE_URL`
    - **Value:** `postgresql://postgres:password@localhost:5432/test_db`
- [x] **Add `NEXT_PUBLIC_SUPABASE_URL`:**
    - Click **New repository secret**.
    - **Name:** `NEXT_PUBLIC_SUPABASE_URL`
    - **Value:** [Your Supabase Project URL]
- [x] **Add `NEXT_PUBLIC_SUPABASE_ANON_KEY`:**
    - Click **New repository secret**.
    - **Name:** `NEXT_PUBLIC_SUPABASE_ANON_KEY`
    - **Value:** [Your Supabase Anon Key]

## 3. (Optional) Service Account / Token Setup
- [ ] **Add `CODECOV_TOKEN`:** (Optional) If using Codecov for coverage reports.
- [ ] **Add `DEPLOY_HOOK_URL`:** (Optional) If using manual deploy hooks for the backend.

## 4. Verify Branch Protection
- [x] **Enable Protection:** Go to **Settings > Branches > Add branch protection rule**. (Done via CLI)
- [x] **Set Rule for `main`:** 
    - [x] Check `Require status checks to pass before merging`.
    - [x] Search for and select `Backend CI` and `Frontend CI` (Note: Unified under 'quality-check' context).
