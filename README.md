<div align="center">
  <h1>BrayDashy</h1>
  <p>A sophisticated, responsive, and highly configurable React dashboard for server environments.</p>
</div>

![BrayDashy Screenshot](dashboard-screenshot.png)

## Overview

BrayDashy is a modern dashboard engineered specifically for home servers and self-hosted environments. Built on a React and Node.js architecture, it provides a centralized interface for application management, live infrastructure monitoring, and service health tracking.

## Architecture

*   **Frontend:** React 18, Vite, TypeScript, Tailwind CSS, shadcn/ui.
*   **Backend:** Node.js Express Server (handles secure local proxying and configuration state).
*   **Persistency:** All state is tracked in a local `config.json` volume mount, abstracting API keys and configurations away from environment variables.

## Core Capabilities

*   **Dynamic Layout Engine:** Supports four distinct, hot-swappable structural designs (Classic, Minimalist, Split View, Dynamic Sidebar).
*   **In-Browser Configuration:** A comprehensive settings modal allows operators to add services, categorize links, and inject API keys without utilizing the terminal.
*   **Infrastructure Telemetry:** Built-in polling securely queries system CPU, RAM, and Disk utilization.
*   **Application Health:** The backend proxies requests to services like Sonarr, Radarr, Tautulli, and Home Assistant to render live availability and queue metrics directly on the app interfaces.

## Deployment Instructions

BrayDashy is optimized for containerized environments and includes native support for Unraid.

### Docker / Unraid

1. Utilize the provided `braydashy-docker-template.xml` template.
2. Ensure you map the `/app/config.json` path to a persistent volume (e.g., `/mnt/user/appdata/braydashy/config.json`). This protects your configuration from container rebuilds.
3. Access the dashboard via port `3000` on the host machine.

### Local Development Environment

To compile and execute the interface locally:

1. Clone the repository.
2. Install dependencies for the frontend application: `cd frontend && npm install`
3. Install dependencies for the backend service: `npm install`
4. Launch the frontend development server: `cd frontend && npm run dev`
5. Launch the backend proxy service: `node server.js`

*Note: The frontend development server utilizes port 5173 for Hot Module Replacement, but queries the Node.js API on port 3000 to fetch metrics and configuration data.*
