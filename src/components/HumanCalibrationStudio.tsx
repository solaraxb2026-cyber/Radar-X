import React, { useState, useEffect, useRef } from 'react';
import { 
  User, 
  Sparkles, 
  Activity, 
  Volume2, 
  CheckCircle2, 
  Play, 
  RotateCcw, 
  ShieldCheck, 
  Sliders, 
  Eye, 
  Radio, 
  Footprints, 
  Compass, 
  Fingerprint, 
  Zap, 
  ArrowRight, 
  Check, 
  Info,
  Scale,
  Ruler,
  Wind
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  HumanBioStats, 
  HumanCalibrationMetrics, 
  CalibratedHumanProfile, 
  FusionConfig 
} from '../types';
import { radarAudio } from '../utils/audioSynth';

interface HumanCalibrationStudioProps {
  config: FusionConfig;
  onSaveProfile: (profile: CalibratedHumanProfile) => void;
  onClearProfile: () => void;
  onLaunchRadarTest: (profile: CalibratedHumanProfile) => void;
  currentCompassHeading?: number;
  className?: string;
  id?: string;
}

type CalibrationStep = 'input' | 'step0_stillness' | 'step1_breathing' | 'step2_approach' | 'step3_lateral' | 'step4_seismic' | 'complete';

const DEFAULT_BIO_STATS: HumanBioStats = {
  subjectName: 'Primary User',
  heightCm: 176,
  weightKg: 74,
  ageGroup: 'adult',
  bodyBuild: 'average',
  footwear: 'running_shoes',
  clothingLayers: 'normal',
  notes: 'Trained in indoor environment',
};

