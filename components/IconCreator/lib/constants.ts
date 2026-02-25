/**
 * IconCreator — Constants & configuration
 */

/** Default color-distance tolerance for background removal (0–100) */
export const DEFAULT_TOLERANCE = 30;

/** Min/max tolerance range */
export const TOLERANCE_MIN = 0;
export const TOLERANCE_MAX = 100;

/** ICO output sizes (px) — standard icon sizes */
export const ICO_SIZES = [16, 32, 48, 256] as const;

/** Maximum input image dimension before we warn */
export const MAX_IMAGE_DIMENSION = 4096;

/** Accepted file extensions for the file input */
export const ACCEPTED_EXTENSIONS = '.png,.jpg,.jpeg,.webp';

/** Animation durations (seconds) for framer-motion */
export const ANIM = {
  fast: 0.2,
  normal: 0.3,
  slow: 0.5,
  spring: { type: 'spring' as const, stiffness: 300, damping: 25 },
} as const;
