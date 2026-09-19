export type SensorType = 
  | 'camera'
  | 'tof_depth'
  | 'acoustic'
  | 'ultrasonic_sonar'
  | 'wifi_rssi'
  | 'wifi_rtt'
  | 'ble'
  | 'accelerometer'
  | 'gyroscope'
  | 'magnetometer'
  | 'barometer'
  | 'light'
  | 'gps'
  | 'proximity';

export type DetectionClassification = 
  | 'human' 
  | 'animal' 
  | 'creature' 
  | 'device' 
  | 'vehicle' 
  | 'unknown';

export type CreatureSize = 'tiny' | 'small' | 'medium' | 'large';

export type DeviceType = 'phone' | 'wearable' | 'tracker' | 'computer' | 'router' | 'iot';

export type VehicleType = 'car' | 'suv' | 'truck' | 'motorcycle' | 'bicycle' | 'ev';

export interface SpatialCoordinate {
  bearing: number; // 0 to 360 degrees (0 = North/device top)
  distance: number; // meters from device (0.2m to 5.0m)
  elevation?: number; // degrees elevation
}

export interface SensorReading {
  sensorId: SensorType;
  timestamp: number;
  value: unknown;
  confidence: number; // 0.0 to 1.0 reliability score
  spatialHint?: {
    bearing?: number; // degrees
    distance?: number; // meters
    uncertaintyM?: number;
    uncertaintyDeg?: number;
    headingDeg?: number;
    velocityMps?: number;
  };
  metadata?: Record<string, unknown>;
}

export interface ContributingSensorInfo {
  sensorId: SensorType;
  sensorName: string;
  confidence: number; // 0.0 - 1.0
  weight: number; // weight assigned by fusion engine
  contributionPercentage: number; // 0 - 100%
  signalSummary: string;
  measuredDistanceM?: number;
  measuredBearingDeg?: number;
}

export interface PresenceEstimate {
  id: string;
  bearing: number; // 0 to 360 degrees
  distance: number; // meters
  confidence: number; // 0 to 100%
  classification: DetectionClassification;
  subClass?: string; // 'Person (Standing)', 'Pet (Dog)', 'Vehicle (Sedan)', etc.
  creatureSize?: CreatureSize;
  deviceType?: DeviceType;
  vehicleType?: VehicleType;
  estimatedWeightKg?: number;
  headingDeg?: number;
  speedKmh?: number;
  uncertaintyDeg?: number;
  contributingSensors: ContributingSensorInfo[];
  firstSeen: number;
  lastSeen: number;
  velocityMps?: number;
  isInCameraFov?: boolean;
  activeTrackId?: number;
  // Human Target Identifier Calibration
  isCalibratedUser?: boolean;
  bioMatchScore?: number; // 0 to 100% match with trained human profile
  calibratedSubjectName?: string;
  // Carried Device Signal Assist
  carriedDevices?: CarriedDeviceSignal[];
  deviceSignalMetrics?: DeviceSignalFusionMetrics;
  precisionAccuracyBoost?: number; // 0 to 100% improvement over baseline physics
}

export interface RadarBlip {
  id: string;
  angle: number; // 0 to 360 degrees
  distance: number; // normalized 0.05 to 0.95 (0 = center, 1 = max range ~5m)
  distanceMeters: number; // actual meters (0.2m - 5.0m)
  strength: number; // 0 to 100
  type: SensorType;
  classification: DetectionClassification;
  subClass?: string;
  label: string;
  lastDetected: number;
  alpha?: number;
  contributingSensors: ContributingSensorInfo[];
  // Precise Direction & Kinematics
  bearingDeg: number; // 0-360° azimuth
  bearingSector?: string; // e.g., '042° NE', '180° S'
  headingDeg?: number; // movement vector
  speedKmh?: number;
  uncertaintyDeg?: number; // angle error tolerance
  // Classification & Attributes
  creatureSize?: CreatureSize;
  deviceType?: DeviceType;
  vehicleType?: VehicleType;
  estimatedWeightKg?: number;
  // Human Target Identifier Calibration
  isCalibratedUser?: boolean;
  bioMatchScore?: number; // 0 to 100% match
  calibratedSubjectName?: string;
  // Carried Device Signal Assist
  carriedDevices?: CarriedDeviceSignal[];
  deviceSignalMetrics?: DeviceSignalFusionMetrics;
  precisionAccuracyBoost?: number;
}