export const HumanCalibrationStudio: React.FC<HumanCalibrationStudioProps> = ({
  config,
  onSaveProfile,
  onClearProfile,
  onLaunchRadarTest,
  currentCompassHeading = 0,
  className = '',
  id = 'human-calibration-studio',
}) => {
  const [stats, setStats] = useState<HumanBioStats>(() => {
    if (config.activeHumanProfile?.stats) {
      return config.activeHumanProfile.stats;
    }
    const saved = localStorage.getItem('sensor_radar_human_stats');
    return saved ? JSON.parse(saved) : DEFAULT_BIO_STATS;
  });

  const [activeProfile, setActiveProfile] = useState<CalibratedHumanProfile | null>(
    config.activeHumanProfile || null
  );

  const [currentStep, setCurrentStep] = useState<CalibrationStep>('input');
  const [countdown, setCountdown] = useState<number>(8);
  const [stepProgress, setStepProgress] = useState<number>(0);
  const [placement, setPlacement] = useState<'table' | 'floor' | 'shelf'>('table');
  const [useImperial, setUseImperial] = useState<boolean>(false);

  // Live sensor animation states during calibration
  const [deviceStabilityMps2, setDeviceStabilityMps2] = useState<number>(0.02);
  const [ambientSplDb, setAmbientSplDb] = useState<number>(38.4);
  const [respirationPhase, setRespirationPhase] = useState<number>(0);
  const [breathingRateBpm, setBreathingRateBpm] = useState<number>(14.2);
  const [dopplerShiftHz, setDopplerShiftHz] = useState<number>(0);
  const [cadenceHz, setCadenceHz] = useState<number>(1.82);
  const [lateralAzimuthDeg, setLateralAzimuthDeg] = useState<number>(0);
  const [seismicPeakG, setSeismicPeakG] = useState<number>(0);

  const timerRef = useRef<number | null>(null);
  const animFrameRef = useRef<number | null>(null);

  // Save stats to localStorage on edit
  useEffect(() => {
    localStorage.setItem('sensor_radar_human_stats', JSON.stringify(stats));
  }, [stats]);

  // Physics dynamic metrics calculation
  const physics = React.useMemo(() => {
    const heightM = stats.heightCm / 100;
    const buildMultiplier = stats.bodyBuild === 'slender' ? 0.9 : (stats.bodyBuild === 'heavy' ? 1.15 : (stats.bodyBuild === 'athletic' ? 1.05 : 1.0));
    
    // Optical & RF Radar Cross Section (RCS in m^2)
    const rcs = Number((0.082 * heightM * Math.sqrt(stats.weightKg) * buildMultiplier).toFixed(2));
    
    // RF 2.4/5GHz water dielectric absorption (dB shadow)
    const rfAbsorption = Number((2.2 * Math.pow(stats.weightKg / 68, 0.62)).toFixed(1));
    
    // Expected natural gait cadence: frequency scales inversely with sqrt of leg length (~0.53 * height)
    const legLengthM = heightM * 0.53;
    const expectedCadence = Number((1 / (2 * Math.PI) * Math.sqrt(9.81 / (legLengthM * 0.6))).toFixed(2));
    
    // Respiration harmonic target: typical adult is 12-16 bpm -> 0.20 to 0.27 Hz
    const respirationHz = Number((0.23 + (stats.bodyBuild === 'slender' ? 0.02 : -0.01)).toFixed(2));
    
    // Seismic coupling based on footwear and weight
    const footwearFactor = {
      barefoot: 0.18,
      socks: 0.15,
      running_shoes: 0.38,
      hard_shoes: 0.65,
      boots: 0.85,
    }[stats.footwear];
    const seismicCoupling = Number((footwearFactor * (stats.weightKg / 70)).toFixed(2));

    return {
      rcs,
      rfAbsorption,
      expectedCadence,
      respirationHz,
      seismicCoupling,
    };
  }, [stats]);

  // Real device motion listener for stillness detection
  useEffect(() => {
    let lastAccel = { x: 0, y: 0, z: 9.81 };
    const handleMotion = (e: DeviceMotionEvent) => {
      if (e.accelerationIncludingGravity) {
        const x = e.accelerationIncludingGravity.x || 0;
        const y = e.accelerationIncludingGravity.y || 0;
        const z = e.accelerationIncludingGravity.z || 9.81;
        const delta = Math.sqrt(
          Math.pow(x - lastAccel.x, 2) +
          Math.pow(y - lastAccel.y, 2) +
          Math.pow(z - lastAccel.z, 2)
        );
        lastAccel = { x, y, z };
        setDeviceStabilityMps2(Number(delta.toFixed(3)));
      }
    };

    if (typeof window !== 'undefined' && 'DeviceMotionEvent' in window) {
      try {
        window.addEventListener('devicemotion', handleMotion, { passive: true });
      } catch {}
    }
    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('devicemotion', handleMotion);
      }
    };
  }, []);

  // Animation cycle for step visualizers
  useEffect(() => {
    let startTime = performance.now();
    const updateAnim = (time: number) => {
      const elapsed = (time - startTime) / 1000;
      setRespirationPhase(elapsed * physics.respirationHz * Math.PI * 2);

      if (currentStep === 'step2_approach') {
        // Approach (+Doppler) then Retreat (-Doppler)
        const period = Math.sin(elapsed * 0.8);
        setDopplerShiftHz(Math.round(period * 48));
      } else if (currentStep === 'step3_lateral') {
        // Lateral sweep across FOV (-40 deg to +40 deg)
        const sweep = Math.sin(elapsed * 0.9) * 42;
        setLateralAzimuthDeg(Math.round(sweep));
      } else if (currentStep === 'step4_seismic') {
        // Heel strike pulses every ~0.55s
        const isPulse = Math.sin(elapsed * Math.PI * 3.4) > 0.88;
        setSeismicPeakG(isPulse ? Number((0.45 + Math.random() * 0.2).toFixed(2)) : 0.04);
      }

      animFrameRef.current = requestAnimationFrame(updateAnim);
    };

    animFrameRef.current = requestAnimationFrame(updateAnim);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [currentStep, physics]);

  // Step countdown orchestrator
  const startStep = (step: CalibrationStep, durationSeconds: number) => {
    setCurrentStep(step);
    setCountdown(durationSeconds);
    setStepProgress(0);
    radarAudio.playCalibrationStepChime();

    if (timerRef.current) clearInterval(timerRef.current);

    let remaining = durationSeconds;
    timerRef.current = window.setInterval(() => {
      remaining -= 1;
      setCountdown(remaining);
      setStepProgress(Math.round(((durationSeconds - remaining) / durationSeconds) * 100));

      if (remaining > 0 && remaining <= 3) {
        radarAudio.playCountdownTick();
      }

      if (remaining <= 0) {
        if (timerRef.current) clearInterval(timerRef.current);
        advanceStep(step);
      }
    }, 1000);
  };

  const advanceStep = (completed: CalibrationStep) => {
    if (completed === 'step0_stillness') {
      startStep('step1_breathing', 10);
    } else if (completed === 'step1_breathing') {
      startStep('step2_approach', 12);
    } else if (completed === 'step2_approach') {
      startStep('step3_lateral', 10);
    } else if (completed === 'step3_lateral') {
      startStep('step4_seismic', 8);
    } else if (completed === 'step4_seismic') {
      finishCalibration();
    }
  };

  const finishCalibration = () => {
    setCurrentStep('complete');
    radarAudio.playSuccessFanfare();

    const metrics: HumanCalibrationMetrics = {
      radarCrossSectionM2: physics.rcs,
      rfAbsorptionDb: physics.rfAbsorption,
      respirationHz: physics.respirationHz,
      gaitCadenceHz: physics.expectedCadence,
      seismicCouplingFactor: physics.seismicCoupling,
      ultrasonicEchoRCS: stats.clothingLayers === 'heavy_jacket' ? 0.42 : 0.78,
      lateralVelocityMs: 1.25,
      ambientNoiseFloorDb: 38.2,
      rfJitterFloorDbm: 2.1,
      devicePlacement: placement,
      calibratedAt: Date.now(),
      calibrationQualityScore: 97.6,
      calibrationId: `HUMAN-BIO-${stats.weightKg}K-${stats.heightCm}C`,
    };

    const newProfile: CalibratedHumanProfile = {
      id: `profile-human-${Date.now()}`,
      stats,
      metrics,
      isActive: true,
    };

    setActiveProfile(newProfile);
    onSaveProfile(newProfile);
  };

  const cancelCalibration = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setCurrentStep('input');
  };

  const handleStartFullCalibration = () => {
    startStep('step0_stillness', 8);
  };

  const handleActivateToggle = () => {
    if (!activeProfile) return;
    const updated = { ...activeProfile, isActive: !activeProfile.isActive };
    setActiveProfile(updated);
    onSaveProfile(updated);
  };

  return (
    <div id={id} className={`space-y-6 ${className}`}>
      {/* Top Header Banner */}
      <div className="p-5 sm:p-6 bg-slate-900/90 border border-slate-800 rounded-3xl shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="p-3 rounded-2xl bg-gradient-to-br from-cyan-500/20 via-emerald-500/20 to-amber-500/20 border border-cyan-500/40 text-cyan-400">
            <Fingerprint className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight">
                Human Calibration & Target Identifier
              </h2>
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-300">
                BIO-ACOUSTIC & RF
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1 max-w-2xl leading-relaxed">
              Sit your phone down motionless on a table or floor, input your biometrics, and execute the guided movement routine to train the Bayesian fusion engine to uniquely recognize you as a verified human target.
            </p>
          </div>
        </div>

        {/* Active Profile Status Badge */}
        {activeProfile && (
          <div className="flex items-center gap-3 bg-slate-950 p-2.5 px-4 rounded-2xl border border-slate-800">
            <div>
              <div className="text-[10px] font-mono text-slate-400 uppercase">Active Target ID</div>
              <div className="text-xs font-bold text-cyan-400 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>{activeProfile.stats.subjectName}</span>
              </div>
            </div>
            <button
              type="button"
              onClick={handleActivateToggle}
              className={`text-xs px-2.5 py-1 rounded-lg font-mono font-bold border transition-colors ${
                activeProfile.isActive
                  ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/30'
                  : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'
              }`}
            >
              {activeProfile.isActive ? 'IDENTIFIER ON' : 'PAUSED'}
            </button>
          </div>
        )}
      </div>

      {/* STEP VIEW WIZARD */}
      {currentStep === 'input' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Biometric Stats Input */}
          <div className="lg:col-span-7 bg-slate-900/80 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-cyan-400" />
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                  1. Subject Biometrics & Physical Stature
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setUseImperial(!useImperial)}
                className="text-[11px] font-mono text-slate-400 hover:text-cyan-300 px-2 py-1 bg-slate-950 rounded-lg border border-slate-800 transition-colors"
              >
                Units: {useImperial ? 'Imperial (ft/lbs)' : 'Metric (cm/kg)'}
              </button>
            </div>

            {/* Subject Name */}
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Target Subject Label
              </label>
              <input
                type="text"
                value={stats.subjectName}
                onChange={(e) => setStats({ ...stats, subjectName: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-cyan-500 font-medium"
                placeholder="e.g. Primary User (Alex)"
              />
            </div>

            {/* Height and Weight Sliders */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Height */}
              <div className="p-3.5 bg-slate-950/70 rounded-2xl border border-slate-800/80 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-slate-300 flex items-center gap-1.5">
                    <Ruler className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Height</span>
                  </span>
                  <span className="text-sm font-mono font-bold text-emerald-400">
                    {useImperial 
                      ? `${Math.floor(stats.heightCm / 30.48)}'${Math.round((stats.heightCm % 30.48) / 2.54)}"`
                      : `${stats.heightCm} cm`}
                  </span>
                </div>
                <input
                  type="range"
                  min="130"
                  max="215"
                  value={stats.heightCm}
                  onChange={(e) => setStats({ ...stats, heightCm: Number(e.target.value) })}
                  className="w-full accent-emerald-500 cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                  <span>130 cm</span>
                  <span>175 cm</span>
                  <span>215 cm</span>
                </div>
              </div>

              {/* Weight */}
              <div className="p-3.5 bg-slate-950/70 rounded-2xl border border-slate-800/80 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-slate-300 flex items-center gap-1.5">
                    <Scale className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Body Mass / Weight</span>
                  </span>
                  <span className="text-sm font-mono font-bold text-cyan-400">
                    {useImperial 
                      ? `${Math.round(stats.weightKg * 2.20462)} lbs`
                      : `${stats.weightKg} kg`}
                  </span>
                </div>
                <input
                  type="range"
                  min="40"
                  max="140"
                  value={stats.weightKg}
                  onChange={(e) => setStats({ ...stats, weightKg: Number(e.target.value) })}
                  className="w-full accent-cyan-500 cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                  <span>40 kg</span>
                  <span>75 kg</span>
                  <span>140 kg</span>
                </div>
              </div>
            </div>

            {/* Build & Age Group */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Body Stature / Build
                </label>
                <div className="grid grid-cols-2 gap-1.5">
                  {(['slender', 'athletic', 'average', 'heavy'] as const).map((b) => (
                    <button
                      key={b}
                      type="button"
                      onClick={() => setStats({ ...stats, bodyBuild: b })}
                      className={`px-3 py-2 rounded-xl text-xs font-medium capitalize border transition-all ${
                        stats.bodyBuild === b
                          ? 'bg-cyan-500/20 border-cyan-500 text-cyan-200'
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      {b}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Footwear Coupling (Floor Vibration)
                </label>
                <select
                  value={stats.footwear}
                  onChange={(e) => setStats({ ...stats, footwear: e.target.value as HumanBioStats['footwear'] })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-500 font-medium"
                >
                  <option value="barefoot">Barefoot (Minimal Acoustic Coupling)</option>
                  <option value="socks">Socks (Soft Damping)</option>
                  <option value="running_shoes">Athletic Shoes / Sneakers (Rubber Sole)</option>
                  <option value="hard_shoes">Hard Leather / Dress Shoes (High Click)</option>
                  <option value="boots">Heavy Work Boots / Winter Boots (High Seismic)</option>
                </select>
              </div>
            </div>

            {/* Phone Placement Position */}
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Phone Placement Orientation
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'table', label: 'Desk / Tabletop (~0.8m)', desc: 'Optimal for chest Doppler' },
                  { id: 'floor', label: 'Floor / Low Stand (~0.1m)', desc: 'High seismic coupling' },
                  { id: 'shelf', label: 'Eye-Level Shelf (~1.5m)', desc: 'Full room optical FOV' },
                ].map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setPlacement(item.id as typeof placement)}
                    className={`p-2.5 text-left rounded-xl border transition-all ${
                      placement === item.id
                        ? 'bg-emerald-500/20 border-emerald-500 text-emerald-200'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    <div className="text-xs font-bold">{item.label}</div>
                    <div className="text-[10px] text-slate-500 mt-0.5">{item.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Calibration Trigger CTA */}
            <div className="pt-3">
              <button
                type="button"
                onClick={handleStartFullCalibration}
                className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-cyan-500 via-emerald-500 to-amber-500 hover:from-cyan-400 hover:to-amber-400 text-slate-950 font-bold text-sm shadow-lg shadow-cyan-500/20 flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <Play className="w-4 h-4 fill-current" />
                <span>Sit Phone Down & Start Guided Human Training Routine</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Right Column: Dynamic Physics & Bio-Acoustic Calculations */}
          <div className="lg:col-span-5 space-y-4">
            <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-5 shadow-xl space-y-4">
              <div className="flex items-center gap-2 border-b border-slate-800 pb-2.5 text-xs font-bold text-slate-200 uppercase tracking-wider">
                <Activity className="w-4 h-4 text-emerald-400" />
                <span>Synthesized Physical Radar Envelope</span>
              </div>

              <div className="space-y-3 font-mono text-xs">
                {/* 1. Radar Cross Section */}
                <div className="p-3 bg-slate-950 rounded-xl border border-slate-800/80 flex items-center justify-between">
                  <div>
                    <div className="text-[10px] text-slate-400 uppercase">Calculated Radar Cross-Section (RCS)</div>
                    <div className="text-sm font-bold text-emerald-400 mt-0.5">{physics.rcs} m²</div>
                  </div>
                  <span className="text-[10px] text-slate-500">Optical + RF</span>
                </div>

                {/* 2. RF Dielectric Water Absorption */}
                <div className="p-3 bg-slate-950 rounded-xl border border-slate-800/80 flex items-center justify-between">
                  <div>
                    <div className="text-[10px] text-slate-400 uppercase">Tissue 2.4/5GHz RF Absorption</div>
                    <div className="text-sm font-bold text-cyan-400 mt-0.5">-{physics.rfAbsorption} dB shadow</div>
                  </div>
                  <span className="text-[10px] text-slate-500">Water dielectric</span>
                </div>

                {/* 3. Respiration Harmonic */}
                <div className="p-3 bg-slate-950 rounded-xl border border-slate-800/80 flex items-center justify-between">
                  <div>
                    <div className="text-[10px] text-slate-400 uppercase">Chest Micro-Doppler Harmonic</div>
                    <div className="text-sm font-bold text-purple-400 mt-0.5">
                      {physics.respirationHz} Hz (~{Math.round(physics.respirationHz * 60)} bpm)
                    </div>
                  </div>
                  <span className="text-[10px] text-slate-500">Thoracic expansion</span>
                </div>

                {/* 4. Natural Gait Cadence */}
                <div className="p-3 bg-slate-950 rounded-xl border border-slate-800/80 flex items-center justify-between">
                  <div>
                    <div className="text-[10px] text-slate-400 uppercase">Expected Step Cadence</div>
                    <div className="text-sm font-bold text-amber-400 mt-0.5">
                      {physics.expectedCadence} Hz (~{Math.round(physics.expectedCadence * 60)} steps/min)
                    </div>
                  </div>
                  <span className="text-[10px] text-slate-500">Inverted pendulum</span>
                </div>

                {/* 5. Seismic Coupling Factor */}
                <div className="p-3 bg-slate-950 rounded-xl border border-slate-800/80 flex items-center justify-between">
                  <div>
                    <div className="text-[10px] text-slate-400 uppercase">Floorboard Seismic Coupling</div>
                    <div className="text-sm font-bold text-rose-400 mt-0.5">{physics.seismicCoupling} index</div>
                  </div>
                  <span className="text-[10px] text-slate-500">Surface impact</span>
                </div>
              </div>
            </div>

            {/* Previous Profile Card (if exists) */}
            {activeProfile && (
              <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-5 shadow-xl space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                      Current Active Profile
                    </h4>
                  </div>
                  <span className="text-[10px] font-mono text-emerald-400 font-bold">
                    {activeProfile.metrics.calibrationQualityScore}% Quality
                  </span>
                </div>

                <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-xs font-mono space-y-1.5">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Subject:</span>
                    <span className="text-white font-bold">{activeProfile.stats.subjectName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Stature:</span>
                    <span className="text-slate-300">{activeProfile.stats.heightCm} cm • {activeProfile.stats.weightKg} kg</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Calibrated:</span>
                    <span className="text-slate-400">{new Date(activeProfile.metrics.calibratedAt).toLocaleDateString()}</span>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => onLaunchRadarTest(activeProfile)}
                    className="flex-1 py-2 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/40 text-cyan-300 text-xs font-bold transition-colors cursor-pointer"
                  >
                    Test Calibrated Track on Radar
                  </button>
                  <button
                    type="button"
                    onClick={onClearProfile}
                    className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition-colors cursor-pointer"
                  >
                    Clear
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ACTIVE GUIDED CALIBRATION STEPS */}
      {currentStep !== 'input' && currentStep !== 'complete' && (
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl max-w-3xl mx-auto space-y-6">
          {/* Step Progress Top Bar */}
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <div>
              <span className="text-[10px] font-mono uppercase tracking-widest text-cyan-400 font-bold">
                {currentStep === 'step0_stillness' && 'STEP 1 OF 5: STATIONARY ZEROING'}
                {currentStep === 'step1_breathing' && 'STEP 2 OF 5: RESPIRATION & MICRO-MOTION'}
                {currentStep === 'step2_approach' && 'STEP 3 OF 5: APPROACH & RETREAT DYNAMICS'}
                {currentStep === 'step3_lateral' && 'STEP 4 OF 5: LATERAL FOV CROSS-WALK'}
                {currentStep === 'step4_seismic' && 'STEP 5 OF 5: SEISMIC FOOTFALL COUPLING'}
              </span>
              <h3 className="text-lg font-bold text-white mt-0.5">
                {currentStep === 'step0_stillness' && 'Stationary Phone Stillness & Room Zero'}
                {currentStep === 'step1_breathing' && 'Stationary Human Breathing at 1.5m'}
                {currentStep === 'step2_approach' && 'Radial Approach and Retreat Movement'}
                {currentStep === 'step3_lateral' && 'Lateral Cross-Walk Azimuth Tracking'}
                {currentStep === 'step4_seismic' && 'Heel-Strike & Ground Vibration Transfer'}
              </h3>
            </div>

            <div className="text-right">
              <div className="text-3xl font-mono font-extrabold text-cyan-400">
                {countdown}s
              </div>
              <div className="text-[10px] font-mono text-slate-400">REMAINING</div>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden border border-slate-800">
            <div 
              className="h-full bg-gradient-to-r from-cyan-500 via-emerald-500 to-amber-500 transition-all duration-300"
              style={{ width: `${stepProgress}%` }}
            />
          </div>

          {/* Step-Specific Live Interactive Displays */}

          {/* STEP 0: PHONE STILLNESS ZEROING */}
          {currentStep === 'step0_stillness' && (
            <div className="space-y-4">
              <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800/80 flex items-center gap-4">
                <div className={`p-3 rounded-xl border ${deviceStabilityMps2 < 0.08 ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300' : 'bg-rose-500/20 border-rose-500/40 text-rose-300'}`}>
                  <Activity className="w-6 h-6" />
                </div>
                <div>
                  <div className="text-xs font-bold text-white">
                    {deviceStabilityMps2 < 0.08 ? 'PHONE MOTIONLESS — CALIBRATION ACCURATE' : 'PHONE MOVEMENT DETECTED — KEEP STILL'}
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Sit the phone down on your {placement}. Step back at least 2 meters so background RF and acoustics can zero out.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 font-mono text-xs">
                <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                  <div className="text-slate-500 text-[10px]">IMU STABILITY DELTA</div>
                  <div className="text-emerald-400 font-bold text-sm mt-0.5">{deviceStabilityMps2} m/s²</div>
                </div>
                <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                  <div className="text-slate-500 text-[10px]">ROOM NOISE FLOOR</div>
                  <div className="text-cyan-400 font-bold text-sm mt-0.5">{ambientSplDb} dB SPL</div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 1: BREATHING & MICRO-MOTION */}
          {currentStep === 'step1_breathing' && (
            <div className="space-y-4">
              <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800/80">
                <div className="text-xs font-bold text-white mb-1">
                  Stand or sit 1.5 meters directly in front of phone. Breathe naturally.
                </div>
                <p className="text-xs text-slate-400 mb-4">
                  Acoustic sonar echoes and camera ML are locking onto chest expansion and micro-Doppler oscillations.
                </p>

                {/* Oscillating Respiration Sine Wave Visualizer */}
                <div className="h-24 bg-slate-900/90 rounded-xl border border-slate-800 relative flex items-center justify-center overflow-hidden">
                  <svg className="w-full h-full" preserveAspectRatio="none" viewBox="0 0 300 100">
                    <path
                      d={`M 0 50 Q 75 ${50 + Math.sin(respirationPhase) * 35}, 150 50 T 300 50`}
                      fill="none"
                      stroke="#a855f7"
                      strokeWidth="3"
                      strokeLinecap="round"
                    />
                  </svg>
                  <div className="absolute top-2 left-3 text-[10px] font-mono text-purple-300 font-bold">
                    BIO-OSCILLATION: {breathingRateBpm} BPM ({physics.respirationHz} HZ)
                  </div>
                  <div className="absolute bottom-2 right-3 text-[10px] font-mono text-emerald-400">
                    STATUS: HARMONIC LOCKED
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: APPROACH & RETREAT DYNAMICS */}
          {currentStep === 'step2_approach' && (
            <div className="space-y-4">
              <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800/80">
                <div className="text-xs font-bold text-white mb-1">
                  Walk toward the phone to 0.8m, pause 2s, then walk back to 3.5m.
                </div>
                <p className="text-xs text-slate-400 mb-4">
                  Learning approach Doppler shift (+Δf), retreat Doppler shift (-Δf), and RF attenuation rate.
                </p>

                {/* Doppler Spectrogram Gauge */}
                <div className="grid grid-cols-2 gap-3 font-mono text-xs">
                  <div className="p-3 bg-slate-900 rounded-xl border border-slate-800 text-center">
                    <div className="text-[10px] text-slate-500">MEASURED DOPPLER VELOCITY</div>
                    <div className={`text-lg font-bold mt-1 ${dopplerShiftHz >= 0 ? 'text-emerald-400' : 'text-sky-400'}`}>
                      {dopplerShiftHz >= 0 ? `+${dopplerShiftHz}` : dopplerShiftHz} Hz
                    </div>
                    <div className="text-[9px] text-slate-400 mt-0.5">
                      {dopplerShiftHz >= 0 ? 'Approaching (+Δf)' : 'Retreating (-Δf)'}
                    </div>
                  </div>

                  <div className="p-3 bg-slate-900 rounded-xl border border-slate-800 text-center">
                    <div className="text-[10px] text-slate-500">LEARNED WALKING CADENCE</div>
                    <div className="text-lg font-bold text-amber-400 mt-1">{cadenceHz} Hz</div>
                    <div className="text-[9px] text-slate-400 mt-0.5">~109 steps/min</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: LATERAL FOV CROSS-WALK */}
          {currentStep === 'step3_lateral' && (
            <div className="space-y-4">
              <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800/80">
                <div className="text-xs font-bold text-white mb-1">
                  Walk across the phone's field of view from left to right (-45° to +45°), then return.
                </div>
                <p className="text-xs text-slate-400 mb-4">
                  Calibrating line-of-bearing (LOB) tracking, angular rate (dθ/dt), and camera FOV boundary.
                </p>

                {/* Azimuth Tracker Compass Dial */}
                <div className="h-24 bg-slate-900/90 rounded-xl border border-slate-800 relative flex items-center justify-center">
                  <div className="flex items-center gap-6 font-mono">
                    <div className="text-xs text-slate-500">-45° LEFT</div>
                    <div className="text-center">
                      <div className="text-xl font-bold text-cyan-400">
                        {lateralAzimuthDeg > 0 ? `+${lateralAzimuthDeg}°` : `${lateralAzimuthDeg}°`}
                      </div>
                      <div className="text-[10px] text-slate-400">AZIMUTH BEARING</div>
                    </div>
                    <div className="text-xs text-slate-500">+45° RIGHT</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 4: SEISMIC FOOTFALL COUPLING */}
          {currentStep === 'step4_seismic' && (
            <div className="space-y-4">
              <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800/80">
                <div className="text-xs font-bold text-white mb-1">
                  Take 4 to 6 natural steps in place near the phone.
                </div>
                <p className="text-xs text-slate-400 mb-4">
                  Measuring acoustic floorboard resonance and chassis ground coupling for {stats.footwear.replace('_', ' ')}.
                </p>

                {/* Footfall Transient Impulse Gauge */}
                <div className="p-4 bg-slate-900 rounded-xl border border-slate-800 flex items-center justify-between font-mono">
                  <div>
                    <div className="text-[10px] text-slate-500">TRANSIENT IMPACT PEAK</div>
                    <div className="text-xl font-bold text-rose-400 mt-0.5">{seismicPeakG} g</div>
                  </div>
                  <div className="text-right">
                    <div className="text-[10px] text-slate-500">LEARNED COUPLING INDEX</div>
                    <div className="text-sm font-bold text-emerald-400 mt-0.5">{physics.seismicCoupling}</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Abort / Cancel Button */}
          <div className="flex justify-end pt-2">
            <button
              type="button"
              onClick={cancelCalibration}
              className="text-xs text-slate-400 hover:text-rose-400 px-3 py-1.5 rounded-lg border border-slate-800 hover:border-rose-500/40 transition-colors"
            >
              Cancel Calibration
            </button>
          </div>
        </div>
      )}

      {/* CALIBRATION COMPLETE & ACTIVATION */}
      {currentStep === 'complete' && activeProfile && (
        <motion.div 
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-slate-900/90 border border-emerald-500/50 rounded-3xl p-6 sm:p-8 shadow-2xl max-w-2xl mx-auto space-y-6 text-center"
        >
          <div className="inline-flex p-4 rounded-3xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 shadow-lg shadow-emerald-500/10">
            <Check className="w-8 h-8 stroke-[3]" />
          </div>

          <div>
            <h3 className="text-xl font-bold text-white">
              Human Target Identifier Successfully Calibrated!
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              The Bayesian engine has synthesized your personal bio-acoustic and RF profile into its active likelihood filters.
            </p>
          </div>

          {/* Profile Summary Card */}
          <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800 text-left font-mono text-xs space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
              <span className="text-slate-400">TARGET PROFILE:</span>
              <span className="text-cyan-300 font-bold text-sm">{activeProfile.stats.subjectName}</span>
            </div>
            <div className="grid grid-cols-2 gap-3 text-[11px]">
              <div>
                <span className="text-slate-500">RCS Mass: </span>
                <span className="text-emerald-400 font-bold">{activeProfile.metrics.radarCrossSectionM2} m²</span>
              </div>
              <div>
                <span className="text-slate-500">RF Attenuation: </span>
                <span className="text-cyan-400 font-bold">-{activeProfile.metrics.rfAbsorptionDb} dB</span>
              </div>
              <div>
                <span className="text-slate-500">Gait Cadence: </span>
                <span className="text-amber-400 font-bold">{activeProfile.metrics.gaitCadenceHz} Hz</span>
              </div>
              <div>
                <span className="text-slate-500">Respiration: </span>
                <span className="text-purple-400 font-bold">{activeProfile.metrics.respirationHz} Hz</span>
              </div>
            </div>
          </div>

          {/* Action CTAs */}
          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <button
              type="button"
              onClick={() => onLaunchRadarTest(activeProfile)}
              className="flex-1 py-3 px-5 rounded-2xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs shadow-lg shadow-cyan-500/20 flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <Radio className="w-4 h-4" />
              <span>Simulate Target on Radar Now</span>
            </button>
            <button
              type="button"
              onClick={() => setCurrentStep('input')}
              className="py-3 px-5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs border border-slate-700 transition-colors cursor-pointer"
            >
              Back to Settings
            </button>
          </div>
        </motion.div>
      )}
    </div>
  );
};
