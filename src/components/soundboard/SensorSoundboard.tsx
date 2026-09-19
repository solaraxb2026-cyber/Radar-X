import React, { useState } from 'react';
import { SensorType, FusionConfig, SensorMicroTune, PresenceState } from '../../types';
import { ChannelStrip } from './ChannelStrip';
import { RotaryKnob } from './RotaryKnob';
import { VUMeter } from './VUMeter';
import { OscilloscopeDisplay } from './OscilloscopeDisplay';
import { 
  SlidersHorizontal, 
  Camera, 
  Volume2, 
  Wifi, 
  Bluetooth, 
  Activity, 
  Compass, 
  CloudSun,
  Zap,
  RotateCcw,
  Gauge,
  Radio,
  Sparkles,
  VolumeX,
  AudioWaveform,
  Sliders,
  CheckCircle2
} from 'lucide-react';

interface SensorSoundboardProps {
  config: FusionConfig;
  presenceState: PresenceState;
  onChangeConfig: (newConfig: FusionConfig) => void;
  onSimulate: (action: string) => void;
  onEmitChirp: () => void;
  compassHeading: number;
}

type SoundboardTab = 'master' | SensorType;

export const SensorSoundboard: React.FC<SensorSoundboardProps> = ({
  config,
  presenceState,
  onChangeConfig,
  onSimulate,
  onEmitChirp,
  compassHeading,
}) => {
  const [activeSubtab, setActiveSubtab] = useState<SoundboardTab>('master');
  const [masterFaderDb, setMasterFaderDb] = useState(0);

  // All 7 physical and virtual sensor channels
  const channels: { id: SensorType; name: string; icon: React.ElementType; theme: 'emerald' | 'purple' | 'cyan' | 'amber' | 'rose' | 'slate' }[] = [
    { id: 'camera', name: 'Camera ML', icon: Camera, theme: 'emerald' },
    { id: 'acoustic', name: 'Acoustic Sonar', icon: Volume2, theme: 'purple' },
    { id: 'wifi_rssi', name: 'WiFi Multipath', icon: Wifi, theme: 'cyan' },
    { id: 'ble', name: 'BLE Proximity', icon: Bluetooth, theme: 'cyan' },
    { id: 'accelerometer', name: 'IMU Kinematics', icon: Activity, theme: 'amber' },
    { id: 'magnetometer', name: 'Magnetometer', icon: Compass, theme: 'rose' },
    { id: 'barometer', name: 'Barometer & Env', icon: CloudSun, theme: 'slate' },
  ];

  const getControls = (id: SensorType): SensorMicroTune => {
    return (
      config.sensorControls?.[id] ?? {
        enabled: true,
        samplingRateHz: 10,
        gainSensitivity: 1.0,
        noiseGateThreshold: 10,
        azimuthOffsetDeg: 0,
        isMuted: false,
        isSolo: false,
        faderDb: 0,
      }
    );
  };

  const updateControls = (id: SensorType, updated: SensorMicroTune) => {
    const updatedControls = {
      ...(config.sensorControls || {}),
      [id]: updated,
    };
    onChangeConfig({
      ...config,
      sensorControls: updatedControls,
    });
  };

  const toggleMute = (id: SensorType) => {
    const current = getControls(id);
    updateControls(id, { ...current, isMuted: !current.isMuted });
  };

  const toggleSolo = (id: SensorType) => {
    const current = getControls(id);
    updateControls(id, { ...current, isSolo: !current.isSolo });
  };

  const resetAllChannels = () => {
    const resetControls: Partial<Record<SensorType, SensorMicroTune>> = {};
    channels.forEach((ch) => {
      resetControls[ch.id] = {
        enabled: true,
        samplingRateHz: 10,
        gainSensitivity: 1.0,
        noiseGateThreshold: 10,
        azimuthOffsetDeg: 0,
        isMuted: false,
        isSolo: false,
        faderDb: 0,
      };
    });
    setMasterFaderDb(0);
    onChangeConfig({
      ...config,
      sensorControls: resetControls,
    });
  };

  const masterConfidence = presenceState.confidenceScore;
  const anySoloActive = channels.some((c) => getControls(c.id).isSolo);

  return (
    <div className="space-y-4 font-mono select-none">
      {/* 1. Studio Soundboard Header & Subtab Navigation */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3 shadow-xl">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-800 pb-3 mb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-cyan-500/20 border border-cyan-500/40 text-cyan-400 shadow-inner">
              <SlidersHorizontal className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-100 tracking-tight">
                  Sensor Soundboard & Mixing Studio
                </h2>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-cyan-500/10 border border-cyan-500/30 text-cyan-300">
                  7-CHANNEL CONSOLE
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Micromanage gain trim, noise gates, azimuth bias, faders & oscilloscope streams
              </p>
            </div>
          </div>

          {/* Quick Global Soundboard Actions */}
          <div className="flex items-center gap-2">
            {anySoloActive && (
              <span className="text-[10px] font-bold px-2 py-1 rounded bg-amber-500/20 border border-amber-500/40 text-amber-300 animate-pulse">
                SOLO BUS ENGAGED
              </span>
            )}

            <button
              type="button"
              onClick={resetAllChannels}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
              title="Reset all channel trims, gates, and faders to default"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Board</span>
            </button>
          </div>
        </div>

        {/* Sub-Tab Navigation Bar */}
        <div className="flex space-x-1.5 overflow-x-auto pb-1 scrollbar-none">
          {/* Master Console Tab */}
          <button
            type="button"
            onClick={() => setActiveSubtab('master')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeSubtab === 'master'
                ? 'bg-cyan-500/20 border border-cyan-500/40 text-cyan-300 shadow-sm'
                : 'bg-slate-950/80 border border-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>Master Console</span>
          </button>

          {/* Individual Sensor Sub-tabs */}
          {channels.map((ch) => {
            const Icon = ch.icon;
            const ctrl = getControls(ch.id);
            const score = presenceState.breakdown[ch.id] || 0;
            const isSubtabActive = activeSubtab === ch.id;

            return (
              <button
                key={ch.id}
                type="button"
                onClick={() => setActiveSubtab(ch.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap border ${
                  isSubtabActive
                    ? 'bg-slate-800 border-cyan-500/60 text-slate-100 shadow-md ring-1 ring-cyan-500/30'
                    : 'bg-slate-950/80 border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 text-${ch.theme}-400`} />
                <span>{ch.name}</span>

                {ctrl.isMuted ? (
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500" title="Muted" />
                ) : ctrl.isSolo ? (
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shadow-[0_0_4px_#f59e0b]" title="Solo" />
                ) : (
                  <span className="text-[9px] font-mono text-slate-500">
                    {score}%
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. SUBTAB CONTENT VIEW */}

      {/* VIEW A: MASTER CONSOLE (7-Channel Sound Mixer Board) */}
      {activeSubtab === 'master' && (
        <div className="space-y-4">
          {/* Top Master Section: Analog VU Meter & Master Fader & Oscilloscope */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            {/* Master Stereo / Bus Gauges */}
            <div className="lg:col-span-4 bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col items-center justify-between shadow-xl">
              <div className="w-full flex items-center justify-between border-b border-slate-800 pb-2 mb-2">
                <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                  Master Bus Output
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                  {presenceState.presenceLevel}
                </span>
              </div>

              {/* Analog Needle Meter */}
              <div className="py-1">
                <VUMeter
                  levelPercent={masterConfidence}
                  variant="analog"
                  label="Master Output Meter"
                />
              </div>

              {/* Master Telemetry Stats */}
              <div className="w-full grid grid-cols-2 gap-2 mt-2 pt-2 border-t border-slate-800 text-[10px]">
                <div className="p-2 rounded-lg bg-slate-950 border border-slate-800/80">
                  <span className="text-slate-500 block">Fused Score</span>
                  <span className="text-sm font-bold text-emerald-400">{masterConfidence}%</span>
                </div>
                <div className="p-2 rounded-lg bg-slate-950 border border-slate-800/80">
                  <span className="text-slate-500 block">Active Tracks</span>
                  <span className="text-sm font-bold text-cyan-400">{presenceState.detectedCount}</span>
                </div>
              </div>
            </div>

            {/* Master Oscilloscope Monitor */}
            <div className="lg:col-span-8 bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl flex flex-col justify-between">
              <OscilloscopeDisplay
                sensorType="acoustic"
                signalConfidence={masterConfidence}
                gain={1.2}
                height={160}
                title="MASTER COMPOSITE SIGNAL TRACE"
              />
            </div>
          </div>

          {/* 7-Channel Console Rack (Horizontal Scrollable Strip Layout) */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 shadow-xl">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                <Sliders className="w-4 h-4 text-cyan-400" />
                <span>Multi-Channel Studio Fader Rack</span>
              </h3>
              <span className="text-[10px] text-slate-500">
                Drag rotary knobs to adjust Gain/Gate/Azimuth • Move faders to mix
              </span>
            </div>

            {/* Horizontal Scroll of All Channel Strips */}
            <div className="flex gap-3 overflow-x-auto pb-3 pt-1 scrollbar-thin scrollbar-thumb-slate-700">
              {channels.map((ch, idx) => {
                const ctrl = getControls(ch.id);
                const score = presenceState.breakdown[ch.id] || 0;

                return (
                  <ChannelStrip
                    key={ch.id}
                    channelIndex={idx + 1}
                    sensorId={ch.id}
                    sensorName={ch.name}
                    readingScore={score}
                    controls={ctrl}
                    onChangeControls={(updated) => updateControls(ch.id, updated)}
                    onSoloToggle={() => toggleSolo(ch.id)}
                    onMuteToggle={() => toggleMute(ch.id)}
                    onOpenSubtab={() => setActiveSubtab(ch.id)}
                    onInjectStimulus={() => {
                      if (ch.id === 'acoustic') onEmitChirp();
                      else if (ch.id === 'camera') onSimulate('sim_human_center');
                      else if (ch.id === 'wifi_rssi') onSimulate('sim_rf_perturbation');
                      else if (ch.id === 'ble') onSimulate('sim_ble_phone');
                      else if (ch.id === 'magnetometer') onSimulate('sim_car_passing');
                      else if (ch.id === 'accelerometer') onSimulate('sim_vehicle_rumble');
                    }}
                  />
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* VIEW B: DEDICATED SENSOR SUB-TAB (Deep-Dive Channel Micromanagement) */}
      {activeSubtab !== 'master' && (() => {
        const currentChannel = channels.find((c) => c.id === activeSubtab)!;
        const ctrl = getControls(activeSubtab);
        const score = presenceState.breakdown[activeSubtab] || 0;
        const Icon = currentChannel.icon;

        return (
          <div className="space-y-4">
            {/* Channel Header Banner */}
            <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xl">
              <div className="flex items-center gap-3">
                <div className={`p-2.5 rounded-xl bg-slate-800 text-${currentChannel.theme}-400 border border-slate-700`}>
                  <Icon className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-slate-100">
                      {currentChannel.name} Channel Studio
                    </h3>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                      CH {channels.findIndex((c) => c.id === activeSubtab) + 1}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400">
                    Fine-tune hardware sampling, digital noise floor, directional alignment and filter bandwidth
                  </p>
                </div>
              </div>

              {/* Mute & Solo Quick Controls */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => toggleMute(activeSubtab)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors cursor-pointer ${
                    ctrl.isMuted
                      ? 'bg-rose-600 border-rose-500 text-white shadow-[0_0_8px_#f43f5e]'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {ctrl.isMuted ? 'UNMUTE CHANNEL' : 'MUTE CHANNEL'}
                </button>

                <button
                  type="button"
                  onClick={() => toggleSolo(activeSubtab)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors cursor-pointer ${
                    ctrl.isSolo
                      ? 'bg-amber-500 border-amber-400 text-black shadow-[0_0_8px_#f59e0b]'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {ctrl.isSolo ? 'RELEASE SOLO' : 'SOLO CHANNEL'}
                </button>
              </div>
            </div>

            {/* Main Interactive Dials & Scope Row */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
              {/* Left Column: Bank of Tactile Rotary Dials */}
              <div className="lg:col-span-5 bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                    <Gauge className="w-4 h-4 text-cyan-400" />
                    <span>Rotary Potentiometers</span>
                  </h4>
                  <span className="text-[10px] text-slate-500">Drag dials vertically</span>
                </div>

                {/* 2x2 Grid of Rotary Knobs */}
                <div className="grid grid-cols-2 gap-4 py-2">
                  {/* GAIN TRIM */}
                  <RotaryKnob
                    label="GAIN TRIM"
                    value={ctrl.gainSensitivity ?? 1.0}
                    min={0.1}
                    max={3.0}
                    step={0.1}
                    unit="x"
                    color={currentChannel.theme}
                    size="md"
                    defaultValue={1.0}
                    subtitle="Pre-amp scale"
                    onChange={(val) => updateControls(activeSubtab, { ...ctrl, gainSensitivity: val })}
                  />

                  {/* NOISE GATE */}
                  <RotaryKnob
                    label="NOISE GATE"
                    value={ctrl.noiseGateThreshold ?? 10}
                    min={0}
                    max={90}
                    step={5}
                    unit="%"
                    color="amber"
                    size="md"
                    defaultValue={10}
                    subtitle="Low-cut filter"
                    onChange={(val) => updateControls(activeSubtab, { ...ctrl, noiseGateThreshold: val })}
                  />

                  {/* SAMPLING RATE */}
                  <RotaryKnob
                    label="POLL RATE"
                    value={ctrl.samplingRateHz ?? 10}
                    min={1}
                    max={60}
                    step={1}
                    unit="Hz"
                    color="cyan"
                    size="md"
                    defaultValue={10}
                    subtitle="Update clock"
                    onChange={(val) => updateControls(activeSubtab, { ...ctrl, samplingRateHz: val })}
                  />

                  {/* AZIMUTH BEARING BIAS */}
                  <RotaryKnob
                    label="AZIMUTH BIAS"
                    value={ctrl.azimuthOffsetDeg ?? 0}
                    min={-180}
                    max={180}
                    step={5}
                    unit="°"
                    color="rose"
                    size="md"
                    defaultValue={0}
                    subtitle="Bearing trim"
                    onChange={(val) => updateControls(activeSubtab, { ...ctrl, azimuthOffsetDeg: val })}
                  />
                </div>

                {/* Range Limit Slider */}
                <div className="pt-2 border-t border-slate-800 space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-400">Spatial Range Gate:</span>
                    <span className="font-bold text-cyan-400">{ctrl.rangeLimitM ?? 5.0} meters</span>
                  </div>
                  <input
                    type="range"
                    min={0.5}
                    max={10.0}
                    step={0.5}
                    value={ctrl.rangeLimitM ?? 5.0}
                    onChange={(e) => updateControls(activeSubtab, { ...ctrl, rangeLimitM: parseFloat(e.target.value) })}
                    className="w-full accent-cyan-400"
                  />
                </div>
              </div>

              {/* Center/Right Column: Live Oscilloscope & Analog Meter */}
              <div className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl flex flex-col justify-between space-y-4">
                {/* Oscilloscope Display */}
                <OscilloscopeDisplay
                  sensorType={activeSubtab}
                  signalConfidence={score}
                  isMuted={ctrl.isMuted}
                  gain={ctrl.gainSensitivity ?? 1.0}
                  height={150}
                  title={`${currentChannel.name.toUpperCase()} REAL-TIME HARMONIC`}
                />

                {/* Level Gauges & Test Injector Row */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-800">
                  {/* Channel VU Meter */}
                  <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl flex items-center justify-around">
                    <VUMeter
                      levelPercent={ctrl.isMuted ? 0 : score}
                      height={90}
                      width={24}
                      label="SIG LEVEL"
                    />
                    <div className="text-right">
                      <span className="text-[10px] text-slate-500 uppercase block">Instant Conf</span>
                      <span className="text-2xl font-bold text-emerald-400">{score}%</span>
                      <span className="text-[9px] text-slate-400 block mt-1">
                        Weight: {Math.round((config.weights[activeSubtab] || 0.1) * 100)}%
                      </span>
                    </div>
                  </div>

                  {/* Channel Specific Trigger Test Actions */}
                  <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl flex flex-col justify-center gap-2">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      Hardware Stimulus Generator
                    </span>

                    {activeSubtab === 'acoustic' && (
                      <button
                        type="button"
                        onClick={onEmitChirp}
                        className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-bold bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/40 text-purple-300 transition-colors cursor-pointer"
                      >
                        <Zap className="w-3.5 h-3.5" />
                        <span>Fire 19.2 kHz Ultrasonic Chirp</span>
                      </button>
                    )}

                    {activeSubtab === 'camera' && (
                      <button
                        type="button"
                        onClick={() => onSimulate('sim_human_center')}
                        className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-bold bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-300 transition-colors cursor-pointer"
                      >
                        <Zap className="w-3.5 h-3.5" />
                        <span>Inject Optical Human Bounding Box</span>
                      </button>
                    )}

                    {activeSubtab === 'wifi_rssi' && (
                      <button
                        type="button"
                        onClick={() => onSimulate('sim_rf_perturbation')}
                        className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-bold bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/40 text-cyan-300 transition-colors cursor-pointer"
                      >
                        <Zap className="w-3.5 h-3.5" />
                        <span>Simulate RF Multipath Variance</span>
                      </button>
                    )}

                    {activeSubtab === 'ble' && (
                      <button
                        type="button"
                        onClick={() => onSimulate('sim_ble_phone')}
                        className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-bold bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/40 text-cyan-300 transition-colors cursor-pointer"
                      >
                        <Zap className="w-3.5 h-3.5" />
                        <span>Transmit Pixel 9 Beacon Track</span>
                      </button>
                    )}

                    {activeSubtab === 'magnetometer' && (
                      <button
                        type="button"
                        onClick={() => onSimulate('sim_car_passing')}
                        className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-bold bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/40 text-rose-300 transition-colors cursor-pointer"
                      >
                        <Zap className="w-3.5 h-3.5" />
                        <span>Inject Ferrous Vehicle Anomaly</span>
                      </button>
                    )}

                    {activeSubtab === 'accelerometer' && (
                      <button
                        type="button"
                        onClick={() => onSimulate('sim_vehicle_rumble')}
                        className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-bold bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 transition-colors cursor-pointer"
                      >
                        <Zap className="w-3.5 h-3.5" />
                        <span>Inject Surface Vibration Pulse</span>
                      </button>
                    )}

                    {activeSubtab === 'barometer' && (
                      <button
                        type="button"
                        onClick={() => onSimulate('quiet')}
                        className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-bold bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 transition-colors cursor-pointer"
                      >
                        <Zap className="w-3.5 h-3.5" />
                        <span>Inject Door Inflow Pressure Spike</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
};
