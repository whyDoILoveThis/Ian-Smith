// lib/rfEngine.ts
// -----------------------------
// Real RF physics engine (explicit variable names, lots of comments)
// Purpose: produce physically meaningful numbers for one-way links:
//   Pr(dBm) = Pt(dBm) + Gt_dBi(thetaTx) + Gr_dBi(thetaRx) - FSPL(dB) - systemLoss(dB) - rainLoss(dB)
// Also: noise floor, SNR, MCS mapping, helper geometry utilities.
// -----------------------------

export type Position = { x: number; y: number; z: number };

// -----------------------------
// RF CONSTANTS (tune these to match your hardware)
// -----------------------------
export const RF_CONSTANTS = {
  // Frequency and antenna physicals
  frequencyGHz: 11.0,       // nominal frequency in GHz
  dishDiameterM: 0.9,       // dish diameter in meters
  apertureEfficiency: 0.60, // typical range 0.5..0.7

  // Transmitter / system
  txPowerDbm: 23.0,         // transmitter output power in dBm (set to your IP20 value)
  systemLossDb: 2.0,        // cable/connector/radome loss in dB

  // Noise & bandwidth for SNR calculation
  bandwidthMHz: 20.0,       // channel/measurement bandwidth in MHz (tune to radio)
  noiseFigureDb: 6.0,       // receiver noise figure in dB (typical small radios 3..8 dB)

  // Simulation extras
  targetReferenceDb: 1.32,  // UI reference margin (non-physics) if you want to compare
};

// -----------------------------
// Math helpers
// -----------------------------
const C_LIGHT_MS = 299_792_458; // speed of light (m/s)
const DEG2RAD = Math.PI / 180;
const RAD2DEG = 180 / Math.PI;

function clamp(value: number, min = -Infinity, max = Infinity) {
  return Math.max(min, Math.min(max, value));
}

export function degToRad(deg: number) { return deg * DEG2RAD; }
export function radToDeg(rad: number) { return rad * RAD2DEG; }

// -----------------------------
// Wavelength (meters) from frequency (GHz)
// -----------------------------
export function wavelengthMetersFromGHz(frequencyGigahertz: number) {
  return C_LIGHT_MS / (frequencyGigahertz * 1e9);
}

// -----------------------------
// PEAK DISH GAIN (dBi) using aperture formula
// Gpeak_linear = (4 * π * Ae) / λ^2, Ae = efficiency * physicalArea
// -----------------------------
export function peakDishGainDb(
  dishDiameterMeters: number,
  frequencyGigahertz: number,
  apertureEfficiency = RF_CONSTANTS.apertureEfficiency,
) {
  const wavelengthMeters = wavelengthMetersFromGHz(frequencyGigahertz);
  const physicalArea = Math.PI * Math.pow(dishDiameterMeters / 2.0, 2.0);
  const effectiveAperture = apertureEfficiency * physicalArea;
  const gainLinear = (4.0 * Math.PI * effectiveAperture) / Math.pow(wavelengthMeters, 2.0);
  // Guard
  const numericalGainLinear = Math.max(gainLinear, 1e-12);
  return 10.0 * Math.log10(numericalGainLinear);
}

