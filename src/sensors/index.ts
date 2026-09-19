import { CameraSensorModule } from './cameraSensor';
import { AcousticSensorModule } from './acousticSensor';
import { WifiSensorModule } from './wifiSensor';
import { BleSensorModule } from './bleSensor';
import { ImuSensorModule } from './imuSensor';
import { MagnetometerSensorModule } from './magnetometerSensor';
import { EnvironmentSensorsModule } from './environmentSensors';
import { ISensorModule } from './sensorInterface';
import { SensorType } from '../types';

export class SensorRegistry {
  public camera = new CameraSensorModule();
  public acoustic = new AcousticSensorModule();
  public wifi = new WifiSensorModule();
  public ble = new BleSensorModule();
  public imu = new ImuSensorModule();
  public magnetometer = new MagnetometerSensorModule();
  public environment = new EnvironmentSensorsModule();

  private modules: Map<SensorType, ISensorModule> = new Map();

  constructor() {
    this.modules.set('camera', this.camera);
    this.modules.set('acoustic', this.acoustic);
    this.modules.set('wifi_rssi', this.wifi);
    this.modules.set('ble', this.ble);
    this.modules.set('accelerometer', this.imu);
    this.modules.set('magnetometer', this.magnetometer);
    this.modules.set('barometer', this.environment);
  }

  public getAll(): ISensorModule[] {
    return Array.from(this.modules.values());
  }

  public get(id: SensorType): ISensorModule | undefined {
    return this.modules.get(id);
  }

  public async startAll(): Promise<void> {
    const promises = this.getAll().map(m => m.start());
    await Promise.all(promises);
  }

  public stopAll(): void {
    this.getAll().forEach(m => m.stop());
  }
}

export const sensorRegistry = new SensorRegistry();
