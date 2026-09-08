import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Radar, 
  RadarProps 
} from './components/Radar';
import { PresenceMeter } from './components/PresenceMeter';
import { SensorPanel } from './components/SensorPanel';
import { SettingsPanel } from './components/SettingsPanel';
import { AndroidCodeViewer } from './components/AndroidCodeViewer';
import { 
  SensorReading, 
  SensorType, 
  RadarBlip, 
  PresenceState, 
  FusionConfig 
} from './types';
import { 
  PresenceFusionEngine, 
  DEFAULT_FUSION_CONFIG 
} from './utils/fusionEngine';
import { radarAudio } from './utils/audioSynth';
import { 
  Radio, 
  Sliders, 
  Activity, 
  FileCode, 
  Volume2, 
  VolumeX, 
  Sparkles, 
  ShieldCheck, 
  RefreshCw,
  Info
} from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState<'radar' | 'sensors' | 'settings' | 'code'>('radar');
  const [fusionConfig, setFusionConfig] = useState<FusionConfig>(DEFAULT_FUSION_CONFIG);
  const [manualConfidenceOverride, setManualConfidenceOverride] = useState<number | null>(null);
  const [isMicActive, setIsMicActive] = useState(false);
  const [selectedBlip, setSelectedBlip] = useState<RadarBlip | null>(null);

  // Fusion Engine Instance
  const fusionEngineRef = useRef<PresenceFusionEngine>(new PresenceFusionEngine());

  // Sensor state store
  const [sensorReadings, setSensorReadings] = useState<Record<SensorType, SensorReading>>({
    proximity: { type: 'proximity', timestamp: Date.now(), isAvailable: true, values: { isNear: false, proximityDistanceCm: 5.0 } },
    accelerometer: { type: 'accelerometer', timestamp: Date.now(), isAvailable: true, values: { motionDelta: 0.05, accelX: 0, accelY: 0, accelZ: 9.8 } },
    gyroscope: { type: 'gyroscope', timestamp: Date.now(), isAvailable: true, values: { rotationDelta: 0.02, gyroX: 0, gyroY: 0, gyroZ: 0 } },
    light: { type: 'light', timestamp: Date.now(), isAvailable: true, values: { lux: 320, isOccluded: false } },
    magnetometer: { type: 'magnetometer', timestamp: Date.now(), isAvailable: true, values: { magAnomoly: 0.4, magX: 18, magY: -5, magZ: 42 } },
    ble: { 
      type: 'ble', 
      timestamp: Date.now(), 
      isAvailable: true, 
      values: { 
        bleCount: 1, 
        strongestRssi: -78,
        nearbyDevices: [{ id: 'BLE-01', rssi: -78, name: 'Smart Accessory', estimatedDistanceM: 1.4 }] 
      } 
    },
    acoustic: { type: 'acoustic', timestamp: Date.now(), isAvailable: true, values: { soundLevelDb: -65, acousticAnomalyScore: 5 } },
  });

  // Current calculated Presence state
  const [presenceState, setPresenceState] = useState<PresenceState>({
    confidenceScore: 0,
    presenceLevel: 'CLEAR',
    dominantSensor: 'none',
    breakdown: { proximity: 0, accelerometer: 0, gyroscope: 0, light: 0, magnetometer: 0, ble: 0, acoustic: 0 },
    lastUpdated: Date.now(),
    alertTriggered: false,
    estimatedProximityMeters: undefined,
  });

  // Audio Context stream for real microphone
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);

  // Dynamic Radar Blips generated based on sensor state
  const blips: RadarBlip[] = useMemo(() => {
    const list: RadarBlip[] = [];
    const now = Date.now();

    // 1. Proximity Blip if Near
    if (sensorReadings.proximity.values.isNear) {
      list.push({
        id: 'blip-prox',
        angle: 15,
        distance: 0.22, // very close to center
        strength: 95,
        type: 'proximity',
        label: 'Direct Obstacle (Hand/Body)',
        lastDetected: now,
      });
    }

    // 2. Motion / Vibration Blips
    const motion = sensorReadings.accelerometer.values.motionDelta ?? 0;
    if (motion > 0.3) {
      list.push({
        id: 'blip-motion',
        angle: 140,
        distance: Math.max(0.2, Math.min(0.85, 1.0 - (motion / 4.0))),
        strength: Math.min(100, Math.round(motion * 30)),
        type: 'accelerometer',
        label: `Surface Vibration (${motion.toFixed(1)} m/s²)`,
        lastDetected: now,
      });
    }

    // 3. BLE Peripheral Devices
    const devices = sensorReadings.ble.values.nearbyDevices ?? [];
    devices.forEach((dev, idx) => {
      const angles = [65, 210, 310, 175];
      const dist = Math.max(0.25, Math.min(0.9, (Math.abs(dev.rssi) - 40) / 60));
      list.push({
        id: dev.id,
        angle: angles[idx % angles.length],
        distance: dist,
        strength: Math.max(10, Math.min(95, (dev.rssi + 100) * 1.5)),
        type: 'ble',
        label: `${dev.name || 'BLE Device'} (${dev.rssi} dBm)`,
        lastDetected: now,
      });
    });

    // 4. Acoustic Anomaly Blip
    const acousticScore = sensorReadings.acoustic.values.acousticAnomalyScore ?? 0;
    if (acousticScore > 20) {
      list.push({
        id: 'blip-acoustic',
        angle: 260,
        distance: Math.max(0.3, Math.min(0.85, 1.0 - (acousticScore / 130))),
        strength: acousticScore,
        type: 'acoustic',
        label: `Acoustic Signature (${acousticScore.toFixed(0)}%)`,
        lastDetected: now,
      });
    }

    // 5. Light Occlusion Blip
    if (sensorReadings.light.values.isOccluded) {
      list.push({
        id: 'blip-light',
        angle: 330,
        distance: 0.35,
        strength: 80,
        type: 'light',
        label: 'Light Occlusion Shadow',
        lastDetected: now,
      });
    }

    return list;
  }, [sensorReadings]);

  // Main fusion loop
  useEffect(() => {
    const intervalMs = Math.round(1000 / fusionConfig.updateRateHz);

    const timer = setInterval(() => {
      // Feed readings into engine
      (Object.keys(sensorReadings) as SensorType[]).forEach((type) => {
        fusionEngineRef.current.updateSensorReading(sensorReadings[type]);
      });

      const calculated = fusionEngineRef.current.calculateState(fusionConfig);

      // Check for manual override in demo mode
      if (manualConfidenceOverride !== null) {
        calculated.confidenceScore = manualConfidenceOverride;
        calculated.alertTriggered = manualConfidenceOverride >= fusionConfig.alertThreshold;
        if (manualConfidenceOverride >= 80) calculated.presenceLevel = 'IMMEDIATE';
        else if (manualConfidenceOverride >= 55) calculated.presenceLevel = 'ELEVATED';
        else if (manualConfidenceOverride >= 25) calculated.presenceLevel = 'POSSIBLE';
        else calculated.presenceLevel = 'CLEAR';
      }

      setPresenceState(calculated);

      // Trigger audio sonar ping if enabled
      if (fusionConfig.soundAlerts && calculated.confidenceScore > 10) {
        radarAudio.playSonarPing(calculated.confidenceScore);
      }

      // Trigger vibration alert if enabled and threshold crossed
      if (calculated.alertTriggered && fusionConfig.vibrationAlerts && typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate(60);
      }
    }, intervalMs);

    return () => clearInterval(timer);
  }, [sensorReadings, fusionConfig, manualConfidenceOverride]);

  // Real Web Motion Listener (when running on actual mobile device)
  useEffect(() => {
    const handleDeviceMotion = (e: DeviceMotionEvent) => {
      if (!e.accelerationIncludingGravity) return;
      const x = e.accelerationIncludingGravity.x ?? 0;
      const y = e.accelerationIncludingGravity.y ?? 0;
      const z = e.accelerationIncludingGravity.z ?? 9.8;
      const mag = Math.sqrt(x * x + y * y + z * z);
      const delta = Math.abs(mag - 9.8);

      if (delta > 0.15) {
        setSensorReadings((prev) => ({
          ...prev,
          accelerometer: {
            type: 'accelerometer',
            timestamp: Date.now(),
            isAvailable: true,
            values: {
              accelX: +x.toFixed(2),
              accelY: +y.toFixed(2),
              accelZ: +z.toFixed(2),
              motionDelta: +delta.toFixed(2),
            },
          },
        }));
      }
    };

    if (typeof window !== 'undefined' && 'ondevicemotion' in window) {
      window.addEventListener('devicemotion', handleDeviceMotion);
    }
    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('devicemotion', handleDeviceMotion);
      }
    };
  }, []);

  // Real Microphone Stream Setup
  const toggleMicrophone = async () => {
    if (isMicActive) {
      // Turn off
      if (micStreamRef.current) {
        micStreamRef.current.getTracks().forEach((track) => track.stop());
      }
      if (audioContextRef.current) {
        audioContextRef.current.close().catch(() => {});
      }
      setIsMicActive(false);
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      micStreamRef.current = stream;

      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const audioCtx = new AudioCtx();
      audioContextRef.current = audioCtx;

      const source = audioCtx.createMediaStreamSource(stream);
      audioSourceRef.current = source;

      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      analyserRef.current = analyser;

      setIsMicActive(true);

      // Read audio volume in loop
      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      const processAudio = () => {
        if (!analyserRef.current || !micStreamRef.current) return;
        analyserRef.current.getByteFrequencyData(dataArray);

        let sum = 0;
        for (let i = 0; i < bufferLength; i++) {
          sum += dataArray[i];
        }
        const avg = sum / bufferLength;
        const db = Math.round((avg / 255) * 80 - 80);
        const anomaly = Math.min(100, Math.max(0, Math.round((avg / 90) * 100)));

        setSensorReadings((prev) => ({
          ...prev,
          acoustic: {
            type: 'acoustic',
            timestamp: Date.now(),
            isAvailable: true,
            values: {
              soundLevelDb: db,
              acousticAnomalyScore: anomaly,
            },
          },
        }));

        if (micStreamRef.current?.active) {
          requestAnimationFrame(processAudio);
        }
      };

      requestAnimationFrame(processAudio);
    } catch {
      setIsMicActive(false);
    }
  };

  // Helper to trigger simulated sensor values
  const handleTriggerSimulation = (type: SensorType, values: Record<string, unknown>) => {
    setManualConfidenceOverride(null); // Return to engine-driven mode
    setSensorReadings((prev) => ({
      ...prev,
      [type]: {
        ...prev[type],
        timestamp: Date.now(),
        values: {
          ...prev[type].values,
          ...values,
        },
      },
    }));
  };

  // Preset Scenario Handlers
  const handleScenarioPreset = (presetName: string) => {
    switch (presetName) {
      case 'idle':
        setManualConfidenceOverride(null);
        fusionEngineRef.current.reset();
        setSensorReadings({
          proximity: { type: 'proximity', timestamp: Date.now(), isAvailable: true, values: { isNear: false, proximityDistanceCm: 5.0 } },
          accelerometer: { type: 'accelerometer', timestamp: Date.now(), isAvailable: true, values: { motionDelta: 0.02 } },
          gyroscope: { type: 'gyroscope', timestamp: Date.now(), isAvailable: true, values: { rotationDelta: 0.01 } },
          light: { type: 'light', timestamp: Date.now(), isAvailable: true, values: { lux: 320, isOccluded: false } },
          magnetometer: { type: 'magnetometer', timestamp: Date.now(), isAvailable: true, values: { magAnomoly: 0.2 } },
          ble: { type: 'ble', timestamp: Date.now(), isAvailable: true, values: { bleCount: 0, strongestRssi: -95, nearbyDevices: [] } },
          acoustic: { type: 'acoustic', timestamp: Date.now(), isAvailable: true, values: { soundLevelDb: -72, acousticAnomalyScore: 0 } },
        });
        break;

      case 'walking':
        setManualConfidenceOverride(null);
        setSensorReadings({
          proximity: { type: 'proximity', timestamp: Date.now(), isAvailable: true, values: { isNear: false, proximityDistanceCm: 5.0 } },
          accelerometer: { type: 'accelerometer', timestamp: Date.now(), isAvailable: true, values: { motionDelta: 0.85 } },
          gyroscope: { type: 'gyroscope', timestamp: Date.now(), isAvailable: true, values: { rotationDelta: 0.4 } },
          light: { type: 'light', timestamp: Date.now(), isAvailable: true, values: { lux: 280, isOccluded: false } },
          magnetometer: { type: 'magnetometer', timestamp: Date.now(), isAvailable: true, values: { magAnomoly: 1.5 } },
          ble: { 
            type: 'ble', 
            timestamp: Date.now(), 
            isAvailable: true, 
            values: { 
              bleCount: 1, 
              strongestRssi: -74,
              nearbyDevices: [{ id: 'DEV-WALK', rssi: -74, name: 'Approaching Fitness Band', estimatedDistanceM: 1.8 }] 
            } 
          },
          acoustic: { type: 'acoustic', timestamp: Date.now(), isAvailable: true, values: { soundLevelDb: -52, acousticAnomalyScore: 35 } },
        });
        break;

      case 'ble_proximity':
        setManualConfidenceOverride(null);
        setSensorReadings({
          proximity: { type: 'proximity', timestamp: Date.now(), isAvailable: true, values: { isNear: false, proximityDistanceCm: 5.0 } },
          accelerometer: { type: 'accelerometer', timestamp: Date.now(), isAvailable: true, values: { motionDelta: 0.15 } },
          gyroscope: { type: 'gyroscope', timestamp: Date.now(), isAvailable: true, values: { rotationDelta: 0.1 } },
          light: { type: 'light', timestamp: Date.now(), isAvailable: true, values: { lux: 310, isOccluded: false } },
          magnetometer: { type: 'magnetometer', timestamp: Date.now(), isAvailable: true, values: { magAnomoly: 0.8 } },
          ble: { 
            type: 'ble', 
            timestamp: Date.now(), 
            isAvailable: true, 
            values: { 
              bleCount: 3, 
              strongestRssi: -48,
              nearbyDevices: [
                { id: 'DEV-01', rssi: -48, name: 'Nearby Phone', estimatedDistanceM: 0.6 },
                { id: 'DEV-02', rssi: -62, name: 'Smart Watch', estimatedDistanceM: 1.1 },
                { id: 'DEV-03', rssi: -78, name: 'BLE Tag', estimatedDistanceM: 2.1 }
              ] 
            } 
          },
          acoustic: { type: 'acoustic', timestamp: Date.now(), isAvailable: true, values: { soundLevelDb: -60, acousticAnomalyScore: 12 } },
        });
        break;

      case 'elevated':
        setManualConfidenceOverride(null);
        setSensorReadings({
          proximity: { type: 'proximity', timestamp: Date.now(), isAvailable: true, values: { isNear: false, proximityDistanceCm: 5.0 } },
          accelerometer: { type: 'accelerometer', timestamp: Date.now(), isAvailable: true, values: { motionDelta: 1.8 } },
          gyroscope: { type: 'gyroscope', timestamp: Date.now(), isAvailable: true, values: { rotationDelta: 0.9 } },
          light: { type: 'light', timestamp: Date.now(), isAvailable: true, values: { lux: 40, isOccluded: true } },
          magnetometer: { type: 'magnetometer', timestamp: Date.now(), isAvailable: true, values: { magAnomoly: 6.2 } },
          ble: { 
            type: 'ble', 
            timestamp: Date.now(), 
            isAvailable: true, 
            values: { 
              bleCount: 2, 
              strongestRssi: -45,
              nearbyDevices: [
                { id: 'DEV-HIGH', rssi: -45, name: 'Handheld Mobile', estimatedDistanceM: 0.5 }
              ] 
            } 
          },
          acoustic: { type: 'acoustic', timestamp: Date.now(), isAvailable: true, values: { soundLevelDb: -42, acousticAnomalyScore: 72 } },
        });
        break;

      case 'immediate_proximity':
        setManualConfidenceOverride(null);
        setSensorReadings({
          proximity: { type: 'proximity', timestamp: Date.now(), isAvailable: true, values: { isNear: true, proximityDistanceCm: 0.8 } },
          accelerometer: { type: 'accelerometer', timestamp: Date.now(), isAvailable: true, values: { motionDelta: 2.2 } },
          gyroscope: { type: 'gyroscope', timestamp: Date.now(), isAvailable: true, values: { rotationDelta: 1.2 } },
          light: { type: 'light', timestamp: Date.now(), isAvailable: true, values: { lux: 2, isOccluded: true } },
          magnetometer: { type: 'magnetometer', timestamp: Date.now(), isAvailable: true, values: { magAnomoly: 12.0 } },
          ble: { 
            type: 'ble', 
            timestamp: Date.now(), 
            isAvailable: true, 
            values: { 
              bleCount: 2, 
              strongestRssi: -38,
              nearbyDevices: [
                { id: 'DEV-PROX', rssi: -38, name: 'Direct User Device', estimatedDistanceM: 0.3 }
              ] 
            } 
          },
          acoustic: { type: 'acoustic', timestamp: Date.now(), isAvailable: true, values: { soundLevelDb: -38, acousticAnomalyScore: 88 } },
        });
        break;
    }
  };

  const displayedScore = presenceState.confidenceScore;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-emerald-500/30 selection:text-emerald-200">
      {/* Top Application Bar */}
      <header className="sticky top-0 z-40 border-b border-slate-800/80 bg-slate-950/85 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-lg shadow-emerald-500/10">
              <Radio className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-bold text-white tracking-tight font-mono">
                  SensorRadar
                </h1>
                <span className="text-[10px] px-2 py-0.5 rounded-full font-mono bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-semibold">
                  NON-CAMERA FUSION
                </span>
              </div>
              <p className="text-xs text-slate-400 hidden sm:block">
                Privacy-friendly nearby human presence estimator with animated radar visualization
              </p>
            </div>
          </div>

          {/* Nav Tabs */}
          <nav className="flex items-center gap-1.5 font-mono text-xs">
            <button
              id="tab-radar-btn"
              onClick={() => setActiveTab('radar')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors ${
                activeTab === 'radar'
                  ? 'bg-slate-800 text-emerald-400 font-bold border border-slate-700 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
              }`}
            >
              <Radio className="w-3.5 h-3.5" />
              <span>Radar</span>
            </button>

            <button
              id="tab-sensors-btn"
              onClick={() => setActiveTab('sensors')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors ${
                activeTab === 'sensors'
                  ? 'bg-slate-800 text-emerald-400 font-bold border border-slate-700 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
              }`}
            >
              <Activity className="w-3.5 h-3.5" />
              <span>Sensors</span>
            </button>

            <button
              id="tab-settings-btn"
              onClick={() => setActiveTab('settings')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors ${
                activeTab === 'settings'
                  ? 'bg-slate-800 text-emerald-400 font-bold border border-slate-700 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
              }`}
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>Tuning</span>
            </button>

            <button
              id="tab-code-btn"
              onClick={() => setActiveTab('code')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors ${
                activeTab === 'code'
                  ? 'bg-slate-800 text-emerald-400 font-bold border border-slate-700 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
              }`}
            >
              <FileCode className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Android Code</span>
            </button>
          </nav>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* TAB 1: RADAR HOME SCREEN */}
        {activeTab === 'radar' && (
          <div className="space-y-6">
            {/* Top Info Banner */}
            <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800/80 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-400 font-mono">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span className="text-slate-300 font-semibold">Camera Access Disabled:</span>
                <span>Estimates nearby human presence solely via Phone Hardware Sensor Fusion (Proximity, BLE RSSI, Accelerometer, Light Occlusion, Acoustic).</span>
              </div>

              {/* Sonar Audio Toggle */}
              <button
                onClick={() => setFusionConfig((c) => ({ ...c, soundAlerts: !c.soundAlerts }))}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs transition-colors ${
                  fusionConfig.soundAlerts
                    ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
                    : 'bg-slate-800/60 border-slate-700 text-slate-400 hover:text-slate-300'
                }`}
              >
                {fusionConfig.soundAlerts ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
                <span>Sonar Sound: {fusionConfig.soundAlerts ? 'ON' : 'OFF'}</span>
              </button>
            </div>

            {/* Radar View Layout (Center Radar Canvas + Side Presence Meter & Stimulators) */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* Left/Center: The Radar Component with Live Confidence Modulation */}
              <div className="lg:col-span-7 bg-slate-900/80 border border-slate-800 rounded-2xl p-6 backdrop-blur-md flex flex-col items-center justify-center relative shadow-2xl">
                <div className="w-full flex items-center justify-between mb-4 border-b border-slate-800/80 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
                    <h2 className="text-sm font-bold font-mono tracking-wider text-slate-200 uppercase">
                      Active Sensor Radar Sweep
                    </h2>
                  </div>

                  <span className="text-xs font-mono text-slate-400">
                    Pulse Intensity: <strong className="text-emerald-400">{displayedScore}%</strong>
                  </span>
                </div>

                {/* THE RADAR COMPONENT */}
                <div className="my-2 p-2 relative flex items-center justify-center">
                  <Radar
                    confidenceScore={displayedScore}
                    size={380}
                    isScanning={true}
                    blips={blips}
                    alertThreshold={fusionConfig.alertThreshold}
                    onBlipClick={(b) => setSelectedBlip(b)}
                    showDistanceLabels={true}
                    showAzimuthLines={true}
                    showBearingNumbers={true}
                    showSweepTrail={true}
                  />
                </div>

                {/* Direct Confidence Modulation Slider */}
                <div className="w-full mt-4 p-4 rounded-xl bg-slate-950/70 border border-slate-800/90 font-mono space-y-2">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-bold text-slate-300 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                      Direct Confidence Modulator (Prop Value):
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-emerald-400 font-bold text-sm">{displayedScore} / 100</span>
                      {manualConfidenceOverride !== null && (
                        <button
                          onClick={() => setManualConfidenceOverride(null)}
                          className="flex items-center gap-1 text-[10px] text-slate-400 hover:text-slate-200 underline"
                        >
                          <RefreshCw className="w-3 h-3" /> Auto Fusion
                        </button>
                      )}
                    </div>
                  </div>

                  <input
                    id="radar-confidence-slider"
                    type="range"
                    min="0"
                    max="100"
                    value={displayedScore}
                    onChange={(e) => {
                      const val = parseInt(e.target.value);
                      setManualConfidenceOverride(val);
                      fusionEngineRef.current.setScore(val);
                    }}
                    className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                  />
                  <div className="flex justify-between text-[10px] text-slate-400">
                    <span>0% (Calm Idle Waves)</span>
                    <span>50% (Active Mid Ripple)</span>
                    <span>100% (High Energy Excited Ping)</span>
                  </div>
                </div>
              </div>

              {/* Right: Presence Meter & Scenario Presets */}
              <div className="lg:col-span-5 space-y-4">
                {/* Confidence & Presence State Gauge */}
                <PresenceMeter
                  state={presenceState}
                  alertThreshold={fusionConfig.alertThreshold}
                />

                {/* Scenario Simulator Presets */}
                <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 sm:p-5 backdrop-blur-md space-y-3 font-mono">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                    <h3 className="text-xs font-bold text-slate-200 tracking-wider uppercase">
                      Presence Signature Scenarios
                    </h3>
                    <span className="text-[11px] text-slate-400">Instant Demo States</span>
                  </div>

                  <div className="space-y-2">
                    <button
                      onClick={() => handleScenarioPreset('idle')}
                      className="w-full p-2.5 rounded-lg bg-slate-950/70 border border-slate-800 text-left hover:border-slate-700 transition-colors flex items-center justify-between group"
                    >
                      <div>
                        <div className="text-xs font-bold text-slate-200 group-hover:text-emerald-400">
                          1. Quiet / Empty Room
                        </div>
                        <div className="text-[11px] text-slate-400 font-sans">
                          Phone resting, ambient lux constant, no BLE or motion delta.
                        </div>
                      </div>
                      <span className="text-xs px-2 py-0.5 rounded bg-slate-800 text-emerald-400 font-bold">
                        0%
                      </span>
                    </button>

                    <button
                      onClick={() => handleScenarioPreset('walking')}
                      className="w-full p-2.5 rounded-lg bg-slate-950/70 border border-slate-800 text-left hover:border-slate-700 transition-colors flex items-center justify-between group"
                    >
                      <div>
                        <div className="text-xs font-bold text-slate-200 group-hover:text-cyan-400">
                          2. Distant Footsteps / Walking
                        </div>
                        <div className="text-[11px] text-slate-400 font-sans">
                          Desk vibration jitter + low acoustic delta detected.
                        </div>
                      </div>
                      <span className="text-xs px-2 py-0.5 rounded bg-slate-800 text-cyan-400 font-bold">
                        35%
                      </span>
                    </button>

                    <button
                      onClick={() => handleScenarioPreset('ble_proximity')}
                      className="w-full p-2.5 rounded-lg bg-slate-950/70 border border-slate-800 text-left hover:border-slate-700 transition-colors flex items-center justify-between group"
                    >
                      <div>
                        <div className="text-xs font-bold text-slate-200 group-hover:text-sky-400">
                          3. Nearby BLE Smart Device
                        </div>
                        <div className="text-[11px] text-slate-400 font-sans">
                          Smartwatch / phone detected within -48 dBm RSSI.
                        </div>
                      </div>
                      <span className="text-xs px-2 py-0.5 rounded bg-slate-800 text-sky-400 font-bold">
                        55%
                      </span>
                    </button>

                    <button
                      onClick={() => handleScenarioPreset('elevated')}
                      className="w-full p-2.5 rounded-lg bg-slate-950/70 border border-slate-800 text-left hover:border-slate-700 transition-colors flex items-center justify-between group"
                    >
                      <div>
                        <div className="text-xs font-bold text-slate-200 group-hover:text-amber-400">
                          4. Multi-Sensor Motion + Shadow Pass
                        </div>
                        <div className="text-[11px] text-slate-400 font-sans">
                          Sudden light occlusion + surface movement perturbation.
                        </div>
                      </div>
                      <span className="text-xs px-2 py-0.5 rounded bg-slate-800 text-amber-400 font-bold">
                        75%
                      </span>
                    </button>

                    <button
                      onClick={() => handleScenarioPreset('immediate_proximity')}
                      className="w-full p-2.5 rounded-lg bg-slate-950/70 border border-rose-500/40 text-left hover:border-rose-500 transition-colors flex items-center justify-between group bg-rose-500/5"
                    >
                      <div>
                        <div className="text-xs font-bold text-rose-300">
                          5. Direct Hardware Proximity Trigger
                        </div>
                        <div className="text-[11px] text-slate-400 font-sans">
                          User hand directly covering phone sensor (&lt;5cm).
                        </div>
                      </div>
                      <span className="text-xs px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 font-bold">
                        95%
                      </span>
                    </button>
                  </div>
                </div>

                {/* Selected Blip Detail Card */}
                {selectedBlip && (
                  <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 text-xs font-mono">
                    <div className="flex items-center justify-between text-slate-300 font-bold mb-1">
                      <span>Target: {selectedBlip.label}</span>
                      <button
                        onClick={() => setSelectedBlip(null)}
                        className="text-slate-400 hover:text-slate-200"
                      >
                        ✕
                      </button>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-slate-400 text-[11px] mt-2">
                      <div>Bearing: {selectedBlip.angle.toFixed(0)}°</div>
                      <div>Dist: {(selectedBlip.distance * 2).toFixed(2)}m</div>
                      <div>Signal: {selectedBlip.strength}%</div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: LIVE SENSOR READINGS & HARDWARE STIMULATOR */}
        {activeTab === 'sensors' && (
          <SensorPanel
            readings={sensorReadings}
            onTriggerSimulation={handleTriggerSimulation}
            isMicActive={isMicActive}
            onToggleMic={toggleMicrophone}
          />
        )}

        {/* TAB 3: CALIBRATION & WEIGHT TUNING */}
        {activeTab === 'settings' && (
          <SettingsPanel
            config={fusionConfig}
            onChangeConfig={(newCfg) => setFusionConfig(newCfg)}
          />
        )}

        {/* TAB 4: ANDROID SOURCE CODE VIEWER */}
        {activeTab === 'code' && (
          <AndroidCodeViewer />
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 mt-12 py-6 text-center text-xs text-slate-400 font-mono">
        <div className="max-w-7xl mx-auto px-4 flex flex-wrap items-center justify-between gap-2">
          <span>SensorRadar • Privacy-First Human Presence Estimator</span>
          <span className="text-slate-400">Zero Camera Access • Pure Sensor Fusion</span>
        </div>
      </footer>
    </div>
  );
}
