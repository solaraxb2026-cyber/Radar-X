import React, { useEffect, useRef, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { RadarBlip, SensorType } from '../types';
import { 
  Wifi, 
  Activity, 
  SunMedium, 
  Volume2, 
  Compass, 
  Target, 
  AlertTriangle 
} from 'lucide-react';

export interface RadarProps {
  /**
   * Confidence score from 0 to 100 which modulates the pulse intensity,
   * ripple rate, glow opacity, and harmonic visual feedback.
   */
  confidenceScore: number;
  size?: number;
  isScanning?: boolean;
  blips?: RadarBlip[];
  onBlipClick?: (blip: RadarBlip) => void;
  alertThreshold?: number;
  showDistanceLabels?: boolean;
  showAzimuthLines?: boolean;
  showBearingNumbers?: boolean;
  showSweepTrail?: boolean;
  className?: string;
  id?: string;
}

const SENSOR_ICONS: Record<SensorType, React.ComponentType<{ className?: string }>> = {
  proximity: Target,
  ble: Wifi,
  accelerometer: Activity,
  gyroscope: Compass,
  acoustic: Volume2,
  light: SunMedium,
  magnetometer: Compass,
};

const SENSOR_COLORS: Record<SensorType, { dot: string; glow: string; text: string; bg: string }> = {
  proximity: { dot: '#f43f5e', glow: 'rgba(244, 63, 94, 0.6)', text: 'text-rose-400', bg: 'bg-rose-500/20' },
  ble: { dot: '#0ea5e9', glow: 'rgba(14, 165, 233, 0.6)', text: 'text-sky-400', bg: 'bg-sky-500/20' },
  accelerometer: { dot: '#10b981', glow: 'rgba(16, 185, 129, 0.6)', text: 'text-emerald-400', bg: 'bg-emerald-500/20' },
  gyroscope: { dot: '#06b6d4', glow: 'rgba(6, 182, 212, 0.6)', text: 'text-cyan-400', bg: 'bg-cyan-500/20' },
  acoustic: { dot: '#a855f7', glow: 'rgba(168, 85, 247, 0.6)', text: 'text-purple-400', bg: 'bg-purple-500/20' },
  light: { dot: '#f59e0b', glow: 'rgba(245, 158, 11, 0.6)', text: 'text-amber-400', bg: 'bg-amber-500/20' },
  magnetometer: { dot: '#6366f1', glow: 'rgba(99, 102, 241, 0.6)', text: 'text-indigo-400', bg: 'bg-indigo-500/20' },
};

export const Radar: React.FC<RadarProps> = ({
  confidenceScore = 0,
  size = 420,
  isScanning = true,
  blips = [],
  onBlipClick,
  alertThreshold = 70,
  showDistanceLabels = true,
  showAzimuthLines = true,
  showBearingNumbers = true,
  showSweepTrail = true,
  className = '',
  id = 'sensor-radar-canvas',
}) => {
  const [hoveredBlip, setHoveredBlip] = useState<RadarBlip | null>(null);
  const [sweepAngle, setSweepAngle] = useState(0);
  const sweepAnimRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(performance.now());

  // Clamped confidence
  const normalizedConfidence = Math.max(0, Math.min(100, confidenceScore));
  const isHighAlert = normalizedConfidence >= alertThreshold;

  // Pulse intensity calculations modulated by confidence
  // 0% -> low opacity, slow animation, dim cyan
  // 100% -> high opacity, fast cycle, vivid emerald/amber excitation
  const pulseScale = useMemo(() => {
    return {
      duration: Math.max(1.0, 3.2 - (normalizedConfidence / 100) * 2.0), // 3.2s (idle) down to 1.2s (intense)
      opacity: 0.15 + (normalizedConfidence / 100) * 0.75, // 0.15 to 0.90
      glowRadius: 4 + (normalizedConfidence / 100) * 20, // 4px to 24px
      ringExcitation: (normalizedConfidence / 100),
      color: isHighAlert 
        ? '#f59e0b' 
        : normalizedConfidence > 45 
          ? '#10b981' 
          : '#06b6d4',
    };
  }, [normalizedConfidence, isHighAlert]);

  // Sweep rotation loop
  useEffect(() => {
    if (!isScanning) return;
    let currentAngle = sweepAngle;

    const animateSweep = (time: number) => {
      const delta = time - lastTimeRef.current;
      lastTimeRef.current = time;

      // Speed increases slightly when confidence is high (60 deg/sec up to 130 deg/sec)
      const degPerSec = 70 + (normalizedConfidence / 100) * 60;
      currentAngle = (currentAngle + (degPerSec * delta) / 1000) % 360;
      setSweepAngle(currentAngle);

      sweepAnimRef.current = requestAnimationFrame(animateSweep);
    };

    lastTimeRef.current = performance.now();
    sweepAnimRef.current = requestAnimationFrame(animateSweep);

    return () => {
      if (sweepAnimRef.current) cancelAnimationFrame(sweepAnimRef.current);
    };
  }, [isScanning, normalizedConfidence]);

  // Radius metrics
  const center = size / 2;
  const maxRadius = center - 24;
  const ringSteps = [0.25, 0.5, 0.75, 1.0]; // 4 concentric zones: 0.5m, 1.0m, 1.5m, 2.0m approx
  const distanceLabels = ['0.5m', '1.0m', '1.5m', '2.0m'];

  // Calculate blip phosphorescence based on sweep proximity
  const blipsWithIntensity = useMemo(() => {
    return blips.map((blip) => {
      // Angular difference between sweep and blip
      let diff = (sweepAngle - blip.angle + 360) % 360;
      // If sweep just passed it (within 45 degrees behind sweep), trigger high illumination
      let illumination = 0.4;
      if (diff >= 0 && diff < 60) {
        illumination = 1.0 - (diff / 60) * 0.55; // Decays smoothly from 1.0 to 0.45
      }
      return {
        ...blip,
        alpha: illumination,
      };
    });
  }, [blips, sweepAngle]);

  return (
    <div
      id={id}
      className={`relative inline-flex items-center justify-center select-none font-mono ${className}`}
      style={{ width: size, height: size }}
    >
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="overflow-visible"
        aria-label="Sensor Presence Radar Visualization"
      >
        <defs>
          {/* Radar background gradient */}
          <radialGradient id="radarBgGradient" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#0f172a" stopOpacity="0.95" />
            <stop offset="70%" stopColor="#020617" stopOpacity="0.98" />
            <stop offset="100%" stopColor="#000000" stopOpacity="1" />
          </radialGradient>

          {/* Sweeper gradient */}
          <linearGradient id="sweepSectorGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={pulseScale.color} stopOpacity="0.45" />
            <stop offset="60%" stopColor={pulseScale.color} stopOpacity="0.12" />
            <stop offset="100%" stopColor={pulseScale.color} stopOpacity="0" />
          </linearGradient>

          {/* Dynamic center pulse glow filter */}
          <filter id="pulseGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation={pulseScale.glowRadius / 2} result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          {/* Center Beacon Glow */}
          <filter id="centerBeaconFilter" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation={isHighAlert ? 6 : 3} result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* 1. Radar Base Plate */}
        <circle
          cx={center}
          cy={center}
          r={maxRadius + 14}
          fill="url(#radarBgGradient)"
          stroke="#1e293b"
          strokeWidth="2"
        />

        {/* Subtle Outer Bezel / Compass Ring */}
        <circle
          cx={center}
          cy={center}
          r={maxRadius + 8}
          fill="none"
          stroke="#334155"
          strokeWidth="1.5"
          strokeDasharray="4 6"
        />

        {/* 2. Azimuth & Angle Radial Lines */}
        {showAzimuthLines && (
          <g opacity="0.35" stroke="#475569" strokeWidth="1">
            {/* Major crosshairs */}
            <line x1={center} y1={center - maxRadius} x2={center} y2={center + maxRadius} strokeDasharray="3 3" />
            <line x1={center - maxRadius} y1={center} x2={center + maxRadius} y2={center} strokeDasharray="3 3" />

            {/* 45 degree diagonals */}
            <line
              x1={center - maxRadius * 0.707}
              y1={center - maxRadius * 0.707}
              x2={center + maxRadius * 0.707}
              y2={center + maxRadius * 0.707}
              strokeDasharray="2 4"
              opacity="0.5"
            />
            <line
              x1={center - maxRadius * 0.707}
              y1={center + maxRadius * 0.707}
              x2={center + maxRadius * 0.707}
              y2={center - maxRadius * 0.707}
              strokeDasharray="2 4"
              opacity="0.5"
            />
          </g>
        )}

        {/* Bearing numbers around perimeter */}
        {showBearingNumbers && (
          <g fontSize="9" fill="#64748b" fontWeight="600" textAnchor="middle" dominantBaseline="middle">
            <text x={center} y={center - maxRadius - 1}>000° N</text>
            <text x={center + maxRadius + 1} y={center + 3} textAnchor="start">090° E</text>
            <text x={center} y={center + maxRadius + 7}>180° S</text>
            <text x={center - maxRadius - 1} y={center + 3} textAnchor="end">270° W</text>
          </g>
        )}

        {/* 3. Static Concentric Grid Rings */}
        {ringSteps.map((step, idx) => {
          const ringR = maxRadius * step;
          const isOuter = idx === ringSteps.length - 1;
          return (
            <g key={`ring-${idx}`}>
              <circle
                cx={center}
                cy={center}
                r={ringR}
                fill="none"
                stroke={isHighAlert ? '#f59e0b' : '#334155'}
                strokeOpacity={isOuter ? 0.8 : 0.45}
                strokeWidth={isOuter ? 1.5 : 1}
                strokeDasharray={idx % 2 === 1 ? 'none' : '4 3'}
              />

              {/* Distance Labels */}
              {showDistanceLabels && (
                <text
                  x={center + 6}
                  y={center - ringR + 12}
                  fill={isHighAlert ? '#f59e0b' : '#64748b'}
                  fontSize="9"
                  opacity="0.85"
                  fontWeight="500"
                >
                  {distanceLabels[idx]}
                </text>
              )}
            </g>
          );
        })}

        {/* 4. Dynamic Animated Concentric Waves Modulated by Confidence */}
        {/* Layer 1: Expanding Ripple 1 */}
        <motion.circle
          cx={center}
          cy={center}
          fill="none"
          stroke={pulseScale.color}
          strokeWidth={1.5 + pulseScale.ringExcitation * 1.5}
          initial={{ r: 4, opacity: pulseScale.opacity }}
          animate={{
            r: [4, maxRadius * 0.98],
            opacity: [pulseScale.opacity, 0],
          }}
          transition={{
            duration: pulseScale.duration,
            repeat: Infinity,
            ease: 'easeOut',
          }}
          style={{ filter: `drop-shadow(0 0 ${pulseScale.glowRadius}px ${pulseScale.color})` }}
        />

        {/* Layer 2: Expanding Ripple 2 (Offset Phase) */}
        <motion.circle
          cx={center}
          cy={center}
          fill="none"
          stroke={pulseScale.color}
          strokeWidth={1 + pulseScale.ringExcitation}
          initial={{ r: 4, opacity: pulseScale.opacity * 0.8 }}
          animate={{
            r: [4, maxRadius * 0.98],
            opacity: [pulseScale.opacity * 0.8, 0],
          }}
          transition={{
            duration: pulseScale.duration,
            delay: pulseScale.duration * 0.38,
            repeat: Infinity,
            ease: 'easeOut',
          }}
          style={{ filter: `drop-shadow(0 0 ${pulseScale.glowRadius * 0.7}px ${pulseScale.color})` }}
        />

        {/* Layer 3: High Confidence Extra Rapid Wave */}
        {normalizedConfidence > 50 && (
          <motion.circle
            cx={center}
            cy={center}
            fill="none"
            stroke={pulseScale.color}
            strokeWidth={2}
            initial={{ r: 4, opacity: 0.9 }}
            animate={{
              r: [4, maxRadius * 0.75],
              opacity: [0.9, 0],
            }}
            transition={{
              duration: pulseScale.duration * 0.7,
              delay: pulseScale.duration * 0.7,
              repeat: Infinity,
              ease: 'easeOut',
            }}
          />
        )}

        {/* 5. Rotating Radar Sweep Beam */}
        {isScanning && (
          <g
            transform={`rotate(${sweepAngle} ${center} ${center})`}
            style={{ pointerEvents: 'none' }}
          >
            {/* Sweep Sector Trail */}
            {showSweepTrail && (
              <path
                d={`M ${center} ${center} 
                   L ${center + maxRadius * Math.cos((-45 * Math.PI) / 180)} ${center + maxRadius * Math.sin((-45 * Math.PI) / 180)} 
                   A ${maxRadius} ${maxRadius} 0 0 1 ${center + maxRadius} ${center} 
                   Z`}
                fill="url(#sweepSectorGrad)"
                opacity={0.7 + (normalizedConfidence / 100) * 0.3}
              />
            )}

            {/* Leading Sweep Line */}
            <line
              x1={center}
              y1={center}
              x2={center + maxRadius}
              y2={center}
              stroke={pulseScale.color}
              strokeWidth="2"
              strokeLinecap="round"
              opacity="0.95"
              style={{ filter: `drop-shadow(0 0 6px ${pulseScale.color})` }}
            />
          </g>
        )}

        {/* 6. Radar Target Blips */}
        {blipsWithIntensity.map((blip) => {
          const blipAngleRad = (blip.angle * Math.PI) / 180;
          const blipDist = Math.min(maxRadius * 0.92, maxRadius * blip.distance);
          const bx = center + blipDist * Math.cos(blipAngleRad);
          const by = center + blipDist * Math.sin(blipAngleRad);
          const colors = SENSOR_COLORS[blip.type] || SENSOR_COLORS.proximity;
          const alpha = blip.alpha ?? 0.7;

          return (
            <g
              key={blip.id}
              className="cursor-pointer transition-transform duration-150 hover:scale-125"
              onClick={() => onBlipClick?.(blip)}
              onMouseEnter={() => setHoveredBlip(blip)}
              onMouseLeave={() => setHoveredBlip(null)}
            >
              {/* Outer phosphorescent ping aura */}
              <circle
                cx={bx}
                cy={by}
                r={8 + blip.strength * 0.08}
                fill={colors.dot}
                fillOpacity={alpha * 0.3}
              />

              {/* Core target dot */}
              <circle
                cx={bx}
                cy={by}
                r={4.5}
                fill={colors.dot}
                fillOpacity={Math.max(0.4, alpha)}
                stroke="#0f172a"
                strokeWidth="1.5"
                style={{
                  filter: `drop-shadow(0 0 ${6 * alpha}px ${colors.dot})`,
                }}
              />

              {/* Blip label if highlighted */}
              {alpha > 0.7 && (
                <text
                  x={bx + 8}
                  y={by - 6}
                  fill="#f1f5f9"
                  fontSize="8.5"
                  fontWeight="600"
                  opacity={alpha}
                  className="pointer-events-none"
                >
                  {blip.label}
                </text>
              )}
            </g>
          );
        })}

        {/* 7. Center Device Reticle & Core Point */}
        <g id="radar-center-point">
          {/* Animated Center Aura Ring */}
          <motion.circle
            cx={center}
            cy={center}
            r={14}
            fill="none"
            stroke={pulseScale.color}
            strokeWidth="1.5"
            strokeOpacity={0.8}
            animate={{
              scale: [1, 1.25, 1],
              opacity: [0.6, 0.9, 0.6],
            }}
            transition={{
              duration: pulseScale.duration,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          />

          {/* Center point core dot */}
          <circle
            cx={center}
            cy={center}
            r={5}
            fill={pulseScale.color}
            filter="url(#centerBeaconFilter)"
          />
          <circle
            cx={center}
            cy={center}
            r={2}
            fill="#ffffff"
          />

          {/* Crosshair reticle ticks */}
          <line x1={center - 9} y1={center} x2={center - 3} y2={center} stroke="#ffffff" strokeWidth="1.2" />
          <line x1={center + 3} y1={center} x2={center + 9} y2={center} stroke="#ffffff" strokeWidth="1.2" />
          <line x1={center} y1={center - 9} x2={center} y2={center - 3} stroke="#ffffff" strokeWidth="1.2" />
          <line x1={center} y1={center + 3} x2={center} y2={center + 9} stroke="#ffffff" strokeWidth="1.2" />
        </g>
      </svg>

      {/* 8. Interactive Hover Tooltip for Blips */}
      <AnimatePresence>
        {hoveredBlip && (
          <motion.div
            initial={{ opacity: 0, y: 6, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.95 }}
            className="absolute bottom-2 left-1/2 -translate-x-1/2 z-20 px-3 py-2 bg-slate-900/95 border border-slate-700/80 rounded-lg shadow-xl text-xs backdrop-blur-md flex items-center gap-2.5 pointer-events-none min-w-[200px]"
          >
            {React.createElement(SENSOR_ICONS[hoveredBlip.type] || Target, {
              className: `w-4 h-4 ${SENSOR_COLORS[hoveredBlip.type]?.text || 'text-slate-400'}`,
            })}
            <div>
              <div className="font-bold text-slate-100 flex items-center justify-between gap-2">
                <span>{hoveredBlip.label}</span>
                <span className="text-[10px] text-slate-400 font-normal">
                  {(hoveredBlip.distance * 2.0).toFixed(2)}m
                </span>
              </div>
              <div className="text-[11px] text-slate-400 flex items-center gap-2 mt-0.5">
                <span>Signal: {hoveredBlip.strength}%</span>
                <span>•</span>
                <span>Bearing: {hoveredBlip.angle.toFixed(0)}°</span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 9. Live Alert Badge (when confidence crosses threshold) */}
      {isHighAlert && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: [1, 1.06, 1] }}
          transition={{ repeat: Infinity, duration: 1.2 }}
          className="absolute top-4 right-4 z-10 px-2.5 py-1 bg-amber-500/20 border border-amber-500/50 rounded-full flex items-center gap-1.5 text-amber-300 text-xs font-semibold backdrop-blur-sm shadow-lg shadow-amber-500/10"
        >
          <AlertTriangle className="w-3.5 h-3.5 animate-pulse text-amber-400" />
          <span>PROXIMITY ALERT</span>
        </motion.div>
      )}

      {/* 10. Range / Mode Gauge in Bottom Left of Radar */}
      <div className="absolute bottom-3 left-4 text-[10px] text-slate-400 font-mono flex flex-col gap-0.5 pointer-events-none">
        <span className="text-slate-400 font-bold tracking-wider">RANGE: 2.0m</span>
        <span className="text-slate-400">BEAM: 360° CONT</span>
      </div>
    </div>
  );
};
