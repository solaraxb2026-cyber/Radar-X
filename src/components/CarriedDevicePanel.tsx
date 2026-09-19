import React, { useState, useEffect } from 'react';
import { 
  Smartphone, 
  Watch, 
  Headphones, 
  Tag, 
  CircleDot, 
  Wifi, 
  Bluetooth, 
  Zap, 
  Sparkles, 
  ShieldCheck, 
  Plus, 
  Trash2, 
  Check, 
  X, 
  Activity, 
  Crosshair, 
  Layers, 
  Compass, 
  Radio, 
  BatteryCharging 
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  CarriedDeviceSignal, 
  CarriedDeviceType, 
  SignalTransportType, 
  DeviceSignalFusionMetrics 
} from '../types';
import { carriedDeviceEngine } from '../fusion/carriedDeviceSignalEngine';
import { radarAudio } from '../utils/audioSynth';

interface CarriedDevicePanelProps {
  onClose?: () => void;
  className?: string;
  id?: string;
}

export const CarriedDevicePanel: React.FC<CarriedDevicePanelProps> = ({
  onClose,
  className = '',
  id = 'carried-device-panel',
}) => {
  const [signals, setSignals] = useState<CarriedDeviceSignal[]>([]);
  const [metrics, setMetrics] = useState<DeviceSignalFusionMetrics>(carriedDeviceEngine.computeCurrentMetrics());
  const [isFusionEnabled, setIsFusionEnabled] = useState(carriedDeviceEngine.isEnabled());
  const [autoAssociate, setAutoAssociate] = useState(carriedDeviceEngine.isAutoAssociateEnabled());
  const [showAddModal, setShowAddModal] = useState(false);

  // New device form state
  const [newDeviceName, setNewDeviceName] = useState('');
  const [newDeviceType, setNewDeviceType] = useState<CarriedDeviceType>('smartphone');
  const [newTransport, setNewTransport] = useState<SignalTransportType>('ble_advertisement');
  const [newMac, setNewMac] = useState('AA:BB:CC:DD:EE:FF');

  useEffect(() => {
    const unsubscribe = carriedDeviceEngine.subscribe((newSignals, newMetrics) => {
      setSignals(newSignals);
      setMetrics(newMetrics);
      setIsFusionEnabled(carriedDeviceEngine.isEnabled());
      setAutoAssociate(carriedDeviceEngine.isAutoAssociateEnabled());
    });
    return unsubscribe;
  }, []);

  const handleToggleFusion = () => {
    const next = !isFusionEnabled;
    carriedDeviceEngine.setEnabled(next);
    setIsFusionEnabled(next);
    radarAudio.playBlipAlert();
  };

  const handleToggleAutoAssociate = () => {
    const next = !autoAssociate;
    carriedDeviceEngine.setAutoAssociate(next);
    setAutoAssociate(next);
    radarAudio.playPing();
  };

  const handleToggleDevice = (id: string) => {
    carriedDeviceEngine.toggleDeviceCarried(id);
    radarAudio.playPing();
  };

  const handlePreset = (preset: 'none' | 'phone_only' | 'phone_watch' | 'full_constellation') => {
    carriedDeviceEngine.simulatePreset(preset);
    radarAudio.playTargetLocked();
  };

  const handleAddDevice = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDeviceName.trim()) return;

    carriedDeviceEngine.addDevice({
      name: newDeviceName.trim(),
      deviceType: newDeviceType,
      transport: newTransport,
      macAddress: newMac.trim() || 'C0:FF:EE:11:22:33',
      rssiDbm: -58,
      txPowerDbm: newTransport === 'wifi_rtt_ftm' ? -42 : -59,
      frequencyMhz: newTransport.startsWith('wifi') ? 5180 : (newTransport === 'uwb_pulse' ? 6489 : 2412),
      estimatedDistanceM: 1.35,
      distanceUncertaintyM: newTransport === 'uwb_pulse' ? 0.08 : (newTransport === 'wifi_rtt_ftm' ? 0.15 : 0.22),
      bearingDeg: 35,
      bearingUncertaintyDeg: 1.8,
      coMovementScore: 94,
      packetRateHz: 10,
      isAssociatedWithHuman: true,
      accuracyBoostPercent: 35,
      batteryPercent: 85,
    });

    setNewDeviceName('');
    setShowAddModal(false);
    radarAudio.playTargetLocked();
  };

  const getDeviceIcon = (type: CarriedDeviceType) => {
    switch (type) {
      case 'smartphone':
        return Smartphone;
      case 'smartwatch':
        return Watch;
      case 'earbuds':
        return Headphones;
      case 'smart_tag':
        return Tag;
      case 'smart_ring':
        return CircleDot;
      default:
        return Radio;
    }
  };

  return (
    <div id={id} className={`bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden font-sans text-slate-100 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/70">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
            <Radio className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-semibold text-white tracking-tight">
                Carried Device Signal Assist & Constellation Fusion
              </h2>
              <span className={`px-2 py-0.5 rounded-full text-xs font-semibold border ${
                isFusionEnabled 
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' 
                  : 'bg-slate-800 border-slate-700 text-slate-400'
              }`}>
                {isFusionEnabled ? 'FUSION ACTIVE' : 'FUSION OFF'}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Multi-spectral RF anchoring using personal phones, watches, earbuds & tags to sharpen radar accuracy
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleToggleFusion}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border ${
              isFusionEnabled
                ? 'bg-emerald-600 hover:bg-emerald-500 text-white border-emerald-500/50 shadow-lg shadow-emerald-950/50'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
            }`}
          >
            {isFusionEnabled ? 'Signal Fusion Enabled' : 'Enable Signal Fusion'}
          </button>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      <div className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
        {/* Real-time Accuracy Gains Banner */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          {/* Angle Resolution Comparison */}
          <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800">
            <div className="text-[11px] font-medium text-slate-400 flex items-center justify-between">
              <span>AZIMUTH ERROR</span>
              <Compass className="w-3.5 h-3.5 text-cyan-400" />
            </div>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-xl font-bold font-mono text-cyan-300">
                ±{metrics.fusedAngleUncertaintyDeg}°
              </span>
              <span className="text-xs font-mono text-slate-500 line-through">
                ±3.8°
              </span>
            </div>
            <div className="mt-1 text-[10px] text-emerald-400 font-mono flex items-center gap-1">
              <Zap className="w-3 h-3" />
              <span>
                {metrics.totalCarriedDevices > 0 
                  ? `${Math.round((1 - metrics.fusedAngleUncertaintyDeg / 3.8) * 100)}% sharper beam focus` 
                  : 'Baseline physics'}
              </span>
            </div>
          </div>

          {/* Distance Precision Comparison */}
          <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800">
            <div className="text-[11px] font-medium text-slate-400 flex items-center justify-between">
              <span>DISTANCE TOLERANCE</span>
              <Crosshair className="w-3.5 h-3.5 text-emerald-400" />
            </div>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-xl font-bold font-mono text-emerald-300">
                ±{metrics.fusedDistanceUncertaintyM}m
              </span>
              <span className="text-xs font-mono text-slate-500 line-through">
                ±0.45m
              </span>
            </div>
            <div className="mt-1 text-[10px] text-emerald-400 font-mono flex items-center gap-1">
              <Sparkles className="w-3 h-3" />
              <span>
                {metrics.fusedDistanceUncertaintyM <= 0.15 
                  ? 'Centimeter-level precision lock' 
                  : `${Math.round((1 - metrics.fusedDistanceUncertaintyM / 0.45) * 100)}% tighter fix`}
              </span>
            </div>
          </div>

          {/* Combined Accuracy Boost */}
          <div className="p-3.5 rounded-xl bg-gradient-to-br from-emerald-950/30 to-cyan-950/30 border border-emerald-500/30">
            <div className="text-[11px] font-medium text-slate-400 flex items-center justify-between">
              <span>ACCURACY BOOST</span>
              <Zap className="w-3.5 h-3.5 text-amber-400" />
            </div>
            <div className="mt-1 text-2xl font-bold font-mono text-amber-300">
              +{metrics.accuracyImprovementPercent}%
            </div>
            <div className="mt-1 text-[10px] text-slate-400 font-mono">
              Constellation: <span className="text-cyan-400 font-bold uppercase">{metrics.constellationQuality}</span>
            </div>
          </div>

          {/* Active Carried Devices Count */}
          <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800">
            <div className="text-[11px] font-medium text-slate-400 flex items-center justify-between">
              <span>CARRIED SIGNALS</span>
              <Layers className="w-3.5 h-3.5 text-indigo-400" />
            </div>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-2xl font-bold font-mono text-indigo-300">
                {metrics.totalCarriedDevices}
              </span>
              <span className="text-xs text-slate-400">of {signals.length} detected</span>
            </div>
            <div className="mt-1 text-[10px] text-slate-400 font-mono flex gap-1 items-center">
              {metrics.transportsActive.map(t => (
                <span key={t} className="px-1 py-0.2 bg-slate-800 rounded text-[9px] text-slate-300">
                  {t.split('_')[0].toUpperCase()}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Quick Simulation Presets */}
        <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
              Quick Constellation Presets
            </span>
            <span className="text-[11px] text-slate-500">
              Select what the target is carrying to simulate accuracy changes
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <button
              type="button"
              onClick={() => handlePreset('none')}
              className={`px-3 py-2 rounded-lg text-xs font-medium border text-left transition-all ${
                metrics.totalCarriedDevices === 0
                  ? 'bg-slate-800 border-slate-600 text-white shadow'
                  : 'bg-slate-900/80 hover:bg-slate-800/60 border-slate-800 text-slate-400'
              }`}
            >
              <div className="font-semibold text-slate-200">Bare Target</div>
              <div className="text-[10px] text-slate-500 mt-0.5">±3.8° / ±0.45m Baseline</div>
            </button>

            <button
              type="button"
              onClick={() => handlePreset('phone_only')}
              className={`px-3 py-2 rounded-lg text-xs font-medium border text-left transition-all ${
                metrics.totalCarriedDevices === 1
                  ? 'bg-cyan-950/60 border-cyan-500/60 text-cyan-200 shadow'
                  : 'bg-slate-900/80 hover:bg-slate-800/60 border-slate-800 text-slate-400'
              }`}
            >
              <div className="font-semibold text-cyan-300 flex items-center gap-1">
                <Smartphone className="w-3.5 h-3.5" />
                <span>Phone Only</span>
              </div>
              <div className="text-[10px] text-cyan-400/80 mt-0.5">+44% Accuracy Boost</div>
            </button>

            <button
              type="button"
              onClick={() => handlePreset('phone_watch')}
              className={`px-3 py-2 rounded-lg text-xs font-medium border text-left transition-all ${
                metrics.totalCarriedDevices === 2
                  ? 'bg-emerald-950/60 border-emerald-500/60 text-emerald-200 shadow'
                  : 'bg-slate-900/80 hover:bg-slate-800/60 border-slate-800 text-slate-400'
              }`}
            >
              <div className="font-semibold text-emerald-300 flex items-center gap-1">
                <Watch className="w-3.5 h-3.5" />
                <span>Phone + Watch</span>
              </div>
              <div className="text-[10px] text-emerald-400/80 mt-0.5">+68% Accuracy Boost</div>
            </button>

            <button
              type="button"
              onClick={() => handlePreset('full_constellation')}
              className={`px-3 py-2 rounded-lg text-xs font-medium border text-left transition-all ${
                metrics.totalCarriedDevices >= 4
                  ? 'bg-amber-950/60 border-amber-500/60 text-amber-200 shadow'
                  : 'bg-slate-900/80 hover:bg-slate-800/60 border-slate-800 text-slate-400'
              }`}
            >
              <div className="font-semibold text-amber-300 flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Full Constellation</span>
              </div>
              <div className="text-[10px] text-amber-400/80 mt-0.5">+88% Centimeter Lock</div>
            </button>
          </div>
        </div>

        {/* Live Detected Carried Devices List */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-white">Detected Personal RF Signals</h3>
              <span className="px-2 py-0.5 bg-slate-800 rounded-full text-xs font-mono text-slate-400">
                {signals.length} Signals Tracked
              </span>
            </div>
            <div className="flex items-center gap-2">
              <label className="flex items-center gap-1.5 text-xs text-slate-400 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={autoAssociate}
                  onChange={handleToggleAutoAssociate}
                  className="rounded bg-slate-800 border-slate-700 text-cyan-500 focus:ring-0"
                />
                <span>Auto-Associate Co-Moving Signals</span>
              </label>
              <button
                type="button"
                onClick={() => setShowAddModal(true)}
                className="px-2.5 py-1 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-xs font-medium flex items-center gap-1 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Device</span>
              </button>
            </div>
          </div>

          <div className="space-y-2">
            {signals.map((dev) => {
              const DevIcon = getDeviceIcon(dev.deviceType);
              const isCarried = dev.isAssociatedWithHuman;

              return (
                <div
                  key={dev.id}
                  onClick={() => handleToggleDevice(dev.id)}
                  className={`p-3.5 rounded-xl border transition-all cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-3 ${
                    isCarried
                      ? 'bg-slate-900/90 border-cyan-500/40 shadow-lg shadow-cyan-950/20'
                      : 'bg-slate-950/50 border-slate-800 hover:border-slate-700 opacity-60'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-xl border ${
                      isCarried
                        ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
                        : 'bg-slate-800 text-slate-400 border-slate-700'
                    }`}>
                      <DevIcon className="w-5 h-5" />
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-white">
                          {dev.name}
                        </span>
                        <span className="px-1.5 py-0.2 bg-slate-800 border border-slate-700 rounded text-[10px] font-mono text-cyan-400">
                          {dev.transport.replace('_', ' ').toUpperCase()}
                        </span>
                        {dev.batteryPercent !== undefined && (
                          <span className="text-[10px] text-slate-400 font-mono flex items-center gap-0.5">
                            <BatteryCharging className="w-3 h-3 text-emerald-400" />
                            <span>{dev.batteryPercent}%</span>
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-slate-400 font-mono mt-0.5 flex items-center gap-2">
                        <span>MAC: {dev.macAddress}</span>
                        <span>•</span>
                        <span>{dev.packetRateHz} Hz</span>
                        <span>•</span>
                        <span className="text-slate-300">{dev.frequencyMhz} MHz</span>
                      </div>
                    </div>
                  </div>

                  {/* Signal Metrics & Checkbox */}
                  <div className="flex items-center gap-4 self-end md:self-center">
                    {/* RSSI & Distance Badge */}
                    <div className="text-right font-mono">
                      <div className="text-xs font-bold text-slate-200">
                        {dev.rssiDbm} dBm
                      </div>
                      <div className="text-[11px] text-emerald-400">
                        {dev.estimatedDistanceM.toFixed(2)}m (±{dev.distanceUncertaintyM}m)
                      </div>
                    </div>

                    {/* Co-movement correlation */}
                    <div className="hidden sm:block text-right font-mono">
                      <div className="text-[10px] text-slate-400">TRAJECTORY MATCH</div>
                      <div className="text-xs font-bold text-cyan-400">{dev.coMovementScore}%</div>
                    </div>

                    {/* Accuracy Boost Contribution Badge */}
                    <div className="px-2 py-1 rounded-md bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-mono font-bold">
                      +{dev.accuracyBoostPercent}%
                    </div>

                    {/* Toggle Button */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleToggleDevice(dev.id);
                      }}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors border ${
                        isCarried
                          ? 'bg-cyan-600 hover:bg-cyan-500 text-white border-cyan-500'
                          : 'bg-slate-800 hover:bg-slate-700 text-slate-400 border-slate-700'
                      }`}
                    >
                      {isCarried ? (
                        <>
                          <Check className="w-3.5 h-3.5" />
                          <span>Carrying</span>
                        </>
                      ) : (
                        <span>Not Carrying</span>
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Mathematical Fusion Explanation Note */}
        <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800/80 text-xs text-slate-400 space-y-1.5">
          <div className="font-semibold text-slate-200 flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>How Personal RF Signals Anchor the Radar</span>
          </div>
          <p className="leading-relaxed">
            When a person carries personal electronics (smartphones, smartwatches, wireless earbuds, smart tags), the devices broadcast periodic high-frequency RF chirps (BLE advertisements, WiFi probe requests, 802.11mc FTM RTT packets, and UWB pulses).
          </p>
          <p className="leading-relaxed">
            The Radar performs <strong>Maximum Likelihood Inverse-Variance Fusion</strong>: combining the acoustic Doppler footstep cadence and optical bounding box with the micro-second arrival time of the carried device packets. This reduces spatial jitter by over 75% and ensures uninterrupted non-line-of-sight track continuity even if the person walks behind partitions or into darkness.
          </p>
        </div>
      </div>

      {/* Add Custom Device Modal */}
      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <div className="w-full max-w-md bg-slate-900 border border-slate-700 rounded-2xl p-6 space-y-4 shadow-2xl text-slate-100">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <h3 className="text-base font-semibold text-white flex items-center gap-2">
                  <Plus className="w-4 h-4 text-cyan-400" />
                  <span>Register Carried Personal Device</span>
                </h3>
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="text-slate-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleAddDevice} className="space-y-4 text-xs">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Device Name / Model</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Apple Watch Ultra 2, AirPods Pro"
                    value={newDeviceName}
                    onChange={(e) => setNewDeviceName(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-300 font-medium mb-1">Device Category</label>
                    <select
                      value={newDeviceType}
                      onChange={(e) => setNewDeviceType(e.target.value as CarriedDeviceType)}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white focus:outline-none focus:border-cyan-500"
                    >
                      <option value="smartphone">Smartphone</option>
                      <option value="smartwatch">Smartwatch</option>
                      <option value="earbuds">Wireless Earbuds</option>
                      <option value="smart_tag">Smart Tag / Beacon</option>
                      <option value="smart_ring">Smart Ring</option>
                      <option value="custom_rf">Custom RF Peripheral</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-300 font-medium mb-1">Signal Protocol</label>
                    <select
                      value={newTransport}
                      onChange={(e) => setNewTransport(e.target.value as SignalTransportType)}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white focus:outline-none focus:border-cyan-500"
                    >
                      <option value="ble_advertisement">BLE Advertisement (2.4GHz)</option>
                      <option value="ble_gatt_telemetry">BLE GATT Telemetry</option>
                      <option value="wifi_probe_request">WiFi Probe Request</option>
                      <option value="wifi_rtt_ftm">WiFi 802.11mc FTM RTT</option>
                      <option value="uwb_pulse">Ultra-Wideband Pulse (UWB)</option>
                      <option value="classic_bluetooth">Bluetooth Classic BR/EDR</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">MAC Address (or BLE UUID)</label>
                  <input
                    type="text"
                    placeholder="e.g. 3C:06:30:4A:89:12"
                    value={newMac}
                    onChange={(e) => setNewMac(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white font-mono focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white font-semibold rounded-lg shadow-lg shadow-cyan-950/50"
                  >
                    Save & Associate
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