export type SensorPowerMode = 'full' | 'balanced' | 'passive';
export type ThermalStatus = 'nominal' | 'moderate' | 'severe' | 'critical';

export interface PowerBudgetStatus {
  mode: SensorPowerMode;
  batteryPercent: number;
  isCharging: boolean;
  thermalStatus: ThermalStatus;
  estimatedPowerDrawMw: number;
  activeSensorCount: number;
  throttledSensors: SensorType[];
  refreshRateHz: number;
}

export interface ShizukuStatus {
  isAvailable: boolean;
  isEnabled: boolean;
  privilegedAccessActive: boolean;
  wifiScanThrottleBypassed: boolean;
  bleScanThrottleBypassed: boolean;
  dumpsysWifiActive: boolean;
  silentPermissionsGranted: boolean;
  backgroundDozeExempt: boolean;
  wifiScanRateHz: number; // 10Hz with Shizuku vs 0.03Hz without (4 per 2 min)
}

export interface OccupancyGridCell {
  x: number; // grid coordinate
  y: number;
  bearing: number;
  distance: number;
  occupancyProbability: number; // 0.0 to 1.0
  classification: DetectionClassification;
  creatureSize?: CreatureSize;
  lastUpdated: number;
}

export interface PresenceState {
  confidenceScore: number; // 0 to 100
  presenceLevel: 'CLEAR' | 'POSSIBLE' | 'ELEVATED' | 'IMMEDIATE';
  dominantSensor: SensorType | 'none';
  breakdown: Partial<Record<SensorType, number>>;
  lastUpdated: number;
  alertTriggered: boolean;
  estimatedProximityMeters?: number;
  detectedCount: number;
  primaryClassification: DetectionClassification;
}

export interface SensorMicroTune {
  enabled: boolean;
  samplingRateHz: number; // 1 to 60 Hz
  gainSensitivity: number; // 0.2 to 3.0
  noiseGateThreshold: number; // 0 to 100
  beamWidthDeg?: number; // 15 to 120 degrees
  azimuthOffsetDeg?: number; // -180 to 180 degrees
  rangeLimitM?: number; // 0.5 to 10.0 m
  // Soundboard Studio Mixer controls
  isMuted?: boolean;
  isSolo?: boolean;
  faderDb?: number; // -48 to +12 dB
  highPassFilterHz?: number;
  lowPassFilterHz?: number;
  panAzimuthDeg?: number;
}

export interface RadarFilterSettings {
  showHumans: boolean;
  showCreatures: boolean;
  creatureSizes: {
    tiny: boolean; // <0.5kg
    small: boolean; // 0.5-5kg
    medium: boolean; // 5-25kg
    large: boolean; // >25kg
  };
  showDevices: boolean;
  showVehicles: boolean;
  showUnknown: boolean;
  minDistanceM: number;
  maxDistanceM: number;
  minConfidence: number;
  azimuthSector: 'all' | 'front_arc' | 'rear_arc' | 'left_flank' | 'right_flank';
  searchQuery: string;
}

export interface FusionConfig {
  sensitivity: number; // 0.5 to 2.0
  alertThreshold: number; // 0 to 100
  decayRatePerSec: number; // points / sec
  updateRateHz: number; // 5 to 30 Hz
  soundAlerts: boolean;
  vibrationAlerts: boolean;
  ultrasonicMode: boolean;
  powerMode: SensorPowerMode;
  useShizukuOptimization: boolean;
  weights: Record<string, number>;
  // Sensor micromanagement per module
  sensorControls?: Partial<Record<SensorType, SensorMicroTune>>;
  // Active Calibrated Human Target Identifier Profile
  activeHumanProfile?: CalibratedHumanProfile;
  // Carried Device Signal Fusion Configuration
  carriedDeviceFusionEnabled?: boolean;
  autoAssociateCoMovingSignals?: boolean;
  carriedSignalWeight?: number; // 0.1 to 2.0
  registeredCarriedDevices?: CarriedDeviceSignal[];
}

