import React, { useEffect, useRef, useState } from 'react';
import { SensorType } from '../../types';
import { Activity, Radio, BarChart2 } from 'lucide-react';

interface OscilloscopeDisplayProps {
  sensorType: SensorType;
  signalConfidence: number; // 0 to 100
  isMuted?: boolean;
  gain?: number;
  width?: number | string;
  height?: number;
  title?: string;
}

export const OscilloscopeDisplay: React.FC<OscilloscopeDisplayProps> = ({
  sensorType,
  signalConfidence,
  isMuted = false,
  gain = 1.0,
  width = '100%',
  height = 130,
  title,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [displayMode, setDisplayMode] = useState<'wave' | 'fft'>('wave');
  const animFrameRef = useRef<number | null>(null);
  const phaseRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let isActive = true;

    const render = () => {
      if (!isActive) return;
      phaseRef.current += 0.08;

      const w = canvas.width;
      const h = canvas.height;
      const centerY = h / 2;

      // Dark CRT phosphor screen background
      ctx.fillStyle = '#030712';
      ctx.fillRect(0, 0, w, h);

      // Oscilloscope Grid Lines (Reticle)
      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = 1;

      // Horizontal grid
      const gridSpacingY = h / 6;
      for (let y = gridSpacingY; y < h; y += gridSpacingY) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
      }

      // Vertical grid
      const gridSpacingX = w / 10;
      for (let x = gridSpacingX; x < w; x += gridSpacingX) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, h);
        ctx.stroke();
      }

      // Center crosshair axes
      ctx.strokeStyle = '#1e293b';
      ctx.setLineDash([2, 4]);
      ctx.beginPath();
      ctx.moveTo(0, centerY);
      ctx.lineTo(w, centerY);
      ctx.moveTo(w / 2, 0);
      ctx.lineTo(w / 2, h);
      ctx.stroke();
      ctx.setLineDash([]);

      if (isMuted) {
        // Flatline trace
        ctx.strokeStyle = '#ef4444';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(0, centerY);
        ctx.lineTo(w, centerY);
        ctx.stroke();

        ctx.fillStyle = '#ef4444';
        ctx.font = '10px monospace';
        ctx.fillText('MUTED / CHANNEL INACTIVE', 12, 20);
        animFrameRef.current = requestAnimationFrame(render);
        return;
      }

      const amp = Math.min(centerY * 0.9, (signalConfidence / 100) * (centerY * 0.8) * gain + 3);

      if (displayMode === 'wave') {
        // Waveform mode
        ctx.strokeStyle = sensorType === 'acoustic' 
          ? '#a855f7' 
          : sensorType === 'wifi_rssi' 
            ? '#06b6d4' 
            : sensorType === 'camera' 
              ? '#10b981' 
              : '#f59e0b';
        ctx.lineWidth = 2;
        ctx.shadowBlur = 6;
        ctx.shadowColor = ctx.strokeStyle;

        ctx.beginPath();
        const p = phaseRef.current;

        for (let x = 0; x < w; x += 2) {
          const normX = x / w;
          let yVal = 0;

          if (sensorType === 'acoustic') {
            // High frequency ultrasonic chirp + bioacoustic envelope
            const carrier = Math.sin(normX * 50 + p * 4);
            const env = Math.sin(normX * 8 + p) * 0.5 + 0.5;
            yVal = carrier * env * amp;
          } else if (sensorType === 'wifi_rssi') {
            // RF multipath fading ripples with stochastic noise
            const fade = Math.sin(normX * 12 + p * 1.5) * Math.cos(normX * 4 + p * 0.5);
            const noise = (Math.sin(normX * 120 + p * 10) * 0.15);
            yVal = (fade + noise) * amp;
          } else if (sensorType === 'camera') {
            // Optical bounding box square pulse
            const pulse = (Math.sin(normX * 6 + p) > 0.4 ? 1 : -0.2);
            yVal = pulse * amp * 0.8;
          } else if (sensorType === 'magnetometer') {
            // Magnetic field vector dip & recovery
            const dip = Math.exp(-Math.pow((normX - ((p * 0.15) % 1.2)) * 8, 2));
            yVal = (Math.sin(normX * 4 + p) * 0.2 - dip * 1.2) * amp;
          } else {
            // General sinusoidal harmonic trace
            yVal = (Math.sin(normX * 10 + p) * 0.7 + Math.sin(normX * 22 + p * 2) * 0.3) * amp;
          }

          const y = centerY + yVal;
          if (x === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
        ctx.shadowBlur = 0;
      } else {
        // FFT Spectrum Analyzer Bar Mode
        const numBands = 24;
        const barWidth = (w - (numBands * 2)) / numBands;
        const p = phaseRef.current;

        for (let i = 0; i < numBands; i++) {
          const x = i * (barWidth + 2) + 2;
          const bandNorm = i / numBands;
          // Spectral energy simulation based on sensor profile
          let energy = Math.sin(bandNorm * 5 + p * 2) * 0.5 + 0.5;
          if (sensorType === 'acoustic' && i > 16) {
            energy = (Math.sin(p * 3) * 0.4 + 0.6); // high ultrasonic energy
          }
          const barHeight = Math.max(4, energy * (signalConfidence / 100) * (h - 20) * gain);
          const y = h - barHeight;

          ctx.fillStyle = i > 18 ? '#ef4444' : i > 12 ? '#f59e0b' : '#10b981';
          ctx.fillRect(x, y, barWidth, barHeight);
        }
      }

      // Signal Readout HUD overlay
      ctx.fillStyle = '#94a3b8';
      ctx.font = '9px monospace';
      ctx.fillText(`SIG: ${signalConfidence}%`, 8, 14);
      ctx.fillText(`GAIN: ${gain.toFixed(1)}x`, 70, 14);
      ctx.fillText(`MODE: ${displayMode.toUpperCase()}`, w - 75, 14);

      animFrameRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      isActive = false;
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [sensorType, signalConfidence, isMuted, gain, displayMode]);

  return (
    <div className="flex flex-col select-none font-mono bg-slate-950 border border-slate-800 rounded-xl p-2.5 shadow-inner">
      {/* Scope Header & Controls */}
      <div className="flex items-center justify-between mb-1.5 px-1">
        <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-300">
          <Activity className="w-3.5 h-3.5 text-cyan-400" />
          <span>{title || `${sensorType.toUpperCase()} SCOPE`}</span>
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setDisplayMode('wave')}
            className={`px-1.5 py-0.5 rounded text-[9px] font-bold cursor-pointer transition-colors ${
              displayMode === 'wave' 
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40' 
                : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            WAVE
          </button>
          <button
            type="button"
            onClick={() => setDisplayMode('fft')}
            className={`px-1.5 py-0.5 rounded text-[9px] font-bold cursor-pointer transition-colors ${
              displayMode === 'fft' 
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40' 
                : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            FFT
          </button>
        </div>
      </div>

      {/* CRT Canvas */}
      <canvas
        ref={canvasRef}
        width={320}
        height={height}
        className="w-full rounded border border-slate-900 shadow-inner"
        style={{ height }}
      />
    </div>
  );
};
