import { GAME_CONSTANTS } from './constants';

export interface CanvasBackingStore {
  readonly width: number;
  readonly height: number;
  readonly renderScale: number;
}

const MAX_RENDER_SCALE = 2;
const MIN_RENDER_SCALE = 0.35;

export function calculateCanvasBackingStore(
  cssWidth: number,
  cssHeight: number,
  devicePixelRatio: number,
  resolutionScale: number,
): CanvasBackingStore {
  const fittedScale = Math.min(
    Math.max(1, cssWidth) / GAME_CONSTANTS.VIEWPORT_WIDTH,
    Math.max(1, cssHeight) / GAME_CONSTANTS.VIEWPORT_HEIGHT,
  );
  const renderScale = Math.max(
    MIN_RENDER_SCALE,
    Math.min(MAX_RENDER_SCALE, fittedScale * Math.max(1, devicePixelRatio) * Math.max(0.5, resolutionScale)),
  );

  return {
    width: Math.max(1, Math.round(GAME_CONSTANTS.VIEWPORT_WIDTH * renderScale)),
    height: Math.max(1, Math.round(GAME_CONSTANTS.VIEWPORT_HEIGHT * renderScale)),
    renderScale,
  };
}
