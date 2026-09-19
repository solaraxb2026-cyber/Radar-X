import { SensorReading, SensorType } from '../types';

export interface ISensorModule {
  readonly id: SensorType;
  readonly name: string;
  readonly description: string;
  isActive: boolean;
  isAvailable: boolean;
  samplingRateHz: number;
  
  start(): Promise<boolean>;
  stop(): void;
  getLatestReading(): SensorReading | null;
  getHistory(windowMs?: number): SensorReading[];
  onReading(callback: (reading: SensorReading) => void): () => void;
  subscribe(callback: (reading: SensorReading) => void): () => void;
}

export abstract class BaseSensorModule implements ISensorModule {
  public abstract readonly id: SensorType;
  public abstract readonly name: string;
  public abstract readonly description: string;
  
  public isActive = false;
  public isAvailable = true;
  public samplingRateHz = 10;
  
  protected buffer: SensorReading[] = [];
  protected maxBufferDurationMs = 5000; // 5 second rolling window
  protected listeners: Set<(reading: SensorReading) => void> = new Set();
  protected timerId: number | null = null;

  public abstract start(): Promise<boolean>;
  
  public stop(): void {
    this.isActive = false;
    if (this.timerId !== null) {
      window.clearInterval(this.timerId);
      this.timerId = null;
    }
  }

  public getLatestReading(): SensorReading | null {
    if (this.buffer.length === 0) return null;
    return this.buffer[this.buffer.length - 1];
  }

  public getHistory(windowMs = 3000): SensorReading[] {
    const cutoff = Date.now() - windowMs;
    return this.buffer.filter(r => r.timestamp >= cutoff);
  }

  public onReading(callback: (reading: SensorReading) => void): () => void {
    this.listeners.add(callback);
    return () => {
      this.listeners.delete(callback);
    };
  }

  public subscribe(callback: (reading: SensorReading) => void): () => void {
    return this.onReading(callback);
  }

  protected emitReading(reading: SensorReading): void {
    const now = Date.now();
    this.buffer.push(reading);
    
    // Prune buffer outside rolling window
    const cutoff = now - this.maxBufferDurationMs;
    while (this.buffer.length > 0 && this.buffer[0].timestamp < cutoff) {
      this.buffer.shift();
    }

    // Notify listeners
    this.listeners.forEach(cb => {
      try {
        cb(reading);
      } catch (err) {
        console.error(`Error in sensor listener (${this.id}):`, err);
      }
    });
  }
}
