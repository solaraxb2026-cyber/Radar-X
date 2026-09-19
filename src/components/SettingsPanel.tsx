import React, { useState } from 'react';
import { 
  FusionConfig, 
  SensorType, 
  SensorMicroTune 
} from '../types';
import { 
  Sliders, 
  Volume2, 
  Vibrate, 
  Radio, 
  RotateCcw, 
  Gauge, 
  ShieldAlert,
  SlidersHorizontal,
  Activity,
  Compass,
  Zap,
  Camera,
  Wifi,
  Bluetooth,
  BarChart3,
  Crosshair,
  Car,
  Smartphone,
  User,
  PawPrint
} from 'lucide-react';
import { DEFAULT_FUSION_CONFIG, DEFAULT_SENSOR_CONTROLS } from '../fusion/bayesianEngine';

interface SettingsPanelProps {
  config: FusionConfig;
  onChangeConfig: (newConfig: FusionConfig) => void;
  onOpenMicromanageModal?: () => void;
}

const SENSOR_META_ITEMS: { id: SensorType; name: string; icon: React.ComponentType<{ className?: string }>; description: string }[] = [
  { id: 'camera', name: 'Camera Vision ML', icon: Camera, description: 'On-device neural object detection & tracking.' },
  { id: 'acoustic', name: 'Microphone Bioacoustics', icon: Volume2, description: 'Footsteps, speech, animal vocalizations, and rumble.' },
  { id: 'ultrasonic_sonar', name: 'Active Ultrasonic Chirp', icon: Volume2, description: '19.2 kHz acoustic echolocation pulses.' },
  { id: 'ble', name: 'Bluetooth LE Near-Field', icon: Bluetooth, description: 'BLE beacon and peripheral RF sniffer.' },
  { id: 'wifi_rssi', name: 'WiFi RSSI Multipath', icon: Wifi, description: 'Beacon frame multipath variance.' },
  { id: 'accelerometer', name: 'IMU Seismic Geophone', icon: Activity, description: 'Surface vibration and physical footstep impacts.' },
  { id: 'magnetometer', name: 'Ferrous Magnetometer', icon: Compass, description: 'Passing cars & metal disturbances.' },
  { id: 'tof_depth', name: 'ToF Depth Sensor', icon: Camera, description: 'Time-of-flight near-field ranging.' },
];

