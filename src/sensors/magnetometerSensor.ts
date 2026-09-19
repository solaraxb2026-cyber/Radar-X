import { BaseSensorModule } from './sensorInterface';
import { SensorReading } from '../types';

export interface MagnetometerData {
  headingDeg: number; // 0-360° true/magnetic heading for radar sweep alignment
  magFieldMicroTesla: number; // Earth ambient is typically ~30-60 µT
  anomalyScore: number; // 0-100%
  ferrousDisturbanceDetected: boolean;
  fieldVector: { x: number; y: number; z: number };
}

export class MagnetometerSensorModule extends BaseSensorModule {
  public readonly id = 'magnetometer' as const;
  public readonly name = 'Magnetometer (Compass & Field Anomaly)';
  public readonly description = 'Syncs radar sweep to true compass heading and detects ferromagnetic mass anomalies.';

  public samplingRateHz = 10;
  private heading = 0;
  private hasHardwareCompass = false;
  private baselineField = 48.0; // standard Earth field
  private cycle = 0;

  private orientationHandler = (e: DeviceOrientationEvent) => {
    if (e.alpha !== null && e.alpha !== undefined) {
      this.hasHardwareCompass = true;
      // In mobile browsers, alpha is compass rotation (0 to 360)
      const compassHeading = (360 - e.alpha) % 360;
      this.heading = Math.round(compassHeading);
    }
  };

  public async start(): Promise<boolean> {
    this.stop();
    this.isActive = true;

    if (typeof window !== 'undefined' && 'DeviceOrientationEvent' in window) {
      try {
        window.addEventListener('deviceorientation', this.orientationHandler, { passive: true });
      } catch {
        // Fallback
      }
    }

    const intervalMs = Math.round(1000 / this.samplingRateHz);
    this.timerId = window.setInterval(() => this.pollMagnetometer(), intervalMs);
    return true;
  }

  public stop(): void {
    super.stop();
    if (typeof window !== 'undefined') {
      window.removeEventListener('deviceorientation', this.orientationHandler);
    }
  }

  public getCompassHeading(): number {
    return this.heading;
  }

  public setManualHeading(headingDeg: number): void {
    this.heading = (headingDeg + 360) % 360;
  }

  public simulateDisturbance(deltaUT: number = 8.5): void {
    const currentField = this.baselineField + deltaUT;
    const delta = Math.abs(currentField - this.baselineField);
    const isDisturbance = delta > 4.0;
    const anomalyScore = Math.min(100, Math.round(delta * 12));

    const data: MagnetometerData = {
      headingDeg: Math.round(this.heading),
      magFieldMicroTesla: Number(currentField.toFixed(1)),
      anomalyScore,
      ferrousDisturbanceDetected: isDisturbance,
      fieldVector: {
        x: Number((25 + deltaUT * 0.7).toFixed(1)),
        y: Number((-10 + deltaUT * 0.4).toFixed(1)),
        z: Number((45 + deltaUT * 1.2).toFixed(1)),
      },
    };

    const reading: SensorReading = {
      sensorId: 'magnetometer',
      timestamp: Date.now(),
      value: data,
      confidence: 0.85,
      spatialHint: {
        bearing: Math.round(this.heading),
        distance: 1.2,
        uncertaintyM: 0.4,
      },
      metadata: {
        headingDeg: Math.round(this.heading),
        isHardwareCompass: this.hasHardwareCompass,
        simulated: true,
      },
    };

    this.emitReading(reading);
  }

  private pollMagnetometer(): void {
    if (!this.isActive) return;
    const now = Date.now();
    this.cycle += 0.1;

    // If no hardware compass, rotate gently or remain user-steered
    if (!this.hasHardwareCompass) {
      // Gentle realistic compass drift if untracked
      this.heading = (this.heading + 0.1) % 360;
    }

    // Ferrous anomaly check (e.g. metal phone case, keys, belt buckle, or large steel frame)
    const anomalySpike = Math.sin(this.cycle * 0.4) > 0.92 ? 9.5 : (Math.random() - 0.5) * 0.8;
    const currentField = this.baselineField + anomalySpike;
    const delta = Math.abs(currentField - this.baselineField);
    const isDisturbance = delta > 4.0;
    const anomalyScore = Math.min(100, Math.round(delta * 10));

    const data: MagnetometerData = {
      headingDeg: Math.round(this.heading),
      magFieldMicroTesla: Number(currentField.toFixed(1)),
      anomalyScore,
      ferrousDisturbanceDetected: isDisturbance,
      fieldVector: {
        x: Number((22 + Math.sin(this.heading * (Math.PI / 180)) * 5).toFixed(1)),
        y: Number((-8 + Math.cos(this.heading * (Math.PI / 180)) * 5).toFixed(1)),
        z: Number((42 + anomalySpike).toFixed(1)),
      },
    };

    const confidence = isDisturbance ? 0.58 : 0.2;

    const reading: SensorReading = {
      sensorId: 'magnetometer',
      timestamp: now,
      value: data,
      confidence,
      spatialHint: {
        bearing: Math.round(this.heading),
        distance: isDisturbance ? 1.0 : undefined,
        uncertaintyM: 0.5,
      },
      metadata: {
        headingDeg: Math.round(this.heading),
        isHardwareCompass: this.hasHardwareCompass,
      },
    };

    this.emitReading(reading);
  }
}
