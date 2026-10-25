// Result of editing a photo that sits in a design (crop + adjustments).
import type { PhotoAdjustments } from '@/lib/editor/photoFilters';

export interface CropRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface PhotoEditResult {
  dataUrl: string;
  adjustments: PhotoAdjustments;
  cropRect: CropRect | null;
}
