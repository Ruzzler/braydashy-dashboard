# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.2.0-beta.1] - 2026-03-03

### Added
- **Visual Changelog App**: Interactive version number badge that opens a styled markdown modal with the project's entire history.
- **Weather Integration**: Free robust Open-Meteo local weather widget module.
- **Dynamic Application Layouts**: Three distinct interactive styling layers applied onto app cards: Glassmorphism, Solid Minimal, and Outline.

### Changed
- Replaced project name from BrayServer to BrayDashy. 
- Restructured Node.js file mount location to `/app/data/` for easier unraid persistence.
- Moved unraid proxy port default from `3000` to `3050`.

## [0.1.0-alpha.1] - 2026-03-03

### Added
- **React Frontend Architecture**: Completely rebuilt the static HTML/CSS vanilla dashboard using React, Vite, Tailwind CSS, and shadcn/ui.
- **Dynamic Config Engine**: A completely dynamic node backend now interacts with `config.json` to store Categories, App Links, API keys, and System Settings. 
- **Settings Dashboard Modal**: Added a beautiful glassmorphism-style dashboard for configuring the server in real-time, removing the requirement to manually edit JSON or environment variables.
- **API Key Manager**: Persistently store Sonarr, Radarr, Tautulli, and other API keys directly in the UI instead of managing Docker environment variables.
- **Server Stats Live Metrics**: CPU, RAM, and Disk trackers are now securely fetched and rendered live in the top right.
- **Header Layout Engine**: Introducing 4 custom UI structures for the Dashboard top-bar:
  - Classic (Default)
  - Minimalist (Centered Hero)
  - Split View (Left/Right Grid)
  - Dynamic Sidebar
- **Customizable Identity**: Added Settings for users to rename "BrayServer" and provide custom Lucide React Server Icons. 
- **Funny Subtitles**: Added rotating, tech-humor subtitles beneath the main Server name.

### Changed
- **Icons CDN**: Replaced dashy's legacy icon CDN with the more stable walkxcode dashboard-icons CDN.
- **Version Number**: Added application version tracking integrated transparently through Vite's environment variables. 
- **Dockerization Strategy**: Refactored the Dockerfile into a multi-stage optimized build isolating Node production boundaries.

### Fixed
- Fixed unreadable Header text gradients.
- Fixed a bug where settings modal would unmount itself every second due to inline React component lifecycle polling.
- Handled fallback gracefully when custom icon URLs 404.
