import type { CollectionInfo } from './variables/collections.ts';

/*
 * Two directions of the same job: colors move from the canvas into variables, or from variables back
 * onto the canvas. A segmented control switches between them, so the window size never changes and
 * the plugin needs no manifest menu.
 */
export type Direction = 'from-selection' | 'to-canvas';

export interface SelectionInfo {
  total: number;
  eligible: number;
}

export type CreateTarget = { kind: 'new'; name: string } | { kind: 'existing'; id: string };

export interface GenerateRequest {
  target: CreateTarget;
  modeId: string | null;
  bindFills: boolean;
}

export interface GenerateOutcome {
  created: number;
  updated: number;
  skipped: number;
  failed: number;
}

export interface CanvasRequest {
  collectionId: string;
  swatchSize: number;
}

export interface CanvasOutcome {
  modes: number;
  swatches: number;
  skipped: number;
}

export type UiMessage =
  { type: 'generate'; request: GenerateRequest } | { type: 'canvas'; request: CanvasRequest };

export type PluginMessage =
  | { type: 'collections'; collections: CollectionInfo[] }
  | { type: 'selection'; selection: SelectionInfo }
  | { type: 'generate-done'; outcome: GenerateOutcome }
  | { type: 'canvas-done'; outcome: CanvasOutcome }
  | { type: 'error'; message: string };

export const MIN_SWATCH = 8;
export const MAX_SWATCH = 400;
export const DEFAULT_SWATCH = 64;
