# Implementation Plan - Implement Deploy Hook Guide Tasks

## Technical Context

- **Feature**: Configure Backend Deployment Hook using Railway CLI
- **Source**: `specs/009-deploy-hook-guide/spec.md`
- **Dependencies**:
  - GitHub Actions
  - Docker Image: `ghcr.io/railwayapp/cli:latest`
  - GitHub Secret: `RAILWAY_TOKEN`
- **Integrations**:
  - Railway Platform (Target for deployment)
  - GitHub Repository (Source of code and workflow trigger)

## Constitution Check

- **Test-First**: We will define verification steps. While we cannot "unit test" the external deployment easily without mocking, we will include a "Manual Verification" task as per the User Story 2.
- **Simplicity**: We are using the official Docker image (`ghcr.io/railwayapp/cli`) which is the recommended and simplest path, avoiding manual installation steps.
- **Security**: The `RAILWAY_TOKEN` will be strictly handled as a GitHub Secret, never hardcoded.

## Phase 0: Outline & Research

### 1. Research: Railway CLI in GitHub Actions
- **Goal**: Identify the correct syntax for using Railway CLI in GHA.
- **Findings**:
  - **Method**: Use `container: ghcr.io/railwayapp/cli:latest` in the job definition.
  - **Command**: `railway up` (or `railway up --service=$SVC_ID` if needed).
  - **Auth**: Pass `RAILWAY_TOKEN` as an environment variable.
  - **Reference**: Official Railway docs and GitHub Container Registry usage.
- **Decision**: Adopt the container-based approach for the workflow.

## Phase 1: Design & Contracts

### 1. Data Model
*No new database entities required.*

### 2. API Contracts
*No new API endpoints required.*

### 3. Workflow Design
**File**: `.github/workflows/deploy.yml` (or update existing `backend-ci.yml` if we want to deploy after CI).

**Structure**:
```yaml
name: Deploy Backend

on:
  push:
    branches:
      - main
  workflow_dispatch:

jobs:
  deploy:
    runs-on: ubuntu-latest
    needs: [quality-check] # Ensure CI passes first if separate, or include steps here
    container: ghcr.io/railwayapp/cli:latest
    env:
      RAILWAY_TOKEN: ${{ secrets.RAILWAY_TOKEN }}
    steps:
      - uses: actions/checkout@v4
      - name: Deploy
        run: railway up
```

## Phase 2: Implementation Tasks

### 1. Configuration
- [ ] **Task**: Create/Update GitHub Workflow
  - **File**: `.github/workflows/deploy-backend.yml`
  - **Content**: Implement the YAML structure defined in Phase 1.
  - **Dependency**: Needs `RAILWAY_TOKEN` secret to work (Prerequisite check).

### 2. Documentation
- [ ] **Task**: Update `devops/DEPLOY_HOOK_GUIDE.md`
  - **Action**: Refine the guide to reflect the "Railway CLI via Docker" method instead of the generic "curl" method for Railway.
- [ ] **Task**: Update `devops/DEPLOY_HOOK_TASKS.md`
  - **Action**: Update tasks to reflect the CLI-based implementation steps.

### 3. Verification
- [ ] **Task**: Verify Deployment
  - **Action**: Trigger the workflow (manually or via push) and confirm success in GitHub Actions logs and Railway Dashboard.