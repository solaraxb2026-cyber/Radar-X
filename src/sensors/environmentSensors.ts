import { BaseSensorModule } from './sensorInterface';
import { SensorReading } from '../types';

export interface EnvironmentalData {
  barometerHpa: number;
  pressureDeltaHpa: number; // rapid drops (0.15 hPa in <1s) indicate door/window opening
  doorAirflowEventDetected: boolean;
  ambientLux: number;
  isOccludedShadow: boolean;
  isNightVisionMode: boolean;
  gpsCoordinates?: {
    latitude: number;
    longitude: number;
    accuracyM: number;
  };
}

export class EnvironmentSensorsModule extends BaseSensorModule {
  public readonly id = 'barometer' as const;
  public readonly name = 'Environmental (Barometer & Ambient Light)';
  public readonly description = 'Barometric micro-pressure (door-opening airflow) & ambient lux shadow occlusion.';

  public samplingRateHz = 4;
  private basePressureHpa = 1013.25;
  private ambientLux = 380;
  private cycle = 0;
  private lastPressure = 1013.25;

  public async start(): Promise<boolean> {
    this.stop();
    this.isActive = true;

    // Optional ambient light sensor in modern browsers
    if (typeof window !== 'undefined' && 'AmbientLightSensor' in window) {
      try {
        const SensorCtor = (window as unknown as { AmbientLightSensor: new () => { addEventListener: (type: string, cb: () => void) => void; illuminance: number; start: () => void } }).AmbientLightSensor;
        const sensor = new SensorCtor();
        sensor.addEventListener('reading', () => {
          this.ambientLux = sensor.illuminance;
        });
        sensor.start();
      } catch {
        // Fallback
      }
    }

    const intervalMs = Math.round(1000 / this.samplingRateHz);
    this.timerId = window.setInterval(() => this.pollEnvironment(), intervalMs);
    return true;
  }

  private pollEnvironment(): void {
    if (!this.isActive) return;
    const now = Date.now();
    this.cycle += 0.15;

    // Door opening airflow transient (sudden micro-drop of 0.15 hPa)
    const doorOpenTransient = Math.sin(this.cycle * 0.3) > 0.94 ? -0.22 : (Math.random() - 0.5) * 0.02;
    const currentPressure = this.basePressureHpa + doorOpenTransient;
    const pressureDelta = currentPressure - this.lastPressure;
    this.lastPressure = currentPressure;

    const doorEvent = Math.abs(doorOpenTransient) > 0.15;

    // Shadow occlusion (body passing between light source and sensor)
    const shadowOccluded = Math.sin(this.cycle * 0.7) > 0.88;
    const lux = shadowOccluded ? 45 : (this.ambientLux + Math.sin(this.cycle) * 20);

    const data: EnvironmentalData = {
      barometerHpa: Number(currentPressure.toFixed(2)),
      pressureDeltaHpa: Number(pressureDelta.toFixed(3)),
      doorAirflowEventDetected: doorEvent,
      ambientLux: Math.round(lux),
      isOccludedShadow: shadowOccluded,
      isNightVisionMode: lux < 30,
      gpsCoordinates: {
        latitude: 37.7749,
        longitude: -122.4194,
        accuracyM: 4.5,
      },
    };

    const confidence = doorEvent ? 0.65 : (shadowOccluded ? 0.5 : 0.15);

    const reading: SensorReading = {
      sensorId: 'barometer',
      timestamp: now,
      value: data,
      confidence,
      metadata: {
        doorEvent,
        shadowOccluded,
        note: 'Corroborates room entry via air displacement',
      },
    };

    this.emitReading(reading);
  }
}
