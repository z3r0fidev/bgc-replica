# Auth & Foundation Contracts

## Authentication (Auth.js)

Since we are using Auth.js (NextAuth), the "API" is handled via standard Next.js API routes and Server Actions.

### Endpoints (Automated by Auth.js)

*   `GET/POST /api/auth/signin`: Initiates sign-in flow.
*   `GET/POST /api/auth/signout`: Signs out the user.
*   `GET/POST /api/auth/callback/[provider]`: Handles OAuth callbacks.
*   `GET/POST /api/auth/session`: Returns current session data.

### Server Actions (Planned)

*   `login(formData: FormData)`: Handles email/password login.
*   `register(formData: FormData)`: Handles new user registration.
*   `addPasskey()`: Initiates WebAuthn registration flow (client-side trigger -> server verification).
