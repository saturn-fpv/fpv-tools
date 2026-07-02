# FPV Tools

[![Google Play Store](https://img.shields.io/badge/Google_Play-Install-green?logo=google-play&logoColor=white)](https://play.google.com/store/apps/details?id=com.saturnfpv.fpvtools)
[![Install with Obtainium](https://img.shields.io/badge/Install%20with-Obtainium-purple?logo=android&logoColor=white)](https://github.com/saturn-fpv/fpv-tools/releases)
[![GitHub Release](https://img.shields.io/github/v/release/saturn-fpv/fpv-tools?logo=github&color=blue)](https://github.com/saturn-fpv/fpv-tools/releases)
[![Platform](https://img.shields.io/badge/Platform-Android_7.0%2B-green?logo=android&logoColor=white)](https://developer.android.com)
[![License: GPL v3](https://img.shields.io/badge/License-GPL_v3-blue.svg)](LICENSE)
[![Support on Patreon](https://img.shields.io/badge/Patreon-Sponsor-orange?logo=patreon&logoColor=white)](https://www.patreon.com/SaturnFPV)

FPV Tools is a comprehensive utility suite designed specifically for FPV drone pilots, builders, and racers. It simplifies complex drone calculations, coordinates frequencies, models rate profiles, and parses telemetry log files into beautiful interactive charts and 3D maps.

![FPV Tools Showcase](media/9x9_sep.jpg)

---

## Key Features

* **Rate Converter / Comparison / Visualization**: Overlay and compare different rate profiles. Translate dynamically between Betaflight and Actual rate systems, tweak curves, and zoom in on center sticks for precision adjustments. Renders copy-and-paste CLI commands.
* **TPA Comparison / Visualization**: Compare Throttle PID Attenuation (TPA) curves side-by-side to visualize exactly how and where your PIDs attenuate to tune out high-throttle oscillations.
* **Current & Voltage Sensor Calibration**: Effortlessly calibrate OSD scale coefficients based on real battery pack recharge logs from your charger.
* **Motor Stator Volume Calculator**: Model and compare motor stator dimensions (e.g., 2306 vs. 2207) with visual cylinder comparisons and comparative graphs.
* **PID Controller Simulator**: Interactive visual simulator to model overshoot, settling time, and tracking errors to help you understand PID fundamentals. *(Based on the original simulator by Joshua Bardwell, with additional improvements)*
* **Prop Tip Speed Calculator**: Ensure your props stay subsonic. Calculates prop tip velocity (Mach speed) based on KV, battery cell counts, voltage, and prop dimensions, with metric/imperial outputs.
* **Race Frequency Planner**: Coordinate analog and digital video systems (HDZero, DJI V1/WS, DJI O3/O4). Features automatic Intermodulation (IMD) conflict scans and visual spectrum charts.
* **Telemetry Parser**: Convert raw EdgeTX/OpenTX/FreedomTX telemetry logs (`.csv`) into 3D flight paths (`.kml`/`.kmz`) for terrain-accurate flyovers in Google Earth.

---

## App Philosophy

* 🚫 **No Ads & No In-App Purchases**: Fully free, clean, and distraction-free workspace.
* 🚫 **No Tracking / Privacy-First**: No data is tracked, stored, or sent to cloud servers. Your telemetry logs and settings remain strictly local.
* 🌐 **Works 100% Offline**: All calculations, simulators, and telemetry parsing are performed in local memory. The only network request occurs to load map tiles in the telemetry preview (if online).
* 📖 **Fully Open Source**: Clean, public source code designed to build trust and collaborate on improvements.

---

## Development & AI Assistance

This project is developed using modern web techniques and compiled as a hybrid Android application. 

🤖 **AI Assisted Development**: FPV Tools was pair-programmed with agentic AI assistants, to refine mathematics, automate compilation assets, and optimize user experience.

---

## Support Development

If you find this application useful for your builds or race events, please consider supporting future development and maintenance:

💖 **[Support on Patreon](https://www.patreon.com/SaturnFPV)**

---

## Credits & Attributions

* **PID Controller Simulator**: The core PID simulator logic and concept are based on Joshua Bardwell's original development. He graciously granted permission to adapt his code (originally demonstrated on his YouTube channel). Since then, we have built on top of that foundation, implementing additional improvements. 
  
  To learn more, check out:
  * [Joshua Bardwell's Original PID Simulator Video](https://www.youtube.com/watch?v=q5VtSrJ3oVQ)
  * [FPV Know-It-All Simulator Page](https://www.fpvknowitall.com/pid-controller-simulator)

---

## Development

FPV Tools is a hybrid Android app. The user interface and calculation engines are written in standard web technologies (HTML, CSS, JS) located in the root directory, which are loaded via an offline WebView wrapper in the `android/` directory.

### Quick Start / Web Testing
To test or edit the web tools, you do not need to build the Android app. Simply open [index.html](file:///d:/Temp/Antigravity/FPV%20Tools/index.html) in any modern web browser.

### Building the Android App
To compile the Android app, ensure you have **JDK 17** and the **Android SDK** installed, then run the following commands from the `android/` directory:

* **Windows**:
  ```powershell
  cd android
  .\gradlew.bat assembleDebug
  ```
* **macOS / Linux**:
  ```bash
  cd android
  ./gradlew assembleDebug
  ```

### Release Signing
Release builds are signed using a keystore configuration loaded from `android/secrets.properties` (which is gitignored). To build a signed release APK:
1. Create a `secrets.properties` file in the `android/` directory with the following variables:
   ```properties
   storeFile=fpvtools-upload-key.jks
   storePassword=your_keystore_password
   keyAlias=your_key_alias
   keyPassword=your_key_password
   ```
2. Place your keystore file (e.g. `fpvtools-upload-key.jks`) in `android/app/`.
3. Run the assemble release command: `./gradlew assembleRelease` (or `.\gradlew.bat assembleRelease` on Windows).

For more detailed codebase standards and architecture guidelines, see [DEVELOPER.md](file:///d:/Temp/Antigravity/FPV%20Tools/DEVELOPER.md).

---

## License

This project is open-source and distributed under the **GNU General Public License v3 (GPL v3)**. See the [LICENSE](LICENSE) file for details.
