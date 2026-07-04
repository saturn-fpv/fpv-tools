# FPV Tools - Developer Guidance

This file outlines the rules of engagement, project architecture, and coding standards for developers and AI coding assistants working on this repository.

### 1. Project Architecture & Synchronization (CRITICAL)
* This is a hybrid Android app consisting of a simple Kotlin Android wrapper loading offline web views (Note: Compose UI and compose-navigation layers have been removed to keep the application lightweight and WebView-focused):
  * **Master Source Files**: Located in the workspace root (`/tools`, `/css`, `/js`, `index.html`, `menu.html`, `app_icon.png`).
  * **Active Assets**: Loaded by the Android app from `android/app/src/main/assets/`.
* **Rule**: Whenever you edit any HTML, JS, CSS, or icon files in the root folder, you **MUST** synchronize/copy those updated files to their corresponding paths inside `android/app/src/main/assets/` so the Android app builds with the newest code.

### 2. Git & Secrets Security
* Never push to GitHub without an explicit instruction from the user.
* All cryptographic keys (*.jks, *.keystore) and local properties files (`secrets.properties`, `local.properties`) are strictly gitignored. Never stage, commit, or push them.

### 3. Build & Verification Protocol
* After modifying any Kotlin files or web assets, always verify that the project builds and lint checks pass cleanly using the local Gradle wrapper for the target distribution flavor:
  * Play Store Build: `.\gradlew.bat lintPlayDebug assemblePlayDebug`
  * F-Droid Build: `.\gradlew.bat lintFdroidDebug assembleFdroidDebug`
* If a physical device or emulator is connected, launch the app to visually inspect and verify the UI changes.

### 4. Typography & Styling
* **Typography**: Clean, premium fonts (e.g. Google Font *Outfit*).
* Accent highlight elements should match the brand orange color token: `#E8722A`.

### 5. WebView & Container Constraints (CRITICAL)
* **Offline-First Assets**: The app must remain 100% offline. All libraries, fonts, and assets must be hosted locally. External CDNs and network-bound API calls are prohibited.
* **WebView Lifecycle**: Maintain state save/restore (`saveState`/`restoreState`) in `MainActivity.kt` to preserve tool state across activity lifecycle events.
* **Security & Bridge Limitations**:
  * WebView settings block CORS/AJAX from local file URLs and disable WebSQL.
  * The file-sharing bridge (`AndroidBridge.shareFile`) enforces a 50MB file size limit and restricts exports strictly to `.gpx`, `.kml`, `.kmz`, and `.txt` formats.
  * Parent-child iframe communication (`postMessage`) must validate `event.source` to prevent spoofing.

### 6. Shared Architecture with Saturn FPV Website

The Master Source Files under `/tools/`, `/js/`, and `/css/` are shared directly with the **Saturn FPV Website** repository. Please note that while this FPV Tools app codebase is public, the website source code is kept private/local. 

#### Critical Considerations for Shared Tools:
* **Preserving Structure for Web Compatibility**: Because the private website repository relies directly on the structure of `/tools/`, `/js/`, and `/css/` to run its web-based tools, external contributors must preserve this directory layout. If you need to make changes to the folder structure, please open an issue or check with the project owner first to ensure the updates can be tested and verified against the website.
* **Shared Sidebar Configuration & Constructor**: The sidebar links and display order are defined in `js/tools-list.js` (the single source of truth for tool names, icons, tags, and file paths). The HTML drawer construction, CSS transitions, hover effects, and theme toggle behaviors are implemented in `js/sidebar.js`. In App mode, `index.html` loads both to render the wrapper drawer. On the Website, `partial_tools.js` imports them to inject the sidebar. Always make changes to the sidebar styles or tool lists in these files first, then copy them to the website.
* **Sidebar Lifecycle & Layout Rules (CRITICAL)**:
  * *App Wrapper Detection:* The environment variable `isAppWrapper` must **never** be evaluated at top-level script load in the `<head>` of the wrapper page (as `#app-iframe` is not yet parsed). It must be assigned inside the `DOMContentLoaded` listener (`init()`) to avoid broken app navigation.
  * *Synchronous Layout Offsets:* To prevent visual stutters and jumps during page reloads on the website, `partial_tools.js` must inject the navbar styles (like `body { padding-top: 86px !important; }` and desktop persistent margins) and add the `.has-persistent-sidebar` class **synchronously** immediately upon script load rather than waiting for DOMContentLoaded.
  * *Mobile Viewport Scale:* The off-screen drawer menu must be hidden using `visibility: hidden;` when closed (toggling it together with the `right` position transition). This prevents mobile browsers from expanding layout boundaries and scaling down or squishing the tool pages.
  * *Theme Persistence & Local File Restrictions:* Active theme preferences are saved in `localStorage` under the key `'fpv-tools-theme'`. Note that browsers isolate `localStorage` key spaces per file when pages are opened locally via the `file://` protocol. Persistent synchronization across all tools works natively inside the App and on the live Website (under HTTP/HTTPS), but will not sync across pages when opened directly via double-clicking files.
