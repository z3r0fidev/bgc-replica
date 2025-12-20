# BGCLive Replica Project Context

## Directory Overview
This directory serves as the initialization and planning hub for the **BGCLive Replica** project. The goal is to clone and modernize the functionality of the historical `bgclive.com` social networking platform, adapting it for modern web standards and mobile-first experiences.

## Key Files

### `RESEARCH_SUMMARY.md`
Contains a detailed historical analysis of the original `bgclive.com` website.
*   **Demographics:** Focus on LGBTQ+ Black and Latino communities.
*   **Features:** Profiles, chat rooms, forums, and media galleries.
*   **Context:** Understanding the "Web 2.0" era features to modernize.

### `REPLICATION_GUIDE.md`
A comprehensive technical guide for building the new application.
*   **Tech Stack:** Next.js (React), Tailwind CSS, PostgreSQL (Supabase), Prisma.
*   **Architecture:** Mobile-first PWA approach.
*   **Implementation Plan:** Phased approach starting with setup & auth, then profiles, chat, and community features.

## Usage & Next Steps
This directory currently contains the *blueprint* for the project. The actual code implementation has not yet begun.

**To start development:**
1.  Refer to `REPLICATION_GUIDE.md` for the specific initialization commands.
2.  The recommended first step is to initialize the Next.js project:
    ```bash
    npx create-next-app@latest bgc-replica --typescript --tailwind --eslint
    ```
    *(Note: You may need to move the current documentation files into the new project folder or initialize the project in the current directory).*
