# Feature Specification: Setup Auth & Foundation

**Feature Branch**: `001-setup-auth-foundation`
**Created**: 2025-12-20
**Status**: Draft
**Input**: Initialize the BGCLive Replica project as a mobile-first Progressive Web App (PWA) using the T3 stack... Implement premium UI with shadcn/ui... Secure authentication...

## User Scenarios & Testing

### User Story 1 - Application Access & Installation (Priority: P1)

As a mobile user, I want to access the application and install it on my home screen so that I can access it easily like a native app.

**Why this priority**: Foundations for "mobile-first" experience and PWA requirement.

**Independent Test**: Can be tested by visiting the URL on a mobile device and verifying the "Add to Home Screen" prompt/functionality works and the app launches in standalone mode.

**Acceptance Scenarios**:

1. **Given** a user visits the site on a mobile browser, **When** they check browser options, **Then** they see an option to install/add to home screen.
2. **Given** the app is installed, **When** opened, **Then** it launches without browser chrome (standalone mode) and shows a splash screen/logo.
3. **Given** a visitor, **When** they load the landing page, **Then** they see a responsive layout using shadcn/ui components (e.g., Hero section).

---

### User Story 2 - User Registration & Login (Priority: P1)

As a new user, I want to create an account using my email or Google account so that I can access the platform.

**Why this priority**: Core requirement for all social features.

**Independent Test**: Can be tested by completing the signup flow and verifying a session is created.

**Acceptance Scenarios**:

1. **Given** a guest on the login page, **When** they choose "Sign in with Google", **Then** they are redirected to Google, authenticated, and returned to the app as a logged-in user.
2. **Given** a guest, **When** they enter a valid email/password and click Sign Up, **Then** an account is created and they are logged in.
3. **Given** a logged-in user, **When** they close and reopen the browser, **Then** their session persists (they remain logged in).

---

### User Story 3 - Biometric/Passkey Login (Priority: P2)

As a returning mobile user, I want to log in using FaceID or TouchID (Passkeys) so that I don't have to type my password every time.

**Why this priority**: "Modern Twist" requirement for enhanced mobile UX.

**Independent Test**: Can be tested on a supported device by registering a passkey and using it for subsequent logins.

**Acceptance Scenarios**:

1. **Given** a logged-in user, **When** they navigate to security settings, **Then** they can register a Passkey for their device.
2. **Given** a user with a registered Passkey, **When** they attempt to log in, **Then** they are prompted to use their device's biometric auth instead of a password.

### Edge Cases

- **Offline Install**: What happens if the user tries to install the PWA while offline? (Should still prompt if manifest cached, or fail gracefully).
- **Biometric Failure**: What happens if FaceID/TouchID fails or is denied? (System MUST fall back to password/magic link login).
- **Duplicate Account**: What happens if a user tries to sign up with Google using an email that already exists via Password? (System MUST link the accounts or prompt for login to link).
- **Unsupported Device**: What happens if a user tries to use Passkeys on a device that doesn't support them? (Option should be hidden or disabled with explanation).

## Requirements

### Functional Requirements

- **FR-001**: System MUST be initialized with a Next.js frontend (React, TypeScript, Tailwind CSS, shadcn/ui) and FastAPI backend (Python, SQLAlchemy, PostgreSQL).
- **FR-002**: System MUST utilize `shadcn/ui` with Framer Motion for premium component library (buttons, inputs, dialogs, etc.) and animations.
- **FR-003**: System MUST provide a `manifest.json` and Service Worker configuration for PWA installation.
- **FR-004**: System MUST support Authentication via OAuth Provider (Google) using Better Auth.
- **FR-005**: System MUST support Authentication via Email/Password credentials using Better Auth.
- **FR-006**: System MUST support Passkey (WebAuthn) authentication for passwordless login using Better Auth.
- **FR-007**: System MUST store user data in a PostgreSQL database (e.g., Supabase) accessed via SQLAlchemy ORM, with Redis for caching.
- **FR-008**: System MUST protect private routes, redirecting unauthenticated users to the login page.

### Key Entities

- **User**: The core identity entity.
    - Attributes: ID, Email, Name, Image, CreatedAt, UpdatedAt.
    - Relations: Linked Accounts (OAuth), Sessions, Passkeys.
- **Account**: Stores OAuth provider details (Provider ID, Provider Account ID, Tokens).
- **Session**: Manages user login state.
- **Authenticator** (for Passkeys): Stores WebAuthn credential ID, public key, counter, and transport method.

## Success Criteria

### Measurable Outcomes

- **SC-001**: **PWA Compliance**: Lighthouse audit "Progressive Web App" score MUST be ≥ 90/100.
- **SC-002**: **Performance**: First Contentful Paint (FCP) on mobile (4G) MUST be < 2.0 seconds.
- **SC-003**: **Auth Efficiency**: Existing users can log in via Passkey in < 5 seconds (time from click to dashboard load).
- **SC-004**: **Visual Quality**: 100% of UI components used in the initial pages (Login, Landing) MUST be derived from shadcn/ui or compatible themes.

## Assumptions

- **Database**: We will use Supabase as the PostgreSQL provider with Redis for caching (as per Replication Guide and modernization research).
- **Auth Provider**: We will use Better Auth as the authentication library for enhanced security, WebAuthn support, and modern features.
- **Hosting**: Frontend deployed on Vercel; backend on Railway or Render for scalability.
- **Backend Separation**: API calls from Next.js frontend to FastAPI backend for separation of concerns.