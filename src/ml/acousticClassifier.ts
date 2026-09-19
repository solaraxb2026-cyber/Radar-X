import { DetectionClassification } from '../types';

export interface AcousticClassificationResult {
  category: 'footsteps' | 'breathing' | 'animal_vocalization' | 'ultrasonic_reflection' | 'ambient_noise';
  classification: DetectionClassification;
  confidence: number;
  cadenceHz?: number;
  description: string;
}

export class OnDeviceAcousticClassifier {
  /**
   * Spectral feature and cadence classifier for microphonic & ultrasonic sensing
   */
  public classifySpectrum(
    infrasoundEnergy: number,
    midSpeechEnergy: number,
    ultrasonicEnergy: number,
    cadenceRateHz: number
  ): AcousticClassificationResult {
    // 1. Footstep Cadence (1.2 - 2.0 Hz rhythmic low-frequency peaks)
    if (infrasoundEnergy > 0.25 && cadenceRateHz >= 1.0 && cadenceRateHz <= 2.2) {
      return {
        category: 'footsteps',
        classification: 'human',
        confidence: 0.86,
        cadenceHz: cadenceRateHz,
        description: `Bipedal walking cadence detected (${cadenceRateHz.toFixed(1)} Hz)`,
      };
    }

    // 2. Animal vocalization / whine / bark
    if (midSpeechEnergy > 0.4 && infrasoundEnergy < 0.15) {
      return {
        category: 'animal_vocalization',
        classification: 'animal',
        confidence: 0.78,
        description: 'Mid-frequency bioacoustic vocalization detected (pet/wildlife signature)',
      };
    }

    // 3. Ultrasonic Doppler / echo reflection
    if (ultrasonicEnergy > 0.2) {
      return {
        category: 'ultrasonic_reflection',
        classification: 'unknown',
        confidence: 0.81,
        description: 'Active sonar echo returned (close-proximity physical reflector)',
      };
    }

    // 4. Subtle respiratory rustling
    if (infrasoundEnergy > 0.1 && midSpeechEnergy > 0.1) {
      return {
        category: 'breathing',
        classification: 'human',
        confidence: 0.62,
        description: 'Low-amplitude rhythmic rustle (breathing / fabric motion)',
      };
    }

    return {
      category: 'ambient_noise',
      classification: 'unknown',
      confidence: 0.15,
      description: 'Ambient room noise baseline',
    };
  }
}

export const acousticMl = new OnDeviceAcousticClassifier();
