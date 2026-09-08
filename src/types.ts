export type SensorType = 
  | 'proximity'
  | 'accelerometer'
  | 'gyroscope'
  | 'light'
  | 'magnetometer'
  | 'ble'
  | 'acoustic';

export interface SensorReading {
  type: SensorType;
  timestamp: number;
  isAvailable: boolean;
  values: {
    // Proximity: distance in cm (typically 0 or 5cm on phones)
    proximityDistanceCm?: number;
    isNear?: boolean;
    
    // Accelerometer: m/s^2
    accelX?: number;
    accelY?: number;
    accelZ?: number;
    accelMagnitude?: number;
    motionDelta?: number;

    // Gyroscope: rad/s
    gyroX?: number;
    gyroY?: number;
    gyroZ?: number;
    rotationDelta?: number;

    // Light: lux
    lux?: number;
    luxDelta?: number;
    isOccluded?: boolean;

    // Magnetometer: microTesla
    magX?: number;
    magY?: number;
    magZ?: number;
    magAnomoly?: number;

    // BLE: devices count, max RSSI
    bleCount?: number;
    strongestRssi?: number;
    nearbyDevices?: Array<{ id: string; rssi: number; name?: string; estimatedDistanceM?: number }>;

    // Acoustic / Ultrasonic
    soundLevelDb?: number;
    acousticAnomalyScore?: number;
    frequencyPeakHz?: number;
  };
}

export interface RadarBlip {
  id: string;
  angle: number; // 0 to 360 degrees
  distance: number; // normalized 0.1 to 0.95 (0 = center, 1 = edge)
  strength: number; // 0 to 100
  type: SensorType;
  label: string;
  lastDetected: number;
  alpha?: number;
}

export interface PresenceState {
  confidenceScore: number; // 0 to 100
  presenceLevel: 'CLEAR' | 'POSSIBLE' | 'ELEVATED' | 'IMMEDIATE';
  dominantSensor: SensorType | 'none';
  breakdown: Record<SensorType, number>; // Individual contributions
  lastUpdated: number;
  alertTriggered: boolean;
  estimatedProximityMeters?: number;
}

export interface FusionConfig {
  sensitivity: number; // 0.5 to 2.0
  alertThreshold: number; // 0 to 100 (e.g. 70)
  decayRatePerSec: number; // e.g. 15 points / sec
  updateRateHz: number; // 5 to 30 Hz
  soundAlerts: boolean;
  vibrationAlerts: boolean;
  acousticMode: boolean;
  ultrasonicMode: boolean;
  weights: {
    proximity: number;
    motion: number;
    light: number;
    ble: number;
    acoustic: number;
    magnetometer: number;
  };
}
