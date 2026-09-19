import React, { useState, useRef, useEffect, useCallback } from 'react';

interface RotaryKnobProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  onChange: (value: number) => void;
  color?: 'emerald' | 'cyan' | 'amber' | 'purple' | 'rose' | 'slate';
  size?: 'sm' | 'md' | 'lg';
  defaultValue?: number;
  subtitle?: string;
}

export const RotaryKnob: React.FC<RotaryKnobProps> = ({
  label,
  value,
  min,
  max,
  step = 1,
  unit = '',
  onChange,
  color = 'cyan',
  size = 'md',
  defaultValue,
  subtitle,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const startYRef = useRef(0);
  const startValRef = useRef(0);
  const knobRef = useRef<HTMLDivElement>(null);

  // Rotation arc: from -135deg (min) to +135deg (max) => total 270deg span
  const normalized = Math.max(0, Math.min(1, (value - min) / (max - min || 1)));
  const angleDeg = -135 + normalized * 270;

  const colorMap = {
    emerald: {
      arc: '#10b981',
      glow: 'rgba(16, 185, 129, 0.4)',
      text: 'text-emerald-400',
      border: 'border-emerald-500/40',
      fill: '#10b981',
    },
    cyan: {
      arc: '#06b6d4',
      glow: 'rgba(6, 182, 212, 0.4)',
      text: 'text-cyan-400',
      border: 'border-cyan-500/40',
      fill: '#06b6d4',
    },
    amber: {
      arc: '#f59e0b',
      glow: 'rgba(245, 158, 11, 0.4)',
      text: 'text-amber-400',
      border: 'border-amber-500/40',
      fill: '#f59e0b',
    },
    purple: {
      arc: '#a855f7',
      glow: 'rgba(168, 85, 247, 0.4)',
      text: 'text-purple-400',
      border: 'border-purple-500/40',
      fill: '#a855f7',
    },
    rose: {
      arc: '#f43f5e',
      glow: 'rgba(244, 63, 94, 0.4)',
      text: 'text-rose-400',
      border: 'border-rose-500/40',
      fill: '#f43f5e',
    },
    slate: {
      arc: '#94a3b8',
      glow: 'rgba(148, 163, 184, 0.3)',
      text: 'text-slate-300',
      border: 'border-slate-600',
      fill: '#94a3b8',
    },
  };

  const c = colorMap[color] || colorMap.cyan;

  const sizePixels = {
    sm: 46,
    md: 62,
    lg: 80,
  }[size];

  const handlePointerDown = (e: React.PointerEvent) => {
    setIsDragging(true);
    startYRef.current = e.clientY;
    startValRef.current = value;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!isDragging) return;
    const dy = startYRef.current - e.clientY; // moving up increases value
    const range = max - min;
    const sensitivity = range / 140; // 140px drag for full scale
    let raw = startValRef.current + dy * sensitivity;
    raw = Math.max(min, Math.min(max, raw));
    if (step >= 1) {
      raw = Math.round(raw / step) * step;
    } else {
      const precision = step.toString().split('.')[1]?.length || 1;
      raw = parseFloat(raw.toFixed(precision));
    }
    onChange(raw);
  }, [isDragging, min, max, step, onChange]);

  const handlePointerUp = (e: React.PointerEvent) => {
    setIsDragging(false);
    try {
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {}
  };

  const handleDoubleClick = () => {
    if (defaultValue !== undefined) {
      onChange(defaultValue);
    }
  };

  // SVG arc calculation for LED arc around dial
  const radius = (sizePixels / 2) + 4;
  const strokeWidth = 3;
  const circumference = 2 * Math.PI * radius;
  // 270 degrees is 0.75 of circle
  const arcLength = circumference * 0.75;
  const strokeDashoffset = arcLength * (1 - normalized);

  return (
    <div className="flex flex-col items-center select-none font-mono text-center">
      {/* Knob Label */}
      <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-1 truncate max-w-[90px]">
        {label}
      </span>

      {/* Dial Container */}
      <div 
        ref={knobRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onDoubleClick={handleDoubleClick}
        className="relative flex items-center justify-center cursor-ns-resize touch-none group"
        style={{ width: sizePixels + 14, height: sizePixels + 14 }}
        title={`Drag up/down to adjust ${label}. Double-click to reset.`}
      >
        {/* Background Track & Active Glowing LED Arc */}
        <svg 
          className="absolute inset-0 pointer-events-none transform -rotate-135" 
          width={sizePixels + 14} 
          height={sizePixels + 14}
        >
          {/* Track Arc */}
          <circle
            cx={(sizePixels + 14) / 2}
            cy={(sizePixels + 14) / 2}
            r={radius}
            fill="none"
            stroke="#1e293b"
            strokeWidth={strokeWidth}
            strokeDasharray={`${arcLength} ${circumference}`}
            strokeLinecap="round"
          />
          {/* Active Level Arc */}
          <circle
            cx={(sizePixels + 14) / 2}
            cy={(sizePixels + 14) / 2}
            r={radius}
            fill="none"
            stroke={c.arc}
            strokeWidth={strokeWidth}
            strokeDasharray={`${arcLength} ${circumference}`}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            style={{
              filter: isDragging ? `drop-shadow(0 0 6px ${c.glow})` : undefined,
              transition: isDragging ? 'none' : 'stroke-dashoffset 0.1s ease',
            }}
          />
        </svg>

        {/* Brushed Metal Cylindrical Knob */}
        <div
          className={`rounded-full shadow-lg border relative flex items-center justify-center transition-all ${
            isDragging 
              ? 'border-white/40 ring-2 ring-cyan-500/30 shadow-cyan-900/30' 
              : 'border-slate-700/80 hover:border-slate-500'
          }`}
          style={{
            width: sizePixels,
            height: sizePixels,
            background: 'radial-gradient(circle at 35% 35%, #334155 0%, #0f172a 70%, #020617 100%)',
            boxShadow: 'inset 0 1px 2px rgba(255,255,255,0.2), 0 4px 10px rgba(0,0,0,0.7)',
          }}
        >
          {/* Inner Gripped Texture Ring */}
          <div 
            className="w-3/4 h-3/4 rounded-full border border-slate-700/40 opacity-70"
            style={{
              background: 'repeating-conic-gradient(from 0deg, #1e293b 0deg 10deg, #0f172a 10deg 20deg)',
            }}
          />

          {/* Indicator Notch / Pointer Line */}
          <div
            className="absolute inset-0 flex items-center justify-center pointer-events-none"
            style={{
              transform: `rotate(${angleDeg}deg)`,
              transition: isDragging ? 'none' : 'transform 0.08s ease-out',
            }}
          >
            <div 
              className="w-1 rounded-full shadow-sm"
              style={{
                height: sizePixels * 0.32,
                marginTop: -sizePixels * 0.28,
                backgroundColor: isDragging ? '#ffffff' : c.arc,
                boxShadow: `0 0 4px ${c.glow}`,
              }}
            />
          </div>
        </div>
      </div>

      {/* Numeric Telemetry Display with Unit */}
      <div className="mt-1 flex items-baseline justify-center gap-0.5 px-2 py-0.5 rounded bg-slate-950 border border-slate-800 text-[11px] font-bold shadow-inner">
        <span className={c.text}>{value}</span>
        {unit && <span className="text-[9px] text-slate-500 font-normal">{unit}</span>}
      </div>

      {subtitle && (
        <span className="text-[9px] text-slate-500 mt-0.5 truncate max-w-[85px]">
          {subtitle}
        </span>
      )}
    </div>
  );
};
