import { 
  CarriedDeviceSignal, 
  CarriedDeviceType, 
  SignalTransportType, 
  DeviceSignalFusionMetrics,
  ContributingSensorInfo 
} from '../types';

export const DEFAULT_CARRIED_SIGNALS: CarriedDeviceSignal[] = [
  {
    id: 'dev-phone-pixel',
    name: 'Personal Smartphone (Pixel 9 Pro)',
    deviceType: 'smartphone',
    transport: 'wifi_rtt_ftm',
    macAddress: 'DC:72:9B:44:E1:8F',
    rssiDbm: -56,
    txPowerDbm: -42,
    frequencyMhz: 5240,
    estimatedDistanceM: 1.35,
    distanceUncertaintyM: 0.14,
    bearingDeg: 38,
    bearingUncertaintyDeg: 1.6,
    coMovementScore: 98,
    packetRateHz: 12,
    lastPacketTimestamp: Date.now(),
    isAssociatedWithHuman: true,
    accuracyBoostPercent: 44,
    batteryPercent: 88,
  },
  {
    id: 'dev-watch-galaxy',
    name: 'Smart Watch (WearOS)',
    deviceType: 'smartwatch',
    transport: 'ble_gatt_telemetry',
    macAddress: 'E4:95:6E:2B:1A:99',
    rssiDbm: -61,
    txPowerDbm: -59,
    frequencyMhz: 2402,
    estimatedDistanceM: 1.30,
    distanceUncertaintyM: 0.18,
    bearingDeg: 40,
    bearingUncertaintyDeg: 1.9,
    coMovementScore: 95,
    packetRateHz: 8,
    lastPacketTimestamp: Date.now(),
    isAssociatedWithHuman: true,
    accuracyBoostPercent: 32,
    batteryPercent: 74,
  },
  {
    id: 'dev-earbuds-pro',
    name: 'Wireless ANC Earbuds (LE Audio)',
    deviceType: 'earbuds',
    transport: 'ble_advertisement',
    macAddress: '1A:8F:E2:09:41:BC',
    rssiDbm: -66,
    txPowerDbm: -58,
    frequencyMhz: 2426,
    estimatedDistanceM: 1.38,
    distanceUncertaintyM: 0.22,
    bearingDeg: 36,
    bearingUncertaintyDeg: 2.1,
    coMovementScore: 91,
    packetRateHz: 6,
    lastPacketTimestamp: Date.now(),
    isAssociatedWithHuman: false,
    accuracyBoostPercent: 24,
    batteryPercent: 92,
  },
  {
    id: 'dev-smart-tag',
    name: 'Keyring Ultra-Wideband Smart Tag',
    deviceType: 'smart_tag',
    transport: 'uwb_pulse',
    macAddress: '9C:34:F1:8A:22:D4',
    rssiDbm: -52,
    txPowerDbm: -45,
    frequencyMhz: 6489,
    estimatedDistanceM: 1.32,
    distanceUncertaintyM: 0.08,
    bearingDeg: 39,
    bearingUncertaintyDeg: 1.2,
    coMovementScore: 97,
    packetRateHz: 15,
    lastPacketTimestamp: Date.now(),
    isAssociatedWithHuman: false,
    accuracyBoostPercent: 52,
    batteryPercent: 65,
  },
  {
    id: 'dev-smart-ring',
    name: 'Biometric Smart Ring (BLE Pulse)',
    deviceType: 'smart_ring',
    transport: 'ble_advertisement',
    macAddress: 'F0:82:11:3C:99:A0',
    rssiDbm: -74,
    txPowerDbm: -60,
    frequencyMhz: 2440,
    estimatedDistanceM: 1.36,
    distanceUncertaintyM: 0.30,
    bearingDeg: 41,
    bearingUncertaintyDeg: 2.8,
    coMovementScore: 88,
    packetRateHz: 2,
    lastPacketTimestamp: Date.now(),
    isAssociatedWithHuman: false,
    accuracyBoostPercent: 18,
    batteryPercent: 42,
  },
];

type UpdateListener = (signals: CarriedDeviceSignal[], metrics: DeviceSignalFusionMetrics) => void;

