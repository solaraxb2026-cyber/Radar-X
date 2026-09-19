import { BaseSensorModule } from './sensorInterface';
import { SensorReading } from '../types';

export interface AccessPointSignal {
  bssid: string;
  ssid: string;
  frequencyMhz: number; // 2412 or 5180
  rssiDbm: number;
  rssiHistory: number[];
  rssiVariance: number; // standard deviation over last 10 samples
  isRttSupported: boolean;
  rttDistanceM?: number; // 802.11mc round-trip-time distance
  rttStdDevM?: number;
}

export interface WifiDisturbanceResult {
  accessPoints: AccessPointSignal[];
  multipathDisturbanceDetected: boolean;
  disturbanceScore: number; // 0-100%
  dominantDisturbedAp?: string;
  rttEstimatedDistanceM?: number;
  scanRateHz: number;
  throttleActive: boolean;
  shizukuBypassActive: boolean;
}

export class WifiSensorModule extends BaseSensorModule {
  public readonly id = 'wifi_rssi' as const;
  public readonly name = 'WiFi Disturbance & RTT Ranging';
  public readonly description = 'Multipath RSSI disruption detection for non-line-of-sight motion + 802.11mc RTT distance measurements.';

  public samplingRateHz = 2; // Stock Android throttle: ~0.03Hz without Shizuku, 2-10Hz with Shizuku
  public shizukuBypassActive = false;
  private accessPoints: AccessPointSignal[] = [
    {
      bssid: '88:de:a9:44:12:01',
      ssid: 'Mesh_Node_LivingRoom',
      frequencyMhz: 5180,
      rssiDbm: -58,
      rssiHistory: [-58, -58, -59, -58],
      rssiVariance: 0.4,
      isRttSupported: true,
      rttDistanceM: 2.8,
      rttStdDevM: 0.8,
    },
    {
      bssid: '88:de:a9:44:12:02',
      ssid: 'Mesh_Node_Hallway',
      frequencyMhz: 2412,
      rssiDbm: -67,
      rssiHistory: [-67, -66, -67, -68],
      rssiVariance: 0.6,
      isRttSupported: true,
      rttDistanceM: 4.1,
      rttStdDevM: 1.1,
    },
    {
      bssid: 'c4:04:15:32:89:10',
      ssid: 'IoT_Hub_Gateway',
      frequencyMhz: 2437,
      rssiDbm: -72,
      rssiHistory: [-72, -73, -72],
      rssiVariance: 0.3,
      isRttSupported: false,
    },
  ];

  private cycle = 0;

  public async start(): Promise<boolean> {
    this.stop();
    this.isActive = true;

    // Adjust sampling rate based on Shizuku state
    this.samplingRateHz = this.shizukuBypassActive ? 8 : 2;
    const intervalMs = Math.round(1000 / this.samplingRateHz);
    this.timerId = window.setInterval(() => this.pollWifiDisturbance(), intervalMs);
    return true;
  }

  public setShizukuBypass(enabled: boolean): void {
    this.shizukuBypassActive = enabled;
    if (this.isActive) {
      this.start();
    }
  }

  private pollWifiDisturbance(): void {
    if (!this.isActive) return;
    const now = Date.now();
    this.cycle += 0.2;

    // Simulate RF multipath fluctuation caused by human water mass moving between AP and receiver
    // A moving person creates rapid 3-8 dBm fades/peaks
    const humanMovementFactor = Math.sin(this.cycle * 0.9) > 0.3;
    const rfFadeDelta = humanMovementFactor ? (Math.sin(this.cycle * 3.5) * 5.5) : (Math.sin(this.cycle * 0.5) * 0.8);

    let maxVariance = 0;
    let disturbedApName = '';

    const updatedAps = this.accessPoints.map((ap, idx) => {
      // Living room AP experiences largest disruption if person is in room
      const apFade = idx === 0 ? rfFadeDelta : rfFadeDelta * 0.35;
      const baseRssi = idx === 0 ? -58 : (idx === 1 ? -67 : -72);
      const newRssi = Math.round(baseRssi + apFade);

      const history = [...ap.rssiHistory.slice(-9), newRssi];
      // Calculate variance (standard deviation)
      const mean = history.reduce((a, b) => a + b, 0) / history.length;
      const variance = Math.sqrt(history.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / history.length);

      if (variance > maxVariance) {
        maxVariance = variance;
        disturbedApName = ap.ssid;
      }

      // RTT measurement fluctuation (±0.4m precision on 802.11mc)
      const rttDist = ap.isRttSupported && ap.rttDistanceM 
        ? Number((ap.rttDistanceM + (humanMovementFactor ? Math.sin(this.cycle) * 0.3 : 0)).toFixed(1))
        : undefined;

      return {
        ...ap,
        rssiDbm: newRssi,
        rssiHistory: history,
        rssiVariance: Number(variance.toFixed(2)),
        rttDistanceM: rttDist,
      };
    });

    this.accessPoints = updatedAps;

    // Disturbance score: variance > 2.0 dBm strongly indicates human movement in RF path
    const disturbanceScore = Math.min(100, Math.round(maxVariance * 24));
    const multipathDetected = disturbanceScore >= 45;

    const result: WifiDisturbanceResult = {
      accessPoints: updatedAps,
      multipathDisturbanceDetected: multipathDetected,
      disturbanceScore,
      dominantDisturbedAp: disturbedApName,
      rttEstimatedDistanceM: updatedAps[0].rttDistanceM,
      scanRateHz: this.samplingRateHz,
      throttleActive: !this.shizukuBypassActive,
      shizukuBypassActive: this.shizukuBypassActive,
    };

    // WiFi disturbance confidence: alone it is coarse (0.3 - 0.65), but corroborates strongly
    const confidence = multipathDetected 
      ? Math.min(0.68, 0.35 + (disturbanceScore / 100) * 0.33)
      : 0.15;

    const reading: SensorReading = {
      sensorId: 'wifi_rssi',
      timestamp: now,
      value: result,
      confidence,
      spatialHint: {
        distance: updatedAps[0].rttDistanceM ?? 2.8,
        uncertaintyM: 1.2, // coarse spatial accuracy
      },
      metadata: {
        isRttAvailable: true,
        dominantAp: disturbedApName,
        rssiVarianceDb: maxVariance,
        note: 'Stock WiFi RSSI multipath disruption (no CSI required)',
      },
    };

    this.emitReading(reading);
  }

  public simulateInterference(apName = 'Living Room AP', varianceDb = 5.8): void {
    this.emitReading({
      sensorId: 'wifi_rssi',
      timestamp: Date.now(),
      value: {
        multipathDisturbanceDetected: true,
        disturbanceScore: 78,
        dominantDisturbedAp: apName,
        rttEstimatedDistanceM: 2.6,
        scanRateHz: this.samplingRateHz,
        throttleActive: !this.shizukuBypassActive,
        shizukuBypassActive: this.shizukuBypassActive,
      },
      confidence: 0.65,
      spatialHint: {
        distance: 2.6,
        uncertaintyM: 1.0,
      },
      metadata: {
        dominantAp: apName,
        rssiVarianceDb: varianceDb,
      },
    });
  }
}
