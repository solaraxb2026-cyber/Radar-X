import { BaseSensorModule } from './sensorInterface';
import { SensorReading } from '../types';

export interface ImuMotionData {
  accelX: number;
  accelY: number;
  accelZ: number;
  gyroX: number;
  gyroY: number;
  gyroZ: number;
  vibrationDelta: number; // m/s^2 deviation
  footstepCadenceDetected: boolean;
  deviceStabilized: boolean;
  tiltPitchDeg: number;
  tiltRollDeg: number;
}

export class ImuSensorModule extends BaseSensorModule {
  public readonly id = 'accelerometer' as const;
  public readonly name = 'IMU (Accelerometer & Gyroscope)';
  public readonly description = 'Surface micro-vibration detection (footsteps/pacing) & device motion stabilization.';

  public samplingRateHz = 20; // 20Hz for vibration analysis
  private hasHardwareMotion = false;
  private lastAccel = { x: 0, y: 0, z: 9.81 };
  private vibrationHistory: number[] = [];
  private cycle = 0;

  private motionHandler = (e: DeviceMotionEvent) => {
    if (e.accelerationIncludingGravity) {
      this.hasHardwareMotion = true;
      const x = e.accelerationIncludingGravity.x || 0;
      const y = e.accelerationIncludingGravity.y || 0;
      const z = e.accelerationIncludingGravity.z || 9.81;
      
      const delta = Math.sqrt(
        Math.pow(x - this.lastAccel.x, 2) +
        Math.pow(y - this.lastAccel.y, 2) +
        Math.pow(z - this.lastAccel.z, 2)
      );
      this.lastAccel = { x, y, z };
      this.processSample(x, y, z, 0, 0, 0, delta);
    }
  };

  public async start(): Promise<boolean> {
    this.stop();
    this.isActive = true;

    if (typeof window !== 'undefined' && 'DeviceMotionEvent' in window) {
      try {
        window.addEventListener('devicemotion', this.motionHandler, { passive: true });
      } catch {
        // Fallback
      }
    }

    const intervalMs = Math.round(1000 / this.samplingRateHz);
    this.timerId = window.setInterval(() => {
      if (!this.hasHardwareMotion) {
        this.simulateImuSample();
      }
    }, intervalMs);

    return true;
  }

  public stop(): void {
    super.stop();
    if (typeof window !== 'undefined') {
      window.removeEventListener('devicemotion', this.motionHandler);
    }
  }

  private simulateImuSample(): void {
    this.cycle += 0.25;
    // Periodic rhythmic footstep impulse transferred to desk/floor (every ~1.2s)
    const isFootstepImpulse = Math.sin(this.cycle * 0.8) > 0.85;
    const baseNoise = (Math.random() - 0.5) * 0.04;
    const vibration = isFootstepImpulse ? (0.28 + Math.random() * 0.15) : baseNoise;

    const x = Math.sin(this.cycle * 0.1) * 0.05 + vibration * 0.4;
    const y = Math.cos(this.cycle * 0.1) * 0.05 + vibration * 0.3;
    const z = 9.81 + vibration;

    this.processSample(x, y, z, 0.01, -0.01, 0, Math.abs(vibration));
  }

  private processSample(ax: number, ay: number, az: number, gx: number, gy: number, gz: number, delta: number): void {
    const now = Date.now();
    this.vibrationHistory.push(delta);
    if (this.vibrationHistory.length > 20) this.vibrationHistory.shift();

    const avgVibration = this.vibrationHistory.reduce((a, b) => a + b, 0) / this.vibrationHistory.length;
    const isFootstep = avgVibration > 0.18;
    const isStable = avgVibration < 0.08;

    const pitch = Math.atan2(-ax, Math.sqrt(ay * ay + az * az)) * (180 / Math.PI);
    const roll = Math.atan2(ay, az) * (180 / Math.PI);

    const data: ImuMotionData = {
      accelX: Number(ax.toFixed(2)),
      accelY: Number(ay.toFixed(2)),
      accelZ: Number(az.toFixed(2)),
      gyroX: Number(gx.toFixed(2)),
      gyroY: Number(gy.toFixed(2)),
      gyroZ: Number(gz.toFixed(2)),
      vibrationDelta: Number(avgVibration.toFixed(3)),
      footstepCadenceDetected: isFootstep,
      deviceStabilized: isStable,
      tiltPitchDeg: Math.round(pitch),
      tiltRollDeg: Math.round(roll),
    };

    const confidence = isFootstep ? 0.72 : (isStable ? 0.15 : 0.4);

    const reading: SensorReading = {
      sensorId: 'accelerometer',
      timestamp: now,
      value: data,
      confidence,
      spatialHint: {
        distance: isFootstep ? 1.5 : 3.0,
        uncertaintyM: 0.8,
      },
      metadata: {
        isHardwareMotion: this.hasHardwareMotion,
        isFootstepCadence: isFootstep,
      },
    };

    this.emitReading(reading);
  }
}
