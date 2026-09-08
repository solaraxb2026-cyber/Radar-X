import React from 'react';
import { motion } from 'motion/react';
import { PresenceState } from '../types';
import { ShieldCheck, Eye, Zap, AlertOctagon } from 'lucide-react';

interface PresenceMeterProps {
  state: PresenceState;
  alertThreshold: number;
}

export const PresenceMeter: React.FC<PresenceMeterProps> = ({
  state,
  alertThreshold,
}) => {
  const { confidenceScore, presenceLevel, dominantSensor, estimatedProximityMeters } = state;

  const levelConfigs = {
    CLEAR: {
      label: 'CLEAR / NO PRESENCE',
      color: 'text-emerald-400',
      bg: 'bg-emerald-500/10',
      border: 'border-emerald-500/30',
      barColor: 'from-emerald-500 to-teal-400',
      icon: ShieldCheck,
      desc: 'Ambient sensors quiet. No immediate human proximity signatures detected.',
    },
    POSSIBLE: {
      label: 'POSSIBLE PERIPHERAL PRESENCE',
      color: 'text-cyan-400',
      bg: 'bg-cyan-500/10',
      border: 'border-cyan-500/30',
      barColor: 'from-cyan-500 to-blue-400',
      icon: Eye,
      desc: 'Minor sensor perturbations (BLE beacon or low ambient motion).',
    },
    ELEVATED: {
      label: 'ELEVATED NEARBY PRESENCE',
      color: 'text-amber-400',
      bg: 'bg-amber-500/10',
      border: 'border-amber-500/30',
      barColor: 'from-amber-500 to-yellow-400',
      icon: Zap,
      desc: 'Coordinated signals detected (light occlusion, motion delta, or acoustic shift).',
    },
    IMMEDIATE: {
      label: 'IMMEDIATE CLOSE PROXIMITY',
      color: 'text-rose-400',
      bg: 'bg-rose-500/10',
      border: 'border-rose-500/30',
      barColor: 'from-rose-500 to-amber-500',
      icon: AlertOctagon,
      desc: 'Hardware proximity or strong multi-sensor convergence triggered within direct range.',
    },
  };

  const currentLevelConfig = levelConfigs[presenceLevel] || levelConfigs.CLEAR;
  const Icon = currentLevelConfig.icon;

  return (
    <div className="w-full bg-slate-900/90 border border-slate-800 rounded-xl p-4 sm:p-5 backdrop-blur-md">
      {/* Header with Title & Level Badge */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
        <div>
          <span className="text-xs font-mono tracking-wider text-slate-400 uppercase">
            Human Presence Estimator
          </span>
          <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2 mt-0.5">
            <span>Confidence Index</span>
            {estimatedProximityMeters !== undefined && (
              <span className="text-xs px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-300 font-mono">
                ~{estimatedProximityMeters}m Est.
              </span>
            )}
          </h3>
        </div>

        {/* Presence Badge */}
        <div
          className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-bold font-mono ${currentLevelConfig.bg} ${currentLevelConfig.border} ${currentLevelConfig.color}`}
        >
          <Icon className="w-4 h-4 animate-pulse" />
          <span>{currentLevelConfig.label}</span>
        </div>
      </div>

      {/* Main Score Display & Progress Bar */}
      <div className="space-y-2 my-3">
        <div className="flex items-baseline justify-between font-mono">
          <div className="flex items-baseline gap-1.5">
            <span className="text-4xl sm:text-5xl font-black text-white tracking-tight">
              {confidenceScore}
            </span>
            <span className="text-sm text-slate-400 font-semibold">/ 100</span>
          </div>

          <div className="text-right text-xs text-slate-400">
            <span>Alert Threshold: </span>
            <span className="text-slate-200 font-bold">{alertThreshold}%</span>
          </div>
        </div>

        {/* Progress Bar with Alert Marker */}
        <div className="relative w-full h-3.5 bg-slate-950 rounded-full overflow-hidden border border-slate-800 p-0.5">
          <motion.div
            className={`h-full rounded-full bg-gradient-to-r ${currentLevelConfig.barColor}`}
            initial={{ width: 0 }}
            animate={{ width: `${confidenceScore}%` }}
            transition={{ type: 'spring', damping: 20, stiffness: 200 }}
          />

          {/* Threshold indicator line */}
          <div
            className="absolute top-0 bottom-0 w-0.5 bg-amber-400/80 z-10"
            style={{ left: `${alertThreshold}%` }}
            title={`Threshold: ${alertThreshold}%`}
          />
        </div>
      </div>

      {/* Dominant Sensor & Status Description */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-800/80 text-xs text-slate-400">
        <p className="line-clamp-1 flex-1">{currentLevelConfig.desc}</p>
        <div className="flex items-center gap-1.5 font-mono text-[11px]">
          <span className="text-slate-400">Dominant:</span>
          <span className="text-slate-200 font-semibold uppercase px-1.5 py-0.5 bg-slate-800 rounded">
            {dominantSensor}
          </span>
        </div>
      </div>
    </div>
  );
};
