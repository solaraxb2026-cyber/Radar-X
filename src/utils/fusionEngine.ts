import { SensorReading, PresenceState, FusionConfig, SensorType } from '../types';

export const DEFAULT_FUSION_CONFIG: FusionConfig = {
  sensitivity: 1.0,
  alertThreshold: 70,
  decayRatePerSec: 18,
  updateRateHz: 15,
  soundAlerts: false,
  vibrationAlerts: true,
  acousticMode: true,
  ultrasonicMode: false,
  weights: {
    proximity: 0.40,     // Proximity near = strong signal (40%)
    motion: 0.20,        // Accelerometer / Gyro motion delta (20%)
    ble: 0.15,           // Nearby BLE devices & RSSI (15%)
    acoustic: 0.15,      // Acoustic anomaly / mic noise floor (15%)
    light: 0.05,         // Sudden light occlusion (5%)
    magnetometer: 0.05,  // Magnetic field fluctuation (5%)
  },
};

export class PresenceFusionEngine {
  private currentScore = 0;
  private lastCalculationTime = Date.now();
  private lastReadings: Partial<Record<SensorType, SensorReading>> = {};

  public updateSensorReading(reading: SensorReading) {
    this.lastReadings[reading.type] = reading;
  }

  public calculateState(config: FusionConfig): PresenceState {
    const now = Date.now();
    const dtSeconds = Math.max(0.01, (now - this.lastCalculationTime) / 1000);
    this.lastCalculationTime = now;

    const breakdown: Record<SensorType, number> = {
      proximity: 0,
      accelerometer: 0,
      gyroscope: 0,
      light: 0,
      magnetometer: 0,
      ble: 0,
      acoustic: 0,
    };

    let instantaneousSignal = 0;

    // 1. Proximity Sensor (Strongest immediate signal)
    const prox = this.lastReadings.proximity;
    if (prox && prox.isAvailable && prox.values.isNear) {
      const proxScore = 100;
      const weighted = proxScore * config.weights.proximity * config.sensitivity;
      breakdown.proximity = Math.min(100, weighted);
      instantaneousSignal += weighted;
    }

    // 2. Motion (Accelerometer + Gyroscope)
    const accel = this.lastReadings.accelerometer;
    const gyro = this.lastReadings.gyroscope;
    let motionScore = 0;
    if (accel && accel.isAvailable && accel.values.motionDelta !== undefined) {
      // Motion delta normalized (e.g. 0.0 to 4.0 m/s^2)
      const accelFactor = Math.min(100, (accel.values.motionDelta / 2.5) * 100);
      motionScore += accelFactor * 0.7;
    }
    if (gyro && gyro.isAvailable && gyro.values.rotationDelta !== undefined) {
      const gyroFactor = Math.min(100, (gyro.values.rotationDelta / 1.5) * 100);
      motionScore += gyroFactor * 0.3;
    }
    if (motionScore > 0) {
      const weighted = Math.min(100, motionScore) * config.weights.motion * config.sensitivity;
      breakdown.accelerometer = weighted;
      instantaneousSignal += weighted;
    }

    // 3. Bluetooth LE Proximity & RSSI
    const ble = this.lastReadings.ble;
    if (ble && ble.isAvailable && ble.values.bleCount !== undefined && ble.values.bleCount > 0) {
      // Stronger RSSI (-40 is close, -90 is far)
      const rssi = ble.values.strongestRssi ?? -85;
      const normalizedRssi = Math.max(0, Math.min(100, (rssi + 95) * 1.8));
      const countBonus = Math.min(25, (ble.values.bleCount - 1) * 6);
      const bleScore = Math.min(100, normalizedRssi + countBonus);
      const weighted = bleScore * config.weights.ble * config.sensitivity;
      breakdown.ble = weighted;
      instantaneousSignal += weighted;
    }

    // 4. Acoustic / Ultrasonic anomaly
    if (config.acousticMode) {
      const acoustic = this.lastReadings.acoustic;
      if (acoustic && acoustic.isAvailable && acoustic.values.acousticAnomalyScore !== undefined) {
        const acousticScore = Math.min(100, acoustic.values.acousticAnomalyScore);
        const weighted = acousticScore * config.weights.acoustic * config.sensitivity;
        breakdown.acoustic = weighted;
        instantaneousSignal += weighted;
      }
    }

    // 5. Light Sensor (Occlusion detection)
    const light = this.lastReadings.light;
    if (light && light.isAvailable && light.values.isOccluded) {
      const lightScore = 75;
      const weighted = lightScore * config.weights.light * config.sensitivity;
      breakdown.light = weighted;
      instantaneousSignal += weighted;
    }

    // 6. Magnetometer (Perturbation detection)
    const mag = this.lastReadings.magnetometer;
    if (mag && mag.isAvailable && mag.values.magAnomoly !== undefined) {
      const magScore = Math.min(100, (mag.values.magAnomoly / 15) * 100);
      const weighted = magScore * config.weights.magnetometer * config.sensitivity;
      breakdown.magnetometer = weighted;
      instantaneousSignal += weighted;
    }

    // Temporal Smoothing & Decay
    // If instantaneous signal is higher, smoothly rise quickly; if lower, decay at configured rate
    if (instantaneousSignal > this.currentScore) {
      // Rapid attack (climb toward target within 150-300ms)
      this.currentScore = this.currentScore + (instantaneousSignal - this.currentScore) * Math.min(1, dtSeconds * 8);
    } else {
      // Gradual decay
      const decayAmount = config.decayRatePerSec * dtSeconds;
      this.currentScore = Math.max(0, this.currentScore - decayAmount);
    }

    const finalScore = Math.round(Math.max(0, Math.min(100, this.currentScore)));

    // Determine Presence Level
    let presenceLevel: PresenceState['presenceLevel'] = 'CLEAR';
    if (finalScore >= 80) presenceLevel = 'IMMEDIATE';
    else if (finalScore >= 55) presenceLevel = 'ELEVATED';
    else if (finalScore >= 25) presenceLevel = 'POSSIBLE';

    // Dominant sensor
    let dominantSensor: SensorType | 'none' = 'none';
    let maxVal = 0;
    (Object.keys(breakdown) as SensorType[]).forEach((s) => {
      if (breakdown[s] > maxVal) {
        maxVal = breakdown[s];
        dominantSensor = s;
      }
    });

    const alertTriggered = finalScore >= config.alertThreshold;

    // Approximate distance estimation based on score
    let estimatedProximityMeters: number | undefined;
    if (finalScore > 10) {
      // maps 100 score -> 0.15m, 20 score -> 3.5m
      estimatedProximityMeters = Math.max(0.1, +(4.0 - (finalScore / 100) * 3.7).toFixed(1));
    }

    return {
      confidenceScore: finalScore,
      presenceLevel,
      dominantSensor,
      breakdown,
      lastUpdated: now,
      alertTriggered,
      estimatedProximityMeters,
    };
  }

  public reset() {
    this.currentScore = 0;
    this.lastCalculationTime = Date.now();
  }

  public setScore(val: number) {
    this.currentScore = Math.max(0, Math.min(100, val));
  }
}
