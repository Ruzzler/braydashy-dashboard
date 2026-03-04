<div align="center">
  <h1>BrayDashy</h1>
  <p>A sophisticated, responsive, and highly configurable React dashboard for server environments.</p>
</div>

[![Live Demo](https://img.shields.io/badge/Live-Interactive_Demo-success?style=for-the-badge)](https://ruzzler.github.io/braydashy-dashboard/)

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
*   **Workspace Overlay Mode:** Confine application web interfaces directly inside the dashboard using an interactive IFrame viewer instead of opening endless new tabs.
*   **Glance Widgets**: Build a custom scrolling row of system status rings, beautiful digital clocks, and proxy-routed RSS feeds fetched on the fly.
*   **Infrastructure Telemetry:** Built-in polling securely queries system CPU, RAM, and Disk utilization.
*   **Application Health & Latency:** The backend proxies requests to services like Proxmox, Pi-hole, qBittorrent, Sonarr, Radarr, Tautulli, and more to render live connection latency (`14ms`) and queue metrics directly on the app interfaces.

## Deployment Instructions

BrayDashy is optimized for containerized environments and includes native support for Unraid.

### Docker / Unraid

1. Utilize the provided `braydashy-docker-template.xml` template.
2. Ensure you map the `/app/data` path to a persistent volume (e.g., `/mnt/user/appdata/braydashy/`). This protects your configuration file from container rebuilds.
3. Access the dashboard via port `3050` on the host machine.

### Local Development Environment

To compile and execute the interface locally:

1. Clone the repository.
2. Install dependencies for the frontend application: `cd frontend && npm install`
3. Install dependencies for the backend service: `npm install`
4. Launch the frontend development server: `cd frontend && npm run dev`
5. Launch the backend proxy service: `node backend/server.js`

*Note: The frontend development server utilizes port 5173 for Hot Module Replacement, but queries the Node.js API on port 3050 to fetch metrics and configuration data.*