export class CarriedDeviceSignalEngine {
  private signals: CarriedDeviceSignal[] = [...DEFAULT_CARRIED_SIGNALS];
  private isFusionEnabled = true;
  private autoAssociateCoMoving = true;
  private listeners: Set<UpdateListener> = new Set();
  private timerId: number | null = null;
  private cycle = 0;

  constructor() {
    this.startBackgroundScanner();
  }

  public subscribe(listener: UpdateListener): () => void {
    this.listeners.add(listener);
    listener(this.signals, this.computeCurrentMetrics());
    return () => this.listeners.delete(listener);
  }

  public getSignals(): CarriedDeviceSignal[] {
    return [...this.signals];
  }

  public isEnabled(): boolean {
    return this.isFusionEnabled;
  }

  public setEnabled(enabled: boolean): void {
    this.isFusionEnabled = enabled;
    this.notify();
  }

  public setAutoAssociate(enabled: boolean): void {
    this.autoAssociateCoMoving = enabled;
    this.notify();
  }

  public isAutoAssociateEnabled(): boolean {
    return this.autoAssociateCoMoving;
  }

  public setDeviceCarried(id: string, isCarried: boolean): void {
    this.signals = this.signals.map(s => {
      if (s.id === id) {
        return { ...s, isAssociatedWithHuman: isCarried };
      }
      return s;
    });
    this.notify();
  }

  public toggleDeviceCarried(id: string): void {
    this.signals = this.signals.map(s => {
      if (s.id === id) {
        return { ...s, isAssociatedWithHuman: !s.isAssociatedWithHuman };
      }
      return s;
    });
    this.notify();
  }

  public addDevice(device: Omit<CarriedDeviceSignal, 'id' | 'lastPacketTimestamp'>): void {
    const newDev: CarriedDeviceSignal = {
      ...device,
      id: `dev-custom-${Date.now()}`,
      lastPacketTimestamp: Date.now(),
    };
    this.signals.push(newDev);
    this.notify();
  }

  public removeDevice(id: string): void {
    this.signals = this.signals.filter(s => s.id !== id);
    this.notify();
  }

  public simulatePreset(preset: 'none' | 'phone_only' | 'phone_watch' | 'full_constellation'): void {
    if (preset === 'none') {
      this.signals = this.signals.map(s => ({ ...s, isAssociatedWithHuman: false }));
    } else if (preset === 'phone_only') {
      this.signals = this.signals.map(s => ({
        ...s,
        isAssociatedWithHuman: s.deviceType === 'smartphone',
      }));
    } else if (preset === 'phone_watch') {
      this.signals = this.signals.map(s => ({
        ...s,
        isAssociatedWithHuman: s.deviceType === 'smartphone' || s.deviceType === 'smartwatch',
      }));
    } else if (preset === 'full_constellation') {
      this.signals = this.signals.map(s => ({
        ...s,
        isAssociatedWithHuman: true,
      }));
    }
    this.notify();
  }

  /**
   * Start a realistic background RF beacon loop that continuously samples RSSI,
   * path-loss, and syncs micro-fluctuations.
   */
  private startBackgroundScanner(): void {
    if (typeof window === 'undefined') return;
    this.timerId = window.setInterval(() => {
      this.cycle += 0.2;
      const now = Date.now();

      this.signals = this.signals.map((s, idx) => {
        // Small multipath fading jitter (±1.5 dBm)
        const jitter = Math.sin(this.cycle + idx * 1.7) * 1.5;
        const newRssi = Math.round(s.rssiDbm + jitter);

        // Path loss distance computation: d = 10 ^ ((txPower - RSSI) / (10 * n))
        const n = s.transport === 'uwb_pulse' ? 1.8 : 2.2;
        const rawDist = Math.pow(10, (s.txPowerDbm - newRssi) / (10 * n));
        const estimatedDistanceM = Number(Math.max(0.3, Math.min(5.0, rawDist)).toFixed(2));

        return {
          ...s,
          rssiDbm: newRssi,
          estimatedDistanceM,
          lastPacketTimestamp: now,
        };
      });

      this.notify();
    }, 1200);
  }

  private notify(): void {
    const metrics = this.computeCurrentMetrics();
    this.listeners.forEach(cb => cb([...this.signals], metrics));
  }

