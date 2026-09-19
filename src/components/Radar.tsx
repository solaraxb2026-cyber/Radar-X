import React, { useEffect, useRef, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  RadarBlip, 
  DetectionClassification, 
  CreatureSize,
  RadarFilterSettings 
} from '../types';
import { 
  User, 
  PawPrint, 
  HelpCircle, 
  Compass, 
  Layers, 
  Wifi, 
  Volume2, 
  Camera, 
  Activity,
  Car,
  Smartphone,
  SlidersHorizontal,
  Search,
  Filter,
  Eye,
  Navigation,
  Crosshair,
  RotateCcw,
  Scale,
  Radio,
  Watch,
  Sparkles,
  Zap
} from 'lucide-react';

export const DEFAULT_RADAR_FILTER: RadarFilterSettings = {
  showHumans: true,
  showCreatures: true,
  creatureSizes: {
    tiny: true,
    small: true,
    medium: true,
    large: true,
  },
  showDevices: true,
  showVehicles: true,
  showUnknown: true,
  minDistanceM: 0,
  maxDistanceM: 5.0,
  minConfidence: 0,
  azimuthSector: 'all',
  searchQuery: '',
};

export interface RadarProps {
  confidenceScore: number;
  size?: number;
  isScanning?: boolean;
  compassHeading?: number; // 0-360° from magnetometer
  blips?: RadarBlip[];
  onBlipClick?: (blip: RadarBlip) => void;
  alertThreshold?: number;
  showDistanceLabels?: boolean;
  showAzimuthLines?: boolean;
  showBearingNumbers?: boolean;
  showSweepTrail?: boolean;
  showOccupancyGrid?: boolean;
  onToggleOccupancyGrid?: () => void;
  onOpenMicromanage?: () => void;
  onOpenCarriedDevices?: () => void;
  carriedDevicesCount?: number;
  accuracyBoostPercent?: number;
  filterSettings?: RadarFilterSettings;
  onUpdateFilter?: (filter: RadarFilterSettings) => void;
  className?: string;
  id?: string;
}

