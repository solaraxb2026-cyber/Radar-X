import { BaseSensorModule } from './sensorInterface';
import { SensorReading } from '../types';

export interface BleBeaconDevice {
  id: string;
  name: string;
  macAddress: string;
  rssiDbm: number;
  txPower: number; // typically -59 dBm at 1 meter
  estimatedDistanceM: number;
  lastSeen: number;
  bearingHintDeg: number;
}

export class BleSensorModule extends BaseSensorModule {
  public readonly id = 'ble' as const;
  public readonly name = 'Bluetooth LE Proximity';
  public readonly description = 'Near-field RSSI beacon and peripheral tracking (1-5m range).';

  public samplingRateHz = 5;
  private beacons: BleBeaconDevice[] = [
    {
      id: 'ble-smartwatch-01',
      name: 'Smart Watch Wearable',
      macAddress: 'E4:95:6E:2B:1A:99',
      rssiDbm: -72,
      txPower: -59,
      estimatedDistanceM: 1.4,
      lastSeen: Date.now(),
      bearingHintDeg: 165,
    },
    {
      id: 'ble-phone-companion',
      name: 'Secondary Device (BLE)',
      macAddress: '78:BD:BC:3F:88:02',
      rssiDbm: -84,
      txPower: -59,
      estimatedDistanceM: 3.2,
      lastSeen: Date.now(),
      bearingHintDeg: 280,
    },
  ];

  private cycle = 0;

  public async start(): Promise<boolean> {
    this.stop();
    this.isActive = true;

    // Optional Web Bluetooth scan check
    if (typeof navigator !== 'undefined' && 'bluetooth' in navigator) {
      this.isAvailable = true;
    }

    const intervalMs = Math.round(1000 / this.samplingRateHz);
    this.timerId = window.setInterval(() => this.scanBlePeripherals(), intervalMs);
    return true;
  }

  private scanBlePeripherals(): void {
    if (!this.isActive) return;
    const now = Date.now();
    this.cycle += 0.15;

    // Path loss formula: distance = 10 ^ ((txPower - RSSI) / (10 * n)), n ~ 2.2
    const updatedBeacons = this.beacons.map(beacon => {
      // Small Gaussian jitter in RSSI (±2 dBm)
      const jitter = (Math.sin(this.cycle + beacon.id.length) * 3);
      const rssi = Math.min(-45, Math.max(-95, Math.round(beacon.rssiDbm + jitter)));
      
      const ratio = (beacon.txPower - rssi) / (10 * 2.2);
      const estDistance = Number(Math.max(0.3, Math.min(6.0, Math.pow(10, ratio))).toFixed(2));

      return {
        ...beacon,
        rssiDbm: rssi,
        estimatedDistanceM: estDistance,
        lastSeen: now,
      };
    });

    this.beacons = updatedBeacons;
    const primary = updatedBeacons[0];
    // BLE is reliable for proximity to transmitters (not raw humans without phones)
    const confidence = primary.rssiDbm > -75 ? 0.82 : 0.45;

    const reading: SensorReading = {
      sensorId: 'ble',
      timestamp: now,
      value: {
        beaconCount: updatedBeacons.length,
        strongestRssi: primary.rssiDbm,
        nearestDistanceM: primary.estimatedDistanceM,
        devices: updatedBeacons,
      },
      confidence,
      spatialHint: {
        bearing: primary.bearingHintDeg,
        distance: primary.estimatedDistanceM,
        uncertaintyM: 0.8,
      },
      metadata: {
        dominantDevice: primary.name,
        note: 'Valid for detecting nearby phones/wearables with active BLE',
      },
    };

    this.emitReading(reading);
  }

  public simulateNearbyTrack(name = 'Smart Watch', rssiDbm = -62, distM = 1.3, bearingDeg = 45, deviceType: 'phone' | 'wearable' | 'tracker' = 'wearable'): void {
    this.emitReading({
      sensorId: 'ble',
      timestamp: Date.now(),
      value: {
        beaconCount: 1,
        strongestRssi: rssiDbm,
        nearestDistanceM: distM,
        classification: 'device',
        deviceType,
        subClass: `Device (${name})`,
        devices: [{ id: 'ble-sim-dev-01', name, rssiDbm, estimatedDistanceM: distM, bearingHintDeg: bearingDeg }],
      },
      confidence: 0.85,
      spatialHint: {
        bearing: bearingDeg,
        distance: distM,
        uncertaintyM: 0.5,
      },
      metadata: { dominantDevice: name },
    });
  }
}
