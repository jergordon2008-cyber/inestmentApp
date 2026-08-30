import { Dimensions, PixelRatio } from 'react-native';

const { width: W, height: H } = Dimensions.get('window');

// Base design was made for a 390pt wide device (iPhone 14)
const BASE_W = 390;
const BASE_H = 844;

// Scale factor clamped so nothing grows too large on iPad or too small on SE
export const scaleW  = Math.min(Math.max(W / BASE_W, 0.78), 1.35);
export const scaleH  = Math.min(Math.max(H / BASE_H, 0.78), 1.35);

// Set by ThemeContext whenever the user changes their Font Size setting.
// Kept as a module-level mutable rather than a hook so every screen's
// existing `fs()` calls pick it up automatically on the next render instead
// of requiring every call site to be rewritten to consume the setting.
let fontScaleMultiplier = 1;
export function setFontScaleMultiplier(multiplier: number) {
  fontScaleMultiplier = multiplier;
}

/** Scale a font size relative to screen width and the user's Font Size setting */
export function fs(size: number) {
  return Math.round(size * scaleW * fontScaleMultiplier);
}

/** Scale a spacing/dimension value relative to screen width */
export function sp(size: number) {
  return Math.round(size * scaleW);
}

/** Is this an iPad-sized screen? */
export const isTablet = W >= 768;

export const SCREEN_W = W;
export const SCREEN_H = H;
