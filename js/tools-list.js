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
  { key: 'rfcalc', name: 'RF Calculators', icon: '📡', path: 'rf-calculators.html', tag: 'Radio' }
];

if (typeof module !== 'undefined' && module.exports) {
  module.exports = FPV_TOOLS_LIST;
}
