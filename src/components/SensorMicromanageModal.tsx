import React, { useState } from 'react';
import { 
  FusionConfig, 
  SensorType, 
  SensorMicroTune 
} from '../types';
import { 
  X, 
  Sliders, 
  RotateCcw, 
  Check, 
  Radio, 
  Zap, 
  Volume2, 
  Camera, 
  Wifi, 
  Bluetooth, 
  Activity, 
  Compass, 
  BarChart3, 
  ShieldCheck,
  Power,
  Gauge,
  SlidersHorizontal,
  Crosshair,
  Sparkles
} from 'lucide-react';
import { DEFAULT_SENSOR_CONTROLS } from '../fusion/bayesianEngine';

interface SensorMicromanageModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: FusionConfig;
  onChangeConfig: (newConfig: FusionConfig) => void;
  onSimulate?: (action: string) => void;
}

interface SensorMeta {
  id: SensorType;
  name: string;
  category: 'Optical & Depth' | 'Acoustic & Sonar' | 'Radio Frequency' | 'Kinematic & Magnetic' | 'Environmental';
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  supportsBeam: boolean;
  powerDrawMw: number;
}

const SENSOR_CATALOG: SensorMeta[] = [
  {
    id: 'camera',
    name: 'Camera Vision ML',
    category: 'Optical & Depth',
    description: 'On-device neural object & humanoid/creature detector with 68° optical FOV.',
    icon: Camera,
    supportsBeam: true,
    powerDrawMw: 450,
  },
  {
    id: 'tof_depth',
    name: 'ToF Depth & Proximity',
    category: 'Optical & Depth',
    description: 'Direct time-of-flight photon ranging for millimetric surface distance.',
    icon: Camera,
    supportsBeam: true,
    powerDrawMw: 180,
  },
  {
    id: 'acoustic',
    name: 'Microphone & Bioacoustics',
    category: 'Acoustic & Sonar',
    description: 'Dual-mic TDoA beamforming, bioacoustic vocalization & footstep cadence analysis.',
    icon: Volume2,
    supportsBeam: true,
    powerDrawMw: 65,
  },
  {
    id: 'ultrasonic_sonar',
    name: 'Active Ultrasonic Sonar',
    category: 'Acoustic & Sonar',
    description: '19.2 kHz high-frequency chirp echolocation for acoustic radar reflections.',
    icon: Volume2,
    supportsBeam: true,
    powerDrawMw: 120,
  },
  {
    id: 'wifi_rssi',
    name: 'WiFi RSSI Multipath',
    category: 'Radio Frequency',
    description: 'High-speed AP beacon variance to detect physical bodies distorting RF waves.',
    icon: Wifi,
    supportsBeam: false,
    powerDrawMw: 90,
  },
  {
    id: 'wifi_rtt',
    name: 'WiFi RTT (802.11mc)',
    category: 'Radio Frequency',
    description: 'Sub-meter round-trip-time ranging from mesh nodes and vehicular hotspots.',
    icon: Wifi,
    supportsBeam: false,
    powerDrawMw: 140,
  },
  {
    id: 'ble',
    name: 'Bluetooth LE Near-Field',
    category: 'Radio Frequency',
    description: 'Continuous advertising packet sniffer for smartwatches, tags, cars, and phones.',
    icon: Bluetooth,
    supportsBeam: false,
    powerDrawMw: 45,
  },
  {
    id: 'accelerometer',
    name: 'IMU Seismic Vibration',
    category: 'Kinematic & Magnetic',
    description: 'Surface geophone vibration detection for approaching footsteps & engine rumblings.',
    icon: Activity,
    supportsBeam: false,
    powerDrawMw: 15,
  },
  {
    id: 'gyroscope',
    name: 'Gyroscope Orientation',
    category: 'Kinematic & Magnetic',
    description: 'Rotational angular velocity tracking for device motion compensation.',
    icon: Compass,
    supportsBeam: false,
    powerDrawMw: 20,
  },
  {
    id: 'magnetometer',
    name: 'Ferrous Magnetometer',
    category: 'Kinematic & Magnetic',
    description: 'Magnetic flux anomaly sensor: detects passing cars and large metal masses.',
    icon: Compass,
    supportsBeam: false,
    powerDrawMw: 18,
  },
  {
    id: 'barometer',
    name: 'Micro-Barometer',
    category: 'Environmental',
    description: 'Infrasonic micro-pressure detection for door opening/closing air displacement.',
    icon: BarChart3,
    supportsBeam: false,
    powerDrawMw: 12,
  },
  {
    id: 'proximity',
    name: 'Infrared Proximity',
    category: 'Optical & Depth',
    description: 'Zero-latency near-field obstacle trigger within 0.8 meters.',
    icon: Activity,
    supportsBeam: true,
    powerDrawMw: 25,
  },
];

