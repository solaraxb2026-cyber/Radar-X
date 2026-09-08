import React, { useState } from 'react';
import { SensorReading, SensorType } from '../types';
import { 
  Target, 
  Activity, 
  SunMedium, 
  Wifi, 
  Volume2, 
  Compass, 
  CheckCircle2, 
  XCircle, 
  Play, 
  Mic, 
  MicOff 
} from 'lucide-react';

interface SensorPanelProps {
  readings: Record<SensorType, SensorReading>;
  onTriggerSimulation: (type: SensorType, value: Record<string, unknown>) => void;
  isMicActive: boolean;
  onToggleMic: () => void;
}

export const SensorPanel: React.FC<SensorPanelProps> = ({
  readings,
  onTriggerSimulation,
  isMicActive,
  onToggleMic,
}) => {
  const [proxActive, setProxActive] = useState(false);
  const [lightOccluded, setLightOccluded] = useState(false);
  const [motionIntensity, setMotionIntensity] = useState(0);
  const [bleDeviceCount, setBleDeviceCount] = useState(2);

  const handleProxToggle = () => {
    const next = !proxActive;
    setProxActive(next);
    onTriggerSimulation('proximity', {
      isNear: next,
      proximityDistanceCm: next ? 1.0 : 5.0,
    });
  };

  const handleLightToggle = () => {
    const next = !lightOccluded;
    setLightOccluded(next);
    onTriggerSimulation('light', {
      isOccluded: next,
      lux: next ? 2.5 : 320,
      luxDelta: next ? 317.5 : 0,
    });
  };

  const handleMotionChange = (val: number) => {
    setMotionIntensity(val);
    onTriggerSimulation('accelerometer', {
      motionDelta: val,
      accelX: +(val * 0.4).toFixed(2),
      accelY: +(val * 0.8).toFixed(2),
      accelZ: +(9.8 + val * 0.2).toFixed(2),
    });
    onTriggerSimulation('gyroscope', {
      rotationDelta: +(val * 0.6).toFixed(2),
      gyroX: +(val * 0.2).toFixed(2),
      gyroY: +(val * 0.3).toFixed(2),
    });
  };

  const handleBleChange = (count: number) => {
    setBleDeviceCount(count);
    const devices = Array.from({ length: count }, (_, i) => ({
      id: `BLE-DEV-0${i + 1}`,
      rssi: -50 - i * 14,
      name: i === 0 ? 'Smart Watch' : i === 1 ? 'Wireless Earbuds' : `Beacon-${i + 1}`,
      estimatedDistanceM: +(0.8 + i * 0.9).toFixed(1),
    }));

    onTriggerSimulation('ble', {
      bleCount: count,
      strongestRssi: count > 0 ? -52 : -95,
      nearbyDevices: devices,
    });
  };

  return (
    <div className="space-y-4">
      {/* Simulation & Hardware Trigger Quick Bar */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 backdrop-blur-md">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
          <div>
            <h4 className="text-sm font-bold text-slate-100 flex items-center gap-2">
              <Play className="w-4 h-4 text-emerald-400" />
              <span>Interactive Sensor Stimulator</span>
            </h4>
            <p className="text-xs text-slate-400 mt-0.5">
              Simulate phone hardware sensor events to test presence fusion algorithms.
            </p>
          </div>

          {/* Real Audio Mic Toggle */}
          <button
            onClick={onToggleMic}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold font-mono transition-colors ${
              isMicActive
                ? 'bg-purple-500/20 border border-purple-500/50 text-purple-300'
                : 'bg-slate-800 border border-slate-700 text-slate-300 hover:bg-slate-750'
            }`}
          >
            {isMicActive ? <Mic className="w-3.5 h-3.5 text-purple-400 animate-pulse" /> : <MicOff className="w-3.5 h-3.5" />}
            <span>{isMicActive ? 'Acoustic Sensing: LIVE' : 'Enable Real Mic'}</span>
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2">
          {/* Proximity Toggle */}
          <button
            onClick={handleProxToggle}
            className={`p-3 rounded-lg border text-left transition-all ${
              proxActive
                ? 'bg-rose-500/20 border-rose-500/60 text-rose-200'
                : 'bg-slate-950/60 border-slate-800 text-slate-300 hover:border-slate-700'
            }`}
          >
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="font-bold flex items-center gap-1.5">
                <Target className="w-3.5 h-3.5 text-rose-400" /> Proximity Sensor
              </span>
              <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${proxActive ? 'bg-rose-500 text-white' : 'bg-slate-800 text-slate-400'}`}>
                {proxActive ? 'NEAR (<5cm)' : 'FAR'}
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              {proxActive ? 'Simulating hand/body blocking phone screen' : 'Click to simulate close obstacle'}
            </p>
          </button>

          {/* Light Sensor Occlusion */}
          <button
            onClick={handleLightToggle}
            className={`p-3 rounded-lg border text-left transition-all ${
              lightOccluded
                ? 'bg-amber-500/20 border-amber-500/60 text-amber-200'
                : 'bg-slate-950/60 border-slate-800 text-slate-300 hover:border-slate-700'
            }`}
          >
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="font-bold flex items-center gap-1.5">
                <SunMedium className="w-3.5 h-3.5 text-amber-400" /> Ambient Light
              </span>
              <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${lightOccluded ? 'bg-amber-500 text-white' : 'bg-slate-800 text-slate-400'}`}>
                {lightOccluded ? 'OCCLUDED (2 lux)' : 'BRIGHT (320 lux)'}
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              {lightOccluded ? 'Sudden shadow / pocket occlusion' : 'Click to simulate shadow pass'}
            </p>
          </button>

          {/* Motion Slider */}
          <div className="p-3 rounded-lg border bg-slate-950/60 border-slate-800 text-slate-300">
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="font-bold flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5 text-emerald-400" /> Motion / Vibration
              </span>
              <span className="text-[10px] text-emerald-400 font-mono">
                {motionIntensity.toFixed(1)} m/s²
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="4.0"
              step="0.2"
              value={motionIntensity}
              onChange={(e) => handleMotionChange(parseFloat(e.target.value))}
              className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500 mt-2"
            />
          </div>

          {/* BLE Beacon Count */}
          <div className="p-3 rounded-lg border bg-slate-950/60 border-slate-800 text-slate-300">
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="font-bold flex items-center gap-1.5">
                <Wifi className="w-3.5 h-3.5 text-sky-400" /> BLE Peripherals
              </span>
              <span className="text-[10px] text-sky-400 font-mono">
                {bleDeviceCount} Devices
              </span>
            </div>
            <div className="flex items-center gap-1 mt-2">
              {[0, 1, 2, 4].map((count) => (
                <button
                  key={count}
                  onClick={() => handleBleChange(count)}
                  className={`flex-1 py-1 text-[11px] font-mono rounded border transition-colors ${
                    bleDeviceCount === count
                      ? 'bg-sky-500/20 border-sky-500/60 text-sky-300 font-bold'
                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {count === 0 ? 'None' : `${count}`}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Live Sensor Feed Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
        {/* 1. Proximity Sensor */}
        <div className="bg-slate-900/70 border border-slate-800/90 rounded-xl p-4">
          <div className="flex items-center justify-between mb-2.5">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-rose-500/10 text-rose-400 border border-rose-500/20">
                <Target className="w-4 h-4" />
              </div>
              <div>
                <h5 className="text-xs font-bold text-slate-200">Proximity Sensor</h5>
                <span className="text-[10px] font-mono text-slate-400">TYPE_PROXIMITY</span>
              </div>
            </div>
            {readings.proximity.isAvailable ? (
              <span className="flex items-center gap-1 text-[10px] text-emerald-400 font-mono">
                <CheckCircle2 className="w-3 h-3" /> ACTIVE
              </span>
            ) : (
              <span className="flex items-center gap-1 text-[10px] text-slate-400 font-mono">
                <XCircle className="w-3 h-3" /> MISSING
              </span>
            )}
          </div>
          <div className="space-y-1 text-xs font-mono bg-slate-950/60 p-2.5 rounded-lg border border-slate-800">
            <div className="flex justify-between">
              <span className="text-slate-400">Status:</span>
              <span className={readings.proximity.values.isNear ? 'text-rose-400 font-bold' : 'text-slate-300'}>
                {readings.proximity.values.isNear ? 'NEAR (< 5 cm)' : 'FAR (> 5 cm)'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Distance:</span>
              <span className="text-slate-200">
                {readings.proximity.values.proximityDistanceCm?.toFixed(1) ?? '5.0'} cm
              </span>
            </div>
          </div>
        </div>

        {/* 2. Accelerometer */}
        <div className="bg-slate-900/70 border border-slate-800/90 rounded-xl p-4">
          <div className="flex items-center justify-between mb-2.5">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <Activity className="w-4 h-4" />
              </div>
              <div>
                <h5 className="text-xs font-bold text-slate-200">Accelerometer (Vibration)</h5>
                <span className="text-[10px] font-mono text-slate-400">TYPE_ACCELEROMETER</span>
              </div>
            </div>
            <span className="flex items-center gap-1 text-[10px] text-emerald-400 font-mono">
              <CheckCircle2 className="w-3 h-3" /> 15 Hz
            </span>
          </div>
          <div className="space-y-1 text-xs font-mono bg-slate-950/60 p-2.5 rounded-lg border border-slate-800">
            <div className="flex justify-between">
              <span className="text-slate-400">Motion Delta:</span>
              <span className="text-emerald-400 font-bold">
                {readings.accelerometer.values.motionDelta?.toFixed(2) ?? '0.00'} m/s²
              </span>
            </div>
            <div className="flex justify-between text-[11px] text-slate-400">
              <span>X: {readings.accelerometer.values.accelX?.toFixed(1) ?? '0.0'}</span>
              <span>Y: {readings.accelerometer.values.accelY?.toFixed(1) ?? '0.0'}</span>
              <span>Z: {readings.accelerometer.values.accelZ?.toFixed(1) ?? '9.8'}</span>
            </div>
          </div>
        </div>

        {/* 3. Bluetooth LE Scanner */}
        <div className="bg-slate-900/70 border border-slate-800/90 rounded-xl p-4">
          <div className="flex items-center justify-between mb-2.5">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-sky-500/10 text-sky-400 border border-sky-500/20">
                <Wifi className="w-4 h-4" />
              </div>
              <div>
                <h5 className="text-xs font-bold text-slate-200">Bluetooth LE Scan</h5>
                <span className="text-[10px] font-mono text-slate-400">BLE RSSI RANGING</span>
              </div>
            </div>
            <span className="flex items-center gap-1 text-[10px] text-emerald-400 font-mono">
              <CheckCircle2 className="w-3 h-3" /> SCANNING
            </span>
          </div>
          <div className="space-y-1 text-xs font-mono bg-slate-950/60 p-2.5 rounded-lg border border-slate-800">
            <div className="flex justify-between">
              <span className="text-slate-400">Nearby Devices:</span>
              <span className="text-sky-300 font-bold">
                {readings.ble.values.bleCount ?? 0} Detected
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Strongest RSSI:</span>
              <span className="text-slate-200">
                {readings.ble.values.strongestRssi ? `${readings.ble.values.strongestRssi} dBm` : 'N/A'}
              </span>
            </div>
          </div>
        </div>

        {/* 4. Ambient Light Sensor */}
        <div className="bg-slate-900/70 border border-slate-800/90 rounded-xl p-4">
          <div className="flex items-center justify-between mb-2.5">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20">
                <SunMedium className="w-4 h-4" />
              </div>
              <div>
                <h5 className="text-xs font-bold text-slate-200">Ambient Light</h5>
                <span className="text-[10px] font-mono text-slate-400">TYPE_LIGHT</span>
              </div>
            </div>
            <span className="flex items-center gap-1 text-[10px] text-emerald-400 font-mono">
              <CheckCircle2 className="w-3 h-3" /> ACTIVE
            </span>
          </div>
          <div className="space-y-1 text-xs font-mono bg-slate-950/60 p-2.5 rounded-lg border border-slate-800">
            <div className="flex justify-between">
              <span className="text-slate-400">Illuminance:</span>
              <span className="text-amber-300 font-bold">
                {readings.light.values.lux?.toFixed(0) ?? '320'} lx
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Occlusion State:</span>
              <span className={readings.light.values.isOccluded ? 'text-amber-400 font-bold' : 'text-slate-400'}>
                {readings.light.values.isOccluded ? 'SHADOW / COVERED' : 'CLEAR'}
              </span>
            </div>
          </div>
        </div>

        {/* 5. Acoustic / Ultrasonic */}
        <div className="bg-slate-900/70 border border-slate-800/90 rounded-xl p-4">
          <div className="flex items-center justify-between mb-2.5">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-purple-500/10 text-purple-400 border border-purple-500/20">
                <Volume2 className="w-4 h-4" />
              </div>
              <div>
                <h5 className="text-xs font-bold text-slate-200">Acoustic & Ultrasonic</h5>
                <span className="text-[10px] font-mono text-slate-400">NOISE FLOOR SPECTRUM</span>
              </div>
            </div>
            <span className={`flex items-center gap-1 text-[10px] font-mono ${isMicActive ? 'text-purple-400' : 'text-slate-400'}`}>
              {isMicActive ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
              {isMicActive ? 'HARDWARE' : 'SIMULATED'}
            </span>
          </div>
          <div className="space-y-1 text-xs font-mono bg-slate-950/60 p-2.5 rounded-lg border border-slate-800">
            <div className="flex justify-between">
              <span className="text-slate-400">Anomaly Index:</span>
              <span className="text-purple-300 font-bold">
                {readings.acoustic.values.acousticAnomalyScore?.toFixed(0) ?? '0'}%
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Sound Level:</span>
              <span className="text-slate-200">
                {readings.acoustic.values.soundLevelDb?.toFixed(0) ?? '-65'} dB
              </span>
            </div>
          </div>
        </div>

        {/* 6. Gyroscope & Magnetometer */}
        <div className="bg-slate-900/70 border border-slate-800/90 rounded-xl p-4">
          <div className="flex items-center justify-between mb-2.5">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                <Compass className="w-4 h-4" />
              </div>
              <div>
                <h5 className="text-xs font-bold text-slate-200">Gyro & Magnetic Flux</h5>
                <span className="text-[10px] font-mono text-slate-400">TYPE_MAGNETIC_FIELD</span>
              </div>
            </div>
            <span className="flex items-center gap-1 text-[10px] text-emerald-400 font-mono">
              <CheckCircle2 className="w-3 h-3" /> CALIBRATED
            </span>
          </div>
          <div className="space-y-1 text-xs font-mono bg-slate-950/60 p-2.5 rounded-lg border border-slate-800">
            <div className="flex justify-between">
              <span className="text-slate-400">Rotation Delta:</span>
              <span className="text-cyan-300">
                {readings.gyroscope.values.rotationDelta?.toFixed(2) ?? '0.00'} rad/s
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Mag Flux Anomaly:</span>
              <span className="text-slate-200">
                {readings.magnetometer.values.magAnomoly?.toFixed(1) ?? '0.4'} µT
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