// Carried Personal Device Signal Fusion
export type CarriedDeviceType = 
  | 'smartphone' 
  | 'smartwatch' 
  | 'earbuds' 
  | 'smart_tag' 
  | 'smart_ring' 
  | 'tablet' 
  | 'custom_rf';

export type SignalTransportType = 
  | 'ble_advertisement' 
  | 'ble_gatt_telemetry' 
  | 'wifi_probe_request' 
  | 'wifi_rtt_ftm' 
  | 'uwb_pulse' 
  | 'classic_bluetooth';

export interface CarriedDeviceSignal {
  id: string;
  name: string;
  deviceType: CarriedDeviceType;
  transport: SignalTransportType;
  macAddress: string;
  rssiDbm: number;
  txPowerDbm: number; // typically -59 dBm at 1m for BLE, -40 dBm for WiFi
  frequencyMhz?: number;
  estimatedDistanceM: number;
  distanceUncertaintyM: number; // e.g. ±0.12m
  bearingDeg?: number;
  bearingUncertaintyDeg?: number; // e.g. ±1.1°
  coMovementScore: number; // 0 to 100% correlation with target trajectory
  packetRateHz: number; // e.g. 8 Hz
  lastPacketTimestamp: number;
  isAssociatedWithHuman: boolean;
  accuracyBoostPercent: number; // e.g. +28%
  batteryPercent?: number;
}

export interface DeviceSignalFusionMetrics {
  totalCarriedDevices: number;
  activeSignalCount: number;
  fusedAngleUncertaintyDeg: number; // e.g. 0.8° (sharpened from 3.8°)
  fusedDistanceUncertaintyM: number; // e.g. 0.08m (tightened from 0.45m)
  accuracyImprovementPercent: number; // e.g. 78%
  primaryAnchorDevice?: string;
  constellationQuality: 'optimal' | 'high' | 'moderate' | 'minimal';
  transportsActive: SignalTransportType[];
}

// User-Trained Human Biometric Calibration
export interface HumanBioStats {
  subjectName: string;
  heightCm: number; // 120 to 220 cm
  weightKg: number; // 35 to 160 kg
  ageGroup: 'youth' | 'adult' | 'senior';
  bodyBuild: 'slender' | 'athletic' | 'average' | 'heavy';
  footwear: 'barefoot' | 'socks' | 'running_shoes' | 'hard_shoes' | 'boots';
  clothingLayers: 'light' | 'normal' | 'heavy_jacket';
  notes?: string;
}

export interface HumanCalibrationMetrics {
  radarCrossSectionM2: number; // ~0.7 to 1.4 m²
  rfAbsorptionDb: number; // tissue dielectric shadow ~2.5 to 6.0 dB
  respirationHz: number; // learned chest oscillation (e.g. 0.23 Hz = 13.8 bpm)
  gaitCadenceHz: number; // learned walking cadence (e.g. 1.82 Hz)
  seismicCouplingFactor: number; // 0.0 to 1.0 (footstep impulse coupling)
  ultrasonicEchoRCS: number; // acoustic reflectance index
  lateralVelocityMs: number; // pacing velocity (e.g. 1.2 m/s)
  ambientNoiseFloorDb: number; // stationary baseline room SPL
  rfJitterFloorDbm: number; // stationary baseline RF variance
  devicePlacement: 'table' | 'floor' | 'shelf' | 'stand';
  calibratedAt: number;
  calibrationQualityScore: number; // 0 to 100%
  calibrationId: string;
}

export interface CalibratedHumanProfile {
  id: string;
  stats: HumanBioStats;
  metrics: HumanCalibrationMetrics;
  isActive: boolean;
}
