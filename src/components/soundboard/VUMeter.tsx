import React, { useEffect, useState, useRef } from 'react';

interface VUMeterProps {
  levelPercent: number; // 0 to 100
  label?: string;
  sublabel?: string;
  variant?: 'analog' | 'led' | 'compact';
  height?: number;
  width?: number;
  showPeakHold?: boolean;
}

export const VUMeter: React.FC<VUMeterProps> = ({
  levelPercent,
  label,
  sublabel,
  variant = 'led',
  height = 140,
  width = 32,
  showPeakHold = true,
}) => {
  const [peak, setPeak] = useState(levelPercent);
  const peakDecayTimer = useRef<number | null>(null);

  // Smooth peak hold behavior
  useEffect(() => {
    if (levelPercent > peak) {
      setPeak(levelPercent);
    } else {
      if (peakDecayTimer.current) window.clearTimeout(peakDecayTimer.current);
      peakDecayTimer.current = window.setTimeout(() => {
        setPeak((p) => Math.max(0, p - 3));
      }, 80);
    }
    return () => {
      if (peakDecayTimer.current) window.clearTimeout(peakDecayTimer.current);
    };
  }, [levelPercent, peak]);

  // Convert 0-100 to dB scale (-36 dB to +3 dB)
  const dbValue = levelPercent <= 0 
    ? -Infinity 
    : Math.round(-36 + (levelPercent / 100) * 39);

  if (variant === 'analog') {
    // Vintage Backlit Analog Needle Gauge
    // Angle: -45deg (-20dB) to +45deg (+3dB)
    const needleAngle = -45 + (Math.min(100, Math.max(0, levelPercent)) / 100) * 90;
    const isOverload = levelPercent > 85;

    return (
      <div className="flex flex-col items-center select-none font-mono">
        {label && (
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
            {label}
          </span>
        )}
        <div 
          className="relative rounded-lg border border-slate-700 bg-slate-900 shadow-inner overflow-hidden p-2 flex flex-col items-center justify-between"
          style={{ width: 140, height: 95, background: 'linear-gradient(180deg, #1e293b 0%, #0f172a 100%)' }}
        >
          {/* Glowing Dial Plate */}
          <svg className="w-full h-full overflow-visible" viewBox="0 0 140 85">
            <defs>
              <linearGradient id="analogDialGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#fef08a" stopOpacity="0.9" />
                <stop offset="100%" stopColor="#ca8a04" stopOpacity="0.75" />
              </linearGradient>
            </defs>

            {/* Dial Background Arc */}
            <path
              d="M 15,65 A 65,65 0 0,1 125,65"
              fill="none"
              stroke="#0f172a"
              strokeWidth="20"
            />
            {/* Green Safe Zone */}
            <path
              d="M 22,63 A 60,60 0 0,1 95,20"
              fill="none"
              stroke="#22c55e"
              strokeWidth="4"
              opacity="0.8"
            />
            {/* Amber Warning Zone */}
            <path
              d="M 95,20 A 60,60 0 0,1 110,32"
              fill="none"
              stroke="#f59e0b"
              strokeWidth="4"
            />
            {/* Red Overload Zone */}
            <path
              d="M 110,32 A 60,60 0 0,1 120,55"
              fill="none"
              stroke="#ef4444"
              strokeWidth="4"
            />

            {/* Tick Marks & Scale Labels */}
            <text x="25" y="70" fill="#94a3b8" fontSize="7" textAnchor="middle">-20</text>
            <text x="50" y="38" fill="#94a3b8" fontSize="7" textAnchor="middle">-10</text>
            <text x="75" y="24" fill="#94a3b8" fontSize="7" textAnchor="middle">-5</text>
            <text x="96" y="22" fill="#f59e0b" fontSize="7" textAnchor="middle">0</text>
            <text x="118" y="42" fill="#ef4444" fontSize="7" textAnchor="middle">+3</text>

            <text x="70" y="52" fill="#64748b" fontSize="7.5" fontWeight="bold" textAnchor="middle">VU METRIC</text>

            {/* Pivot Needle */}
            <g transform={`rotate(${needleAngle} 70 80)`}>
              <line
                x1="70"
                y1="80"
                x2="70"
                y2="15"
                stroke={isOverload ? '#f43f5e' : '#f8fafc'}
                strokeWidth="1.6"
                strokeLinecap="round"
                style={{
                  filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.8))',
                  transition: 'transform 0.06s ease-out',
                }}
              />
              <circle cx="70" cy="80" r="4.5" fill="#334155" stroke="#475569" strokeWidth="1" />
            </g>
          </svg>

          {/* Peak LED Overload Dot */}
          <div className="absolute top-2 right-2 flex items-center gap-1">
            <span className="text-[8px] text-slate-500">PEAK</span>
            <div
              className={`w-2 h-2 rounded-full border border-slate-900 transition-colors ${
                isOverload ? 'bg-rose-500 shadow-[0_0_6px_#f43f5e]' : 'bg-slate-800'
              }`}
            />
          </div>
        </div>
      </div>
    );
  }

  // Segmented LED Ladder Meter (Professional Audio Console Strip)
  const totalSegments = 16;
  const activeSegments = Math.round((levelPercent / 100) * totalSegments);
  const peakSegment = Math.round((peak / 100) * totalSegments);

  return (
    <div className="flex flex-col items-center select-none font-mono">
      {label && (
        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1 truncate max-w-[50px]">
          {label}
        </span>
      )}

      {/* LED Meter Housing */}
      <div
        className="relative bg-slate-950 border border-slate-800/90 rounded-md p-1 flex flex-col justify-end items-center shadow-inner gap-0.5"
        style={{ width, height }}
      >
        {/* Scale DB Tick Marks along the side */}
        <div className="absolute -left-3 inset-y-1 flex flex-col justify-between text-[7px] text-slate-600 font-bold pointer-events-none">
          <span>+3</span>
          <span>0</span>
          <span>-6</span>
          <span>-18</span>
          <span>-∞</span>
        </div>

        {/* LED Bars stacked from bottom (low) to top (high) */}
        {Array.from({ length: totalSegments }).map((_, idx) => {
          // Bottom segment is index 0, top segment is index 15
          const segFromBottom = idx;
          const segIndex = totalSegments - 1 - idx;
          const isActive = segFromBottom < activeSegments;
          const isPeak = showPeakHold && segFromBottom === peakSegment && peakSegment > 0;

          // Color thresholds: top 3 are RED, next 4 are AMBER, bottom 9 are GREEN
          let activeColor = 'bg-emerald-400 shadow-[0_0_4px_#34d399]';
          let inactiveColor = 'bg-emerald-950/40';

          if (segFromBottom >= 13) {
            activeColor = 'bg-rose-500 shadow-[0_0_6px_#f43f5e]';
            inactiveColor = 'bg-rose-950/40';
          } else if (segFromBottom >= 9) {
            activeColor = 'bg-amber-400 shadow-[0_0_5px_#fbbf24]';
            inactiveColor = 'bg-amber-950/40';
          }

          return (
            <div
              key={segIndex}
              className={`w-full rounded-[1px] transition-colors duration-75 ${
                isPeak 
                  ? (segFromBottom >= 13 ? 'bg-rose-400 shadow-[0_0_6px_#f43f5e]' : 'bg-amber-300 shadow-[0_0_5px_#fde047]')
                  : isActive 
                    ? activeColor 
                    : inactiveColor
              }`}
              style={{
                height: `${(height - 12) / totalSegments - 1}px`,
              }}
            />
          );
        })}
      </div>

      {/* Digital Level Reading */}
      <div className="mt-1 text-[9px] font-bold text-slate-400 text-center">
        {dbValue === -Infinity ? '-∞' : `${dbValue > 0 ? `+${dbValue}` : dbValue}dB`}
      </div>

      {sublabel && (
        <span className="text-[8px] text-slate-500 mt-0.5 truncate max-w-[50px]">
          {sublabel}
        </span>
      )}
    </div>
  );
};
