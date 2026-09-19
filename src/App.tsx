import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { 
  Radar,
  DEFAULT_RADAR_FILTER
} from './components/Radar';
import { PresenceMeter } from './components/PresenceMeter';
import { AndroidCodeViewer } from './components/AndroidCodeViewer';
import { DetectionDetailModal } from './components/DetectionDetailModal';
import { RealityCheckModal } from './components/RealityCheckModal';
import { ShizukuPrivilegedModal } from './components/ShizukuPrivilegedModal';
import { LiveCameraFeed } from './components/LiveCameraFeed';
import { AcousticVisualizer } from './components/AcousticVisualizer';
import { SettingsPanel } from './components/SettingsPanel';
import { SensorMicromanageModal } from './components/SensorMicromanageModal';
import { SensorSoundboard } from './components/soundboard/SensorSoundboard';
import { HumanCalibrationStudio } from './components/HumanCalibrationStudio';
import { CarriedDevicePanel } from './components/CarriedDevicePanel';
import { 
  SensorReading, 
  SensorType, 
  RadarBlip, 
  PresenceState, 
  FusionConfig, 
  SensorPowerMode,
  DetectionClassification,
  RadarFilterSettings,
  CreatureSize,
  DeviceType,
  VehicleType,
  CalibratedHumanProfile,
  CarriedDeviceSignal,
  DeviceSignalFusionMetrics
} from './types';
import { bayesianFusionEngine } from './fusion/bayesianEngine';
import { sessionOrchestrator } from './core/session';
import { sensorRegistry } from './sensors';
import { radarAudio } from './utils/audioSynth';
import { carriedDeviceEngine } from './fusion/carriedDeviceSignalEngine';
import { CameraDetectionTarget } from './sensors/cameraSensor';
import { AcousticAnalysisResult } from './sensors/acousticSensor';
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
  Info,
  Zap,
  Layers,
  Camera,
  Cpu,
  User,
  PawPrint,
  HelpCircle,
  Play,
  RotateCcw,
  Compass,
  Wifi,
  Battery,
  Flame,
  AlertTriangle,
  Car,
  Smartphone,
  SlidersHorizontal,
  Scale,
  Fingerprint,
  CheckCircle2
} from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState<'radar' | 'carried_signals' | 'calibration' | 'soundboard' | 'sensors' | 'settings' | 'code'>('radar');
  const [isAudioMuted, setIsAudioMuted] = useState(false);
  const [selectedBlip, setSelectedBlip] = useState<RadarBlip | null>(null);
  const [showRealityCheck, setShowRealityCheck] = useState(false);
  const [showShizukuModal, setShowShizukuModal] = useState(false);
  const [showMicromanageModal, setShowMicromanageModal] = useState(false);
  const [showCarriedDevicesModal, setShowCarriedDevicesModal] = useState(false);
  const [carriedMetrics, setCarriedMetrics] = useState<DeviceSignalFusionMetrics>(() => carriedDeviceEngine.computeCurrentMetrics());
  const [showOccupancyGrid, setShowOccupancyGrid] = useState(false);
  const [activeCameraFeed, setActiveCameraFeed] = useState(true);
  const [compassHeading, setCompassHeading] = useState(14); // degrees
  const [radarFilters, setRadarFilters] = useState<RadarFilterSettings>(DEFAULT_RADAR_FILTER);

  // Subscribe to carried device engine metrics updates
  useEffect(() => {
    const unsub = carriedDeviceEngine.subscribe((_, newMetrics) => {
      setCarriedMetrics(newMetrics);
    });
    return unsub;
  }, []);

  // Session & Power state
  const [powerMode, setPowerMode] = useState<SensorPowerMode>('full');
  const [shizukuStatus, setShizukuStatus] = useState(sessionOrchestrator.getShizukuStatus());
  const powerBudget = sessionOrchestrator.getPowerBudgetStatus();

  // Fusion Config with saved Calibrated Human Profile restoration
  const [fusionConfig, setFusionConfig] = useState<FusionConfig>(() => {
    const base = bayesianFusionEngine.getConfig();
    try {
      const savedProfile = localStorage.getItem('sensor_radar_active_human_profile');
      if (savedProfile) {
        const parsed = JSON.parse(savedProfile) as CalibratedHumanProfile;
        base.activeHumanProfile = parsed;
        bayesianFusionEngine.updateConfig(base);
      }
    } catch {}
    return base;
  });

  // Real-time fused state & blips
  const [presenceState, setPresenceState] = useState<PresenceState>({
    confidenceScore: 0,
    presenceLevel: 'CLEAR',
    dominantSensor: 'none',
    breakdown: {},
    lastUpdated: Date.now(),
    alertTriggered: false,
    estimatedProximityMeters: undefined,
  });

  const [radarBlips, setRadarBlips] = useState<RadarBlip[]>([]);
  const [cameraDetections, setCameraDetections] = useState<CameraDetectionTarget[]>([]);
  const [acousticData, setAcousticData] = useState<AcousticAnalysisResult | null>(null);

  // Sensor state for telemetry table
  const [latestReadings, setLatestReadings] = useState<Partial<Record<SensorType, SensorReading>>>({});

  // 1. Start all sensors & setup polling loops
  useEffect(() => {
    // Start sensor modules
    sensorRegistry.startAll();

    // Subscribe to sensor readings
    const unsubCamera = sensorRegistry.camera.subscribe((reading) => {
      bayesianFusionEngine.ingestReading(reading);
      setLatestReadings((prev) => ({ ...prev, camera: reading }));
      const val = reading.value as { targets?: CameraDetectionTarget[] };
      if (val?.targets) setCameraDetections(val.targets);
    });

    const unsubAcoustic = sensorRegistry.acoustic.subscribe((reading) => {
      bayesianFusionEngine.ingestReading(reading);
      setLatestReadings((prev) => ({ ...prev, acoustic: reading }));
      setAcousticData(reading.value as AcousticAnalysisResult);
    });

    const unsubWifi = sensorRegistry.wifi.subscribe((reading) => {
      bayesianFusionEngine.ingestReading(reading);
      setLatestReadings((prev) => ({ ...prev, wifi_rssi: reading }));
    });

    const unsubBle = sensorRegistry.ble.subscribe((reading) => {
      bayesianFusionEngine.ingestReading(reading);
      setLatestReadings((prev) => ({ ...prev, ble: reading }));
    });

    const unsubImu = sensorRegistry.imu.subscribe((reading) => {
      bayesianFusionEngine.ingestReading(reading);
      setLatestReadings((prev) => ({ ...prev, accelerometer: reading }));
    });

    const unsubMag = sensorRegistry.magnetometer.subscribe((reading) => {
      bayesianFusionEngine.ingestReading(reading);
      setLatestReadings((prev) => ({ ...prev, magnetometer: reading }));
      const val = reading.value as { headingDeg?: number };
      if (val?.headingDeg !== undefined) {
        setCompassHeading(val.headingDeg);
      }
    });

    const unsubEnv = sensorRegistry.environment.subscribe((reading) => {
      bayesianFusionEngine.ingestReading(reading);
      setLatestReadings((prev) => ({ ...prev, barometer: reading }));
    });

    // Main Fusion Evaluation Heartbeat (15 Hz)
    const evalInterval = setInterval(() => {
      const result = bayesianFusionEngine.evaluateFusion();
      setPresenceState(result.presenceState);
      setRadarBlips(result.radarBlips);

      // Audio feedback when score crosses threshold
      if (!isAudioMuted && result.presenceState.confidenceScore > 25) {
        radarAudio.playRadarTick(result.presenceState.confidenceScore);
      }
    }, 66);

    return () => {
      unsubCamera();
      unsubAcoustic();
      unsubWifi();
      unsubBle();
      unsubImu();
      unsubMag();
      unsubEnv();
      clearInterval(evalInterval);
      sensorRegistry.stopAll();
    };
  }, [isAudioMuted]);

  // Audio mute toggle
  const toggleAudio = () => {
    const next = !isAudioMuted;
    setIsAudioMuted(next);
    radarAudio.setMuted(next);
  };

  // Power Mode change handler
  const handlePowerModeChange = (mode: SensorPowerMode) => {
    setPowerMode(mode);
    sessionOrchestrator.setPowerMode(mode);
  };

  // Shizuku toggle handler
  const handleToggleShizuku = (enabled: boolean) => {
    sessionOrchestrator.setShizukuEnabled(enabled);
    setShizukuStatus(sessionOrchestrator.getShizukuStatus());
  };

  // Emit manual ultrasonic chirp
  const handleEmitChirp = () => {
    sensorRegistry.acoustic.emitUltrasonicChirp();
    if (!isAudioMuted) {
      radarAudio.playPingSound(880);
    }
  };

  // Human Target Identifier Profile Handlers
  const handleSaveHumanProfile = (profile: CalibratedHumanProfile) => {
    const updated: FusionConfig = {
      ...fusionConfig,
      activeHumanProfile: profile,
    };
    setFusionConfig(updated);
    bayesianFusionEngine.updateConfig(updated);
    try {
      localStorage.setItem('sensor_radar_active_human_profile', JSON.stringify(profile));
    } catch {}
  };

  const handleClearHumanProfile = () => {
    const updated: FusionConfig = {
      ...fusionConfig,
      activeHumanProfile: undefined,
    };
    setFusionConfig(updated);
    bayesianFusionEngine.updateConfig(updated);
    try {
      localStorage.removeItem('sensor_radar_active_human_profile');
    } catch {}
  };

  const handleLaunchRadarTest = (profile: CalibratedHumanProfile) => {
    handleSaveHumanProfile(profile);
    setActiveTab('radar');
    setTimeout(() => {
      triggerScenario('calibrated_human');
    }, 280);
  };

  // Preset Scenario Demonstrations
  const triggerScenario = (scenario: 
    | 'human_front' 
    | 'calibrated_human'
    | 'animal_room' 
    | 'cadence_dark' 
    | 'rf_wall' 
    | 'car_passing'
    | 'device_ble'
    | 'creature_small'
    | 'creature_large'
    | 'quiet'
  ) => {
    if (scenario === 'calibrated_human') {
      const prof = fusionConfig.activeHumanProfile;
      const subjectName = prof?.stats.subjectName || 'Alex';
      const weight = prof?.stats.weightKg || 74;
      const cadence = prof?.metrics.gaitCadenceHz || 1.82;
      sensorRegistry.camera.simulateCalibratedHumanDetection(subjectName, weight, 1.4, 8);
      sensorRegistry.acoustic.simulateFootstep(cadence);
      sensorRegistry.wifi.simulateInterference('Calibrated RF Tissue Shadow', 5.2);
      sensorRegistry.ble.simulateNearbyTrack(`${subjectName}'s Phone`, -58, 1.3, 8, 'phone');
      if (!isAudioMuted) {
        radarAudio.playCalibrationStepChime();
      }
    } else if (scenario === 'human_front') {
      sensorRegistry.camera.simulateHumanDetection(1.4, 8);
      sensorRegistry.acoustic.simulateFootstep(1.6);
      sensorRegistry.ble.simulateNearbyTrack('Human Smartphone', -62, 1.3, 8, 'phone');
    } else if (scenario === 'animal_room') {
      sensorRegistry.camera.simulateCreatureBySize('medium', 1.8, -22);
      sensorRegistry.acoustic.simulateAnimalVocalization(78, 338, 'medium');
    } else if (scenario === 'car_passing') {
      sensorRegistry.camera.simulateVehicleDetection('car', 3.8, 135, 42);
      sensorRegistry.acoustic.simulateVehicleRumble(3.8, 135);
      sensorRegistry.magnetometer.simulateDisturbance(2.8);
    } else if (scenario === 'device_ble') {
      sensorRegistry.camera.simulateDeviceDetection('wearable', 1.2, 45);
      sensorRegistry.ble.simulateNearbyTrack('Apple Watch Ultra', -58, 1.2, 45, 'wearable');
    } else if (scenario === 'creature_small') {
      sensorRegistry.camera.simulateCreatureBySize('small', 1.5, 290);
      sensorRegistry.acoustic.simulateAnimalVocalization(82, 290, 'small');
    } else if (scenario === 'creature_large') {
      sensorRegistry.camera.simulateCreatureBySize('large', 2.8, 20);
      sensorRegistry.acoustic.simulateAnimalVocalization(90, 20, 'large');
    } else if (scenario === 'cadence_dark') {
      sensorRegistry.camera.clearDetections();
      sensorRegistry.acoustic.simulateFootstep(1.75);
      sensorRegistry.wifi.simulateInterference('Living Room Mesh Node', 6.2);
    } else if (scenario === 'rf_wall') {
      sensorRegistry.camera.clearDetections();
      sensorRegistry.wifi.simulateInterference('Office AP (Through Wall)', 7.8);
      sensorRegistry.ble.simulateNearbyTrack('Smart TV / Wearable', -82, 3.2, 210, 'tracker');
    } else if (scenario === 'quiet') {
      sensorRegistry.camera.clearDetections();
    }
  };

  const handleModalSimulate = (action: string) => {
    if (action === 'sim_human_center') {
      sensorRegistry.camera.simulateHumanDetection(1.4, 8);
    } else if (action === 'sim_car_passing') {
      sensorRegistry.camera.simulateVehicleDetection('car', 3.8, 135, 38);
      sensorRegistry.acoustic.simulateVehicleRumble(3.8, 135);
    } else if (action === 'sim_creature_small') {
      sensorRegistry.camera.simulateCreatureBySize('small', 1.8, 305);
    } else if (action === 'sim_creature_large') {
      sensorRegistry.camera.simulateCreatureBySize('large', 3.2, 25);
    } else if (action === 'sim_ble_phone') {
      sensorRegistry.ble.simulateNearbyTrack('Pixel 9 Pro', -55, 1.3, 45, 'phone');
    } else if (action === 'sim_ble_tracker') {
      sensorRegistry.ble.simulateNearbyTrack('AirTag Beacon', -74, 0.8, 210, 'tracker');
    } else if (action === 'sim_ultrasonic_ping') {
      handleEmitChirp();
    } else if (action === 'sim_vehicle_rumble') {
      sensorRegistry.acoustic.simulateVehicleRumble(3.5, 115);
    } else if (action === 'sim_rf_perturbation') {
      sensorRegistry.wifi.simulateInterference('Test Perturbation', 5.5);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans flex flex-col antialiased selection:bg-emerald-500 selection:text-black">
      {/* Top Application Header */}
      <header className="sticky top-0 z-40 border-b border-slate-800 bg-slate-950/90 backdrop-blur-md px-4 lg:px-8 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-gradient-to-br from-emerald-500/20 to-cyan-500/20 border border-emerald-500/40 text-emerald-400">
            <Radio className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base sm:text-lg font-bold text-white tracking-tight">
                SensorRadar
              </h1>
              <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
                PROD SENSOR-FUSION
              </span>
            </div>
            <p className="text-[11px] text-slate-400 hidden sm:block">
              Multi-sensor Bayesian presence estimator • Zero cloud dependency
            </p>
          </div>
        </div>

        {/* Action Controls & Modal Triggers */}
        <div className="flex items-center gap-2">
          {/* Reality Check Button */}
          <button
            type="button"
            onClick={() => setShowRealityCheck(true)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-amber-500/10 border border-amber-500/30 text-amber-300 hover:bg-amber-500/20 transition-colors"
            title="Open Reality Check guide on stock Android/iOS physics constraints"
          >
            <Info className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Hardware Reality Check</span>
          </button>

          {/* Shizuku Privileged Button */}
          <button
            type="button"
            onClick={() => setShowShizukuModal(true)}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-mono border transition-colors ${
              shizukuStatus.isEnabled
                ? 'bg-purple-500/20 border-purple-500/40 text-purple-300'
                : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
            }`}
            title="Configure Shizuku ADB-shell throttle bypass"
          >
            <Zap className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Shizuku {shizukuStatus.isEnabled ? 'Active' : 'Off'}</span>
          </button>

          {/* Sound Mute Toggle */}
          <button
            type="button"
            onClick={toggleAudio}
            className={`p-2 rounded-lg border transition-colors ${
              isAudioMuted 
                ? 'bg-slate-900 border-slate-800 text-slate-500' 
                : 'bg-slate-800 border-slate-700 text-emerald-400'
            }`}
            title={isAudioMuted ? 'Unmute radar audio feedback' : 'Mute radar audio feedback'}
          >
            {isAudioMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>
        </div>
      </header>

      {/* Main Tab Navigation */}
      <div className="border-b border-slate-800/80 bg-slate-950/60 px-4 lg:px-8">
        <div className="flex space-x-1 sm:space-x-3 overflow-x-auto py-2 scrollbar-none">
          <button
            type="button"
            onClick={() => setActiveTab('radar')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold whitespace-nowrap transition-all ${
              activeTab === 'radar'
                ? 'bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <Radio className="w-4 h-4" />
            <span>Presence Radar</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('carried_signals')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold whitespace-nowrap transition-all ${
              activeTab === 'carried_signals'
                ? 'bg-gradient-to-r from-cyan-500/20 to-emerald-500/20 border border-cyan-500/40 text-cyan-300 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <Radio className="w-4 h-4 text-cyan-400 animate-pulse" />
            <span>Carried Devices</span>
            {carriedMetrics.accuracyImprovementPercent > 0 ? (
              <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-0.5">
                <Sparkles className="w-2.5 h-2.5 text-emerald-400" />
                +{carriedMetrics.accuracyImprovementPercent}% ACC
              </span>
            ) : (
              <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
                RF FUSION
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('calibration')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold whitespace-nowrap transition-all ${
              activeTab === 'calibration'
                ? 'bg-gradient-to-r from-cyan-500/20 via-emerald-500/20 to-amber-500/20 border border-cyan-500/40 text-cyan-300 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <Fingerprint className="w-4 h-4 text-cyan-400" />
            <span>Human Target Calibration</span>
            {fusionConfig.activeHumanProfile && fusionConfig.activeHumanProfile.isActive ? (
              <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                <CheckCircle2 className="w-2.5 h-2.5 text-emerald-400" />
                TRAINED
              </span>
            ) : (
              <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                TOOL
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('soundboard')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold whitespace-nowrap transition-all ${
              activeTab === 'soundboard'
                ? 'bg-cyan-500/20 border border-cyan-500/40 text-cyan-300 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <SlidersHorizontal className="w-4 h-4 text-cyan-400" />
            <span>Sensor Soundboard</span>
            <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
              NEW
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('sensors')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold whitespace-nowrap transition-all ${
              activeTab === 'sensors'
                ? 'bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <Activity className="w-4 h-4" />
            <span>Sensor Streams & ML</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('settings')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold whitespace-nowrap transition-all ${
              activeTab === 'settings'
                ? 'bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <Sliders className="w-4 h-4" />
            <span>Fusion Calibration & Power</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('code')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold whitespace-nowrap transition-all ${
              activeTab === 'code'
                ? 'bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <FileCode className="w-4 h-4" />
            <span>Android & NDK Source</span>
          </button>
        </div>
      </div>

      {/* Main Content Viewport */}
      <main className="flex-1 p-4 lg:p-8 max-w-7xl mx-auto w-full space-y-6">
        {/* TAB 1: RADAR HOME VIEW */}
        {activeTab === 'radar' && (
          <div className="space-y-6">
            {/* Top Confidence Index Banner */}
            <PresenceMeter 
              state={presenceState}
              alertThreshold={fusionConfig.alertThreshold}
            />

            {/* Quick Scenario Injector Toolbar */}
            <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-3.5 flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-emerald-400" />
                <span className="font-semibold text-slate-200">Hardware & Scenario Injector:</span>
                <span className="text-[11px] text-slate-400 hidden sm:inline">Test multi-sensor cross-validation</span>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => triggerScenario('human_front')}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 transition-colors"
                >
                  <User className="w-3.5 h-3.5" />
                  <span>Human (008° N)</span>
                </button>

                <button
                  type="button"
                  onClick={() => triggerScenario('car_passing')}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 transition-colors"
                >
                  <Car className="w-3.5 h-3.5" />
                  <span>Car (135° SE)</span>
                </button>

                <button
                  type="button"
                  onClick={() => triggerScenario('device_ble')}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-sky-500/10 hover:bg-sky-500/20 text-sky-300 border border-sky-500/30 transition-colors"
                >
                  <Smartphone className="w-3.5 h-3.5" />
                  <span>Device (045° NE)</span>
                </button>

                <button
                  type="button"
                  onClick={() => triggerScenario('creature_small')}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 transition-colors"
                >
                  <PawPrint className="w-3.5 h-3.5" />
                  <span>Cat / Small (&lt;5kg)</span>
                </button>

                <button
                  type="button"
                  onClick={() => triggerScenario('creature_large')}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-600/15 hover:bg-amber-600/25 text-amber-200 border border-amber-600/30 transition-colors"
                >
                  <Scale className="w-3.5 h-3.5" />
                  <span>Large Creature (&gt;25kg)</span>
                </button>

                <button
                  type="button"
                  onClick={() => triggerScenario('cadence_dark')}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 transition-colors"
                >
                  <Activity className="w-3.5 h-3.5" />
                  <span>Footsteps (Dark)</span>
                </button>

                {fusionConfig.activeHumanProfile && fusionConfig.activeHumanProfile.isActive ? (
                  <button
                    type="button"
                    onClick={() => triggerScenario('calibrated_human')}
                    className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-gradient-to-r from-cyan-500/25 via-emerald-500/25 to-amber-500/25 hover:from-cyan-500/35 hover:to-amber-500/35 text-white border border-cyan-400/50 font-bold transition-all shadow-md shadow-cyan-950/50 cursor-pointer"
                    title={`Simulate detection of calibrated user ${fusionConfig.activeHumanProfile.stats.subjectName}`}
                  >
                    <Fingerprint className="w-3.5 h-3.5 text-cyan-300" />
                    <span>Target ID: {fusionConfig.activeHumanProfile.stats.subjectName}</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setActiveTab('calibration')}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-300 border border-cyan-500/30 transition-colors cursor-pointer"
                    title="Train device to recognize your unique physical presence"
                  >
                    <Fingerprint className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Calibrate Me</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => {
                    carriedDeviceEngine.simulatePreset('full_constellation');
                    triggerScenario('human_front');
                    if (!isAudioMuted) {
                      radarAudio.playTargetLocked();
                    }
                  }}
                  className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-gradient-to-r from-emerald-500/25 via-cyan-500/25 to-blue-500/25 hover:from-emerald-500/35 hover:to-blue-500/35 text-white border border-emerald-400/50 font-bold transition-all shadow-md shadow-emerald-950/50 cursor-pointer"
                  title="Simulate human target carrying phone, smartwatch, earbuds & tag (+88% Centimeter Lock)"
                >
                  <Radio className="w-3.5 h-3.5 text-emerald-300" />
                  <span>Carried RF Lock (+88%)</span>
                </button>

                <button
                  type="button"
                  onClick={() => triggerScenario('quiet')}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors cursor-pointer"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Clear</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('soundboard')}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/40 text-cyan-300 font-bold transition-colors cursor-pointer"
                  title="Open Soundboard Mixer Console with rotary knobs and faders"
                >
                  <SlidersHorizontal className="w-3 h-3" />
                  <span>Soundboard Mixer</span>
                </button>
              </div>
            </div>

            {/* Main Radar Display Stage & Side Diagnostics */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* Center Radar Sweep View */}
              <div className="lg:col-span-7 bg-slate-900/80 border border-slate-800 rounded-2xl p-6 flex flex-col items-center justify-center min-h-[500px] shadow-2xl relative">
                <Radar
                  confidenceScore={presenceState.confidenceScore}
                  size={420}
                  isScanning={true}
                  compassHeading={compassHeading}
                  blips={radarBlips}
                  onBlipClick={(blip) => setSelectedBlip(blip)}
                  alertThreshold={fusionConfig.alertThreshold}
                  showOccupancyGrid={showOccupancyGrid}
                  onToggleOccupancyGrid={() => setShowOccupancyGrid(!showOccupancyGrid)}
                  onOpenMicromanage={() => setShowMicromanageModal(true)}
                  onOpenCarriedDevices={() => setShowCarriedDevicesModal(true)}
                  carriedDevicesCount={carriedMetrics.totalCarriedDevices}
                  accuracyBoostPercent={carriedMetrics.accuracyImprovementPercent}
                  filterSettings={radarFilters}
                  onUpdateFilter={setRadarFilters}
                />

                <div className="mt-4 text-center text-xs text-slate-400">
                  <span>Click any radar blip above to inspect contributing sensor breakdowns</span>
                </div>
              </div>

              {/* Right Side: Live Visual & Acoustic Telemetry */}
              <div className="lg:col-span-5 space-y-4">
                {/* On-Device Camera ML Feed */}
                <LiveCameraFeed
                  isActive={activeCameraFeed}
                  onToggleActive={() => setActiveCameraFeed(!activeCameraFeed)}
                  detections={cameraDetections}
                />

                {/* Acoustic Sonar & Bioacoustic Spectrum */}
                <AcousticVisualizer
                  data={acousticData}
                  onEmitChirp={handleEmitChirp}
                />

                {/* Active Detected Targets Table */}
                <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 shadow-xl">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-xs font-semibold text-slate-200 uppercase tracking-wider">
                      Active Classified Tracks ({radarBlips.length})
                    </h4>
                    <span className="text-[11px] font-mono text-slate-500">Tap track for breakdown</span>
                  </div>

                  {radarBlips.length > 0 ? (
                    <div className="space-y-2">
                      {radarBlips.map((blip) => {
                        const isHuman = blip.classification === 'human';
                        const isAnimal = blip.classification === 'animal';
                        const badgeColor = isHuman ? 'text-emerald-400' : (isAnimal ? 'text-amber-400' : 'text-cyan-400');
                        const Icon = isHuman ? User : (isAnimal ? PawPrint : HelpCircle);

                        return (
                          <div
                            key={blip.id}
                            onClick={() => setSelectedBlip(blip)}
                            className="p-2.5 bg-slate-950/80 border border-slate-800 hover:border-slate-700 rounded-xl flex items-center justify-between cursor-pointer transition-colors"
                          >
                            <div className="flex items-center gap-2.5">
                              <div className={`p-1.5 rounded-lg bg-slate-800 ${badgeColor}`}>
                                <Icon className="w-4 h-4" />
                              </div>
                              <div>
                                <div className="text-xs font-bold text-slate-200">
                                  {blip.label}
                                </div>
                                <div className="text-[10px] text-slate-400 font-mono">
                                  {blip.distanceMeters.toFixed(1)}m • Azimuth: {Math.round(blip.angle)}°
                                </div>
                              </div>
                            </div>

                            <div className="text-right">
                              <div className="text-xs font-mono font-bold text-emerald-400">
                                {blip.strength}% Conf
                              </div>
                              <div className="text-[10px] text-slate-500 font-mono">
                                {blip.contributingSensors?.length || 1} sensors
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="p-6 text-center text-xs text-slate-500 bg-slate-950/40 rounded-xl">
                      No active targets currently above noise threshold.
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: MULTI-SENSOR LIVE TELEMETRY */}
        {activeTab === 'sensors' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-white">
                  Hardware Sensor Telemetry & Sampling Streams
                </h3>
                <p className="text-xs text-slate-400">
                  Each sensor runs on an independent asynchronous polling loop with dedicated rolling ring buffers.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs font-mono text-slate-400">
                  Power: <span className="text-emerald-400 font-bold">{powerBudget.estimatedPowerDrawMw} mW</span>
                </span>
              </div>
            </div>

            {/* Grid of 7 Distinct Sensor Modules */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* 1. Camera Sensor */}
              <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 font-semibold text-xs text-emerald-400">
                    <Camera className="w-4 h-4" />
                    <span>Camera + ML Vision</span>
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                    8 FPS (Active)
                  </span>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Primary deciding vote for human vs animal classification in front 68° optical field-of-view.
                </p>
                <div className="p-2.5 bg-slate-950 rounded-xl text-xs font-mono text-slate-300 space-y-1">
                  <div>Targets: {cameraDetections.length}</div>
                  <div>Primary: {cameraDetections[0]?.subClass || 'None'}</div>
                  <div>Delegate: NNAPI / GPU INT8</div>
                </div>
              </div>

              {/* 2. Acoustic Sensor */}
              <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 font-semibold text-xs text-purple-400">
                    <Volume2 className="w-4 h-4" />
                    <span>Acoustic Sonar & Mic</span>
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                    44.1 kHz FFT
                  </span>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  18.5–20.4 kHz active ultrasonic chirp ranging + passive footstep cadence detection (20–180Hz).
                </p>
                <div className="p-2.5 bg-slate-950 rounded-xl text-xs font-mono text-slate-300 space-y-1">
                  <div>Cadence: {acousticData?.footstepCadenceDetected ? `${acousticData.footstepHz} Hz` : 'Quiet'}</div>
                  <div>Pet Score: {acousticData?.animalVocalizationScore ?? 0}%</div>
                  <div>Sonar Echo: {acousticData?.ultrasonicEchoDetected ? 'Locked (~1.4m)' : 'Baseline'}</div>
                </div>
              </div>

              {/* 3. WiFi RSSI & RTT */}
              <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 font-semibold text-xs text-cyan-400">
                    <Wifi className="w-4 h-4" />
                    <span>WiFi Multipath & RTT</span>
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                    {shizukuStatus.isEnabled ? '8 Hz (Shizuku)' : 'Throttled'}
                  </span>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Multipath disturbance variance from moving bodies + 802.11mc Time-of-Flight ranging.
                </p>
                <div className="p-2.5 bg-slate-950 rounded-xl text-xs font-mono text-slate-300 space-y-1">
                  <div>APs Tracked: 3 Access Points</div>
                  <div>Disturbance: 4.8 dBm shift</div>
                  <div>802.11mc RTT: Supported (±1.5m)</div>
                </div>
              </div>

              {/* 4. BLE Proximity */}
              <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 font-semibold text-xs text-sky-400">
                    <Activity className="w-4 h-4" />
                    <span>BLE Beacon Proximity</span>
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                    Low-Latency
                  </span>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Near-field (1–5m) Bluetooth beacon signal tracking using log-distance path loss models.
                </p>
                <div className="p-2.5 bg-slate-950 rounded-xl text-xs font-mono text-slate-300 space-y-1">
                  <div>Beacons: 2 detected</div>
                  <div>Strongest: -68 dBm</div>
                  <div>Tx Power Ref: -59 dBm @ 1m</div>
                </div>
              </div>

              {/* 5. IMU Accelerometer & Gyro */}
              <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 font-semibold text-xs text-amber-400">
                    <Activity className="w-4 h-4" />
                    <span>IMU Motion & Vibration</span>
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                    SENSOR_DELAY_GAME
                  </span>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  High-frequency accelerometer & gyro monitoring surface vibrations and phone handling.
                </p>
                <div className="p-2.5 bg-slate-950 rounded-xl text-xs font-mono text-slate-300 space-y-1">
                  <div>Motion Delta: 0.04 m/s²</div>
                  <div>Surface Noise: 0.02 m/s²</div>
                  <div>Handling State: Stationary (Desk)</div>
                </div>
              </div>

              {/* 6. Magnetometer & Compass */}
              <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 font-semibold text-xs text-rose-400">
                    <Compass className="w-4 h-4" />
                    <span>Magnetometer & Heading</span>
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                    50 Hz
                  </span>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Aligns the radar sweep coordinate frame to True North and senses moving ferrous masses.
                </p>
                <div className="p-2.5 bg-slate-950 rounded-xl text-xs font-mono text-slate-300 space-y-1">
                  <div>Azimuth: {Math.round(compassHeading)}° North</div>
                  <div>Magnetic Anomaly: 0.3 µT</div>
                  <div>Calibrated: Yes (3-axis Hard Iron)</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB: CARRIED DEVICE SIGNAL ASSIST */}
        {activeTab === 'carried_signals' && (
          <CarriedDevicePanel />
        )}

        {/* TAB: HUMAN TARGET CALIBRATION STUDIO */}
        {activeTab === 'calibration' && (
          <HumanCalibrationStudio
            config={fusionConfig}
            onSaveProfile={handleSaveHumanProfile}
            onClearProfile={handleClearHumanProfile}
            onLaunchRadarTest={handleLaunchRadarTest}
            currentCompassHeading={compassHeading}
          />
        )}

        {/* TAB: SENSOR SOUNDBOARD STUDIO MIXING CONSOLE */}
        {activeTab === 'soundboard' && (
          <SensorSoundboard
            config={fusionConfig}
            presenceState={presenceState}
            onChangeConfig={(newCfg) => {
              setFusionConfig(newCfg);
              bayesianFusionEngine.updateConfig(newCfg);
            }}
            onSimulate={handleModalSimulate}
            onEmitChirp={handleEmitChirp}
            compassHeading={compassHeading}
          />
        )}

        {/* TAB 3: SETTINGS, FUSION CALIBRATION & SENSOR MICROMANAGEMENT */}
        {activeTab === 'settings' && (
          <SettingsPanel
            config={fusionConfig}
            onChangeConfig={(newCfg) => {
              setFusionConfig(newCfg);
              bayesianFusionEngine.updateConfig(newCfg);
            }}
            onOpenMicromanageModal={() => setShowMicromanageModal(true)}
          />
        )}

        {/* TAB 4: ANDROID & NDK C++ ARCHITECTURE VIEWER */}
        {activeTab === 'code' && (
          <AndroidCodeViewer />
        )}
      </main>

      {/* Sensor Micromanagement Tuning Modal */}
      <SensorMicromanageModal
        isOpen={showMicromanageModal}
        onClose={() => setShowMicromanageModal(false)}
        config={fusionConfig}
        onChangeConfig={(newCfg) => {
          setFusionConfig(newCfg);
          bayesianFusionEngine.updateConfig(newCfg);
        }}
        onSimulate={handleModalSimulate}
      />

      {/* Detection Breakdown Modal when tapping a radar blip */}
      <DetectionDetailModal
        blip={selectedBlip}
        onClose={() => setSelectedBlip(null)}
      />

      {/* Carried Devices Modal when invoked from Radar */}
      {showCarriedDevicesModal && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150"
          onClick={() => setShowCarriedDevicesModal(false)}
        >
          <div 
            className="relative w-full max-w-4xl max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <CarriedDevicePanel onClose={() => setShowCarriedDevicesModal(false)} />
          </div>
        </div>
      )}

      {/* Hardware Reality Check Modal */}
      <RealityCheckModal
        isOpen={showRealityCheck}
        onClose={() => setShowRealityCheck(false)}
      />

      {/* Shizuku Privileged Access Modal */}
      <ShizukuPrivilegedModal
        isOpen={showShizukuModal}
        onClose={() => setShowShizukuModal(false)}
        status={shizukuStatus}
        onToggleShizuku={handleToggleShizuku}
      />
    </div>
  );
}
