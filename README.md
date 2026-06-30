# FPV Tools

[![Google Play Store](https://img.shields.io/badge/Google_Play-Install-green?logo=google-play&logoColor=white)](https://play.google.com/store/apps/details?id=com.saturnfpv.fpvtools)
[![Support on Patreon](https://img.shields.io/badge/Patreon-Sponsor-orange?logo=patreon&logoColor=white)](https://www.patreon.com/SaturnFPV)
[![License: GPL v3](https://img.shields.io/badge/License-GPL_v3-blue.svg)](LICENSE)

FPV Tools is a comprehensive utility suite designed specifically for FPV drone pilots, builders, and racers. It simplifies complex drone calculations, coordinates frequencies, models rate profiles, and parses telemetry log files into beautiful interactive charts and 3D maps.

![FPV Tools Showcase](media/9x9_sep.jpg)

---

## Key Features

* **Rate Converter / Comparison / Visualization**: Overlay and compare different rate profiles. Translate dynamically between Betaflight and Actual rate systems, tweak curves, and zoom in on center sticks for precision adjustments. Renders copy-and-paste CLI commands.
* **TPA Comparison / Visualization**: Compare Throttle PID Attenuation (TPA) curves side-by-side to visualize exactly how and where your PIDs attenuate to tune out high-throttle oscillations.
* **Current & Voltage Sensor Calibration**: Effortlessly calibrate OSD scale coefficients based on real battery pack recharge logs from your charger.
* **Motor Stator Volume Calculator**: Model and compare motor stator dimensions (e.g., 2306 vs. 2207) with visual cylinder comparisons and comparative graphs.
* **PID Controller Simulator**: Interactive visual simulator to model overshoot, settling time, and tracking errors to help you understand PID fundamentals.
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

## License

This project is open-source and distributed under the **GNU General Public License v3 (GPL v3)**. See the [LICENSE](LICENSE) file for details.
