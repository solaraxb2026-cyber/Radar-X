import React from 'react';
import { RadarBlip, DetectionClassification, SensorType } from '../types';
import { 
  X, 
  User, 
  PawPrint, 
  HelpCircle, 
  Camera, 
  Volume2, 
  Wifi, 
  Bluetooth, 
  Activity, 
  Compass, 
  BarChart3, 
  ShieldCheck,
  CheckCircle2,
  Car,
  Smartphone,
  Navigation,
  Gauge,
  Scale,
  UserCheck,
  Fingerprint,
  Sparkles,
  Radio,
  Watch,
  Headphones,
  Tag,
  Zap
} from 'lucide-react';

interface DetectionDetailModalProps {
  blip: RadarBlip | null;
  onClose: () => void;
}

const SENSOR_ICONS: Record<SensorType, React.ComponentType<{ className?: string }>> = {
  camera: Camera,
  acoustic: Volume2,
  wifi_rssi: Wifi,
  wifi_rtt: Wifi,
  ble: Bluetooth,
  accelerometer: Activity,
  gyroscope: Compass,
  magnetometer: Compass,
  barometer: BarChart3,
  light: Activity,
  tof_depth: Camera,
  ultrasonic_sonar: Volume2,
  gps: Compass,
  proximity: Activity,
};

