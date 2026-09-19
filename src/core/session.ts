import { 
  SensorPowerMode, 
  PowerBudgetStatus, 
  ThermalStatus, 
  SensorType, 
  ShizukuStatus 
} from '../types';
import { sensorRegistry } from '../sensors';

export class SessionOrchestrator {
  private powerMode: SensorPowerMode = 'full';
  private batteryPercent = 88;
  private isCharging = false;
  private thermalStatus: ThermalStatus = 'nominal';
  private permissions: Record<string, 'granted' | 'prompt' | 'denied'> = {
    camera: 'granted',
    microphone: 'granted',
    location: 'granted',
    bluetooth: 'prompt',
  };

  private shizukuStatus: ShizukuStatus = {
    isAvailable: true,
    isEnabled: true,
    privilegedAccessActive: true,
    wifiScanThrottleBypassed: true,
    bleScanThrottleBypassed: true,
    dumpsysWifiActive: true,
    silentPermissionsGranted: true,
    backgroundDozeExempt: true,
    wifiScanRateHz: 8,
  };

  constructor() {
    this.initBatteryMonitor();
  }

  private async initBatteryMonitor(): Promise<void> {
    if (typeof navigator !== 'undefined' && 'getBattery' in navigator) {
      try {
        const getBattery = (navigator as unknown as { getBattery: () => Promise<{ level: number; charging: boolean; addEventListener: (type: string, cb: () => void) => void }> }).getBattery;
        const battery = await getBattery();
        this.batteryPercent = Math.round(battery.level * 100);
        this.isCharging = battery.charging;
        battery.addEventListener('levelchange', () => {
          this.batteryPercent = Math.round(battery.level * 100);
        });
        battery.addEventListener('chargingchange', () => {
          this.isCharging = battery.charging;
        });
      } catch {
        // Fallback
      }
    }
  }

  public setPowerMode(mode: SensorPowerMode): void {
    this.powerMode = mode;
    this.applyPowerModeSettings();
  }

  public getPowerMode(): SensorPowerMode {
    return this.powerMode;
  }

  public setThermalStatus(status: ThermalStatus): void {
    this.thermalStatus = status;
    // Auto-throttle under severe thermal stress
    if (status === 'severe' || status === 'critical') {
      if (this.powerMode === 'full') {
        this.setPowerMode('balanced');
      }
    }
  }

  public setShizukuEnabled(enabled: boolean): void {
    this.shizukuStatus.isEnabled = enabled;
    this.shizukuStatus.privilegedAccessActive = enabled;
    this.shizukuStatus.wifiScanThrottleBypassed = enabled;
    this.shizukuStatus.wifiScanRateHz = enabled ? 8 : 0.03;
    sensorRegistry.wifi.setShizukuBypass(enabled);
  }

  public getShizukuStatus(): ShizukuStatus {
    return { ...this.shizukuStatus };
  }

  public getPowerBudgetStatus(): PowerBudgetStatus {
    const throttled: SensorType[] = [];
    let powerMw = 350; // base display + CPU

    if (this.powerMode === 'full') {
      powerMw = 1850; // Camera + TFLite GPU delegate + WiFi scans + ultrasonic speaker
    } else if (this.powerMode === 'balanced') {
      powerMw = 890;
      throttled.push('wifi_rssi');
    } else if (this.powerMode === 'passive') {
      powerMw = 280; // Passive acoustics + low-rate WiFi, camera OFF
      throttled.push('camera', 'light');
    }

    if (this.thermalStatus === 'severe') {
      powerMw *= 0.7;
      if (!throttled.includes('camera')) throttled.push('camera');
    }

    return {
      mode: this.powerMode,
      batteryPercent: this.batteryPercent,
      isCharging: this.isCharging,
      thermalStatus: this.thermalStatus,
      estimatedPowerDrawMw: Math.round(powerMw),
      activeSensorCount: this.getActiveSensorCount(),
      throttledSensors: throttled,
      refreshRateHz: this.powerMode === 'full' ? 15 : (this.powerMode === 'balanced' ? 10 : 4),
    };
  }

  private applyPowerModeSettings(): void {
    if (this.powerMode === 'passive') {
      // In passive mode, camera is stopped to save battery
      sensorRegistry.camera.stop();
      sensorRegistry.acoustic.samplingRateHz = 6;
      sensorRegistry.wifi.samplingRateHz = 1;
    } else if (this.powerMode === 'balanced') {
      sensorRegistry.camera.samplingRateHz = 5;
      sensorRegistry.acoustic.samplingRateHz = 8;
      sensorRegistry.wifi.samplingRateHz = 2;
      if (!sensorRegistry.camera.isActive) {
        sensorRegistry.camera.start();
      }
    } else {
      // Full power mode
      sensorRegistry.camera.samplingRateHz = 8;
      sensorRegistry.acoustic.samplingRateHz = 12;
      sensorRegistry.wifi.samplingRateHz = this.shizukuStatus.isEnabled ? 8 : 2;
      if (!sensorRegistry.camera.isActive) {
        sensorRegistry.camera.start();
      }
    }
  }

  private getActiveSensorCount(): number {
    return sensorRegistry.getAll().filter(s => s.isActive).length;
  }
}

export const sessionOrchestrator = new SessionOrchestrator();
export const session = sessionOrchestrator;
