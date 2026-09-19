import React from 'react';
import { 
  X, 
  AlertTriangle, 
  CheckCircle2, 
  Info, 
  Wifi, 
  Camera, 
  Volume2, 
  Radio, 
  ShieldAlert, 
  Cpu,
  Layers
} from 'lucide-react';

interface RealityCheckModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const RealityCheckModal: React.FC<RealityCheckModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div 
        className="relative w-full max-w-2xl bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden font-sans text-slate-100 flex flex-col max-h-[85vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/70">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-400">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-white tracking-tight">
                Hardware Reality Check & Physics Architecture
              </h3>
              <p className="text-xs text-slate-400">
                Honest breakdown of what stock Android & iOS sensors can and cannot physically do
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="p-6 space-y-6 overflow-y-auto text-sm text-slate-300">
          {/* Callout Box */}
          <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-200 text-xs leading-relaxed flex items-start gap-3">
            <ShieldAlert className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold text-rose-300">No Raw WiFi CSI on Stock Phones: </span>
              Channel State Information (CSI) — the technology that lets laboratory research rigs "see through walls" by reconstructing RF phase multipath — requires root/jailbreak, patched kernel drivers, or specialized external boards (ESP32-S3 CSI / Atheros chipsets). Standard Android and iOS sandbox APIs physically block access to raw CSI. SensorRadar does NOT make fake claims about through-wall CSI vision.
            </div>
          </div>

          {/* What WiFi/BLE Actually Gives You */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-2">
              <Wifi className="w-4 h-4 text-cyan-400" />
              What WiFi and BLE Actually Provide
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="p-3.5 bg-slate-950/70 rounded-xl border border-slate-800">
                <div className="font-semibold text-slate-200 text-xs mb-1 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-cyan-400" />
                  WiFi RSSI Multipath Disturbance
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  High-frequency RSSI sampling from access points. A human body (70% water) attenuates and scatters 2.4/5GHz RF signals, causing 3–8 dBm fluctuations. This provides reliable "something moved" presence detection, though it cannot resolve shape or size.
                </p>
              </div>

              <div className="p-3.5 bg-slate-950/70 rounded-xl border border-slate-800">
                <div className="font-semibold text-slate-200 text-xs mb-1 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                  WiFi RTT (802.11mc Ranging)
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Android 9+ <code className="text-cyan-300">WifiRttManager</code> performs actual nanosecond time-of-flight round-trip measurement to compatible routers (±1-2m accuracy). This is genuine physical ranging, not RSSI guesswork.
                </p>
              </div>

              <div className="p-3.5 bg-slate-950/70 rounded-xl border border-slate-800">
                <div className="font-semibold text-slate-200 text-xs mb-1 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-sky-400" />
                  BLE RSSI Near-Field Proximity
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Bluetooth Low Energy beacon signal tracking using log-distance path loss. Highly reliable within 1–5 meters for detecting active smartphones, smartwatches, or beacons carried by occupants.
                </p>
              </div>

              <div className="p-3.5 bg-slate-950/70 rounded-xl border border-slate-800">
                <div className="font-semibold text-slate-200 text-xs mb-1 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-purple-400" />
                  Shizuku Throttle Bypass (Android)
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Stock Android throttles background scans to 4 scans per 2 minutes. Shizuku privileged shell access bypasses this to achieve 5–10 Hz scan cadences, dramatically sharpening multipath motion resolution.
                </p>
              </div>
            </div>
          </div>

          {/* Primary High Fidelity Channels */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-2">
              <Camera className="w-4 h-4 text-emerald-400" />
              Highest Fidelity Sensory Channels
            </h4>
            <div className="space-y-3">
              <div className="p-3.5 bg-slate-950/70 rounded-xl border border-slate-800">
                <div className="font-semibold text-emerald-300 text-xs mb-1">
                  1. Camera + On-Device ML (The Primary Deciding Vote)
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Computer vision using an on-device lightweight model (MobileNet-SSD / YOLO-nano quantized to INT8) is the ONLY channel capable of definitive classification between a human and an animal (dog, cat, wildlife). It governs the deciding vote whenever a subject is within the 68° optical field of view.
                </p>
              </div>

              <div className="p-3.5 bg-slate-950/70 rounded-xl border border-slate-800">
                <div className="font-semibold text-purple-300 text-xs mb-1 flex items-center gap-2">
                  <Volume2 className="w-3.5 h-3.5" />
                  2. Acoustic Sonar & Passive Bioacoustics
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  <b>Active Ultrasonic Sonar:</b> The speaker emits high-frequency chirps (18.5–20.4 kHz), and the mic monitors reflection delays for close-range (0.3–3.0m) echo ranging.
                  <br />
                  <b>Passive Bioacoustics:</b> Spectral FFT analysis isolates infrasound walking cadence (1.2–2.0 Hz footsteps), respiratory rustle, and pet vocalizations when subjects are outside the camera FOV or in total darkness.
                </p>
              </div>
            </div>
          </div>

          {/* Summary Matrix */}
          <div className="p-4 bg-slate-950 rounded-xl border border-slate-800">
            <h5 className="text-xs font-semibold text-slate-300 mb-2">Sensor Fusion Hierarchy</h5>
            <div className="text-xs text-slate-400 space-y-1.5 font-mono">
              <div className="flex justify-between py-1 border-b border-slate-800/80">
                <span>In-FOV Subject:</span>
                <span className="text-emerald-400">Camera ML (High) + Sonar/IMU Corroboration</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800/80">
                <span>Out-of-FOV / Dark:</span>
                <span className="text-purple-400">Acoustic Cadence + WiFi Multipath + BLE</span>
              </div>
              <div className="flex justify-between py-1">
                <span>Physical Barrier / Wall:</span>
                <span className="text-amber-400">Coarse WiFi RSSI Motion Only (No Shapes)</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-800 bg-slate-950/70 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-100 text-xs font-semibold transition-colors"
          >
            Understood
          </button>
        </div>
      </div>
    </div>
  );
};
