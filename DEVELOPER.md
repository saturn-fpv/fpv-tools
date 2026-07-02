# FPV Tools - Developer Guidance

This file outlines the rules of engagement, project architecture, and coding standards for developers and AI coding assistants working on this repository.

### 1. Project Architecture & Synchronization (CRITICAL)
* This is a hybrid Android app consisting of a simple Kotlin Android wrapper loading offline web views (Note: Compose UI and compose-navigation layers have been removed to keep the application lightweight and WebView-focused):
  * **Master Source Files**: Located in the workspace root (`/html tools`, `/css`, `/js`, `index.html`, `menu.html`, `app_icon.png`).
  * **Active Assets**: Loaded by the Android app from `android/app/src/main/assets/`.
* **Rule**: Whenever you edit any HTML, JS, CSS, or icon files in the root folder, you **MUST** synchronize/copy those updated files to their corresponding paths inside `android/app/src/main/assets/` so the Android app builds with the newest code.

### 2. Git & Secrets Security
* Never push to GitHub without an explicit instruction from the user.
* All cryptographic keys (*.jks, *.keystore) and local properties files (`secrets.properties`, `local.properties`) are strictly gitignored. Never stage, commit, or push them.

### 3. Build & Verification Protocol
* After modifying any Kotlin files or web assets, always verify that the project builds and lint checks pass cleanly using the local Gradle wrapper:
  `.\gradlew.bat lintDebug assembleDebug`
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