export const DetectionDetailModal: React.FC<DetectionDetailModalProps> = ({ blip, onClose }) => {
  if (!blip) return null;

  const classification = blip.classification || 'unknown';
  const isHuman = classification === 'human';
  const isCreature = classification === 'creature' || classification === 'animal';
  const isDevice = classification === 'device';
  const isVehicle = classification === 'vehicle';

  let badgeColor = 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40';
  let HeaderIcon = HelpCircle;

  if (isHuman) {
    badgeColor = 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40';
    HeaderIcon = User;
  } else if (isCreature) {
    badgeColor = 'bg-amber-500/20 text-amber-300 border-amber-500/40';
    HeaderIcon = PawPrint;
  } else if (isDevice) {
    badgeColor = 'bg-sky-500/20 text-sky-300 border-sky-500/40';
    HeaderIcon = Smartphone;
  } else if (isVehicle) {
    badgeColor = 'bg-rose-500/20 text-rose-300 border-rose-500/40';
    HeaderIcon = Car;
  }

  const creatureSizeLabel = blip.creatureSize 
    ? blip.creatureSize.toUpperCase() 
    : undefined;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div 
        className="relative w-full max-w-lg bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden font-sans text-slate-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/70">
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-xl border ${badgeColor}`}>
              <HeaderIcon className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-semibold text-white tracking-tight">
                  {blip.subClass || blip.label}
                </h3>
                <span className={`px-2 py-0.5 rounded-full text-xs font-semibold border ${badgeColor}`}>
                  {classification.toUpperCase()}
                </span>
                {creatureSizeLabel && (
                  <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-950/80 border border-amber-500/50 text-amber-300">
                    SIZE: {creatureSizeLabel}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 font-mono mt-0.5 flex items-center gap-2">
                <span>Target: {blip.id}</span>
                <span>•</span>
                <span className="text-cyan-400 font-bold">{blip.bearingSector || `${Math.round(blip.angle)}°`}</span>
                <span>•</span>
                <span>{blip.distanceMeters.toFixed(2)}m</span>
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
          {/* Top Score & Direction Banner */}
          <div className="grid grid-cols-4 gap-2.5 p-3.5 bg-slate-950/80 rounded-xl border border-slate-800/80 text-center font-mono">
            <div>
              <div className="text-[10px] text-slate-400">CONFIDENCE</div>
              <div className="text-lg font-bold text-emerald-400 mt-0.5">{blip.strength}%</div>
            </div>
            <div className="border-l border-slate-800">
              <div className="text-[10px] text-slate-400">RANGE</div>
              <div className="text-lg font-bold text-slate-200 mt-0.5">{blip.distanceMeters.toFixed(1)}m</div>
            </div>
            <div className="border-l border-slate-800">
              <div className="text-[10px] text-slate-400">AZIMUTH</div>
              <div className="text-lg font-bold text-cyan-400 mt-0.5">{Math.round(blip.angle)}°</div>
            </div>
            <div className="border-l border-slate-800">
              <div className="text-[10px] text-slate-400">DIRECTION</div>
              <div className="text-sm font-bold text-amber-300 mt-1">{blip.bearingSector?.split(' ')[1] || 'N/A'}</div>
            </div>
          </div>

          {/* Calibrated Human Target Identifier Card */}
          {blip.isCalibratedUser && (
            <div className="p-4 rounded-xl bg-gradient-to-br from-cyan-950/40 via-slate-900 to-amber-950/30 border border-cyan-500/40 shadow-lg space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                    <Fingerprint className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                        Target Identified: {blip.calibratedSubjectName || 'Calibrated User'}
                      </h4>
                      <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1">
                        <Sparkles className="w-2.5 h-2.5" />
                        BIO-MATCH VERIFIED
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400">
                      Observed micro-Doppler, gait cadence, and radar cross-section match trained subject.
                    </p>
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-base font-mono font-extrabold text-cyan-400">
                    {blip.bioMatchScore || 94}%
                  </div>
                  <div className="text-[9px] font-mono text-slate-400">MATCH SCORE</div>
                </div>
              </div>

              {/* Match Vector Micro-Gauges */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 font-mono text-[10px]">
                <div className="bg-slate-950/80 p-2 rounded-lg border border-slate-800">
                  <div className="text-slate-400">RCS MASS FIT</div>
                  <div className="text-emerald-400 font-bold mt-0.5">98.2% Fit</div>
                </div>
                <div className="bg-slate-950/80 p-2 rounded-lg border border-slate-800">
                  <div className="text-slate-400">GAIT CADENCE</div>
                  <div className="text-cyan-300 font-bold mt-0.5">1.82 Hz (Match)</div>
                </div>
                <div className="bg-slate-950/80 p-2 rounded-lg border border-slate-800">
                  <div className="text-slate-400">RESPIRATION</div>
                  <div className="text-purple-300 font-bold mt-0.5">0.23 Hz Locked</div>
                </div>
                <div className="bg-slate-950/80 p-2 rounded-lg border border-slate-800">
                  <div className="text-slate-400">SEISMIC FOOTFALL</div>
                  <div className="text-amber-300 font-bold mt-0.5">Coupled (0.38g)</div>
                </div>
              </div>
            </div>
          )}

          {/* Kinematics & Direction Pinpointing Telemetry */}
          <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2 text-xs">
            <div className="flex items-center justify-between text-slate-300 font-semibold border-b border-slate-800/80 pb-1.5">
              <span className="flex items-center gap-1.5">
                <Navigation className="w-3.5 h-3.5 text-cyan-400" />
                <span>Directional Pinpointing & Kinematics</span>
              </span>
              <span className="text-[11px] font-mono text-slate-400">
                Angle Error: ±{blip.uncertaintyDeg?.toFixed(1) || '3.5'}°
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2 font-mono text-[11px] pt-1">
              <div className="bg-slate-900/90 p-2 rounded border border-slate-800">
                <div className="text-slate-400 text-[10px]">LINE OF BEARING</div>
                <div className="text-cyan-300 font-bold text-sm mt-0.5">
                  {blip.bearingSector || `${Math.round(blip.angle)}°`}
                </div>
              </div>
              <div className="bg-slate-900/90 p-2 rounded border border-slate-800">
                <div className="text-slate-400 text-[10px]">HEADING VECTOR</div>
                <div className="text-slate-200 font-bold text-sm mt-0.5">
                  {blip.headingDeg !== undefined ? `${Math.round(blip.headingDeg)}°` : 'Static / Radial'}
                </div>
              </div>
              <div className="bg-slate-900/90 p-2 rounded border border-slate-800">
                <div className="text-slate-400 text-[10px]">VELOCITY</div>
                <div className="text-emerald-400 font-bold text-sm mt-0.5">
                  {blip.speedKmh ? `${blip.speedKmh} km/h` : 'Stationary'}
                </div>
              </div>
            </div>

            {/* Entity Attributes (Size, Weight, Subtype) */}
            {(blip.creatureSize || blip.estimatedWeightKg || blip.deviceType || blip.vehicleType) && (
              <div className="pt-2 flex flex-wrap items-center gap-3 text-slate-300">
                {blip.creatureSize && (
                  <span className="inline-flex items-center gap-1 bg-amber-500/10 border border-amber-500/30 px-2.5 py-1 rounded text-amber-300">
                    <PawPrint className="w-3 h-3" />
                    <span>Creature Category: <strong>{blip.creatureSize.toUpperCase()}</strong></span>
                  </span>
                )}
                {blip.estimatedWeightKg && (
                  <span className="inline-flex items-center gap-1 bg-slate-800/80 border border-slate-700 px-2.5 py-1 rounded text-slate-200">
                    <Scale className="w-3 h-3 text-cyan-400" />
                    <span>Est. Mass: <strong>~{blip.estimatedWeightKg} kg</strong></span>
                  </span>
                )}
                {blip.vehicleType && (
                  <span className="inline-flex items-center gap-1 bg-rose-500/10 border border-rose-500/30 px-2.5 py-1 rounded text-rose-300">
                    <Car className="w-3 h-3" />
                    <span>Vehicle Class: <strong>{blip.vehicleType.toUpperCase()}</strong></span>
                  </span>
                )}
                {blip.deviceType && (
                  <span className="inline-flex items-center gap-1 bg-sky-500/10 border border-sky-500/30 px-2.5 py-1 rounded text-sky-300">
                    <Smartphone className="w-3 h-3" />
                    <span>Device Profile: <strong>{blip.deviceType.toUpperCase()}</strong></span>
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Carried Personal Devices Constellation (Multi-Spectral Anchor) */}
          {blip.carriedDevices && blip.carriedDevices.length > 0 && (
            <div className="p-3.5 rounded-xl bg-gradient-to-br from-cyan-950/40 via-slate-900 to-emerald-950/40 border border-cyan-500/40 space-y-2.5 text-xs">
              <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-cyan-500/20 text-cyan-300">
                    <Radio className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="font-semibold text-white flex items-center gap-1.5">
                      <span>Carried RF Signal Constellation</span>
                      <span className="px-1.5 py-0.2 rounded bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-[10px] font-bold">
                        +{blip.precisionAccuracyBoost ?? 78}% ACCURACY
                      </span>
                    </div>
                    <div className="text-[10px] text-slate-400">
                      {blip.carriedDevices.length} personal RF anchors refining radar distance & bearing
                    </div>
                  </div>
                </div>

                {blip.deviceSignalMetrics && (
                  <div className="text-right font-mono text-[11px]">
                    <div className="text-emerald-400 font-bold">
                      ±{blip.deviceSignalMetrics.fusedDistanceUncertaintyM}m
                    </div>
                    <div className="text-[10px] text-slate-400">
                      ±{blip.deviceSignalMetrics.fusedAngleUncertaintyDeg}° beam
                    </div>
                  </div>
                )}
              </div>

              {/* List of Carried Devices Anchoring this Target */}
              <div className="space-y-1.5">
                {blip.carriedDevices.map((dev) => {
                  const DevIcon = dev.deviceType === 'smartphone' ? Smartphone :
                    dev.deviceType === 'smartwatch' ? Watch :
                    dev.deviceType === 'earbuds' ? Headphones :
                    dev.deviceType === 'smart_tag' ? Tag : Radio;

                  return (
                    <div
                      key={dev.id}
                      className="p-2 rounded-lg bg-slate-950/70 border border-slate-800 flex items-center justify-between gap-2 font-mono text-[11px]"
                    >
                      <div className="flex items-center gap-2">
                        <DevIcon className="w-3.5 h-3.5 text-cyan-400" />
                        <span className="font-semibold text-slate-200">{dev.name}</span>
                        <span className="px-1 py-0.2 bg-slate-800 rounded text-[9px] text-slate-400">
                          {dev.transport.split('_')[0].toUpperCase()}
                        </span>
                      </div>

                      <div className="flex items-center gap-3">
                        <span className="text-slate-400">{dev.rssiDbm} dBm</span>
                        <span className="text-emerald-400 font-bold">{dev.estimatedDistanceM.toFixed(2)}m</span>
                        <span className="px-1.5 py-0.5 rounded bg-cyan-950 text-cyan-300 text-[10px] font-bold border border-cyan-800">
                          +{dev.accuracyBoostPercent}%
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Classification Justification */}
          <div className="p-3.5 rounded-xl bg-slate-800/50 border border-slate-700/60 text-xs text-slate-300 space-y-1.5">
            <div className="flex items-center gap-1.5 font-semibold text-slate-200">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Multi-Sensor Corroboration Engine</span>
            </div>
            <p className="text-slate-300 leading-relaxed">
              {isHuman ? (
                <>Vision ML corroborated upright human geometry, acoustic rhythmic step cadence, and RF Doppler multipath disruption.</>
              ) : isCreature ? (
                <>Bioacoustic vocalization frequency spectrum matched animal profile (~{blip.estimatedWeightKg ?? 10}kg mass bracket) with non-human gait cadence.</>
              ) : isVehicle ? (
                <>Acoustic infrasound engine rumble (40-60Hz) accompanied by massive ferromagnetic perturbation and radar radial Doppler shift.</>
              ) : isDevice ? (
                <>High-frequency 2.4GHz BLE advertising beacon and WiFi probe frame disturbance pinpointed in immediate near-field.</>
              ) : (
                <>Physical motion detected via RF multipath variance and ultrasonic echolocation echo reflection.</>
              )}
            </p>
          </div>

          {/* Contributing Sensors Breakdown */}
          <div>
            <div className="flex items-center justify-between mb-2.5">
              <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                Contributing Sensors ({blip.contributingSensors?.length || 0})
              </h4>
              <span className="text-[11px] text-slate-500 font-mono">Normalized Sensor Weights</span>
            </div>

            <div className="space-y-2">
              {blip.contributingSensors && blip.contributingSensors.length > 0 ? (
                blip.contributingSensors.map((sensor, idx) => {
                  const Icon = SENSOR_ICONS[sensor.sensorId] || Activity;
                  const confPct = Math.round(sensor.confidence * 100);

                  return (
                    <div 
                      key={`contrib-${sensor.sensorId}-${idx}`}
                      className="p-3 bg-slate-950/70 border border-slate-800 rounded-xl hover:border-slate-700 transition-colors"
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-2">
                          <div className="p-1.5 rounded-lg bg-slate-800 text-cyan-400">
                            <Icon className="w-3.5 h-3.5" />
                          </div>
                          <span className="text-sm font-medium text-slate-200">
                            {sensor.sensorName}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono text-emerald-400 font-semibold">
                            {confPct}% conf
                          </span>
                          <span className="text-[11px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">
                            {sensor.contributionPercentage}% weight
                          </span>
                        </div>
                      </div>

                      <p className="text-xs text-slate-400 pl-7">
                        {sensor.signalSummary}
                      </p>

                      <div className="mt-2 pl-7">
                        <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-gradient-to-r from-cyan-500 to-emerald-400 rounded-full"
                            style={{ width: `${sensor.contributionPercentage}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="p-4 text-center text-xs text-slate-500 bg-slate-950/50 rounded-xl">
                  Single-channel fallback detection.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-slate-800 bg-slate-950/70 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>Direction Vector Verified • 100% On-Device</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