// -----------------------------
// AIRY-LIKE RADIATION PATTERN (returns dBi at off-axis angle thetaDeg)
// - This is a practical envelope approximation (fast & contains main-lobe shape)
// - For small x we avoid divide-by-zero and return near-peak.
// - Keep explicit variable names so readers understand the mapping.
// -----------------------------
export function dishGainDb(
  thetaDeg: number,
  options?: { dishDiameterMeters?: number; frequencyGigahertz?: number; apertureEfficiency?: number }
) {
  const dishDiameterMeters = options?.dishDiameterMeters ?? RF_CONSTANTS.dishDiameterM;
  const frequencyGigahertz = options?.frequencyGigahertz ?? RF_CONSTANTS.frequencyGHz;
  const apertureEfficiency = options?.apertureEfficiency ?? RF_CONSTANTS.apertureEfficiency;

  // convert to radians
  const thetaRad = Math.max(Math.abs(thetaDeg) * DEG2RAD, 1e-12);

  // k*a = π * D / λ ; x = k*a * sin(theta)   (surrogate variable for J1 argument)
  const wavelengthMeters = wavelengthMetersFromGHz(frequencyGigahertz);
  const ka = (Math.PI * dishDiameterMeters) / wavelengthMeters; // unitless
  const x = ka * Math.sin(thetaRad);

  // For speed we use surrogate function that models main-lobe envelope:
  // patternLinear ≈ (2 * sin(x) / x)^2  (captures main lobe shape & first null behavior)
  let patternLinear: number;
  if (Math.abs(x) < 1e-6) {
    patternLinear = 1.0;
  } else {
    const twoSinOverX = (2.0 * Math.sin(x)) / x;
    patternLinear = Math.max(twoSinOverX * twoSinOverX, 1e-12);
  }

  const peakDb = peakDishGainDb(dishDiameterMeters, frequencyGigahertz, apertureEfficiency);
  const patternDb = 10.0 * Math.log10(patternLinear);

  // --- engineering realism: enforce a sidelobe floor so off-axis gain doesn't
  // drop to machine-noise levels. Typical real antennas have sidelobes ~ -40..-60 dB.
  const SIDEL_OBE_FLOOR_DB = -60.0;
  const clampedPatternDb = Math.max(patternDb, SIDEL_OBE_FLOOR_DB);

  // Return absolute gain in dBi at this off-axis angle
  return peakDb + clampedPatternDb;
}

// -----------------------------
// FREE-SPACE PATH LOSS (FSPL) in dB
// Standard form: FSPL = 92.45 + 20*log10(d_km) + 20*log10(f_GHz)
// -----------------------------
export function fsplDb(distanceMeters: number, frequencyGigahertz: number) {
  const safeDistanceMeters = Math.max(1e-3, distanceMeters);
  const distanceKilometers = safeDistanceMeters / 1000.0;
  const fspl = 92.45 + 20.0 * Math.log10(Math.max(distanceKilometers, 1e-12)) + 20.0 * Math.log10(Math.max(frequencyGigahertz, 1e-12));
  return fspl;
}

// -----------------------------
// RAIN ATTENUATION (very simple model, per-km).
// - This is a practical approximation suitable for training.
// - Uses a simple proportional model: gammaRain ≈ k * R^alpha (but we provide an easy linear approx).
// - You can replace this function with ITU-R rain model if you want absolute accuracy.
// -----------------------------
// Returns attenuation in dB over the entire path (distanceMeters)
export function rainAttenuationDb(distanceMeters: number, rainRateMmPerHour: number, frequencyGigahertz = RF_CONSTANTS.frequencyGHz) {
  // Keep simple guard
  if (rainRateMmPerHour <= 0) return 0;
  const distanceKilometers = Math.max(distanceMeters / 1000.0, 1e-6);

  // ITU-like scaling: specific attenuation ≈ k(f) * R^alpha
  // For robust training behavior we use a conservative tuned coefficient that scales with frequency.
  // This is not a full ITU-R P.838 implementation, but it captures the frequency dependence.
  const baseCoefficientA = 0.0006; // tuned baseline (at ~10 GHz)
  const exponentB = 1.16; // rainfall exponent (typical)
  // frequency scaling: attenuation increases with frequency (empirical exponent ~0.7..1.0)
  const freqScaling = Math.pow(Math.max(frequencyGigahertz, 0.1) / 10.0, 0.9);
  const coefficientA = baseCoefficientA * freqScaling;

  const specificAttenuationDbPerKm = coefficientA * Math.pow(rainRateMmPerHour, exponentB);

  // For low elevation links the effective slant path through rain increases.
  // We don't know elevation here; keep a small safety factor to emulate slant effects for real-world links.
  const SLANT_PATH_FACTOR = 1.1;

  const pathAttenuationDb = specificAttenuationDbPerKm * distanceKilometers * SLANT_PATH_FACTOR;
  return Math.max(0, pathAttenuationDb);
}

// -----------------------------
// THERMAL NOISE FLOOR (dBm) for a given bandwidth and noise figure
// Noise floor (dBm) = -174 dBm/Hz + 10*log10(BW_Hz) + noiseFigure_dB
// -----------------------------
export function noiseFloorDbm(bandwidthMHz: number, noiseFigureDb: number) {
  const bandwidthHz = Math.max(1.0, bandwidthMHz) * 1e6;
  const thermalNoiseDbm = -174.0 + 10.0 * Math.log10(bandwidthHz);
  return thermalNoiseDbm + noiseFigureDb;
}

