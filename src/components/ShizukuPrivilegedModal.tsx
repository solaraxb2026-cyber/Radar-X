import React from 'react';
import { 
  X, 
  Terminal, 
  CheckCircle2, 
  Zap, 
  ShieldCheck, 
  Radio, 
  BatteryCharging, 
  Layers, 
  Cpu,
  ExternalLink
} from 'lucide-react';
import { ShizukuStatus } from '../types';

interface ShizukuPrivilegedModalProps {
  isOpen: boolean;
  onClose: () => void;
  status: ShizukuStatus;
  onToggleShizuku: (enabled: boolean) => void;
}

export const ShizukuPrivilegedModal: React.FC<ShizukuPrivilegedModalProps> = ({
  isOpen,
  onClose,
  status,
  onToggleShizuku,
}) => {
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
            <div className="p-2 rounded-xl bg-purple-500/20 border border-purple-500/40 text-purple-400">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-semibold text-white tracking-tight">
                  Shizuku Enhanced Privileged Access (Android)
                </h3>
                <span className={`px-2 py-0.5 text-[11px] font-mono rounded-full border ${
                  status.isEnabled 
                    ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400' 
                    : 'bg-slate-800 border-slate-700 text-slate-400'
                }`}>
                  {status.isEnabled ? 'ACTIVE (8 Hz Scans)' : 'STANDARD THROTTLED'}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Wireless debugging ADB shell privileges without full root requirements
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

        {/* Body */}
        <div className="p-6 space-y-5 overflow-y-auto text-sm text-slate-300">
          {/* Active Status Toggle */}
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
            <div>
              <div className="font-semibold text-slate-200 text-sm">Enhanced Sampling Mode</div>
              <div className="text-xs text-slate-400 mt-0.5">
                Bypasses Android 9+ scan throttling using <code className="text-purple-300 font-mono">Shizuku.newProcess()</code>
              </div>
            </div>
            <button
              type="button"
              onClick={() => onToggleShizuku(!status.isEnabled)}
              className={`px-4 py-2 rounded-xl font-medium text-xs transition-colors ${
                status.isEnabled
                  ? 'bg-purple-600 text-white hover:bg-purple-500 shadow-lg shadow-purple-600/30'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              {status.isEnabled ? 'Disable Enhanced Mode' : 'Enable Enhanced Mode'}
            </button>
          </div>

          {/* Capabilities Grid */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">
              What Shizuku Unlocks for SensorRadar
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
              <div className="p-3.5 bg-slate-950/70 rounded-xl border border-slate-800 space-y-1">
                <div className="flex items-center gap-1.5 font-semibold text-slate-200">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  WiFi Scan Throttle Bypass
                </div>
                <p className="text-slate-400 leading-relaxed">
                  Stock Android limits normal apps to ~4 scans per 2 minutes. Via Shizuku, the app runs <code className="text-cyan-300 font-mono">cmd wifi start-scan</code> directly at <b>5–10 Hz</b>, providing high-resolution RSSI multipath motion tracking.
                </p>
              </div>

              <div className="p-3.5 bg-slate-950/70 rounded-xl border border-slate-800 space-y-1">
                <div className="flex items-center gap-1.5 font-semibold text-slate-200">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  Rich Link-Layer AP Telemetry
                </div>
                <p className="text-slate-400 leading-relaxed">
                  Executes <code className="text-cyan-300 font-mono">dumpsys wifi</code> to read per-packet RSSI history, signal-to-noise ratio (SNR), channel utilization, and BSSID packet loss statistics inaccessible to stock SDKs.
                </p>
              </div>

              <div className="p-3.5 bg-slate-950/70 rounded-xl border border-slate-800 space-y-1">
                <div className="flex items-center gap-1.5 font-semibold text-slate-200">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  High-Cadence BLE Scanning
                </div>
                <p className="text-slate-400 leading-relaxed">
                  Disables Android Bluetooth low-latency duty cycle throttling, enabling continuous near-field beacon proximity resolution without system-enforced pauses.
                </p>
              </div>

              <div className="p-3.5 bg-slate-950/70 rounded-xl border border-slate-800 space-y-1">
                <div className="flex items-center gap-1.5 font-semibold text-slate-200">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  Zero-Doze Background Execution
                </div>
                <p className="text-slate-400 leading-relaxed">
                  Grants persistent battery optimization exemptions and wake lock priorities directly to the sensing Foreground Service via shell-level package commands.
                </p>
              </div>
            </div>
          </div>

          {/* Graceful Degradation Note */}
          <div className="p-3.5 rounded-xl bg-slate-800/60 border border-slate-700/60 text-xs text-slate-300 flex items-start gap-2.5">
            <ShieldCheck className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold text-slate-200">Graceful Degradation Guarantee: </span>
              Shizuku is strictly optional. When Shizuku is not running, SensorRadar automatically falls back to standard Android permissions, passive acoustic sonar, and stock batched sensor sampling.
            </div>
          </div>

          {/* Android Kotlin Implementation snippet */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider font-mono">
                Kotlin Integration Pattern
              </span>
            </div>
            <div className="p-3 bg-black rounded-xl border border-slate-800 font-mono text-[11px] text-slate-300 overflow-x-auto">
              <pre>{`// PrivilegedAccess.kt
class PrivilegedWifiScanner {
    fun executeUnthrottledScan(): Boolean {
        if (!Shizuku.pingBinder()) return false // Graceful fallback
        val process = Shizuku.newProcess(arrayOf("cmd", "wifi", "start-scan"), null, null)
        process.waitFor(500, TimeUnit.MILLISECONDS)
        return process.exitValue() == 0
    }
}`}</pre>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-slate-800 bg-slate-950/70 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-100 text-xs font-semibold transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
