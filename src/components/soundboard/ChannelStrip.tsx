import React from 'react';
import { SensorType, SensorMicroTune } from '../../types';
import { RotaryKnob } from './RotaryKnob';
import { VUMeter } from './VUMeter';
import { 
  Camera, 
  Volume2, 
  Wifi, 
  Bluetooth, 
  Activity, 
  Compass, 
  CloudSun,
  Zap,
  ExternalLink
} from 'lucide-react';

interface ChannelStripProps {
  channelIndex: number;
  sensorId: SensorType;
  sensorName: string;
  readingScore: number; // 0 to 100
  controls: SensorMicroTune;
  onChangeControls: (updated: SensorMicroTune) => void;
  onSoloToggle: () => void;
  onMuteToggle: () => void;
  onInjectStimulus?: () => void;
  onOpenSubtab?: () => void;
}

export const ChannelStrip: React.FC<ChannelStripProps> = ({
  channelIndex,
  sensorId,
  sensorName,
  readingScore,
  controls,
  onChangeControls,
  onSoloToggle,
  onMuteToggle,
  onInjectStimulus,
  onOpenSubtab,
}) => {
  const isMuted = !!controls.isMuted;
  const isSolo = !!controls.isSolo;
  const faderDb = controls.faderDb ?? 0; // -48 to +12 dB
  const gain = controls.gainSensitivity ?? 1.0;
  const noiseGate = controls.noiseGateThreshold ?? 0;
  const azimuthOffset = controls.azimuthOffsetDeg ?? 0;

  // Icon mapping
  const sensorIcons: Partial<Record<SensorType, React.ElementType>> = {
    camera: Camera,
    acoustic: Volume2,
    wifi_rssi: Wifi,
    ble: Bluetooth,
    accelerometer: Activity,
    magnetometer: Compass,
    barometer: CloudSun,
  };

  const Icon = sensorIcons[sensorId] || Activity;

  const colorThemes: Partial<Record<SensorType, 'emerald' | 'purple' | 'cyan' | 'amber' | 'rose' | 'slate'>> = {
    camera: 'emerald',
    acoustic: 'purple',
    wifi_rssi: 'cyan',
    ble: 'cyan',
    accelerometer: 'amber',
    magnetometer: 'rose',
    barometer: 'slate',
  };

  const theme = colorThemes[sensorId] || 'cyan';

  // Fader drag / slide handler
  const handleFaderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const db = parseFloat(e.target.value);
    onChangeControls({
      ...controls,
      faderDb: db,
    });
  };

  return (
    <div className={`flex flex-col items-center bg-slate-900/90 border rounded-2xl p-3 select-none font-mono transition-all w-44 min-w-[170px] shadow-xl ${
      isSolo 
        ? 'border-amber-500/80 ring-1 ring-amber-500/40 bg-slate-900' 
        : isMuted 
          ? 'border-red-900/50 opacity-60 bg-slate-950/80' 
          : 'border-slate-800 hover:border-slate-700'
    }`}>
      {/* 1. Header: Channel Number & Icon */}
      <div className="w-full flex items-center justify-between border-b border-slate-800 pb-2 mb-2">
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">
            CH {channelIndex}
          </span>
          <div className={`p-1 rounded-md bg-slate-800 text-${theme}-400`}>
            <Icon className="w-3.5 h-3.5" />
          </div>
        </div>

        {onOpenSubtab && (
          <button
            type="button"
            onClick={onOpenSubtab}
            className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-cyan-300 transition-colors cursor-pointer"
            title={`Open deep-dive sub-tab for ${sensorName}`}
          >
            <ExternalLink className="w-3 h-3" />
          </button>
        )}
      </div>

      <div className="text-[11px] font-bold text-slate-200 truncate max-w-[140px] mb-2 text-center">
        {sensorName}
      </div>

      {/* 2. Top Dials Section */}
      <div className="space-y-3 w-full flex flex-col items-center border-b border-slate-800/80 pb-3 mb-3">
        {/* GAIN / TRIM Knob */}
        <RotaryKnob
          label="GAIN"
          value={gain}
          min={0.2}
          max={3.0}
          step={0.1}
          unit="x"
          color={theme}
          size="sm"
          defaultValue={1.0}
          onChange={(val) => onChangeControls({ ...controls, gainSensitivity: val })}
        />

        {/* NOISE GATE Knob */}
        <RotaryKnob
          label="GATE"
          value={noiseGate}
          min={0}
          max={90}
          step={5}
          unit="%"
          color="amber"
          size="sm"
          defaultValue={0}
          onChange={(val) => onChangeControls({ ...controls, noiseGateThreshold: val })}
        />

        {/* AZIMUTH PAN / BIAS Knob */}
        <RotaryKnob
          label="AZIMUTH"
          value={azimuthOffset}
          min={-180}
          max={180}
          step={5}
          unit="°"
          color="cyan"
          size="sm"
          defaultValue={0}
          onChange={(val) => onChangeControls({ ...controls, azimuthOffsetDeg: val })}
        />
      </div>

      {/* 3. MUTE & SOLO Audio Buttons */}
      <div className="grid grid-cols-2 gap-1.5 w-full mb-3">
        <button
          type="button"
          onClick={onMuteToggle}
          className={`py-1 rounded font-bold text-[10px] transition-all cursor-pointer border ${
            isMuted 
              ? 'bg-rose-600 border-rose-500 text-white shadow-[0_0_8px_#f43f5e]' 
              : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
          }`}
        >
          MUTE
        </button>

        <button
          type="button"
          onClick={onSoloToggle}
          className={`py-1 rounded font-bold text-[10px] transition-all cursor-pointer border ${
            isSolo 
              ? 'bg-amber-500 border-amber-400 text-black shadow-[0_0_8px_#f59e0b]' 
              : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
          }`}
        >
          SOLO
        </button>
      </div>

      {/* 4. Fader & LED VU Meter Section */}
      <div className="flex items-center justify-center gap-3 w-full my-1 py-1">
        {/* Vertical Channel Fader */}
        <div className="flex flex-col items-center">
          <div className="text-[8px] font-bold text-slate-500 mb-1">
            {faderDb > 0 ? `+${faderDb}` : faderDb}dB
          </div>

          <div className="relative h-36 flex items-center justify-center">
            {/* dB scale labels beside fader track */}
            <div className="absolute -left-3.5 inset-y-0 flex flex-col justify-between text-[7px] text-slate-500 pointer-events-none">
              <span>+10</span>
              <span>+5</span>
              <span>0</span>
              <span>-5</span>
              <span>-20</span>
              <span>-∞</span>
            </div>

            {/* Vertical Range Slider */}
            <input
              type="range"
              min={-40}
              max={10}
              step={1}
              value={faderDb}
              onChange={handleFaderChange}
              className="h-32 w-4 appearance-none bg-slate-950 border border-slate-800 rounded cursor-pointer accent-cyan-400 [writing-mode:vertical-lr] [direction:rtl]"
              title={`Channel Fader: ${faderDb} dB`}
            />
          </div>
        </div>

        {/* Live Segmented VU Meter */}
        <div className="flex flex-col items-center">
          <div className="text-[8px] font-bold text-slate-500 mb-1">SIG</div>
          <VUMeter
            levelPercent={isMuted ? 0 : readingScore}
            height={128}
            width={22}
            variant="led"
          />
        </div>
      </div>

      {/* 5. Quick Test / Stimulus Injector */}
      {onInjectStimulus && (
        <button
          type="button"
          onClick={onInjectStimulus}
          className="mt-3 w-full flex items-center justify-center gap-1 py-1 rounded-lg text-[10px] font-bold bg-slate-950 hover:bg-slate-800 border border-slate-800 text-cyan-400 hover:text-cyan-300 transition-colors cursor-pointer"
          title="Inject test pulse for this sensor"
        >
          <Zap className="w-3 h-3 text-cyan-400" />
          <span>PING TEST</span>
        </button>
      )}
    </div>
  );
};
