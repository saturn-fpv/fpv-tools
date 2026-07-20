// Master list of Saturn FPV Tools
// Used dynamically by both the FPV Tools App wrapper and the Saturn FPV Website
const FPV_TOOLS_LIST = [
  { key: 'rate', name: 'Rate Converter', icon: '📈', path: 'rate-converter.html', tag: 'Rates' },
  { key: 'tpa', name: 'TPA Comparison', icon: '📉', path: 'tpa-comparison.html', tag: 'Tuning' },
  { key: 'current', name: 'Sensor Calibration', icon: '⚡', path: 'sensor-calibration.html', tag: 'Calibration' },
  { key: 'stator', name: 'Stator Volume', icon: '⚙️', path: 'stator-volume.html', tag: 'Hardware' },
  { key: 'speed', name: 'Prop Tip Speed', icon: '🌀', path: 'prop-tip-speed.html', tag: 'Hardware' },
  { key: 'pid', name: 'PID Simulator', icon: '🎮', path: 'pid-simulator.html', tag: 'Tuning' },
  { key: 'freq', name: 'Frequency Planner', icon: '📡', path: 'frequency-planner.html', tag: 'Race Day' },
  { key: 'telemetry', name: 'Telemetry Parser', icon: '🗺️', path: 'telemetry-parser.html', tag: 'Post-Flight' },
  { key: 'rfcalc', name: 'RF Calculators', icon: '📡', path: 'rf-calculators.html', tag: 'Radio' },
  { key: 'chirp', name: 'Chirp Analyzer', icon: '<svg viewBox="0 0 24 24" style="width: 1.15rem; height: 1.15rem; fill: none; stroke: currentColor; stroke-width: 1.5; vertical-align: middle;"><path d="M 2.00,12.00 L 2.20,12.05 L 2.40,12.18 L 2.60,12.38 L 2.80,12.63 L 3.00,12.93 L 3.20,13.28 L 3.40,13.67 L 3.60,14.09 L 3.80,14.55 L 4.00,15.02 L 4.20,15.51 L 4.40,16.01 L 4.60,16.50 L 4.80,16.97 L 5.00,17.42 L 5.20,17.82 L 5.40,18.16 L 5.60,18.43 L 5.80,18.61 L 6.00,18.69 L 6.20,18.65 L 6.40,18.49 L 6.60,18.19 L 6.80,17.75 L 7.00,17.17 L 7.20,16.45 L 7.40,15.60 L 7.60,14.65 L 7.80,13.61 L 8.00,12.51 L 8.20,11.39 L 8.40,10.28 L 8.60,9.24 L 8.80,8.30 L 9.00,7.51 L 9.20,6.91 L 9.40,6.55 L 9.60,6.44 L 9.80,6.60 L 10.00,7.03 L 10.20,7.73 L 10.40,8.66 L 10.60,9.78 L 10.80,11.02 L 11.00,12.31 L 11.20,13.57 L 11.40,14.72 L 11.60,15.68 L 11.80,16.36 L 12.00,16.72 L 12.20,16.72 L 12.40,16.35 L 12.60,15.63 L 12.80,14.63 L 13.00,13.41 L 13.20,12.09 L 13.40,10.78 L 13.60,9.61 L 13.80,8.68 L 14.00,8.09 L 14.20,7.91 L 14.40,8.15 L 14.60,8.79 L 14.80,9.77 L 15.00,10.98 L 15.20,12.28 L 15.40,13.52 L 15.60,14.54 L 15.80,15.24 L 16.00,15.51 L 16.20,15.32 L 16.40,14.71 L 16.60,13.75 L 16.80,12.58 L 17.00,11.36 L 17.20,10.27 L 17.40,9.46 L 17.60,9.05 L 17.80,9.11 L 18.00,9.61 L 18.20,10.47 L 18.40,11.54 L 18.60,12.65 L 18.80,13.61 L 19.00,14.26 L 19.20,14.49 L 19.40,14.27 L 19.60,13.66 L 19.80,12.77 L 20.00,11.78 L 20.20,10.88 L 20.40,10.23 L 20.60,9.97 L 20.80,10.12 L 21.00,10.64 L 21.20,11.41 L 21.40,12.26 L 21.60,13.00 L 21.80,13.48 L 22.00,13.60" stroke-linecap="round" stroke-linejoin="round"/></svg>', path: 'chirp-analyzer.html', tag: 'Post-Flight' }
];

if (typeof module !== 'undefined' && module.exports) {
  module.exports = FPV_TOOLS_LIST;
}
