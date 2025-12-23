# CI/CD Solution Research & Comparison

**Date:** December 23, 2025
**Project Context:** BGC Replica (Next.js Frontend, FastAPI Backend, PostgreSQL/Supabase, Monorepo structure)

## Executive Summary
After analyzing the top 5 CI/CD solutions against the project's requirements, **GitHub Actions** has been selected as the optimal choice. Its deep integration with the source code repository, extensive marketplace for standardized actions (setup-node, setup-python), and native support for monorepo path filtering make it the most efficient and maintainable solution for this project.

---

## Top 5 Solutions Analyzed

### 1. GitHub Actions
**Type:** Fully Integrated SaaS (Native to GitHub)
*   **Pros:**
    *   **Monorepo Support:** Excellent `paths` filtering to trigger workflows only when relevant files change (e.g., only run Backend CI if `backend/` changes).
    *   **Ecosystem:** Massive marketplace of pre-built actions for Node, Python, Docker, Playwright, and Cloud providers.
    *   **Simplicity:** No external account setup required; configuration lives right next to the code in `.github/workflows`.
    *   **Pricing:** Generous free tier for public/private repositories.
*   **Cons:**
    *   **Local Testing:** Debugging workflows locally can be tricky (requires third-party tools like `act`).
    *   **Complexity:** Large YAML files can become difficult to manage without "Composite Actions".

### 2. GitLab CI/CD
**Type:** Fully Integrated SaaS/Self-Hosted (Native to GitLab)
*   **Pros:**
    *   **Visualization:** Best-in-class pipeline visualization and dependency management.
    *   **Container Registry:** deeply integrated Docker registry.
    *   **Auto DevOps:** Heuristic-based auto-configuration.
*   **Cons:**
    *   **Ecosystem:** Requires migration to GitLab for full benefits. Using it with a GitHub repo is possible (Mirroring) but adds friction/latency.
    *   **YAML Syntax:** Can be more verbose than GitHub Actions for simple tasks.

### 3. CircleCI
**Type:** Specialized CI/CD SaaS
*   **Pros:**
    *   **Performance:** Known for speed, advanced caching, and easy parallelism/sharding.
    *   **Debugging:** "SSH into build" feature is a standout for fixing broken pipelines.
*   **Cons:**
    *   **Separation:** Separate dashboard and account management.
    *   **Cost:** Pricing ramps up quickly for parallel jobs compared to GitHub Actions' included minutes.
    *   **Config:** Configuration syntax is distinct and requires learning specific CircleCI orbs.

### 4. Jenkins
**Type:** Self-Hosted Open Source
*   **Pros:**
    *   **Flexibility:** Can do literally anything; infinite plugin ecosystem.
    *   **Control:** Total control over the build environment and data.
*   **Cons:**
    *   **Maintenance:** Requires managing your own build server/infrastructure. High "OpEx".
    *   **Complexity:** "Plugin Hell" (dependencies breaking) and Groovy scripting for pipelines have a steep learning curve.
    *   **Fit:** Overkill for a modern cloud-native web app; legacy feel.

### 5. Azure DevOps (Pipelines)
**Type:** Enterprise SaaS/Server
*   **Pros:**
    *   **Enterprise:** Strong integration with Active Directory and Project Management boards.
    *   **Environments:** Excellent release management and gate approval flows.
*   **Cons:**
    *   **UX:** UI can be cluttered and complex for smaller teams.
    *   **Speed:** Sometimes slower startup times for hosted agents compared to CircleCI/GitHub.

---

## Detailed Analysis of the Winner: GitHub Actions

For the **BGC Replica** project, GitHub Actions is the clear winner for the following reasons:

1.  **Tech Stack Alignment:**
    *   **Next.js:** Vercel (the likely host) has zero-config deployments, but for CI (lint/test), GitHub Actions integrates seamlessly.
    *   **FastAPI:** Setting up Python, installing `pip` dependencies, and running `pytest` is trivial with `actions/setup-python`.
    *   **Playwright:** GitHub Actions has a dedicated mechanism for handling Playwright browsers and reporting.

2.  **Monorepo Handling:**
    Since the project has `frontend/` and `backend/` in one repo, GitHub Actions' ability to filter triggers is crucial:
    ```yaml
    on:
      push:
        paths:
          - 'backend/**' # Only run backend CI on backend changes
    ```

3.  **Cost & Maintenance:**
    No new infrastructure to manage (unlike Jenkins) and no new billing/accounts to set up (unlike CircleCI). It "just works" with the existing repository.

## Comparison Matrix

| Feature | GitHub Actions | GitLab CI | CircleCI | Jenkins | Azure DevOps |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Setup Ease** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐ | ⭐⭐⭐ |
| **Monorepo** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐ |
| **Maintenance** | Low | Low | Low | High | Medium |
| **Cost (Sm/Med)**| Free/Low | Free/Low | Medium | Server Cost | Medium |
| **Python/JS** | Native | Native | Native | Plugin | Native |

## Conclusion
We will proceed with **GitHub Actions**. The implementation will focus on three core workflows:
1.  **Backend CI:** Linting (Ruff), Type Check (Mypy), and Testing (Pytest) on Python 3.12+.
2.  **Frontend CI:** Linting (ESLint), Type Check (TSC), and Unit Testing (Vitest).
3.  **E2E Validation:** Running Playwright tests against a preview environment or local build.