export const SensorMicromanageModal: React.FC<SensorMicromanageModalProps> = ({
  isOpen,
  onClose,
  config,
  onChangeConfig,
  onSimulate,
}) => {
  const [selectedSensorId, setSelectedSensorId] = useState<SensorType>('acoustic');
  const [activeCategoryFilter, setActiveCategoryFilter] = useState<string>('all');

  if (!isOpen) return null;

  const currentControls: Record<SensorType, SensorMicroTune> = {
    ...DEFAULT_SENSOR_CONTROLS,
    ...(config.sensorControls || {}),
  };

  const selectedSensor = SENSOR_CATALOG.find((s) => s.id === selectedSensorId) || SENSOR_CATALOG[0];
  const currentTune = currentControls[selectedSensor.id] || DEFAULT_SENSOR_CONTROLS[selectedSensor.id];

  const updateSelectedTune = (partial: Partial<SensorMicroTune>) => {
    const updated: Record<SensorType, SensorMicroTune> = {
      ...currentControls,
      [selectedSensor.id]: {
        ...currentTune,
        ...partial,
      },
    };
    onChangeConfig({
      ...config,
      sensorControls: updated,
    });
  };

  const applyPreset = (presetName: string) => {
    const updated = { ...currentControls };

    if (presetName === 'tactical_sonar') {
      // Prioritize acoustics and sonar, mute noisy optical
      Object.keys(updated).forEach((k) => {
        const id = k as SensorType;
        if (id === 'acoustic' || id === 'ultrasonic_sonar') {
          updated[id] = { ...updated[id], enabled: true, gainSensitivity: 1.8, noiseGateThreshold: 20, samplingRateHz: 40 };
        } else if (id === 'camera') {
          updated[id] = { ...updated[id], enabled: false };
        }
      });
    } else if (presetName === 'vehicle_sentry') {
      // Prioritize cars: magnetometer, acoustic rumble, camera, high range
      Object.keys(updated).forEach((k) => {
        const id = k as SensorType;
        if (id === 'magnetometer' || id === 'acoustic' || id === 'camera') {
          updated[id] = { ...updated[id], enabled: true, gainSensitivity: 1.6, rangeLimitM: 8.0, samplingRateHz: 30 };
        }
      });
    } else if (presetName === 'creature_tracker') {
      // Prioritize creatures: bioacoustic high-freq, optical, footsteps
      Object.keys(updated).forEach((k) => {
        const id = k as SensorType;
        if (id === 'acoustic' || id === 'camera' || id === 'accelerometer') {
          updated[id] = { ...updated[id], enabled: true, gainSensitivity: 1.5, noiseGateThreshold: 15 };
        }
      });
    } else if (presetName === 'rf_device_sweep') {
      // Prioritize BLE & WiFi
      Object.keys(updated).forEach((k) => {
        const id = k as SensorType;
        if (id === 'ble' || id === 'wifi_rssi' || id === 'wifi_rtt') {
          updated[id] = { ...updated[id], enabled: true, gainSensitivity: 2.0, samplingRateHz: 25, noiseGateThreshold: 15 };
        }
      });
    } else if (presetName === 'reset_default') {
      onChangeConfig({
        ...config,
        sensorControls: { ...DEFAULT_SENSOR_CONTROLS },
      });
      return;
    }

    onChangeConfig({
      ...config,
      sensorControls: updated,
    });
  };

  const categories = ['all', 'Optical & Depth', 'Acoustic & Sonar', 'Radio Frequency', 'Kinematic & Magnetic', 'Environmental'];

  const filteredSensors = SENSOR_CATALOG.filter((s) => {
    if (activeCategoryFilter === 'all') return true;
    return s.category === activeCategoryFilter;
  });

  const totalPowerDraw = SENSOR_CATALOG.reduce((acc, s) => {
    const tune = currentControls[s.id];
    return acc + (tune?.enabled ? s.powerDrawMw : 5);
  }, 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div 
        className="relative w-full max-w-5xl bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden font-sans text-slate-100 flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/80">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-cyan-500/20 border border-cyan-500/40 text-cyan-300">
              <SlidersHorizontal className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
                <span>Hardware Sensor Micromanagement Lab</span>
                <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-cyan-950 text-cyan-400 border border-cyan-800">
                  {SENSOR_CATALOG.length} MODULES
                </span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Independently tune sampling rates, noise gates, directional beam cones, and azimuth angle offsets.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-950 border border-slate-800 font-mono text-xs">
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              <span className="text-slate-400">Total Draw:</span>
              <span className="text-amber-300 font-bold">{totalPowerDraw} mW</span>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Quick Presets Bar */}
        <div className="px-6 py-2.5 bg-slate-950/90 border-b border-slate-800/80 flex flex-wrap items-center gap-2 text-xs">
          <span className="text-slate-400 font-mono uppercase text-[10px] mr-1 flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-cyan-400" />
            Tuning Presets:
          </span>
          <button
            type="button"
            onClick={() => applyPreset('tactical_sonar')}
            className="px-2.5 py-1 rounded-md bg-purple-500/15 hover:bg-purple-500/25 border border-purple-500/40 text-purple-200 transition-colors cursor-pointer"
          >
            Tactical Echolocation / Sonar
          </button>
          <button
            type="button"
            onClick={() => applyPreset('vehicle_sentry')}
            className="px-2.5 py-1 rounded-md bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/40 text-rose-200 transition-colors cursor-pointer"
          >
            Vehicle & Traffic Sentry
          </button>
          <button
            type="button"
            onClick={() => applyPreset('creature_tracker')}
            className="px-2.5 py-1 rounded-md bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/40 text-amber-200 transition-colors cursor-pointer"
          >
            Creature & Wildlife Hunter
          </button>
          <button
            type="button"
            onClick={() => applyPreset('rf_device_sweep')}
            className="px-2.5 py-1 rounded-md bg-sky-500/15 hover:bg-sky-500/25 border border-sky-500/40 text-sky-200 transition-colors cursor-pointer"
          >
            Digital Device Sweep
          </button>
          <button
            type="button"
            onClick={() => applyPreset('reset_default')}
            className="ml-auto px-2.5 py-1 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 font-mono text-[11px] transition-colors cursor-pointer flex items-center gap-1"
          >
            <RotateCcw className="w-3 h-3" />
            Reset Factory
          </button>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 overflow-hidden grid grid-cols-1 md:grid-cols-12 min-h-0">
          {/* Left Column: Sensor Selector List */}
          <div className="md:col-span-5 border-r border-slate-800 flex flex-col bg-slate-950/40 overflow-hidden">
            {/* Category Filter Pills */}
            <div className="p-3 border-b border-slate-800/80 flex items-center gap-1.5 overflow-x-auto text-xs scrollbar-none">
              {categories.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setActiveCategoryFilter(cat)}
                  className={`px-2.5 py-1 rounded-full whitespace-nowrap text-[11px] font-medium transition-colors cursor-pointer ${
                    activeCategoryFilter === cat
                      ? 'bg-cyan-500 text-slate-950 font-bold'
                      : 'bg-slate-800/70 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {cat === 'all' ? 'All (12)' : cat}
                </button>
              ))}
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {filteredSensors.map((sensor) => {
                const isSelected = sensor.id === selectedSensor.id;
                const tune = currentControls[sensor.id] || DEFAULT_SENSOR_CONTROLS[sensor.id];
                const Icon = sensor.icon;

                return (
                  <div
                    key={sensor.id}
                    onClick={() => setSelectedSensorId(sensor.id)}
                    className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                      isSelected
                        ? 'bg-slate-800/90 border-cyan-500 shadow-md shadow-cyan-500/10'
                        : 'bg-slate-900/60 border-slate-800/80 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${tune.enabled ? 'bg-cyan-500/20 text-cyan-300' : 'bg-slate-800 text-slate-500'}`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-sm font-semibold text-white flex items-center gap-2">
                          <span>{sensor.name}</span>
                          <span className={`w-2 h-2 rounded-full ${tune.enabled ? 'bg-emerald-400 animate-pulse' : 'bg-slate-600'}`} />
                        </div>
                        <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                          {tune.enabled ? `${tune.samplingRateHz} Hz • Gain ${tune.gainSensitivity.toFixed(1)}x` : 'BYPASSED / MUTED'}
                        </div>
                      </div>
                    </div>

                    {/* Quick Toggle Switch */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        const updated = {
                          ...currentControls,
                          [sensor.id]: {
                            ...tune,
                            enabled: !tune.enabled,
                          },
                        };
                        onChangeConfig({
                          ...config,
                          sensorControls: updated,
                        });
                      }}
                      className={`px-2 py-1 rounded-md text-[10px] font-bold font-mono transition-colors cursor-pointer ${
                        tune.enabled 
                          ? 'bg-emerald-500/20 border border-emerald-500/40 text-emerald-300'
                          : 'bg-rose-500/20 border border-rose-500/40 text-rose-300'
                      }`}
                    >
                      {tune.enabled ? 'ACTIVE' : 'OFF'}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right Column: Selected Sensor Micromanagement Sliders */}
          <div className="md:col-span-7 p-5 overflow-y-auto space-y-5 bg-slate-900/40">
            {/* Sensor Info Header */}
            <div className="flex items-start justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-xl bg-cyan-500/20 border border-cyan-500/40 text-cyan-300">
                  <selectedSensor.icon className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <span>{selectedSensor.name}</span>
                    <span className="text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-mono">
                      {selectedSensor.category}
                    </span>
                  </h3>
                  <p className="text-xs text-slate-300 mt-1 max-w-lg">
                    {selectedSensor.description}
                  </p>
                </div>
              </div>

              {/* Master Enabled Pill */}
              <label className="flex items-center gap-2 bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-800 cursor-pointer">
                <span className="text-xs font-mono text-slate-300">Active</span>
                <input
                  type="checkbox"
                  checked={currentTune.enabled}
                  onChange={(e) => updateSelectedTune({ enabled: e.target.checked })}
                  className="w-4 h-4 rounded bg-slate-800 accent-cyan-500 cursor-pointer"
                />
              </label>
            </div>

            {/* Micromanagement Sliders */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* 1. Sampling Rate */}
              <div className="p-3.5 bg-slate-950/80 rounded-xl border border-slate-800 space-y-2">
                <div className="flex justify-between items-center text-xs font-mono">
                  <span className="text-slate-300 font-semibold flex items-center gap-1.5">
                    <Activity className="w-3.5 h-3.5 text-cyan-400" />
                    Polling Rate
                  </span>
                  <span className="text-cyan-400 font-bold">{currentTune.samplingRateHz} Hz</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="60"
                  step="1"
                  value={currentTune.samplingRateHz}
                  onChange={(e) => updateSelectedTune({ samplingRateHz: parseInt(e.target.value) })}
                  className="w-full h-1.5 bg-slate-800 rounded appearance-none cursor-pointer accent-cyan-500"
                />
                <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                  <span>1 Hz (Low Power)</span>
                  <span>60 Hz (Pro Max)</span>
                </div>
              </div>

              {/* 2. Gain Sensitivity */}
              <div className="p-3.5 bg-slate-950/80 rounded-xl border border-slate-800 space-y-2">
                <div className="flex justify-between items-center text-xs font-mono">
                  <span className="text-slate-300 font-semibold flex items-center gap-1.5">
                    <Gauge className="w-3.5 h-3.5 text-emerald-400" />
                    Gain Sensitivity Multiplier
                  </span>
                  <span className="text-emerald-400 font-bold">{currentTune.gainSensitivity.toFixed(2)}x</span>
                </div>
                <input
                  type="range"
                  min="0.2"
                  max="3.0"
                  step="0.05"
                  value={currentTune.gainSensitivity}
                  onChange={(e) => updateSelectedTune({ gainSensitivity: parseFloat(e.target.value) })}
                  className="w-full h-1.5 bg-slate-800 rounded appearance-none cursor-pointer accent-emerald-500"
                />
                <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                  <span>0.2x (Attenuated)</span>
                  <span>3.0x (Boosted)</span>
                </div>
              </div>

              {/* 3. Noise Gate Threshold */}
              <div className="p-3.5 bg-slate-950/80 rounded-xl border border-slate-800 space-y-2">
                <div className="flex justify-between items-center text-xs font-mono">
                  <span className="text-slate-300 font-semibold flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
                    Noise Gate Floor
                  </span>
                  <span className="text-amber-400 font-bold">{currentTune.noiseGateThreshold}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="80"
                  step="1"
                  value={currentTune.noiseGateThreshold}
                  onChange={(e) => updateSelectedTune({ noiseGateThreshold: parseInt(e.target.value) })}
                  className="w-full h-1.5 bg-slate-800 rounded appearance-none cursor-pointer accent-amber-500"
                />
                <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                  <span>0% (Raw Signals)</span>
                  <span>80% (Strict Anti-False)</span>
                </div>
              </div>

              {/* 4. Azimuth Angle Calibration Offset */}
              <div className="p-3.5 bg-slate-950/80 rounded-xl border border-slate-800 space-y-2">
                <div className="flex justify-between items-center text-xs font-mono">
                  <span className="text-slate-300 font-semibold flex items-center gap-1.5">
                    <Compass className="w-3.5 h-3.5 text-rose-400" />
                    Direction Azimuth Offset
                  </span>
                  <span className="text-rose-400 font-bold">
                    {currentTune.azimuthOffsetDeg && currentTune.azimuthOffsetDeg > 0 ? `+${currentTune.azimuthOffsetDeg}°` : `${currentTune.azimuthOffsetDeg ?? 0}°`}
                  </span>
                </div>
                <input
                  type="range"
                  min="-180"
                  max="180"
                  step="5"
                  value={currentTune.azimuthOffsetDeg ?? 0}
                  onChange={(e) => updateSelectedTune({ azimuthOffsetDeg: parseInt(e.target.value) })}
                  className="w-full h-1.5 bg-slate-800 rounded appearance-none cursor-pointer accent-rose-500"
                />
                <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                  <span>-180° (Rear Left)</span>
                  <span>0° (Forward)</span>
                  <span>+180° (Rear Right)</span>
                </div>
              </div>

              {/* 5. Directional Beam Width */}
              {selectedSensor.supportsBeam && (
                <div className="p-3.5 bg-slate-950/80 rounded-xl border border-slate-800 space-y-2 sm:col-span-2">
                  <div className="flex justify-between items-center text-xs font-mono">
                    <span className="text-slate-300 font-semibold flex items-center gap-1.5">
                      <Crosshair className="w-3.5 h-3.5 text-sky-400" />
                      Directional Beam Cone Aperture
                    </span>
                    <span className="text-sky-400 font-bold">{currentTune.beamWidthDeg ?? 60}° Arc</span>
                  </div>
                  <input
                    type="range"
                    min="15"
                    max="180"
                    step="5"
                    value={currentTune.beamWidthDeg ?? 60}
                    onChange={(e) => updateSelectedTune({ beamWidthDeg: parseInt(e.target.value) })}
                    className="w-full h-1.5 bg-slate-800 rounded appearance-none cursor-pointer accent-sky-500"
                  />
                  <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                    <span>15° (Narrow Spot Beam)</span>
                    <span>68° (Camera FOV)</span>
                    <span>180° (Hemisphere Wide)</span>
                  </div>
                </div>
              )}
            </div>

            {/* Live Test & Simulation Tools for this Sensor */}
            <div className="p-4 bg-slate-950/90 rounded-xl border border-slate-800 space-y-2.5">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-200">
                <span className="flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-emerald-400" />
                  <span>Real-Time Hardware Signal Injector</span>
                </span>
                <span className="text-[11px] font-mono text-slate-400">Direct Sensor Trigger</span>
              </div>
              <p className="text-[11px] text-slate-400">
                Instantly trigger test targets at calibrated bearings to verify your micromanaged settings.
              </p>

              <div className="flex flex-wrap items-center gap-2 pt-1">
                {selectedSensor.id === 'camera' && (
                  <>
                    <button
                      type="button"
                      onClick={() => onSimulate?.('sim_human_center')}
                      className="px-3 py-1.5 rounded-lg bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-medium hover:bg-emerald-500/30 transition-colors cursor-pointer"
                    >
                      Trigger Human (008° N, 1.4m)
                    </button>
                    <button
                      type="button"
                      onClick={() => onSimulate?.('sim_car_passing')}
                      className="px-3 py-1.5 rounded-lg bg-rose-500/20 border border-rose-500/40 text-rose-300 text-xs font-medium hover:bg-rose-500/30 transition-colors cursor-pointer"
                    >
                      Trigger Car / Vehicle (135° SE, 3.8m)
                    </button>
                    <button
                      type="button"
                      onClick={() => onSimulate?.('sim_creature_small')}
                      className="px-3 py-1.5 rounded-lg bg-amber-500/20 border border-amber-500/40 text-amber-300 text-xs font-medium hover:bg-amber-500/30 transition-colors cursor-pointer"
                    >
                      Trigger Cat / Creature (Small, 0.5-5kg)
                    </button>
                  </>
                )}

                {selectedSensor.id === 'acoustic' && (
                  <>
                    <button
                      type="button"
                      onClick={() => onSimulate?.('sim_ultrasonic_ping')}
                      className="px-3 py-1.5 rounded-lg bg-purple-500/20 border border-purple-500/40 text-purple-300 text-xs font-medium hover:bg-purple-500/30 transition-colors cursor-pointer"
                    >
                      Send 19.4kHz Sonar Chirp
                    </button>
                    <button
                      type="button"
                      onClick={() => onSimulate?.('sim_vehicle_rumble')}
                      className="px-3 py-1.5 rounded-lg bg-rose-500/20 border border-rose-500/40 text-rose-300 text-xs font-medium hover:bg-rose-500/30 transition-colors cursor-pointer"
                    >
                      Trigger Engine Rumble (115° ESE)
                    </button>
                    <button
                      type="button"
                      onClick={() => onSimulate?.('sim_creature_large')}
                      className="px-3 py-1.5 rounded-lg bg-amber-500/20 border border-amber-500/40 text-amber-300 text-xs font-medium hover:bg-amber-500/30 transition-colors cursor-pointer"
                    >
                      Trigger Large Creature (&gt;25kg)
                    </button>
                  </>
                )}

                {selectedSensor.id === 'ble' && (
                  <>
                    <button
                      type="button"
                      onClick={() => onSimulate?.('sim_ble_phone')}
                      className="px-3 py-1.5 rounded-lg bg-sky-500/20 border border-sky-500/40 text-sky-300 text-xs font-medium hover:bg-sky-500/30 transition-colors cursor-pointer"
                    >
                      Detect Smartphone (045° NE, 1.3m)
                    </button>
                    <button
                      type="button"
                      onClick={() => onSimulate?.('sim_ble_tracker')}
                      className="px-3 py-1.5 rounded-lg bg-cyan-500/20 border border-cyan-500/40 text-cyan-300 text-xs font-medium hover:bg-cyan-500/30 transition-colors cursor-pointer"
                    >
                      Detect BLE Tag (210° SSW, 0.8m)
                    </button>
                  </>
                )}

                {selectedSensor.id !== 'camera' && selectedSensor.id !== 'acoustic' && selectedSensor.id !== 'ble' && (
                  <button
                    type="button"
                    onClick={() => onSimulate?.('sim_rf_perturbation')}
                    className="px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-200 text-xs font-medium hover:bg-slate-750 transition-colors cursor-pointer"
                  >
                    Simulate Signal Perturbation
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-slate-800 bg-slate-950/80 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span>Changes are immediately evaluated in the Bayesian Kalman fusion pipeline.</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold transition-colors cursor-pointer"
          >
            Apply & Return to Radar
          </button>
        </div>
      </div>
    </div>
  );
};