export const Radar: React.FC<RadarProps> = ({
  confidenceScore = 0,
  size = 460,
  isScanning = true,
  compassHeading = 0,
  blips = [],
  onBlipClick,
  alertThreshold = 65,
  showDistanceLabels = true,
  showAzimuthLines = true,
  showBearingNumbers = true,
  showSweepTrail = true,
  showOccupancyGrid = false,
  onToggleOccupancyGrid,
  onOpenMicromanage,
  onOpenCarriedDevices,
  carriedDevicesCount,
  accuracyBoostPercent,
  filterSettings: externalFilter,
  onUpdateFilter: externalOnUpdateFilter,
  className = '',
  id = 'sensor-radar-canvas',
}) => {
  const [internalFilter, setInternalFilter] = useState<RadarFilterSettings>(DEFAULT_RADAR_FILTER);
  const filter = externalFilter || internalFilter;
  const updateFilter = externalOnUpdateFilter || setInternalFilter;

  const [hoveredBlip, setHoveredBlip] = useState<RadarBlip | null>(null);
  const [selectedBlipId, setSelectedBlipId] = useState<string | null>(null);
  const [mouseCoord, setMouseCoord] = useState<{ bearing: number; distanceM: number; x: number; y: number } | null>(null);
  const [showFilterBar, setShowFilterBar] = useState(true);
  const [headingLock, setHeadingLock] = useState<'device' | 'compass'>('device');
  const [showLabels, setShowLabels] = useState(false);
  const [sweepAngle, setSweepAngle] = useState(0);

  const sweepAnimRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(performance.now());
  const svgRef = useRef<SVGSVGElement | null>(null);

  const normalizedConfidence = Math.max(0, Math.min(100, confidenceScore));
  const isHighAlert = normalizedConfidence >= alertThreshold;

  // Dynamic excitation driven by confidence score
  const pulseScale = useMemo(() => {
    const isElevated = normalizedConfidence > 40;
    return {
      duration: Math.max(1.1, 3.0 - (normalizedConfidence / 100) * 1.8),
      opacity: 0.2 + (normalizedConfidence / 100) * 0.75,
      color: isHighAlert 
        ? '#f43f5e' 
        : isElevated 
          ? '#10b981' 
          : '#06b6d4',
    };
  }, [normalizedConfidence, isHighAlert]);

  // Sweep rotation animation loop
  useEffect(() => {
    if (!isScanning) return;
    let currentAngle = sweepAngle;

    const animateSweep = (time: number) => {
      const delta = time - lastTimeRef.current;
      lastTimeRef.current = time;

      const degPerSec = 65 + (normalizedConfidence / 100) * 55;
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

  // Geometry
  const center = size / 2;
  const maxRadius = center - 32;
  const ringSteps = [0.2, 0.4, 0.6, 0.8, 1.0]; // 1m, 2m, 3m, 4m, 5m
  const ringLabels = ['1.0m', '2.0m', '3.0m', '4.0m', '5.0m'];

  // Mouse / Touch coordinate tracker for real-time pinpointing
  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left - center;
    const y = e.clientY - rect.top - center;
    const distPx = Math.sqrt(x * x + y * y);
    if (distPx > maxRadius + 15) {
      setMouseCoord(null);
      return;
    }

    // Angle in degrees: 0° is North (up), clockwise
    let rad = Math.atan2(x, -y);
    let deg = (rad * 180) / Math.PI;
    if (deg < 0) deg += 360;

    const distMeters = Math.min(5.0, (distPx / maxRadius) * 5.0);
    setMouseCoord({
      bearing: Math.round(deg),
      distanceM: parseFloat(distMeters.toFixed(2)),
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
  };

  const handleMouseLeave = () => {
    setMouseCoord(null);
  };

  // FILTER LOGIC
  const filteredBlips = useMemo(() => {
    return blips.filter((blip) => {
      // 1. Classification & Size Filters
      if (blip.classification === 'human' && !filter.showHumans) return false;
      
      if (blip.classification === 'creature' || blip.classification === 'animal') {
        if (!filter.showCreatures) return false;
        const size = blip.creatureSize || 'medium';
        if (!filter.creatureSizes[size]) return false;
      }

      if (blip.classification === 'device' && !filter.showDevices) return false;
      if (blip.classification === 'vehicle' && !filter.showVehicles) return false;
      if (blip.classification === 'unknown' && !filter.showUnknown) return false;

      // 2. Distance range
      if (blip.distanceMeters < filter.minDistanceM || blip.distanceMeters > filter.maxDistanceM) {
        return false;
      }

      // 3. Minimum Confidence
      if (blip.strength < filter.minConfidence) return false;

      // 4. Azimuth Sector Filter
      const angle = (blip.angle % 360 + 360) % 360;
      if (filter.azimuthSector === 'front_arc') {
        if (!(angle <= 45 || angle >= 315)) return false;
      } else if (filter.azimuthSector === 'rear_arc') {
        if (!(angle >= 135 && angle <= 225)) return false;
      } else if (filter.azimuthSector === 'left_flank') {
        if (!(angle >= 225 && angle <= 315)) return false;
      } else if (filter.azimuthSector === 'right_flank') {
        if (!(angle >= 45 && angle <= 135)) return false;
      }

      // 5. Search Text Filter
      if (filter.searchQuery.trim()) {
        const query = filter.searchQuery.toLowerCase();
        const text = `${blip.label} ${blip.subClass || ''} ${blip.classification} ${blip.creatureSize || ''}`.toLowerCase();
        if (!text.includes(query)) return false;
      }

      return true;
    });
  }, [blips, filter]);

  // Target counts for filter badges
  const counts = useMemo(() => {
    let humans = 0;
    let creatures = 0;
    let devices = 0;
    let vehicles = 0;
    let unknown = 0;

    blips.forEach((b) => {
      if (b.classification === 'human') humans++;
      else if (b.classification === 'creature' || b.classification === 'animal') creatures++;
      else if (b.classification === 'device') devices++;
      else if (b.classification === 'vehicle') vehicles++;
      else unknown++;
    });

    return { humans, creatures, devices, vehicles, unknown, total: blips.length };
  }, [blips]);

  // Compute phosphor illumination decay
  const blipsWithIntensity = useMemo(() => {
    return filteredBlips.map((blip) => {
      const diff = (sweepAngle - blip.angle + 360) % 360;
      let illumination = 0.5;
      if (diff >= 0 && diff < 65) {
        illumination = 1.0 - (diff / 65) * 0.48;
      }
      return {
        ...blip,
        alpha: illumination,
      };
    });
  }, [filteredBlips, sweepAngle]);

  const activeTarget = hoveredBlip || (selectedBlipId ? blips.find((b) => b.id === selectedBlipId) : null);

  return (
    <div
      id={id}
      className={`flex flex-col items-center gap-3 select-none font-mono ${className}`}
    >
      {/* 1. Radar Control & Filter Toolbar */}
      <div className="w-full max-w-xl bg-slate-950/80 border border-slate-800 rounded-xl p-3 backdrop-blur-md space-y-2.5 text-xs">
        {/* Top Quick Category Filter Chips */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-1.5">
            {/* All */}
            <button
              type="button"
              onClick={() => {
                const allActive = filter.showHumans && filter.showCreatures && filter.showDevices && filter.showVehicles;
                updateFilter({
                  ...filter,
                  showHumans: !allActive,
                  showCreatures: !allActive,
                  showDevices: !allActive,
                  showVehicles: !allActive,
                  showUnknown: !allActive,
                });
              }}
              className="px-2.5 py-1 rounded-md text-[11px] font-bold transition-colors cursor-pointer bg-slate-800 hover:bg-slate-700 text-slate-200"
            >
              Targets: {filteredBlips.length}/{counts.total}
            </button>

            {/* Living Beings (Humans) */}
            <button
              type="button"
              onClick={() => updateFilter({ ...filter, showHumans: !filter.showHumans })}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-semibold transition-colors cursor-pointer border ${
                filter.showHumans 
                  ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300' 
                  : 'bg-slate-900 border-slate-800 text-slate-500 line-through'
              }`}
            >
              <User className="w-3 h-3" />
              <span>Humans ({counts.humans})</span>
            </button>

            {/* Creatures */}
            <button
              type="button"
              onClick={() => updateFilter({ ...filter, showCreatures: !filter.showCreatures })}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-semibold transition-colors cursor-pointer border ${
                filter.showCreatures 
                  ? 'bg-amber-500/20 border-amber-500/50 text-amber-300' 
                  : 'bg-slate-900 border-slate-800 text-slate-500 line-through'
              }`}
            >
              <PawPrint className="w-3 h-3" />
              <span>Creatures ({counts.creatures})</span>
            </button>

            {/* Devices */}
            <button
              type="button"
              onClick={() => updateFilter({ ...filter, showDevices: !filter.showDevices })}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-semibold transition-colors cursor-pointer border ${
                filter.showDevices 
                  ? 'bg-sky-500/20 border-sky-500/50 text-sky-300' 
                  : 'bg-slate-900 border-slate-800 text-slate-500 line-through'
              }`}
            >
              <Smartphone className="w-3 h-3" />
              <span>Devices ({counts.devices})</span>
            </button>

            {/* Vehicles / Cars */}
            <button
              type="button"
              onClick={() => updateFilter({ ...filter, showVehicles: !filter.showVehicles })}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-semibold transition-colors cursor-pointer border ${
                filter.showVehicles 
                  ? 'bg-rose-500/20 border-rose-500/50 text-rose-300' 
                  : 'bg-slate-900 border-slate-800 text-slate-500 line-through'
              }`}
            >
              <Car className="w-3 h-3" />
              <span>Cars ({counts.vehicles})</span>
            </button>
          </div>

          {/* Carried Device Signal Assist & Micromanage Shortcuts */}
          <div className="flex items-center gap-2 ml-auto">
            {onOpenCarriedDevices && (
              <button
                type="button"
                onClick={onOpenCarriedDevices}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/40 text-emerald-300 font-semibold text-[11px] transition-colors cursor-pointer"
                title="Manage personal devices carried by target to boost radar precision"
              >
                <Radio className="w-3 h-3 text-emerald-400" />
                <span>Carried Devices ({carriedDevicesCount ?? 2})</span>
                {accuracyBoostPercent ? (
                  <span className="px-1 py-0.2 rounded bg-emerald-900/60 text-[9px] text-emerald-200">
                    +{accuracyBoostPercent}% Acc
                  </span>
                ) : null}
              </button>
            )}

            {onOpenMicromanage && (
              <button
                type="button"
                onClick={onOpenMicromanage}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-500/40 text-cyan-300 font-semibold text-[11px] transition-colors cursor-pointer"
              >
                <SlidersHorizontal className="w-3 h-3" />
                <span>Micromanage Sensors</span>
              </button>
            )}
          </div>
        </div>

        {/* Creature Size Sub-Filter Pills (shown if creatures active) */}
        {filter.showCreatures && (
          <div className="flex items-center gap-1.5 pt-1 border-t border-slate-800/80 text-[11px]">
            <span className="text-slate-400 font-mono text-[10px] uppercase flex items-center gap-1">
              <Scale className="w-3 h-3 text-amber-400" />
              Creature Size:
            </span>
            {(['tiny', 'small', 'medium', 'large'] as CreatureSize[]).map((sz) => {
              const active = filter.creatureSizes[sz];
              const labels = {
                tiny: 'Tiny (<0.5kg)',
                small: 'Small (0.5-5kg)',
                medium: 'Medium (5-25kg)',
                large: 'Large (>25kg)',
              };
              return (
                <button
                  key={sz}
                  type="button"
                  onClick={() =>
                    updateFilter({
                      ...filter,
                      creatureSizes: {
                        ...filter.creatureSizes,
                        [sz]: !active,
                      },
                    })
                  }
                  className={`px-2 py-0.5 rounded text-[10px] font-mono transition-colors cursor-pointer border ${
                    active
                      ? 'bg-amber-500/20 border-amber-500/40 text-amber-200 font-bold'
                      : 'bg-slate-900 border-slate-800 text-slate-500'
                  }`}
                >
                  {labels[sz]}
                </button>
              );
            })}
          </div>
        )}

        {/* Direction Sector & Search Bar */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-800/60">
          {/* Direction Sector Dropdown/Pills */}
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] text-slate-400 uppercase font-mono flex items-center gap-1">
              <Navigation className="w-3 h-3 text-cyan-400" />
              Sector:
            </span>
            {[
              { id: 'all', label: '360° All' },
              { id: 'front_arc', label: 'Front ±45°' },
              { id: 'rear_arc', label: 'Rear' },
              { id: 'left_flank', label: 'Left Flank' },
              { id: 'right_flank', label: 'Right Flank' },
            ].map((sec) => (
              <button
                key={sec.id}
                type="button"
                onClick={() => updateFilter({ ...filter, azimuthSector: sec.id as RadarFilterSettings['azimuthSector'] })}
                className={`px-2 py-0.5 rounded text-[10px] transition-colors cursor-pointer ${
                  filter.azimuthSector === sec.id
                    ? 'bg-cyan-500/20 border border-cyan-500/40 text-cyan-300 font-bold'
                    : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                {sec.label}
              </button>
            ))}
          </div>

          {/* Labels toggle and Search Box */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowLabels(!showLabels)}
              className={`px-2 py-0.5 rounded text-[10px] font-mono transition-colors cursor-pointer border ${
                showLabels 
                  ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300' 
                  : 'bg-slate-900 border-slate-800 text-slate-500 hover:text-slate-300'
              }`}
              title="Toggle target name tags on radar canvas"
            >
              Tags: {showLabels ? 'ON' : 'OFF'}
            </button>

            {/* Search Box */}
            <div className="relative">
              <Search className="w-3 h-3 text-slate-500 absolute left-2 top-2" />
              <input
                type="text"
                placeholder="Search target..."
                value={filter.searchQuery}
                onChange={(e) => updateFilter({ ...filter, searchQuery: e.target.value })}
                className="pl-6 pr-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-[11px] text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-cyan-500 w-28"
              />
            </div>
          </div>
        </div>
      </div>

      {/* 2. Main Radar Display Canvas */}
      <div 
        className="relative inline-flex items-center justify-center"
        style={{ width: size, height: size }}
      >
        <svg
          ref={svgRef}
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          className="overflow-visible cursor-crosshair"
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          aria-label="Sensor Fusion Directional Radar"
        >
          <defs>
            <radialGradient id="radarBgGradient" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#0a0f1d" stopOpacity="0.98" />
              <stop offset="65%" stopColor="#030712" stopOpacity="0.99" />
              <stop offset="100%" stopColor="#000000" stopOpacity="1" />
            </radialGradient>

            <linearGradient id="sweepSectorGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor={pulseScale.color} stopOpacity="0.4" />
              <stop offset="60%" stopColor={pulseScale.color} stopOpacity="0.12" />
              <stop offset="100%" stopColor={pulseScale.color} stopOpacity="0" />
            </linearGradient>

            {/* Vehicle Direction Arrow Marker */}
            <marker id="vehicleArrow" markerWidth="6" markerHeight="6" refX="4" refY="3" orient="auto">
              <path d="M0,0 L6,3 L0,6 Z" fill="#f43f5e" />
            </marker>
            <marker id="headingArrow" markerWidth="6" markerHeight="6" refX="4" refY="3" orient="auto">
              <path d="M0,0 L6,3 L0,6 Z" fill="#06b6d4" />
            </marker>
          </defs>

          {/* Radar Base Outer Rim */}
          <circle
            cx={center}
            cy={center}
            r={maxRadius + 20}
            fill="url(#radarBgGradient)"
            stroke="#1e293b"
            strokeWidth="1.5"
          />

          {/* Outer High-Precision Compass Ring with Azimuth Ticks every 15° */}
          <circle
            cx={center}
            cy={center}
            r={maxRadius + 10}
            fill="none"
            stroke="#334155"
            strokeWidth="1"
          />

          {Array.from({ length: 24 }).map((_, i) => {
            const angle = i * 15;
            const rad = ((angle - 90) * Math.PI) / 180;
            const isMajor = angle % 45 === 0;
            const tickInner = maxRadius + (isMajor ? 4 : 8);
            const tickOuter = maxRadius + 10;
            return (
              <line
                key={`tick-${angle}`}
                x1={center + tickInner * Math.cos(rad)}
                y1={center + tickInner * Math.sin(rad)}
                x2={center + tickOuter * Math.cos(rad)}
                y2={center + tickOuter * Math.sin(rad)}
                stroke={isMajor ? '#38bdf8' : '#475569'}
                strokeWidth={isMajor ? 1.5 : 0.8}
              />
            );
          })}

          {/* Camera Optical FOV Sector (68° arc: -34° to +34°) */}
          <path
            d={`M ${center} ${center} 
               L ${center + maxRadius * Math.sin((-34 * Math.PI) / 180)} ${center - maxRadius * Math.cos((-34 * Math.PI) / 180)} 
               A ${maxRadius} ${maxRadius} 0 0 1 ${center + maxRadius * Math.sin((34 * Math.PI) / 180)} ${center - maxRadius * Math.cos((34 * Math.PI) / 180)} 
               Z`}
            fill="#10b981"
            fillOpacity="0.04"
            stroke="#10b981"
            strokeOpacity="0.15"
            strokeWidth="1"
            strokeDasharray="3 3"
          />

          {/* Azimuth Radial Crosshairs (30° intervals) */}
          {showAzimuthLines && (
            <g opacity="0.3" stroke="#475569" strokeWidth="0.8">
              {[0, 30, 60, 90, 120, 150].map((deg) => {
                const rad = ((deg - 90) * Math.PI) / 180;
                return (
                  <line
                    key={`radial-${deg}`}
                    x1={center - maxRadius * Math.cos(rad)}
                    y1={center - maxRadius * Math.sin(rad)}
                    x2={center + maxRadius * Math.cos(rad)}
                    y2={center + maxRadius * Math.sin(rad)}
                    strokeDasharray="2 4"
                  />
                );
              })}
            </g>
          )}

          {/* Bearing Labels (Cardinal & Intercardinal) */}
          {showBearingNumbers && (
            <g fontSize="8.5" fill="#94a3b8" fontWeight="600" textAnchor="middle" dominantBaseline="middle">
              <text x={center} y={center - maxRadius - 1}>000° N</text>
              <text x={center + maxRadius * 0.707 + 10} y={center - maxRadius * 0.707}>045° NE</text>
              <text x={center + maxRadius + 3} y={center + 2} textAnchor="start">090° E</text>
              <text x={center + maxRadius * 0.707 + 10} y={center + maxRadius * 0.707 + 4}>135° SE</text>
              <text x={center} y={center + maxRadius + 8}>180° S</text>
              <text x={center - maxRadius * 0.707 - 10} y={center + maxRadius * 0.707 + 4}>225° SW</text>
              <text x={center - maxRadius - 3} y={center + 2} textAnchor="end">270° W</text>
              <text x={center - maxRadius * 0.707 - 10} y={center - maxRadius * 0.707}>315° NW</text>
            </g>
          )}

          {/* Distance Rings */}
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
                  stroke={isOuter ? '#475569' : '#1e293b'}
                  strokeWidth={isOuter ? 1.5 : 1}
                  strokeDasharray={isOuter ? 'none' : '4 4'}
                />
                {showDistanceLabels && (
                  <text
                    x={center + 6}
                    y={center - ringR + 11}
                    fontSize="8"
                    fontWeight="500"
                    fill="#64748b"
                    opacity="0.85"
                  >
                    {ringLabels[idx]}
                  </text>
                )}
              </g>
            );
          })}

          {/* Dynamic Confidence Waves */}
          <AnimatePresence>
            {normalizedConfidence > 15 && isScanning && (
              <motion.circle
                key="confidence-ripple-1"
                cx={center}
                cy={center}
                initial={{ r: 8, opacity: 0.8 }}
                animate={{
                  r: [10, maxRadius * 0.95],
                  opacity: [pulseScale.opacity, 0],
                }}
                transition={{
                  duration: pulseScale.duration,
                  repeat: Infinity,
                  ease: 'easeOut',
                }}
                fill="none"
                stroke={pulseScale.color}
                strokeWidth={1.5 + (normalizedConfidence / 100) * 1.5}
              />
            )}
          </AnimatePresence>

          {/* Rotating Sweep Beam */}
          {isScanning && (
            <g transform={`rotate(${sweepAngle} ${center} ${center})`}>
              {showSweepTrail && (
                <path
                  d={`M ${center} ${center} 
                     L ${center + maxRadius * Math.cos((-50 * Math.PI) / 180)} ${center + maxRadius * Math.sin((-50 * Math.PI) / 180)} 
                     A ${maxRadius} ${maxRadius} 0 0 1 ${center + maxRadius} ${center} 
                     Z`}
                  fill="url(#sweepSectorGrad)"
                  opacity={0.75 + (normalizedConfidence / 100) * 0.25}
                />
              )}
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

          {/* TARGET DIRECTION PINPOINTING: Line of Bearing (LoB) Ray for active/hovered target */}
          {activeTarget && (() => {
            const rad = ((activeTarget.angle - 90) * Math.PI) / 180;
            const distPx = Math.min(maxRadius * 0.94, maxRadius * activeTarget.distance);
            const bx = center + distPx * Math.cos(rad);
            const by = center + distPx * Math.sin(rad);

            return (
              <g id="active-target-lob" className="pointer-events-none">
                {/* 1. Line of Bearing (LoB) Vector */}
                <line
                  x1={center}
                  y1={center}
                  x2={bx}
                  y2={by}
                  stroke="#38bdf8"
                  strokeWidth="1.5"
                  strokeDasharray="3 3"
                  opacity="0.85"
                />

                {/* 2. Dynamic Angular Uncertainty Cone (scales with carried device RF fusion) */}
                {(() => {
                  const uncDeg = activeTarget.uncertaintyDeg ?? 3.5;
                  const uncRad = (uncDeg * Math.PI) / 180;
                  const hasCarried = Boolean(activeTarget.carriedDevices && activeTarget.carriedDevices.length > 0);

                  return (
                    <path
                      d={`M ${center} ${center}
                         L ${center + distPx * Math.cos(rad - uncRad)} ${center + distPx * Math.sin(rad - uncRad)}
                         A ${distPx} ${distPx} 0 0 1 ${center + distPx * Math.cos(rad + uncRad)} ${center + distPx * Math.sin(rad + uncRad)}
                         Z`}
                      fill={hasCarried ? '#06b6d4' : '#0284c7'}
                      fillOpacity={hasCarried ? '0.24' : '0.15'}
                      stroke={hasCarried ? '#38bdf8' : 'none'}
                      strokeWidth={hasCarried ? '0.75' : '0'}
                      strokeDasharray={hasCarried ? '2 2' : 'none'}
                    />
                  );
                })()}

                {/* 3. Heading Vector Arrow (if target has velocity / headingDeg) */}
                {activeTarget.headingDeg !== undefined && (() => {
                  const hRad = ((activeTarget.headingDeg - 90) * Math.PI) / 180;
                  const hLen = 22;
                  const hx = bx + hLen * Math.cos(hRad);
                  const hy = by + hLen * Math.sin(hRad);
                  return (
                    <line
                      x1={bx}
                      y1={by}
                      x2={hx}
                      y2={hy}
                      stroke={activeTarget.classification === 'vehicle' ? '#f43f5e' : '#06b6d4'}
                      strokeWidth="2"
                      markerEnd={activeTarget.classification === 'vehicle' ? 'url(#vehicleArrow)' : 'url(#headingArrow)'}
                    />
                  );
                })()}

                {/* 4. Directional Coordinate HUD over active target */}
                {(() => {
                  const hasCarried = Boolean(activeTarget.carriedDevices && activeTarget.carriedDevices.length > 0);
                  const boxWidth = hasCarried ? 148 : 96;
                  return (
                    <g>
                      <rect
                        x={bx - boxWidth / 2}
                        y={by - 32}
                        width={boxWidth}
                        height="20"
                        rx="4"
                        fill="#030712"
                        fillOpacity="0.92"
                        stroke={hasCarried ? '#10b981' : '#38bdf8'}
                        strokeWidth="1"
                      />
                      <text
                        x={bx}
                        y={by - 18}
                        textAnchor="middle"
                        fill={hasCarried ? '#34d399' : '#38bdf8'}
                        fontSize={hasCarried ? '8' : '9'}
                        fontWeight="bold"
                        fontFamily="monospace"
                      >
                        {activeTarget.bearingSector || `${Math.round(activeTarget.angle)}°`} • {activeTarget.distanceMeters.toFixed(2)}m
                        {hasCarried ? ` • RF LOCK +${activeTarget.precisionAccuracyBoost ?? 75}%` : ''}
                      </text>
                    </g>
                  );
                })()}
              </g>
            );
          })()}

          {/* Mouse Crosshair Tracker for pinpointing any point on radar */}
          {mouseCoord && !activeTarget && (
            <g id="interactive-crosshair" className="pointer-events-none">
              <line
                x1={center}
                y1={center}
                x2={mouseCoord.x}
                y2={mouseCoord.y}
                stroke="#64748b"
                strokeWidth="1"
                strokeDasharray="2 2"
              />
              <circle
                cx={mouseCoord.x}
                cy={mouseCoord.y}
                r="4"
                fill="none"
                stroke="#38bdf8"
                strokeWidth="1"
              />
              <rect
                x={mouseCoord.x + 8}
                y={mouseCoord.y - 12}
                width="84"
                height="18"
                rx="3"
                fill="#0f172a"
                fillOpacity="0.9"
                stroke="#475569"
                strokeWidth="0.8"
              />
              <text
                x={mouseCoord.x + 12}
                y={mouseCoord.y}
                fill="#38bdf8"
                fontSize="8.5"
                fontWeight="bold"
              >
                {String(mouseCoord.bearing).padStart(3, '0')}° • {mouseCoord.distanceM}m
              </text>
            </g>
          )}

          {/* 3. Classified Target Blips */}
          {blipsWithIntensity.map((blip) => {
            const blipAngleRad = ((blip.angle - 90) * Math.PI) / 180;
            const blipDist = Math.min(maxRadius * 0.94, maxRadius * blip.distance);
            const bx = center + blipDist * Math.cos(blipAngleRad);
            const by = center + blipDist * Math.sin(blipAngleRad);

            const isHovered = hoveredBlip?.id === blip.id;
            const isSelected = selectedBlipId === blip.id;
            const alpha = blip.alpha ?? 0.7;

            // Distinctive colors and shapes by classification
            let color = '#06b6d4';
            let shape = 'circle';
            let radius = 5;

            if (blip.classification === 'human') {
              color = '#10b981'; // Emerald
              radius = 5.5;
            } else if (blip.classification === 'vehicle') {
              color = '#f43f5e'; // Rose / red for cars
              shape = 'diamond';
              radius = 6.5;
            } else if (blip.classification === 'device') {
              color = '#38bdf8'; // Sky blue / cyan for devices
              shape = 'square';
              radius = 4.5;
            } else if (blip.classification === 'creature' || blip.classification === 'animal') {
              color = '#f59e0b'; // Amber
              // Size modulation for creatures!
              const size = blip.creatureSize || 'medium';
              if (size === 'tiny') radius = 3.5;
              else if (size === 'small') radius = 4.5;
              else if (size === 'medium') radius = 6.0;
              else radius = 7.5;
            }

            return (
              <g
                key={blip.id}
                className="cursor-pointer transition-transform duration-150 hover:scale-125"
                onClick={() => {
                  setSelectedBlipId(blip.id);
                  onBlipClick?.(blip);
                }}
                onMouseEnter={() => setHoveredBlip(blip)}
                onMouseLeave={() => setHoveredBlip(null)}
              >
                {/* Outer Glow Halo */}
                <circle
                  cx={bx}
                  cy={by}
                  r={radius + 6}
                  fill={color}
                  fillOpacity={alpha * 0.25}
                />

                {/* Carried Personal Devices Constellation Envelope (Smartphones, Smartwatches, Earbuds) */}
                {blip.carriedDevices && blip.carriedDevices.length > 0 && (
                  <g className="pointer-events-none">
                    <circle
                      cx={bx}
                      cy={by}
                      r={radius + 15}
                      fill="none"
                      stroke="#06b6d4"
                      strokeWidth="1.2"
                      strokeDasharray="2 3"
                      strokeOpacity="0.85"
                    />
                    {/* Orbiting micro-dots for each personal carried RF beacon */}
                    {blip.carriedDevices.map((dev, dIdx) => {
                      const dAngle = ((dIdx * (360 / blip.carriedDevices!.length)) * Math.PI) / 180;
                      const devX = bx + (radius + 15) * Math.cos(dAngle);
                      const devY = by + (radius + 15) * Math.sin(dAngle);
                      return (
                        <circle
                          key={dev.id}
                          cx={devX}
                          cy={devY}
                          r="2.8"
                          fill="#38bdf8"
                          stroke="#082f49"
                          strokeWidth="0.8"
                        />
                      );
                    })}
                  </g>
                )}

                {/* Target Shape Rendering */}
                {blip.isCalibratedUser && (
                  <g className="pointer-events-none">
                    <circle
                      cx={bx}
                      cy={by}
                      r={radius + 8}
                      fill="none"
                      stroke="#38bdf8"
                      strokeWidth="1.2"
                      strokeDasharray="3 3"
                    />
                    <circle
                      cx={bx}
                      cy={by}
                      r={radius + 13}
                      fill="none"
                      stroke="#fbbf24"
                      strokeWidth="1"
                      strokeOpacity="0.85"
                    />
                    {/* Corner Crosshairs */}
                    <line x1={bx - radius - 7} y1={by} x2={bx - radius - 2} y2={by} stroke="#38bdf8" strokeWidth="1.5" />
                    <line x1={bx + radius + 2} y1={by} x2={bx + radius + 7} y2={by} stroke="#38bdf8" strokeWidth="1.5" />
                    <line x1={bx} y1={by - radius - 7} x2={bx} y2={by - radius - 2} stroke="#38bdf8" strokeWidth="1.5" />
                    <line x1={bx} y1={by + radius + 2} x2={bx} y2={by + radius + 7} stroke="#38bdf8" strokeWidth="1.5" />
                  </g>
                )}

                {shape === 'diamond' ? (
                  // Vehicle Diamond / Chevron Marker
                  <polygon
                    points={`${bx},${by - radius} ${bx + radius},${by} ${bx},${by + radius} ${bx - radius},${by}`}
                    fill={color}
                    stroke="#020617"
                    strokeWidth="1.5"
                    style={{ filter: `drop-shadow(0 0 6px ${color})` }}
                  />
                ) : shape === 'square' ? (
                  // Device Square Marker
                  <rect
                    x={bx - radius}
                    y={by - radius}
                    width={radius * 2}
                    height={radius * 2}
                    rx="1.5"
                    fill={color}
                    stroke="#020617"
                    strokeWidth="1.5"
                    style={{ filter: `drop-shadow(0 0 6px ${color})` }}
                  />
                ) : (
                  // Circular Marker for Human & Creatures
                  <circle
                    cx={bx}
                    cy={by}
                    r={radius}
                    fill={blip.isCalibratedUser ? '#38bdf8' : color}
                    fillOpacity={Math.max(0.6, alpha)}
                    stroke={blip.isCalibratedUser ? '#fbbf24' : '#020617'}
                    strokeWidth={blip.isCalibratedUser ? '2' : '1.5'}
                    style={{ filter: `drop-shadow(0 0 8px ${blip.isCalibratedUser ? '#38bdf8' : color})` }}
                  />
                )}

                {/* Target Tag Label with Direction Sector & RF Lock Status */}
                {(isHovered || isSelected || blip.isCalibratedUser || (showLabels && filteredBlips.length <= 4 && alpha > 0.65)) && (() => {
                  const hasCarried = Boolean(blip.carriedDevices && blip.carriedDevices.length > 0);
                  const isUser = Boolean(blip.isCalibratedUser);
                  const tagWidth = isUser 
                    ? (hasCarried ? 165 : 145) 
                    : (hasCarried ? 150 : Math.min(115, Math.max(54, (blip.subClass || blip.label).length * 5.4 + 16)));
                  const tagHeight = (isUser || hasCarried) ? 26 : 17;
                  const tagY = (isUser || hasCarried) ? by - 16 : by - 11;

                  return (
                    <g className="pointer-events-none">
                      <rect
                        x={bx + 8}
                        y={tagY}
                        width={tagWidth}
                        height={tagHeight}
                        rx="4"
                        fill="#030712"
                        fillOpacity="0.96"
                        stroke={hasCarried ? '#10b981' : (isUser ? '#38bdf8' : color)}
                        strokeWidth={hasCarried ? 1.5 : (isUser ? 1.5 : 1)}
                      />
                      {isUser ? (
                        <>
                          <text
                            x={bx + 12}
                            y={by - 4}
                            fill="#38bdf8"
                            fontSize="7.5"
                            fontWeight="800"
                          >
                            ★ TARGET ID: {(blip.calibratedSubjectName || 'HUMAN').toUpperCase()}
                          </text>
                          <text
                            x={bx + 12}
                            y={by + 6}
                            fill={hasCarried ? '#34d399' : '#f8fafc'}
                            fontSize="7.2"
                            fontWeight="600"
                            fontFamily="monospace"
                          >
                            {hasCarried 
                              ? `RF LOCK +${blip.precisionAccuracyBoost ?? 75}% (${blip.carriedDevices!.length} Devs)` 
                              : `Bio-Match: ${blip.bioMatchScore}% • ${blip.distanceMeters.toFixed(1)}m`}
                          </text>
                        </>
                      ) : hasCarried ? (
                        <>
                          <text
                            x={bx + 12}
                            y={by - 4}
                            fill="#f8fafc"
                            fontSize="7.8"
                            fontWeight="700"
                          >
                            {(blip.subClass || blip.classification).slice(0, 16)}
                          </text>
                          <text
                            x={bx + 12}
                            y={by + 6}
                            fill="#34d399"
                            fontSize="7.2"
                            fontWeight="600"
                            fontFamily="monospace"
                          >
                            RF LOCK +${blip.precisionAccuracyBoost ?? 75}% • {blip.distanceMeters.toFixed(1)}m
                          </text>
                        </>
                      ) : (
                        <text
                          x={bx + 12}
                          y={by + 1}
                          fill="#f8fafc"
                          fontSize="8"
                          fontWeight="700"
                        >
                          {(blip.subClass || blip.classification).slice(0, 14)} • {blip.distanceMeters.toFixed(1)}m
                        </text>
                      )}
                    </g>
                  );
                })()}
              </g>
            );
          })}

          {/* Center Origin Reticle & Compass Needle */}
          <g id="radar-center-reticle">
            <motion.circle
              cx={center}
              cy={center}
              r={10}
              animate={{
                scale: [1, 1.35, 1],
                opacity: [0.3, 0.8, 0.3],
              }}
              transition={{
                duration: pulseScale.duration,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
              fill="none"
              stroke={pulseScale.color}
              strokeWidth="1.5"
            />
            <circle
              cx={center}
              cy={center}
              r={4}
              fill={pulseScale.color}
              stroke="#020617"
              strokeWidth="1.5"
            />

            {/* Compass Heading Needle */}
            <line
              x1={center}
              y1={center}
              x2={center + 16 * Math.sin((compassHeading * Math.PI) / 180)}
              y2={center - 16 * Math.cos((compassHeading * Math.PI) / 180)}
              stroke="#ef4444"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </g>
        </svg>

        {/* Top-Right Floating Controls (Compass & SLAM) */}
        <div className="absolute top-2 left-3 right-3 flex items-center justify-between text-[11px] text-slate-400 pointer-events-none">
          <div className="flex items-center gap-1.5 bg-slate-900/90 backdrop-blur-md px-2.5 py-1 rounded-full border border-slate-800 pointer-events-auto">
            <Compass className="w-3.5 h-3.5 text-rose-400 animate-pulse" />
            <span className="font-semibold text-slate-200">{Math.round(compassHeading)}°</span>
            <span className="text-[10px] text-slate-500">HEADING</span>
          </div>

          <div className="flex items-center gap-1.5 pointer-events-auto">
            {onToggleOccupancyGrid && (
              <button
                type="button"
                onClick={onToggleOccupancyGrid}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-full border text-[10px] font-medium transition-colors ${
                  showOccupancyGrid 
                    ? 'bg-cyan-500/20 border-cyan-500/50 text-cyan-300' 
                    : 'bg-slate-900/90 border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                <Layers className="w-3 h-3" />
                <span>SLAM GRID</span>
              </button>
            )}
          </div>
        </div>

        {/* Bottom Legend */}
        <div className="absolute bottom-2 left-3 right-3 flex flex-wrap items-center justify-center gap-2 text-[10px] pointer-events-none">
          <div className="flex items-center gap-1 bg-slate-950/90 backdrop-blur-sm px-2 py-0.5 rounded border border-slate-800">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span className="text-slate-300">Human</span>
          </div>
          <div className="flex items-center gap-1 bg-slate-950/90 backdrop-blur-sm px-2 py-0.5 rounded border border-slate-800">
            <span className="w-2 h-2 rounded-full bg-amber-400" />
            <span className="text-slate-300">Creature (By Size)</span>
          </div>
          <div className="flex items-center gap-1 bg-slate-950/90 backdrop-blur-sm px-2 py-0.5 rounded border border-slate-800">
            <span className="w-2 h-2 rounded bg-sky-400" />
            <span className="text-slate-300">Device</span>
          </div>
          <div className="flex items-center gap-1 bg-slate-950/90 backdrop-blur-sm px-2 py-0.5 rounded border border-slate-800">
            <span className="w-2 h-2 rotate-45 bg-rose-400" />
            <span className="text-slate-300">Car / Vehicle</span>
          </div>
        </div>
      </div>
    </div>
  );
};
