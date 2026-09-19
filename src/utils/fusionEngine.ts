import { SensorReading, PresenceState, FusionConfig, SensorType } from '../types';
import { DEFAULT_FUSION_CONFIG, FullBayesianFusionEngine } from '../fusion/bayesianEngine';

export { DEFAULT_FUSION_CONFIG };

/**
 * Adapter wrapper providing backward-compatible PresenceFusionEngine
 * backed by the FullBayesianFusionEngine.
 */
export class PresenceFusionEngine {
  private engine = new FullBayesianFusionEngine();

  public updateSensorReading(reading: SensorReading): void {
    this.engine.ingestReading(reading);
  }

  public calculateState(config: FusionConfig): PresenceState {
    this.engine.setConfig(config);
    const result = this.engine.evaluateFusion();
    return result.presenceState;
  }
}