// -----------------------------
// ONE-WAY RECEIVED POWER (dBm)
// Compute what a receiver mounted behind an antenna sees when the transmitter emits.
// Pr = Pt + Gt(thetaTx) + Gr(thetaRx) - FSPL - systemLoss - rainLoss
// -----------------------------
export function computeOneWayRxPowerDbm(
  thetaTxDeg: number,
  thetaRxDeg: number,
  distanceMeters: number,
  options?: {
    useRainRateMmPerHour?: number;
    frequencyGigahertz?: number;
    dishDiameterMeters?: number;
    apertureEfficiency?: number;
    systemLossDb?: number;
    txPowerDbm?: number;
  },
) {
  // Resolve options or fallback to RF_CONSTANTS
  const frequencyGigahertz = options?.frequencyGigahertz ?? RF_CONSTANTS.frequencyGHz;
  const dishDiameterMeters = options?.dishDiameterMeters ?? RF_CONSTANTS.dishDiameterM;
  const apertureEfficiency = options?.apertureEfficiency ?? RF_CONSTANTS.apertureEfficiency;
  const txPowerDbm = options?.txPowerDbm ?? RF_CONSTANTS.txPowerDbm;
  const systemLossDb = options?.systemLossDb ?? RF_CONSTANTS.systemLossDb;
  const rainRateMmPerHour = options?.useRainRateMmPerHour ?? 0.0;

  // Antenna gains (dBi) for given angular offsets
  const txGainDb = dishGainDb(thetaTxDeg, { dishDiameterMeters, frequencyGigahertz, apertureEfficiency });
  const rxGainDb = dishGainDb(thetaRxDeg, { dishDiameterMeters, frequencyGigahertz, apertureEfficiency });

  // Path loss
  const pathLossDb = fsplDb(distanceMeters, frequencyGigahertz);

  // Rain loss across path
  const rainLossDb = rainAttenuationDb(distanceMeters, rainRateMmPerHour, frequencyGigahertz);

  // Received power at Rx input (dBm)
  const receivedPowerDbm = txPowerDbm + txGainDb + rxGainDb - pathLossDb - systemLossDb - rainLossDb;

  return {
    receivedPowerDbm,
    txGainDb,
    rxGainDb,
    pathLossDb,
    rainLossDb,
  };
}

// -----------------------------
// SNR and MCS mapping helpers
// - SNR (dB) = Pr(dBm) - NoiseFloor(dBm)
// - mapSNRToLinkQuality: returns simple metric and MCS suggestion.
// Note: thresholds are approximate and chosen for training/UX, not an exact vendor table.
// -----------------------------
export function computeSnrDb(
  receivedPowerDbm: number,
  bandwidthMHz = RF_CONSTANTS.bandwidthMHz,
  noiseFigureDb = RF_CONSTANTS.noiseFigureDb,
) {
  const noiseDbm = noiseFloorDbm(bandwidthMHz, noiseFigureDb);
  const snrDb = receivedPowerDbm - noiseDbm;
  return { snrDb, noiseDbm };
}

export interface McsRecommendation {
  mcsName: string;
  requiredSnrDb: number;
  estimatedThroughputMbps: number;
  comment?: string;
}

export function mapSnrToMcsRecommendation(snrDb: number): McsRecommendation {
  // Approximate thresholds (training / intuitive)
  // These are coarse and intended as helpful UX signals, not certified vendor thresholds.
  if (snrDb >= 30) return { mcsName: "256-QAM (high)", requiredSnrDb: 30, estimatedThroughputMbps: 300, comment: "Excellent link" };
  if (snrDb >= 25) return { mcsName: "128-QAM", requiredSnrDb: 25, estimatedThroughputMbps: 220, comment: "Very good" };
  if (snrDb >= 20) return { mcsName: "64-QAM", requiredSnrDb: 20, estimatedThroughputMbps: 150, comment: "Good" };
  if (snrDb >= 15) return { mcsName: "32-QAM", requiredSnrDb: 15, estimatedThroughputMbps: 80, comment: "Moderate" };
  if (snrDb >= 10) return { mcsName: "16-QAM", requiredSnrDb: 10, estimatedThroughputMbps: 40, comment: "Low" };
  if (snrDb >= 5) return { mcsName: "QPSK", requiredSnrDb: 5, estimatedThroughputMbps: 10, comment: "Fragile" };
  return { mcsName: "Link Loss / No Lock", requiredSnrDb: -999, estimatedThroughputMbps: 0, comment: "No reliable modulation available" };
}