export const SettingsPanel: React.FC<SettingsPanelProps> = ({
  config,
  onChangeConfig,
  onOpenMicromanageModal,
}) => {
  const [selectedSensorTab, setSelectedSensorTab] = useState<SensorType>('camera');

  const currentControls: Record<SensorType, SensorMicroTune> = {
    ...DEFAULT_SENSOR_CONTROLS,
    ...(config.sensorControls || {}),
  };

  const activeSensorTune = currentControls[selectedSensorTab] || DEFAULT_SENSOR_CONTROLS[selectedSensorTab];

  const updateSensorTune = (sensorId: SensorType, partial: Partial<SensorMicroTune>) => {
    onChangeConfig({
      ...config,
      sensorControls: {
        ...currentControls,
        [sensorId]: {
          ...(currentControls[sensorId] || DEFAULT_SENSOR_CONTROLS[sensorId]),
          ...partial,
        },
      },
    });
  };

  const handleWeightChange = (key: keyof FusionConfig['weights'], val: number) => {
    onChangeConfig({
      ...config,
      weights: {
        ...config.weights,
        [key]: val,
      },
    });
  };

  const handleReset = () => {
    onChangeConfig(DEFAULT_FUSION_CONFIG);
  };

  return (
    <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 sm:p-6 backdrop-blur-md space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-4">
        <div>
          <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
            <Sliders className="w-5 h-5 text-emerald-400" />
            <span>Presence Fusion & Sensor Micromanagement</span>
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Calibrate global Bayesian fusion weights, per-sensor polling rates, noise gates, and directional beam cones.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {onOpenMicromanageModal && (
            <button
              type="button"
              onClick={onOpenMicromanageModal}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/40 text-xs text-cyan-300 font-semibold transition-colors cursor-pointer"
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>Full Sensor Lab</span>
            </button>
          )}
          <button
            type="button"
            onClick={handleReset}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-750 border border-slate-700 text-xs text-slate-300 font-mono transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Defaults</span>
          </button>
        </div>
      </div>

      {/* 1. Global Parameters Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Sensitivity */}
        <div className="bg-slate-950/70 p-3.5 rounded-lg border border-slate-800">
          <div className="flex justify-between text-xs font-mono mb-1">
            <span className="text-slate-300 font-bold flex items-center gap-1.5">
              <Gauge className="w-3.5 h-3.5 text-cyan-400" /> Master Gain
            </span>
            <span className="text-cyan-400 font-bold">{config.sensitivity.toFixed(2)}x</span>
          </div>
          <p className="text-[11px] text-slate-400 mb-2">Overall multiplier for fused confidence.</p>
          <input
            type="range"
            min="0.5"
            max="2.0"
            step="0.05"
            value={config.sensitivity}
            onChange={(e) => onChangeConfig({ ...config, sensitivity: parseFloat(e.target.value) })}
            className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-500"
          />
        </div>

        {/* Alert Threshold */}
        <div className="bg-slate-950/70 p-3.5 rounded-lg border border-slate-800">
          <div className="flex justify-between text-xs font-mono mb-1">
            <span className="text-slate-300 font-bold flex items-center gap-1.5">
              <ShieldAlert className="w-3.5 h-3.5 text-amber-400" /> Proximity Alarm Trip
            </span>
            <span className="text-amber-400 font-bold">{config.alertThreshold}%</span>
          </div>
          <p className="text-[11px] text-slate-400 mb-2">Confidence level that trips haptic/audio pings.</p>
          <input
            type="range"
            min="40"
            max="95"
            step="1"
            value={config.alertThreshold}
            onChange={(e) => onChangeConfig({ ...config, alertThreshold: parseInt(e.target.value) })}
            className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
          />
        </div>

        {/* Confidence Decay Rate */}
        <div className="bg-slate-950/70 p-3.5 rounded-lg border border-slate-800">
          <div className="flex justify-between text-xs font-mono mb-1">
            <span className="text-slate-300 font-bold flex items-center gap-1.5">
              <Radio className="w-3.5 h-3.5 text-emerald-400" /> Decay Velocity
            </span>
            <span className="text-emerald-400 font-bold">{config.decayRatePerSec} pts/s</span>
          </div>
          <p className="text-[11px] text-slate-400 mb-2">How fast targets fade when signals cease.</p>
          <input
            type="range"
            min="5"
            max="40"
            step="1"
            value={config.decayRatePerSec}
            onChange={(e) => onChangeConfig({ ...config, decayRatePerSec: parseInt(e.target.value) })}
            className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
          />
        </div>
      </div>

      {/* 2. SENSOR MICROMANAGEMENT WORKBENCH */}
      <div className="space-y-3 bg-slate-950/60 p-4 rounded-xl border border-slate-800">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-bold text-slate-200 font-mono uppercase tracking-wider flex items-center gap-2">
            <SlidersHorizontal className="w-4 h-4 text-cyan-400" />
            <span>Hardware Sensor Micromanagement Tools</span>
          </h4>
          <span className="text-[11px] font-mono text-cyan-400 bg-cyan-950 px-2 py-0.5 rounded border border-cyan-800">
            Per-Sensor Tuning Active
          </span>
        </div>

        {/* Sensor selector tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-2 scrollbar-none">
          {SENSOR_META_ITEMS.map((item) => {
            const isSelected = item.id === selectedSensorTab;
            const tune = currentControls[item.id] || DEFAULT_SENSOR_CONTROLS[item.id];
            const Icon = item.icon;

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setSelectedSensorTab(item.id)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-colors cursor-pointer border ${
                  isSelected
                    ? 'bg-slate-800 border-cyan-500 text-white shadow'
                    : 'bg-slate-900/80 border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${tune.enabled ? 'text-cyan-400' : 'text-slate-600'}`} />
                <span>{item.name.split(' ')[0]}</span>
                <span className={`w-1.5 h-1.5 rounded-full ${tune.enabled ? 'bg-emerald-400' : 'bg-slate-600'}`} />
              </button>
            );
          })}
        </div>

        {/* Active Selected Sensor Detailed Micromanagement Controls */}
        <div className="p-4 bg-slate-900/90 rounded-xl border border-slate-800 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800/80 pb-3">
            <div>
              <div className="text-sm font-bold text-white flex items-center gap-2">
                <span>{SENSOR_META_ITEMS.find((s) => s.id === selectedSensorTab)?.name}</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                  {selectedSensorTab}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                {SENSOR_META_ITEMS.find((s) => s.id === selectedSensorTab)?.description}
              </p>
            </div>

            {/* Toggle Sensor Online / Offline */}
            <label className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 cursor-pointer">
              <span className="text-xs font-mono text-slate-300">Channel Power</span>
              <input
                type="checkbox"
                checked={activeSensorTune.enabled}
                onChange={(e) => updateSensorTune(selectedSensorTab, { enabled: e.target.checked })}
                className="w-4 h-4 rounded bg-slate-800 accent-cyan-500 cursor-pointer"
              />
            </label>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* 1. Polling Frequency */}
            <div className="p-3 bg-slate-950 rounded-lg border border-slate-800/80 space-y-1.5">
              <div className="flex justify-between text-xs font-mono">
                <span className="text-slate-400">Polling Rate</span>
                <span className="text-cyan-400 font-bold">{activeSensorTune.samplingRateHz} Hz</span>
              </div>
              <input
                type="range"
                min="1"
                max="60"
                step="1"
                value={activeSensorTune.samplingRateHz}
                onChange={(e) => updateSensorTune(selectedSensorTab, { samplingRateHz: parseInt(e.target.value) })}
                className="w-full h-1.5 bg-slate-800 rounded appearance-none cursor-pointer accent-cyan-500"
              />
              <div className="flex justify-between text-[9px] text-slate-500 font-mono">
                <span>1 Hz</span>
                <span>60 Hz</span>
              </div>
            </div>

            {/* 2. Gain Sensitivity Multiplier */}
            <div className="p-3 bg-slate-950 rounded-lg border border-slate-800/80 space-y-1.5">
              <div className="flex justify-between text-xs font-mono">
                <span className="text-slate-400">Gain Sensitivity</span>
                <span className="text-emerald-400 font-bold">{activeSensorTune.gainSensitivity.toFixed(2)}x</span>
              </div>
              <input
                type="range"
                min="0.2"
                max="3.0"
                step="0.05"
                value={activeSensorTune.gainSensitivity}
                onChange={(e) => updateSensorTune(selectedSensorTab, { gainSensitivity: parseFloat(e.target.value) })}
                className="w-full h-1.5 bg-slate-800 rounded appearance-none cursor-pointer accent-emerald-500"
              />
              <div className="flex justify-between text-[9px] text-slate-500 font-mono">
                <span>0.2x</span>
                <span>3.0x</span>
              </div>
            </div>

            {/* 3. Noise Gate Threshold */}
            <div className="p-3 bg-slate-950 rounded-lg border border-slate-800/80 space-y-1.5">
              <div className="flex justify-between text-xs font-mono">
                <span className="text-slate-400">Noise Gate Floor</span>
                <span className="text-amber-400 font-bold">{activeSensorTune.noiseGateThreshold}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="80"
                step="1"
                value={activeSensorTune.noiseGateThreshold}
                onChange={(e) => updateSensorTune(selectedSensorTab, { noiseGateThreshold: parseInt(e.target.value) })}
                className="w-full h-1.5 bg-slate-800 rounded appearance-none cursor-pointer accent-amber-500"
              />
              <div className="flex justify-between text-[9px] text-slate-500 font-mono">
                <span>0% (Raw)</span>
                <span>80% (Strict)</span>
              </div>
            </div>

            {/* 4. Direction Azimuth Calibration Offset */}
            <div className="p-3 bg-slate-950 rounded-lg border border-slate-800/80 space-y-1.5">
              <div className="flex justify-between text-xs font-mono">
                <span className="text-slate-400">Azimuth Offset</span>
                <span className="text-rose-400 font-bold">
                  {activeSensorTune.azimuthOffsetDeg && activeSensorTune.azimuthOffsetDeg > 0 ? `+${activeSensorTune.azimuthOffsetDeg}°` : `${activeSensorTune.azimuthOffsetDeg ?? 0}°`}
                </span>
              </div>
              <input
                type="range"
                min="-180"
                max="180"
                step="5"
                value={activeSensorTune.azimuthOffsetDeg ?? 0}
                onChange={(e) => updateSensorTune(selectedSensorTab, { azimuthOffsetDeg: parseInt(e.target.value) })}
                className="w-full h-1.5 bg-slate-800 rounded appearance-none cursor-pointer accent-rose-500"
              />
              <div className="flex justify-between text-[9px] text-slate-500 font-mono">
                <span>-180°</span>
                <span>0°</span>
                <span>+180°</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Sensor Fusion Weights */}
      <div className="space-y-3">
        <h4 className="text-xs font-bold text-slate-300 font-mono uppercase tracking-wider">
          Normalized Bayesian Sensor Weights
        </h4>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {/* Proximity */}
          <div className="bg-slate-950/50 p-3 rounded-lg border border-slate-800/80">
            <div className="flex justify-between text-xs font-mono mb-1">
              <span className="text-rose-400 font-semibold">Proximity Sensor</span>
              <span className="text-slate-200">{(config.weights.proximity * 100).toFixed(0)}%</span>
            </div>
            <input
              type="range"
              min="0.1"
              max="0.8"
              step="0.05"
              value={config.weights.proximity}
              onChange={(e) => handleWeightChange('proximity', parseFloat(e.target.value))}
              className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-rose-500"
            />
          </div>

          {/* Motion (Accel + Gyro) */}
          <div className="bg-slate-950/50 p-3 rounded-lg border border-slate-800/80">
            <div className="flex justify-between text-xs font-mono mb-1">
              <span className="text-emerald-400 font-semibold">Motion & Vibration</span>
              <span className="text-slate-200">{(config.weights.motion * 100).toFixed(0)}%</span>
            </div>
            <input
              type="range"
              min="0.05"
              max="0.5"
              step="0.05"
              value={config.weights.motion}
              onChange={(e) => handleWeightChange('motion', parseFloat(e.target.value))}
              className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
            />
          </div>

          {/* Bluetooth LE */}
          <div className="bg-slate-950/50 p-3 rounded-lg border border-slate-800/80">
            <div className="flex justify-between text-xs font-mono mb-1">
              <span className="text-sky-400 font-semibold">BLE Device Proximity</span>
              <span className="text-slate-200">{(config.weights.ble * 100).toFixed(0)}%</span>
            </div>
            <input
              type="range"
              min="0.05"
              max="0.5"
              step="0.05"
              value={config.weights.ble}
              onChange={(e) => handleWeightChange('ble', parseFloat(e.target.value))}
              className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-sky-500"
            />
          </div>

          {/* Acoustic */}
          <div className="bg-slate-950/50 p-3 rounded-lg border border-slate-800/80">
            <div className="flex justify-between text-xs font-mono mb-1">
              <span className="text-purple-400 font-semibold">Acoustic / Mic Level</span>
              <span className="text-slate-200">{(config.weights.acoustic * 100).toFixed(0)}%</span>
            </div>
            <input
              type="range"
              min="0.05"
              max="0.5"
              step="0.05"
              value={config.weights.acoustic}
              onChange={(e) => handleWeightChange('acoustic', parseFloat(e.target.value))}
              className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-purple-500"
            />
          </div>

          {/* Light Occlusion */}
          <div className="bg-slate-950/50 p-3 rounded-lg border border-slate-800/80">
            <div className="flex justify-between text-xs font-mono mb-1">
              <span className="text-amber-400 font-semibold">Light Occlusion</span>
              <span className="text-slate-200">{(config.weights.light * 100).toFixed(0)}%</span>
            </div>
            <input
              type="range"
              min="0.0"
              max="0.3"
              step="0.02"
              value={config.weights.light}
              onChange={(e) => handleWeightChange('light', parseFloat(e.target.value))}
              className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
            />
          </div>

          {/* Magnetometer */}
          <div className="bg-slate-950/50 p-3 rounded-lg border border-slate-800/80">
            <div className="flex justify-between text-xs font-mono mb-1">
              <span className="text-indigo-400 font-semibold">Magnetic Flux (Vehicles)</span>
              <span className="text-slate-200">{(config.weights.magnetometer * 100).toFixed(0)}%</span>
            </div>
            <input
              type="range"
              min="0.0"
              max="0.3"
              step="0.02"
              value={config.weights.magnetometer}
              onChange={(e) => handleWeightChange('magnetometer', parseFloat(e.target.value))}
              className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
            />
          </div>
        </div>
      </div>

      {/* Audio & Haptic Feedback Toggles */}
      <div className="pt-2 border-t border-slate-800 grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Audio Ping */}
        <label className="flex items-center justify-between p-3 rounded-lg bg-slate-950/60 border border-slate-800 cursor-pointer hover:border-slate-700">
          <div className="flex items-center gap-2">
            <Volume2 className={`w-4 h-4 ${config.soundAlerts ? 'text-emerald-400' : 'text-slate-400'}`} />
            <span className="text-xs font-semibold text-slate-200">Sonar Audio Ping</span>
          </div>
          <input
            type="checkbox"
            checked={config.soundAlerts}
            onChange={(e) => onChangeConfig({ ...config, soundAlerts: e.target.checked })}
            className="w-4 h-4 rounded bg-slate-800 border-slate-700 accent-emerald-500 cursor-pointer"
          />
        </label>

        {/* Vibration Alert */}
        <label className="flex items-center justify-between p-3 rounded-lg bg-slate-950/60 border border-slate-800 cursor-pointer hover:border-slate-700">
          <div className="flex items-center gap-2">
            <Vibrate className={`w-4 h-4 ${config.vibrationAlerts ? 'text-amber-400' : 'text-slate-400'}`} />
            <span className="text-xs font-semibold text-slate-200">Haptic Vibration</span>
          </div>
          <input
            type="checkbox"
            checked={config.vibrationAlerts}
            onChange={(e) => onChangeConfig({ ...config, vibrationAlerts: e.target.checked })}
            className="w-4 h-4 rounded bg-slate-800 border-slate-700 accent-amber-500 cursor-pointer"
          />
        </label>

        {/* Active Sonar Mode */}
        <label className="flex items-center justify-between p-3 rounded-lg bg-slate-950/60 border border-slate-800 cursor-pointer hover:border-slate-700">
          <div className="flex items-center gap-2">
            <Radio className={`w-4 h-4 ${config.ultrasonicMode ? 'text-purple-400' : 'text-slate-400'}`} />
            <span className="text-xs font-semibold text-slate-200">Active Ultrasonic Sonar</span>
          </div>
          <input
            type="checkbox"
            checked={config.ultrasonicMode}
            onChange={(e) => onChangeConfig({ ...config, ultrasonicMode: e.target.checked })}
            className="w-4 h-4 rounded bg-slate-800 border-slate-700 accent-purple-500 cursor-pointer"
          />
        </label>
      </div>
    </div>
  );
};
