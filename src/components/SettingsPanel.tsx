import React from 'react';
import { FusionConfig } from '../types';
import { 
  Sliders, 
  Volume2, 
  Vibrate, 
  Radio, 
  RotateCcw, 
  Gauge, 
  ShieldAlert 
} from 'lucide-react';
import { DEFAULT_FUSION_CONFIG } from '../utils/fusionEngine';

interface SettingsPanelProps {
  config: FusionConfig;
  onChangeConfig: (newConfig: FusionConfig) => void;
}

export const SettingsPanel: React.FC<SettingsPanelProps> = ({
  config,
  onChangeConfig,
}) => {
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
            <span>Presence Fusion & Signal Calibration</span>
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Fine-tune thresholds, decay rates, sensor weights, and alert feedback triggers.
          </p>
        </div>
        <button
          onClick={handleReset}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-750 border border-slate-700 text-xs text-slate-300 font-mono transition-colors"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Reset Defaults</span>
        </button>
      </div>

      {/* Main Parameters Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Sensitivity */}
        <div className="bg-slate-950/70 p-3.5 rounded-lg border border-slate-800">
          <div className="flex justify-between text-xs font-mono mb-1">
            <span className="text-slate-300 font-bold flex items-center gap-1.5">
              <Gauge className="w-3.5 h-3.5 text-cyan-400" /> Sensitivity Gain
            </span>
            <span className="text-cyan-400 font-bold">{config.sensitivity.toFixed(2)}x</span>
          </div>
          <p className="text-[11px] text-slate-400 mb-2">Multiplier for all sensor signal inputs.</p>
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
              <ShieldAlert className="w-3.5 h-3.5 text-amber-400" /> Proximity Alert Trigger
            </span>
            <span className="text-amber-400 font-bold">{config.alertThreshold}%</span>
          </div>
          <p className="text-[11px] text-slate-400 mb-2">Confidence level that trips haptic/audio alarms.</p>
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
          <p className="text-[11px] text-slate-400 mb-2">How fast confidence decays when no change occurs.</p>
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

      {/* Sensor Fusion Weights */}
      <div className="space-y-3">
        <h4 className="text-xs font-bold text-slate-300 font-mono uppercase tracking-wider">
          Sensor Fusion Weights (Total Multiplier Influence)
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
              <span className="text-indigo-400 font-semibold">Magnetic Flux Perturbation</span>
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

        {/* Acoustic Mode */}
        <label className="flex items-center justify-between p-3 rounded-lg bg-slate-950/60 border border-slate-800 cursor-pointer hover:border-slate-700">
          <div className="flex items-center gap-2">
            <Radio className={`w-4 h-4 ${config.acousticMode ? 'text-purple-400' : 'text-slate-400'}`} />
            <span className="text-xs font-semibold text-slate-200">Acoustic Sensing</span>
          </div>
          <input
            type="checkbox"
            checked={config.acousticMode}
            onChange={(e) => onChangeConfig({ ...config, acousticMode: e.target.checked })}
            className="w-4 h-4 rounded bg-slate-800 border-slate-700 accent-purple-500 cursor-pointer"
          />
        </label>
      </div>
    </div>
  );
};
