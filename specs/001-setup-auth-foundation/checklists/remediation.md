# Remediation Checklist: Setup Auth & Foundation Analysis

**Purpose**: Address gaps identified during `/speckit.analyze` before implementation.
**Source**: Analysis Report (C1, C2, C3)

## Tasks to Add/Update

- [x] **Account Linking Verification (C1)**
  - **Action**: Add task to Phase 6 (Polish) or Phase 4 (Auth) to explicitly verify account linking behavior.
  - **Draft Task**: `- [ ] T038 [US2] Verify account linking behavior: Create account with Email A, then Login with Google (Email A). System should link or handle gracefully.`

- [x] **Performance Verification (C2)**
  - **Action**: Add explicit check for login speed in Phase 6.
  - **Draft Task**: `- [ ] T039 Measure login performance (time to dashboard) on 4G network simulation to ensure < 5s target (SC-003).`

- [x] **Edge Case Handling (C3)**
  - **Action**: Update descriptions for T032/T033 to include fallback logic.
  - **Note**: This can be handled during implementation of T032/T033 by the developer, but explicit task notes help.
  - **Draft Update**: Modify T033 description: `Update Login Page to offer "Sign in with Passkey" option (conditionally rendered/disabled if unsupported) in src/app/(auth)/login/page.tsx`

## Instructions
Review these items. If approved, manually append/edit `specs/001-setup-auth-foundation/tasks.md` or instruct the agent to do so.