// -----------------------------
// small convenience: convert dB <-> linear
// -----------------------------
export function dbToLinear(db: number) {
  return Math.pow(10, db / 10.0);
}
export function linearToDb(linear: number) {
  return 10.0 * Math.log10(Math.max(linear, 1e-30));
}

// -----------------------------
// Geometry helpers (simple and explicit)
// - boresightVectorFromAzEl: returns normalized 3D unit vector for azimuth,elevation
//   Azimuth convention: 0° => pointing along +X, +90° => +Y
//   Elevation: 0° => horizon, +90° => zenith
// -----------------------------
export function boresightVectorFromAzEl(azimuthDeg: number, elevationDeg: number) {
  const azRad = degToRad(azimuthDeg);
  const elRad = degToRad(elevationDeg);
  const x = Math.cos(elRad) * Math.cos(azRad);
  const y = Math.cos(elRad) * Math.sin(azRad);
  const z = Math.sin(elRad);
  const length = Math.sqrt(x*x + y*y + z*z) || 1;
  return [x/length, y/length, z/length] as [number,number,number];
}

// -----------------------------
// LOS bearing/elevation from from->to positions (optional helper)
// -----------------------------
export function bearingElevationFromLos(from: Position, to: Position) {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const dz = to.z - from.z;
  const distanceMeters = Math.sqrt(dx*dx + dy*dy + dz*dz) || 1;
  const horizontalDistance = Math.sqrt(dx*dx + dy*dy) || 1e-12;
  const bearingRad = Math.atan2(dy, dx);
  const elevationRad = Math.atan2(dz, horizontalDistance);
  return {
    bearingDeg: (radToDeg(bearingRad) + 360) % 360,
    elevationDeg: radToDeg(elevationRad),
    distanceMeters,
  };
}

// -----------------------------
// computeLink: convenience wrapper returning full link object for both directions
// (returns A->B and B->A results). Useful for UI summary panels.
// -----------------------------
export interface OneWayResult {
  receivedPowerDbm: number;
  txGainDb: number;
  rxGainDb: number;
  pathLossDb: number;
  rainLossDb: number;
}
export interface BidirectionalLinkResult {
  aToB: OneWayResult;
  bToA: OneWayResult;
  snrAToB: number;
  snrBToA: number;
}

export function computeBidirectionalLink(
  thetaADeg: number,
  thetaBDeg: number,
  distanceMeters: number,
  options?: { rainRateMmPerHour?: number }
): BidirectionalLinkResult {
  const rainRate = options?.rainRateMmPerHour ?? 0.0;

  const aToB = computeOneWayRxPowerDbm(thetaADeg, thetaBDeg, distanceMeters, { useRainRateMmPerHour: rainRate });
  const bToA = computeOneWayRxPowerDbm(thetaBDeg, thetaADeg, distanceMeters, { useRainRateMmPerHour: rainRate });

  const snrAToBObj = computeSnrDb(aToB.receivedPowerDbm, RF_CONSTANTS.bandwidthMHz, RF_CONSTANTS.noiseFigureDb);
  const snrBToAObj = computeSnrDb(bToA.receivedPowerDbm, RF_CONSTANTS.bandwidthMHz, RF_CONSTANTS.noiseFigureDb);

  return {
    aToB: {
      receivedPowerDbm: aToB.receivedPowerDbm,
      txGainDb: aToB.txGainDb,
      rxGainDb: aToB.rxGainDb,
      pathLossDb: aToB.pathLossDb,
      rainLossDb: aToB.rainLossDb,
    },
    bToA: {
      receivedPowerDbm: bToA.receivedPowerDbm,
      txGainDb: bToA.txGainDb,
      rxGainDb: bToA.rxGainDb,
      pathLossDb: bToA.pathLossDb,
      rainLossDb: bToA.rainLossDb,
    },
    snrAToB: snrAToBObj.snrDb,
    snrBToA: snrBToAObj.snrDb,
  };
}
