import React, { useState } from 'react';
import { Volume2, VolumeX, Radio, Activity, Sparkles, Mic, Play } from 'lucide-react';
import { sensorRegistry } from '../sensors';
import { AcousticAnalysisResult } from '../sensors/acousticSensor';

interface AcousticVisualizerProps {
  data: AcousticAnalysisResult | null;
  onEmitChirp: () => void;
}

export const AcousticVisualizer: React.FC<AcousticVisualizerProps> = ({
  data,
  onEmitChirp,
}) => {
  const [audibleDebug, setAudibleDebug] = useState(sensorRegistry.acoustic.audibleSonarDebug);

  const toggleAudible = () => {
    const next = !audibleDebug;
    setAudibleDebug(next);
    sensorRegistry.acoustic.audibleSonarDebug = next;
  };

  const infrasound = data?.spectralBands?.infrasoundLow ?? 0.08;
  const midSpeech = data?.spectralBands?.midSpeech ?? 0.12;
  const ultrasonic = data?.spectralBands?.ultrasonicHigh ?? 0.35;

  return (
    <div className="bg-slate-950 rounded-2xl border border-slate-800 p-4 font-sans text-slate-100 shadow-xl space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-purple-500/20 text-purple-400 border border-purple-500/40">
            <Volume2 className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs font-semibold text-slate-200">
              Acoustic Sonar & Bioacoustic Spectrum
            </h4>
            <p className="text-[10px] text-slate-400 font-mono">
              18.5–20.4 kHz active FMCW chirp echo + 20–180 Hz footstep cadence
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={toggleAudible}
            className={`px-2.5 py-1 rounded-lg text-[10px] font-mono border transition-colors ${
              audibleDebug 
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/50' 
                : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-300'
            }`}
            title="Toggle audible test mode (4.5kHz) vs silent inaudible ultrasonic mode (19kHz)"
          >
            {audibleDebug ? 'Audible Mode (4.5kHz)' : 'Ultrasonic (19kHz)'}
          </button>

          <button
            type="button"
            onClick={onEmitChirp}
            className="flex items-center gap-1.5 px-3 py-1 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-xs font-semibold shadow-lg shadow-purple-600/30 transition-colors"
          >
            <Play className="w-3 h-3 fill-current" />
            <span>Emit Chirp</span>
          </button>
        </div>
      </div>

      {/* Real-Time FFT Energy Frequency Bars */}
      <div className="space-y-2.5 bg-slate-900/60 p-3.5 rounded-xl border border-slate-800/80">
        <div className="text-[11px] font-medium text-slate-300 flex justify-between">
          <span>Spectral Feature Energy Bands (FFT 2048)</span>
          <span className="font-mono text-slate-500">{data?.soundPressureDb ?? -55} dBFS</span>
        </div>

        {/* 1. Infrasound / Low Band (Footsteps) */}
        <div>
          <div className="flex justify-between text-[10px] font-mono text-slate-400 mb-1">
            <span className="flex items-center gap-1.5">
              <Activity className="w-3 h-3 text-cyan-400" />
              Infrasound / Floor Cadence (20–180 Hz)
            </span>
            <span className={data?.footstepCadenceDetected ? 'text-emerald-400 font-bold' : 'text-slate-500'}>
              {data?.footstepCadenceDetected ? `Cadence Active (${data.footstepHz} Hz)` : 'Baseline'}
            </span>
          </div>
          <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
            <div 
              className={`h-full rounded-full transition-all duration-150 ${data?.footstepCadenceDetected ? 'bg-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.8)]' : 'bg-cyan-500'}`}
              style={{ width: `${Math.min(100, infrasound * 220)}%` }}
            />
          </div>
        </div>

        {/* 2. Mid Speech / Bioacoustic Vocalizations */}
        <div>
          <div className="flex justify-between text-[10px] font-mono text-slate-400 mb-1">
            <span className="flex items-center gap-1.5">
              <Mic className="w-3 h-3 text-amber-400" />
              Bioacoustic Vocalization / Breath (300–3200 Hz)
            </span>
            <span className={(data?.animalVocalizationScore ?? 0) > 40 ? 'text-amber-400 font-bold' : 'text-slate-500'}>
              {(data?.animalVocalizationScore ?? 0) > 40 ? 'Pet / Animal Call' : 'Quiet'}
            </span>
          </div>
          <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
            <div 
              className="h-full bg-amber-400 rounded-full transition-all duration-150"
              style={{ width: `${Math.min(100, midSpeech * 180)}%` }}
            />
          </div>
        </div>

        {/* 3. Ultrasonic Echo Return (18.5 - 20.4 kHz) */}
        <div>
          <div className="flex justify-between text-[10px] font-mono text-slate-400 mb-1">
            <span className="flex items-center gap-1.5">
              <Radio className="w-3 h-3 text-purple-400" />
              Active Ultrasonic Echo Return (18.5–20.4 kHz)
            </span>
            <span className="text-purple-400 font-bold">
              Echo Delay: {data?.echoDelayMs ?? 8.2} ms (~{data?.estimatedDistanceM ?? 1.4}m)
            </span>
          </div>
          <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-purple-500 to-cyan-400 rounded-full transition-all duration-150 shadow-[0_0_8px_rgba(168,85,247,0.8)]"
              style={{ width: `${Math.min(100, ultrasonic * 240)}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
