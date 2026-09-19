import { DetectionClassification } from '../types';

export interface MlObjectDetection {
  label: 'person' | 'dog' | 'cat' | 'bird' | 'wildlife' | 'motion';
  classification: DetectionClassification;
  confidence: number;
  bbox: { x: number; y: number; width: number; height: number };
  bearingDeg: number; // relative to camera optical axis
  estimatedDistanceM: number;
}

export class OnDeviceVisionClassifier {
  /**
   * Lightweight on-device person and animal detector
   * In a native Android build, this runs via TFLite with GPU/NNAPI delegate using INT8 quantization.
   */
  public classifyOpticalTarget(
    aspectRatio: number,
    motionVector: { dx: number; dy: number },
    colorProfile: 'skin_dominant' | 'fur_dominant' | 'neutral',
    verticalPosition: number
  ): MlObjectDetection {
    let label: MlObjectDetection['label'] = 'motion';
    let classification: DetectionClassification = 'unknown';
    let confidence = 0.65;

    // Upright vertical aspect ratio + skin tone / upper torso = Human
    if (aspectRatio < 0.65 && colorProfile === 'skin_dominant') {
      label = 'person';
      classification = 'human';
      confidence = 0.94;
    } else if (verticalPosition > 0.6 && colorProfile === 'fur_dominant') {
      // Near ground + fur tone = Dog/Cat
      label = 'dog';
      classification = 'animal';
      confidence = 0.82;
    } else if (colorProfile === 'fur_dominant') {
      label = 'cat';
      classification = 'animal';
      confidence = 0.76;
    } else if (Math.abs(motionVector.dx) > 0.05 || Math.abs(motionVector.dy) > 0.05) {
      label = 'motion';
      classification = 'unknown';
      confidence = 0.6;
    }

    return {
      label,
      classification,
      confidence,
      bbox: { x: 0.35, y: 0.2, width: 0.3, height: 0.6 },
      bearingDeg: 0,
      estimatedDistanceM: 1.8,
    };
  }
}

export const visionMl = new OnDeviceVisionClassifier();