  public computeCurrentMetrics(): DeviceSignalFusionMetrics {
    const activeCarried = this.signals.filter(s => s.isAssociatedWithHuman && this.isFusionEnabled);
    const count = activeCarried.length;

    if (count === 0) {
      return {
        totalCarriedDevices: 0,
        activeSignalCount: 0,
        fusedAngleUncertaintyDeg: 3.8,
        fusedDistanceUncertaintyM: 0.45,
        accuracyImprovementPercent: 0,
        constellationQuality: 'minimal',
        transportsActive: [],
      };
    }

    // Inverse variance math for distance:
    // sigma_fused = 1 / sqrt( sum( 1 / sigma_i^2 ) )
    const baseVariance = Math.pow(0.45, 2);
    let invVarSum = 1 / baseVariance;

    activeCarried.forEach(dev => {
      const varI = Math.pow(dev.distanceUncertaintyM, 2);
      invVarSum += 1 / varI;
    });

    const fusedDistanceUncertaintyM = Number(Math.sqrt(1 / invVarSum).toFixed(2));

    // Angular uncertainty drops as square root of independent signal anchors
    const angleReductionFactor = Math.sqrt(1 + count * 1.8);
    const fusedAngleUncertaintyDeg = Number((3.8 / angleReductionFactor).toFixed(1));

    // Accuracy improvement percentage compared to baseline physics (0.45m error)
    const accuracyImprovementPercent = Math.min(94, Math.round((1 - (fusedDistanceUncertaintyM / 0.45)) * 100));

    let constellationQuality: DeviceSignalFusionMetrics['constellationQuality'] = 'minimal';
    if (count >= 3) constellationQuality = 'optimal';
    else if (count === 2) constellationQuality = 'high';
    else if (count === 1) constellationQuality = 'moderate';

    const transportsActive = Array.from(new Set(activeCarried.map(d => d.transport)));
    const primaryAnchor = activeCarried[0]?.name;

    return {
      totalCarriedDevices: count,
      activeSignalCount: count,
      fusedAngleUncertaintyDeg,
      fusedDistanceUncertaintyM,
      accuracyImprovementPercent,
      primaryAnchorDevice: primaryAnchor,
      constellationQuality,
      transportsActive,
    };
  }

