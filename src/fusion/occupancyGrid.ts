import { DetectionClassification, CreatureSize } from '../types';

export interface GridCell {
  bearing: number; // 0 - 360 in 10-degree bins (36 azimuth sectors)
  ring: number; // 1 to 5 (0.5m, 1.0m, 2.0m, 3.5m, 5.0m)
  distanceM: number;
  logOdds: number; // Bayesian log-odds occupancy
  probability: number; // 0.0 to 1.0
  classification: DetectionClassification;
  creatureSize?: CreatureSize;
  contributingSensors: Set<string>;
  lastUpdated: number;
}

export class PolarOccupancyGrid {
  public static readonly SECTORS = 36; // 10 degrees each
  public static readonly RINGS = 5; // 5 range bins
  private cells: Map<string, GridCell> = new Map();
  private readonly defaultPriorLogOdds = 0.0; // P = 0.5 (neutral)

  public static readonly EMPTY_LOG_ODDS = -3.5; // ~3% prior probability (clear)

  constructor() {
    this.reset();
  }

  public reset(): void {
    this.cells.clear();
    const distances = [0.5, 1.2, 2.2, 3.5, 5.0];

    for (let s = 0; s < PolarOccupancyGrid.SECTORS; s++) {
      const bearing = s * 10;
      for (let r = 0; r < PolarOccupancyGrid.RINGS; r++) {
        const key = `${s}_${r}`;
        this.cells.set(key, {
          bearing,
          ring: r + 1,
          distanceM: distances[r],
          logOdds: PolarOccupancyGrid.EMPTY_LOG_ODDS,
          probability: 0.03,
          classification: 'unknown',
          contributingSensors: new Set(),
          lastUpdated: Date.now(),
        });
      }
    }
  }

  /**
   * Bayesian Log-Odds Update for an observed sensor reading
   * L_t = L_{t-1} + log(P(z|m)/(1-P(z|m))) - L_0
   */
  public updateObservation(
    bearingDeg: number,
    distanceM: number,
    sensorReliability: number, // 0.0 to 1.0
    classification: DetectionClassification,
    sensorId: string,
    creatureSize?: CreatureSize
  ): void {
    const normBearing = (Math.round(bearingDeg) % 360 + 360) % 360;
    const sector = Math.floor(normBearing / 10);
    
    // Determine range ring index
    let ring = 0;
    if (distanceM <= 0.8) ring = 0;
    else if (distanceM <= 1.6) ring = 1;
    else if (distanceM <= 2.8) ring = 2;
    else if (distanceM <= 4.0) ring = 3;
    else ring = 4;

    const key = `${sector}_${ring}`;
    const cell = this.cells.get(key);
    if (!cell) return;

    // Convert reliability to sensor observation probability P(m | z)
    const pObs = Math.max(0.1, Math.min(0.95, sensorReliability));
    const deltaLogOdds = Math.log(pObs / (1 - pObs));

    // Update log-odds with saturation limits
    cell.logOdds = Math.max(-3.5, Math.min(4.5, cell.logOdds + deltaLogOdds * 0.7));
    cell.probability = 1 / (1 + Math.exp(-cell.logOdds));
    cell.lastUpdated = Date.now();
    cell.contributingSensors.add(sensorId);

    // Set classification
    if (classification && classification !== 'unknown') {
      cell.classification = classification;
      if (creatureSize) {
        cell.creatureSize = creatureSize;
      }
    }
  }

  /**
   * Decays grid cells over time back towards empty state
   */
  public decay(decayRate = 0.20): void {
    const now = Date.now();
    this.cells.forEach(cell => {
      // If cell hasn't been refreshed in 700ms, decay log-odds towards empty prior
      if (now - cell.lastUpdated > 700) {
        cell.logOdds = cell.logOdds + (PolarOccupancyGrid.EMPTY_LOG_ODDS - cell.logOdds) * decayRate;
        cell.probability = 1 / (1 + Math.exp(-cell.logOdds));
        if (cell.probability < 0.20) {
          cell.contributingSensors.clear();
          cell.classification = 'unknown';
          cell.creatureSize = undefined;
        }
      }
    });
  }

  public getOccupiedCells(threshold = 0.55): GridCell[] {
    const list: GridCell[] = [];
    this.cells.forEach(c => {
      // Cell must have active sensor observations and cross confidence threshold
      if (c.contributingSensors.size > 0 && c.probability >= threshold) {
        list.push(c);
      }
    });
    return list;
  }

  public getAllCells(): GridCell[] {
    return Array.from(this.cells.values());
  }
}
