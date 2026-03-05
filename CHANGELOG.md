# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.7.4] - 2026-03-05
### Removed
- **Sprout Characters**: Removed all Sprout Lands character assets (Sprout, Chicken, Cow) and world objects.
- **Pixel Agents**: Deprecated the Pixel Agent companion characters.
### Changed
- **Pet Simplification**: Reverted the Dashboard mascot system to focus exclusively on BMO and Coffee Mug for a cleaner, more focused experience.
- **Asset Cleanup**: Purged all unused companion character png layers to reduce bundle size.

## [0.7.3] - 2026-03-05
### Added
- **Pixel Agent Characters**: Integrated 6 new office-themed character variants as companion pets on the dashboard.
- **Agent Interaction**: Added unique emote responses for agents ("Hello!", "Ping!", "Agreed!", "Ready!") and a dedicated AI state machine for their directional movement.
- **Vertical Facing Support**: Enhanced the pet engine to support "Up" and "Down" facing states for complex sprites that utilize the full 4-axis animation set.

### Changed
- **Refined Scaling**: Adjusted the scale and hitbox positioning of Sprout Lands characters (Chicken, Cow) and world objects for better visual harmony.
- **Companion AI Balance**: Improved the clustering and wandering behavior when multiple pets are active simultaneously.

## [0.7.2] - 2026-03-05
### Added
- **Sprout Lands Character**: Integrated the new "Sprout" pixel character with directional movement and interactive actions.
- **Improved Sprite Engine**: Added support for 2D grid-based spritesheets in `index.css`.

## [0.7.1] - 2026-03-05

### Changed
- **Pet Animation Refactor**: Completely replaced the `<svg>` and `<rect>` DOM-heavy mapping loop for the Desktop pets. A new Node.js canvas script now extracts the pet pixel arrays into true `.png` sprite sheets (`public/pets/*.png`), bringing the entire animation process onto the CSS `steps()` thread and removing all React DOM jitter.

## [0.7.0] - 2026-03-04

### Added
- **Multi-Pet System**: The free-roaming desktop pet feature has been vastly expanded. You can now select between the classic BMO robot, a new Coffee Mug character that sloshes coffee, or spawn both simultaneously from the Settings menu!
- **Super-Refined Pixel Art Animations**: Reworked the entire animation state machine for the pets. They now utilize a professional 4-frame walk cycle (contact, down, passing, up) with proper alternating leg swings and realistic Y-axis body bobbing for incredibly smooth movement tracking.
- **Custom Idle Interactions**: The Coffee Mug features its own custom idle states including blowing steam and spilling coffee, rather than recycling BMO's watering and balloon animations.
- **Dynamic Walk Speed Calculation**: The pet transition engine now calculates `Math.abs(newPos - position) * 0.1` independently, guaranteeing continuous and realistic pacing regardless of how far the pet is traveling across the screen.

## [0.6.0-beta.3] - 2026-03-04

### Added
- **Visual Edit Mode**: Introduced a new toggle in the top right header to activate Drag and Drop mode globally. You can now effortlessly click and drag to reorganize and sort Application Cards within their categories and shuffle your top row of Glance Widgets.
- **Interactive Desktop Pet**: Spawns a dedicated robot mascot right inside the Glance Widgets row! Includes a full CSS animation suite that reacts to hover interactions and mouse clicks (with floating hearts!). 
- **Workspace Enhancements**: Added a very prominent `<- Back to Dashboard` button when rendering iframes to make escaping them substantially more intuitive.
- **Widget Resizing Engine**: Rebuilt the Glance Widgets Row CSS matrix to natively support Tailwind `col-span` arguments. You can now resize individual widgets (Small, Medium, Large) from the Settings modal.
- **Weather Widget Migration**: Ripped out the legacy global Weather block and rebuilt it as a modular `WeatherGlanceWidget` that can be generated, positioned, and dropped directly into the widget flow dynamically.

## [0.6.0-beta.2] - 2026-03-04

### Added
- **Command Palette App Launcher**: Separated the "Search Web" input bar from local app filtering. You can now press `Ctrl+K` (or use the new `⌘K` header button) to summon a beautiful, blurred modal. The Command Palette lets you instantly type and filter your local dashboard apps and hit `Enter` to launch them, completely isolating local navigation from global internet searching.
- **Settings Live Previews**: Rewrote the Appearance configuration state pipeline to support real-time previewing. Changing layout structs or color hues from the dropdowns now instantly alters the entire dashboard UI beneath the modal *without needing to press Save*. 
- **Deep Color Saturation**: Vastly increased the "surface area" of the selected Primary Theme Colors. Application Cards hover states, borders, active toggles, and even the giant animated background Orbs now physically inherit and reflect the specific HSL theme color you select in Appearance.

## [0.6.0-beta.1] - 2026-03-04

### Added
- **Global Theme Engine**: Introducing 7 distinct palette choices (Zinc, Slate, Emerald, Ocean Blue, Rose Pink, Deep Violet, Warm Amber) that dynamically recalculate and overwrite the entire application CSS layer without a reload.
- **Granular App Card Control**: Decoupled the rendering of applications into variable structural components. You can now independently combine Layouts (Grid, List, Minimal) and Base Sizing variants (Small, Medium, Large) directly from Settings.
- **New Appearance Settings Tab**: Migrated all style controls into a dedicated dashboard panel for managing layouts and themes in real-time.

### Fixed
- **Settings Modal Crash**: Patched a critical React Context strict-mode bug introduced in 0.5.0 where clicking the Settings gear caused the dashboard to render a black screen due to malformed Component trees.

## [0.5.0-beta.1] - 2026-03-04

### Added
- **Configurable "Glance" Widgets Row**: A sleek new horizontal-scrolling widgets area directly on the dashboard supporting RSS feeds (via proxy), dynamic Clock cards, and Server System Stats (CPU/RAM/Disk via radial gauges).
- **Expanded Application Integrations**: Added support for Pi-hole, Proxmox Virtual Environment (PVE), and qBittorrent live data tracking directly on app cards.
- **Advanced Network Latency Tracker**: App cards now ping backend services locally and display microsecond latency (e.g. `Online (14ms)`) to verify real-time responsiveness.
- **Workspace IFrame Viewer**: Added global and per-app settings to instantly open web interfaces inside a floating dashboard overlay rather than navigating away to a new tab.

## [0.4.0-beta.1] - 2026-03-04

### Added
- **Universal Search & Shortcuts**: The top search bar now routes outward queries to configurable search engines (Google, DuckDuckGo) and supports `!bang` shortcuts (e.g. `!g search`).
- **Complete API Settings Overhaul**: Completely reworked how API Keys are handled in Settings.
- **Dynamic API Inputs**: The settings menu now intelligently detects what supported apps you have and only displays their API key input fields.
- **Test Connections**: Added visual checkmark buttons to live-ping backend API keys inside the Settings Modal.
- **Widget Toggles**: Added granular checkboxes per app so users can pick exactly which statistics are shown on the dashboard (e.g., Queue vs Wanted).

## [0.3.0-beta.1] - 2026-03-04

### Added
- **Bulk Import Wizard**: New UI inside the Settings Modal allowing rapid import of multiple apps simultaneously.
- **Docker Auto-Discovery**: Added functionality to seamlessly scan the local Docker Socket and return running containers for one-click dashboard integration.
- **JSON App Import**: Added a manual AI data-paste feature allowing Unraid XML parsing directly via Gemini JSON exports.

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