  /**
   * Performs real-time Maximum Likelihood Fusion between a raw radar/vision detection
   * and all active RF signals emitted by devices the person is carrying.
   */
  public fuseSignalsWithHumanEstimate(
    humanBearing: number,
    humanDistance: number,
    isCalibratedUser: boolean
  ): {
    refinedBearing: number;
    refinedDistance: number;
    angleUncertaintyDeg: number;
    distanceUncertaintyM: number;
    accuracyBoostPercent: number;
    associatedDevices: CarriedDeviceSignal[];
    metrics: DeviceSignalFusionMetrics;
    contributingEntries: ContributingSensorInfo[];
  } {
    if (!this.isFusionEnabled) {
      return {
        refinedBearing: humanBearing,
        refinedDistance: humanDistance,
        angleUncertaintyDeg: isCalibratedUser ? 2.5 : 3.8,
        distanceUncertaintyM: 0.45,
        accuracyBoostPercent: 0,
        associatedDevices: [],
        metrics: this.computeCurrentMetrics(),
        contributingEntries: [],
      };
    }

    // Identify devices carried by this human:
    // If autoAssociateCoMoving is enabled, sync spatial bearing/distance to the human target
    const associated = this.signals
      .filter(s => s.isAssociatedWithHuman)
      .map(s => {
        // Co-movement spatial alignment: carried devices sit within 0.15m of human center
        const synchronizedDist = Number((humanDistance + (Math.sin(s.id.length) * 0.08)).toFixed(2));
        const synchronizedBearing = (humanBearing + (Math.cos(s.id.length) * 1.5) + 360) % 360;
        return {
          ...s,
          estimatedDistanceM: synchronizedDist,
          bearingDeg: Number(synchronizedBearing.toFixed(1)),
        };
      });

    if (associated.length === 0) {
      return {
        refinedBearing: humanBearing,
        refinedDistance: humanDistance,
        angleUncertaintyDeg: isCalibratedUser ? 2.5 : 3.8,
        distanceUncertaintyM: 0.45,
        accuracyBoostPercent: 0,
        associatedDevices: [],
        metrics: this.computeCurrentMetrics(),
        contributingEntries: [],
      };
    }

    // Maximum Likelihood Estimation (MLE) for Distance
    // Weighted average where weight = 1 / variance
    const radarVariance = Math.pow(0.40, 2);
    let weightedDistanceSum = humanDistance / radarVariance;
    let totalInvVar = 1 / radarVariance;

    associated.forEach(dev => {
      const devVar = Math.pow(dev.distanceUncertaintyM, 2);
      const invVar = 1 / devVar;
      weightedDistanceSum += dev.estimatedDistanceM * invVar;
      totalInvVar += invVar;
    });

    const refinedDistance = Number((weightedDistanceSum / totalInvVar).toFixed(2));
    const distanceUncertaintyM = Number(Math.sqrt(1 / totalInvVar).toFixed(2));

    // Angle refinement via multi-channel AoA / phase constraint
    const angleReduction = Math.sqrt(1 + associated.length * 1.85);
    const baseAngleUncertainty = isCalibratedUser ? 2.5 : 3.8;
    const angleUncertaintyDeg = Number((baseAngleUncertainty / angleReduction).toFixed(1));

    // Refined bearing (slight optical/RF centroid alignment)
    let bearingSum = humanBearing;
    let bearingWeight = 2.0; // vision/radar gets higher directional anchor
    associated.forEach(dev => {
      if (dev.bearingDeg !== undefined) {
        bearingSum += dev.bearingDeg * 0.5;
        bearingWeight += 0.5;
      }
    });
    const refinedBearing = Number(((bearingSum / bearingWeight) % 360).toFixed(1));

    // Accuracy improvement calculation
    const accuracyBoostPercent = Math.min(94, Math.round((1 - (distanceUncertaintyM / 0.45)) * 100));

    const metrics: DeviceSignalFusionMetrics = {
      totalCarriedDevices: associated.length,
      activeSignalCount: associated.length,
      fusedAngleUncertaintyDeg: angleUncertaintyDeg,
      fusedDistanceUncertaintyM: distanceUncertaintyM,
      accuracyImprovementPercent: accuracyBoostPercent,
      primaryAnchorDevice: associated[0]?.name,
      constellationQuality: associated.length >= 3 ? 'optimal' : associated.length === 2 ? 'high' : 'moderate',
      transportsActive: Array.from(new Set(associated.map(d => d.transport))),
    };

    // Construct contributing sensor entries for each carried RF beacon
    const contributingEntries: ContributingSensorInfo[] = associated.map(dev => {
      let sensorId = 'ble' as const;
      let summary = '';
      if (dev.transport === 'wifi_rtt_ftm' || dev.transport === 'wifi_probe_request') {
        summary = `${dev.name} • 802.11mc FTM RTT Ranging (${dev.rssiDbm} dBm • ±${dev.distanceUncertaintyM}m error)`;
      } else if (dev.transport === 'uwb_pulse') {
        summary = `${dev.name} • Ultra-Wideband Radar Chirp (±${dev.distanceUncertaintyM}m precision)`;
      } else {
        summary = `${dev.name} • BLE Telemetry Beacon (${dev.rssiDbm} dBm • ${dev.packetRateHz}Hz pulse)`;
      }

      return {
        sensorId: (dev.transport.startsWith('wifi') ? 'wifi_rssi' : 'ble') as any,
        sensorName: dev.name,
        confidence: 0.94,
        weight: 0.25,
        contributionPercentage: Math.round(dev.accuracyBoostPercent / (associated.length + 1)),
        signalSummary: summary,
        measuredDistanceM: dev.estimatedDistanceM,
        measuredBearingDeg: dev.bearingDeg,
      };
    });

    return {
      refinedBearing,
      refinedDistance,
      angleUncertaintyDeg,
      distanceUncertaintyM,
      accuracyBoostPercent,
      associatedDevices: associated,
      metrics,
      contributingEntries,
    };
  }
}

export const carriedDeviceEngine = new CarriedDeviceSignalEngine();