* **App as the Source of Truth**: All edits, features, and fixes to tool logic, styles, or scripts **MUST** be performed in this repository first, verified locally via Android build compilation, and then synchronized to the website repository. Do not edit tool files inside the website repository directly.
* **Relative Path Management**: All assets (scripts, stylesheets, local fonts) must be linked using relative paths (e.g. `../js/chart.umd.min.js`) rather than absolute paths (e.g. `/js/...`). Absolute paths will fail when loaded inside Android's local asset scheme (`file:///android_asset/tools/...`).
* **Iframe & Standalone Chrome Detection**: The website standalone version injects its brand header and footer into the tools using `partials/partial_tools.js`. This script checks if the tool is loaded inside the app's iframe container:
  ```javascript
  if (window.parent && window.parent !== window) return;
  ```
  If loaded inside the app's iframe, the script exits immediately, leaving navigation entirely to the native Kotlin drawer/shell.
* **Dynamic Help Harvesting**: To eliminate duplicate text storage, tool files hold their help content inside a hidden container and dispatch it to the parent wrapper on load via `postMessage`. Make sure any new tools follow this template:
  ```html
  <div id="help-content-source" style="display:none;">
      [HELP HTML CONTENT]
  </div>
  ```
  ```javascript
  if (window.parent && window.parent !== window) {
      window.parent.postMessage({ type: 'pageChange', key: '[tool_key]' }, '*');
      window.parent.postMessage({
          type: 'helpData',
          key: '[tool_key]',
          html: document.getElementById('help-content-source').innerHTML
      }, '*');
  }
  ```

### 7. F-Droid & Google Play Distribution (Flavors)
To comply with F-Droid's strict open-source policy while retaining optimized file loading on Google Play and the Saturn FPV Website, the Android app is split into two product flavors under the `distribution` dimension:
* **`play` (Google Play Build):**
  * Packages assets directly from `src/main/assets/` (which inherits minified JS libraries from the root `js/` folder).
  * Compiled using: `.\gradlew.bat assemblePlayRelease` / `bundlePlayRelease`
* **`fdroid` (F-Droid Build):**
  * Packages unminified development versions of third-party JS libraries (React, React DOM, Babel standalone, Leaflet, JSZip) stored in `android/app/src/fdroid/assets/js/`.
  * **Naming Override Strategy:** To prevent modifying any HTML files or script tags, the unminified JS libraries inside the `src/fdroid/` directory are named identically to the minified libraries (e.g. the unminified React development build is saved as `react.production.min.js`). Gradle automatically overrides the minified version in `main` with this unminified version during compilation of the F-Droid flavor.
  * Compiled automatically by F-Droid's build servers from your release tags using: `.\gradlew.bat assembleFdroidRelease`
* **Saturn FPV Website Compatibility:**
  * The website build copies files directly from the root folders (`js/`, `css/`, etc.). Because the unminified F-Droid files reside isolated inside `android/app/src/fdroid/`, the website continues to use the root minified assets with zero changes.

