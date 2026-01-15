// app/components/PathLock/rfEngine.ts
"use client";

/**
 * rfEngine.ts — LOS-based computeSignal + LUT pattern engine
 *
 * Replacements / fixes in this version:
 * - When both dishes have position, computeSignal uses true LOS geometry:
 *     thetaA = angle between A boresight and LOS(A->B)
 *     thetaB = angle between B boresight and LOS(B->A)
 *   power = PA(thetaA) * PB(thetaB)  (reciprocity)
 * - Falls back to sampledOverlapForOffset when position missing
 * - Normalized -> app dB mapping kept consistent
 *
 * (Other parts unchanged: LUT, aperture illumination, strut attenuation, Ruze)
 */

/* ---------- Types & exports (same) ---------- */
export type Position = { x: number; y: number; z: number };
export type MechanicalState = {
  azimuth: number;
  tilt: number;
  position?: Position;
  idealAz?: number;
  idealTilt?: number;
};
export type RFPoint = { x: number; y: number };

export const TARGET_DB = 1.32;
export const NULL_DB = 1.70;

/* ---------- Physical defaults & tunables (kept identical) ---------- */
export let dishDiameterM = 0.9;
export let freqHz = 11e9;
export let SURFACE_RMS_M = 0.0005;
export let CENTRAL_BLOCKAGE_RATIO = 0.12;
export let TAPER_ALPHA = 0.8;
export let TAPER_EXP = 2;
export let USE_CORRUGATED_FEED = true;
export let FEED_EDGE_TAPER_DB = 12;

export let STRUT_COUNT = 3;
export let STRUT_AMP = 0.30;
export let STRUT_WIDTH_DEG = 3.0;
export let STRUT_START_DEG = 0;

/* ---------- Math helpers ---------- */
function degToRad(d: number) { return (d * Math.PI) / 180; }
function radToDeg(r: number) { return (r * 180) / Math.PI; }
function clamp(v: number, a = 0, b = 1) { return Math.max(a, Math.min(b, v)); }
function dot3(a: number[], b: number[]) { return a[0]*b[0] + a[1]*b[1] + a[2]*b[2]; }
function norm3(a: number[]) { return Math.sqrt(dot3(a,a)); }
function sub3(a: number[], b: number[]) { return [a[0]-b[0], a[1]-b[1], a[2]-b[2]]; }
function add3(a:number[], b:number[]) { return [a[0]+b[0], a[1]+b[1], a[2]+b[2]]; }
function scale3(a:number[], s:number) { return [a[0]*s, a[1]*s, a[2]*s]; }
function normalize3(a:number[]) { const n = norm3(a)||1; return [a[0]/n, a[1]/n, a[2]/n]; }

function lambda() { return 3e8 / freqHz; }
function kWave() { return 2 * Math.PI / lambda(); }
export function approxBeamwidthDeg() {
  const k = 70;
  return Math.max(0.01, (k * lambda()) / Math.max(1e-6, dishDiameterM));
}

/* ---------- J0 approximation (kept) ---------- */
function j0(x: number) {
  const ax = Math.abs(x);
  if (ax < 1e-8) return 1;
  if (ax < 8.0) {
    const y = x * x;
    const num = 57568490574.0 + y * (-13362590354.0 + y * (651619640.7 + y * (-11214424.18 + y * (77392.33017 + y * (-184.9052456)))));
    const den = 57568490411.0 + y * (1029532985.0 + y * (9494680.718 + y * (59272.64853 + y * (267.8532712 + y))));
    return num / den;
  } else {
    const z = ax - 0.785398164;
    const sq = Math.sqrt(2 / (Math.PI * ax));
    return sq * Math.cos(z);
  }
}

/* ---------- aperture illumination ---------- */
function edgeTaperLinear(db: number) {
  return Math.pow(10, -Math.abs(db)/10);
}
function apertureIllumination(r: number, D: number) {
  const R = D/2;
  const blockedR = (CENTRAL_BLOCKAGE_RATIO * D) / 2;
  if (r <= blockedR) return 0;
  const cosArg = (Math.PI/2) * (r / R);
  const base = (1 - TAPER_ALPHA) + TAPER_ALPHA * Math.pow(Math.cos(cosArg), TAPER_EXP);
  if (USE_CORRUGATED_FEED) {
    const edgeTarget = edgeTaperLinear(FEED_EDGE_TAPER_DB);
    const u = r / R;
    const s = 1 - (1 - edgeTarget) * Math.pow(u, 3);
    return base * s;
  }
  return base;
}

/* ---------- soft strut attenuation ---------- */
function strutAttenuation(xDeg: number, yDeg: number) {
  if (STRUT_COUNT <= 0 || STRUT_AMP <= 0 || STRUT_WIDTH_DEG <= 0) return 1;
  const psi = (radToDeg(Math.atan2(yDeg, xDeg)) + 360) % 360;
  const sector = 360 / STRUT_COUNT;
  let attenuation = 1;
  for (let s=0; s<STRUT_COUNT; s++){
    const center = (STRUT_START_DEG + s*sector) % 360;
    let delta = ((psi - center + 540) % 360) - 180;
    const sigma = STRUT_WIDTH_DEG / 2.355;
    const local = Math.exp(-0.5 * (delta*delta)/(sigma*sigma));
    attenuation *= (1 - STRUT_AMP * local) ;
  }
  return clamp(attenuation, 0.05, 1);
}

/* ---------- Ruze ---------- */
function ruzeAmplitudeFactor() {
  const sigma = SURFACE_RMS_M;
  const eff = Math.exp(-Math.pow((4 * Math.PI * sigma)/lambda(), 2));
  return Math.sqrt(clamp(eff, 0, 1));
}

/* ---------- LUT generation (kept, normalized to boresight=1) ---------- */
const LUT_THETA_SAMPLES = 360;
const LUT_THETA_MAX_DEG = 40;
const RADIAL_SAMPLES = 120;
let _LUT: { thetaDegs: Float32Array, power: Float32Array } | null = null;
let _LUT_KEY: string | null = null;

function makeLUTKey() {
  return [
    dishDiameterM.toFixed(6),
    freqHz.toFixed(0),
    CENTRAL_BLOCKAGE_RATIO.toFixed(4),
    TAPER_ALPHA.toFixed(4),
    TAPER_EXP.toFixed(2),
    SURFACE_RMS_M.toFixed(6),
    USE_CORRUGATED_FEED ? "C" : "N",
    FEED_EDGE_TAPER_DB.toFixed(1),
  ].join("|");
}

function buildLUT() {
  const key = makeLUTKey();
  if (_LUT && _LUT_KEY === key) return;
  _LUT_KEY = key;

  const D = dishDiameterM;
  const R = D/2;
  const k = kWave();
  const nTheta = LUT_THETA_SAMPLES;
  const thetaDegs = new Float32Array(nTheta);
  const power = new Float32Array(nTheta);

  const Nr = RADIAL_SAMPLES;
  const dr = R / Nr;
  const rSamples = new Float32Array(Nr);
  const rWeights = new Float32Array(Nr);
  const illum = new Float32Array(Nr);
  for (let ir=0; ir<Nr; ir++){
    const r = (ir + 0.5) * dr;
    rSamples[ir] = r;
    rWeights[ir] = r * dr;
    illum[ir] = apertureIllumination(r, D);
  }

  let I0 = 0;
  for (let ir=0; ir<Nr; ir++) I0 += illum[ir] * rWeights[ir];
  const I0amp = Math.max(I0, 1e-12);
  const ruzeAmp = ruzeAmplitudeFactor();

  for (let t=0; t<nTheta; t++){
    const thDeg = (t / (nTheta - 1)) * LUT_THETA_MAX_DEG;
    thetaDegs[t] = thDeg;
    const thRad = degToRad(thDeg);
    const s = k * Math.sin(thRad);
    let Ereal = 0;
    for (let ir=0; ir<Nr; ir++){
      const r = rSamples[ir];
      const w = rWeights[ir];
      Ereal += illum[ir] * j0(s * r) * w;
    }
    const E = (Ereal / I0amp) * ruzeAmp;
    const P = Math.max(0, E*E);
    power[t] = P;
  }

  // normalize so boresight ~ 1
  const maxP = power[0] || 1;
  for (let t=0;t<nTheta;t++) power[t] /= Math.max(maxP, 1e-16);

  _LUT = { thetaDegs, power };
}

function lutPowerAtThetaDeg(thetaDeg: number) {
  if (!_LUT) buildLUT();
  const { thetaDegs, power } = _LUT!;
  const n = thetaDegs.length;
  if (thetaDeg <= thetaDegs[0]) return power[0];
  if (thetaDeg >= thetaDegs[n-1]) return power[n-1];
  let lo = 0, hi = n-1;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (thetaDegs[mid] <= thetaDeg) lo = mid; else hi = mid;
  }
  const t0 = thetaDegs[lo], t1 = thetaDegs[hi], p0 = power[lo], p1 = power[hi];
  const u = (thetaDeg - t0) / (t1 - t0);
  return p0 + (p1 - p0) * u;
}



/* ---------- RFFieldAtPoint (2D) ---------- */
export function RFFieldAtPoint(pt: RFPoint) {
  buildLUT();
  const rDeg = Math.hypot(pt.x, pt.y);
  const radial = lutPowerAtThetaDeg(rDeg);
  const att = strutAttenuation(pt.x, pt.y);
  return Math.max(0, radial * att);
}

/* ---------- geometry helpers ---------- */
export function boresightVectorFromAzTilt(azDeg: number, tiltDeg: number) {
  const az = degToRad(azDeg);
  const elev = degToRad(tiltDeg - 90);
  const vx = Math.cos(elev) * Math.sin(az);
  const vy = Math.cos(elev) * Math.cos(az);
  const vz = Math.sin(elev);
  return normalize3([vx, vy, vz]);
}

export function bearingElevationFromLOS(from: Position, to: Position) {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const dz = to.z - from.z;
  const horiz = Math.hypot(dx, dy);
  const bearingRad = Math.atan2(dx, dy);
  const bearingDeg = (radToDeg(bearingRad) + 360) % 360;
  const elevationRad = Math.atan2(dz, horiz);
  const elevationDeg = radToDeg(elevationRad);
  const los = normalize3([dx, dy, dz]);
  return { bearingDeg, elevationDeg, los };
}

/* ---------- pointingRFfromTo (signed errors in deg) ---------- */
export function pointingRFfromTo(source: MechanicalState, target: MechanicalState): RFPoint {
  if (source.position && target.position) {
    // compute LOS from source -> some far point along target boresight if idealAz exists,
    // but for UI signed error we can use LOS between site positions as the real path.
    const be = bearingElevationFromLOS(source.position, target.position);
    const azErr = ((be.bearingDeg - source.azimuth + 540) % 360) - 180;
    const tiltErr = (be.elevationDeg - (source.tilt - 90));
    return { x: azErr, y: tiltErr };
  }
  // fallback: previous relative approx
  const azErr = (((( (target.azimuth - 180) - source.azimuth) + 540) % 360) - 180);
  const tiltErr = (target.tilt - source.tilt);
  return { x: azErr, y: tiltErr };
}

/* ---------- closest approach between rays (kept) ---------- */
export function closestApproachBetweenRays(posA: Position, dirA: number[], posB: Position, dirB: number[]) {
  const p0 = [posA.x, posA.y, posA.z];
  const p1 = [posB.x, posB.y, posB.z];
  const u = dirA;
  const v = dirB;
  const w0 = sub3(p0, p1);
  const a = dot3(u,u);
  const b = dot3(u,v);
  const c = dot3(v,v);
  const d = dot3(u,w0);
  const e = dot3(v,w0);
  const denom = a*c - b*b;
  let sc, tc;
  if (Math.abs(denom) < 1e-12) {
    sc = 0;
    tc = (b>c ? d/b : e/c);
  } else {
    sc = (b*e - c*d) / denom;
    tc = (a*e - b*d) / denom;
  }
  sc = Math.max(0, sc);
  tc = Math.max(0, tc);
  const pa = add3(p0, scale3(u, sc));
  const pb = add3(p1, scale3(v, tc));
  const diff = sub3(pa, pb);
  const dist = norm3(diff);
  return { dist, pointA: { x: pa[0], y: pa[1], z: pa[2] }, pointB: { x: pb[0], y: pb[1], z: pb[2] }, tA: sc, tB: tc };
}

/* ---------- sampled overlap (fallback) ---------- */
function sampledOverlapForOffset(O: RFPoint, grid = 31, radiusDegOverride?: number) {
  const mainBW = approxBeamwidthDeg();
  const sampleRadius = radiusDegOverride ?? Math.max(10, mainBW * 6);
  const half = (grid - 1) / 2;
  let sum = 0;
  let count = 0;
  for (let i=0;i<grid;i++){
    for (let j=0;j<grid;j++){
      const u = ((i - half) / half) * sampleRadius;
      const v = ((j - half) / half) * sampleRadius;
      const aVal = RFFieldAtPoint({ x: u, y: v });
      const bVal = RFFieldAtPoint({ x: u - O.x, y: v - O.y });
      sum += aVal * bVal;
      count++;
    }
  }
  return sum / Math.max(1, count);
}

/* ---------- normalized -> app dB mapping (UPDATED & exported helper) ---------- */
function normalizedToAppDb(norm: number, exponent = 2.2) {
  // stronger compression so partial products map closer to NULL_DB
  const compressed = Math.pow(clamp(norm, 0, 1), exponent);
  return NULL_DB - compressed * (NULL_DB - TARGET_DB);
}

// export intrinsic per-dish mapping (keeps previous semantics)
export function gainToAppDb(gain: number) {
  return normalizedToAppDb(clamp(gain, 0, 1), 1.0); // intrinsic per-dish uses exponent 1 (unchanged)
}

/* ---------- soft capture gate (exported) ---------- */
export function captureGate(g: number, center = 0.6, sharpness = 18) {
  // logistic gate — center in [0..1], sharpness >0
  const v = 1 / (1 + Math.exp(-sharpness * (g - center)));
  return clamp(v, 0, 1);
}

/* ---------- convenience: paired product -> app dB (export) ---------- */
export function pairedDbFromGains(gA: number, gB: number, opts?: { center?: number; sharpness?: number; exponent?: number }) {
  const center = opts?.center ?? 0.6;
  const sharpness = opts?.sharpness ?? 18;
  const exponent = opts?.exponent ?? 2.2;

  const gateA = captureGate(gA, center, sharpness);
  const gateB = captureGate(gB, center, sharpness);

  const product = clamp(gA * gB * gateA * gateB, 0, 1);
  return normalizedToAppDb(product, exponent);
}

/* ---------- computeSignal (UPDATED to use gating & steeper mapping by default) ---------- */
export function computeSignal(dishA: MechanicalState, dishB: MechanicalState) {
  // If both dishes have positions, use LOS-based method
  if (dishA.position && dishB.position) {
    const losAB = bearingElevationFromLOS(dishA.position, dishB.position);
    const losBA = bearingElevationFromLOS(dishB.position, dishA.position);

    const boreA = boresightVectorFromAzTilt(dishA.azimuth, dishA.tilt);
    const boreB = boresightVectorFromAzTilt(dishB.azimuth, dishB.tilt);

    const cosA = clamp(dot3(boreA, losAB.los), -1, 1);
    const cosB = clamp(dot3(boreB, losBA.los), -1, 1);
    const thetaAdeg = radToDeg(Math.acos(cosA));
    const thetaBdeg = radToDeg(Math.acos(cosB));

    const gA = lutPowerAtThetaDeg(thetaAdeg);
    const gB = lutPowerAtThetaDeg(thetaBdeg);

    // apply capture gating
    const gateA = captureGate(gA);
    const gateB = captureGate(gB);

    const product = clamp(gA * gB * gateA * gateB, 0, 1);

    // use a slightly stronger visual exponent for app DB (tuned)
    const db = normalizedToAppDb(product, 2.2);
    return clamp(db, TARGET_DB, NULL_DB);
  }

  // fallback: sampled overlap + facing penalty (same as before but apply gating)
  const O = pointingRFfromTo(dishA, dishB);
  const overlap = sampledOverlapForOffset(O, 31);
  const self = sampledOverlapForOffset({ x: 0, y: 0 }, 31) || 1e-12;
  let norm = clamp(overlap / self, 0, 1);

  let facingFactor = 1;
  if (dishA.position && dishB.position) {
    const losAB = bearingElevationFromLOS(dishA.position, dishB.position);
    const boresightA = boresightVectorFromAzTilt(dishA.azimuth, dishA.tilt);
    const cosErr = clamp(dot3(boresightA, losAB.los), -1, 1);
    const angErrDeg = radToDeg(Math.acos(cosErr));
    facingFactor = Math.exp(-Math.pow(angErrDeg / 30, 2));
  } else {
    const azBtoA = (((dishB.idealAz ?? dishB.azimuth) - 180) + 360) % 360;
    let facingErr = dishA.azimuth - azBtoA;
    facingErr = ((facingErr + 540) % 360) - 180;
    facingFactor = Math.exp(-Math.pow(facingErr / 30, 2));
  }

  norm = clamp(norm * facingFactor, 0, 1);

  // estimate per-dish gains from center point, apply gating
  const offAtoB = pointingRFfromTo(dishA, dishB);
  const offBtoA = pointingRFfromTo(dishB, dishA);
  const gA_guess = RFFieldAtPoint(offAtoB);
  const gB_guess = RFFieldAtPoint(offBtoA);
  const gateA = captureGate(gA_guess);
  const gateB = captureGate(gB_guess);

  const gatedNorm = clamp(norm * gateA * gateB, 0, 1);
  const db = normalizedToAppDb(gatedNorm, 2.2);
  return clamp(db, TARGET_DB, NULL_DB);
}


/* ---------- generateIsoRadii (uses LUT + normalized mapping) ---------- */
export function generateIsoRadii(dish: MechanicalState, thresholdsDb: number[], opts?: { maxRadius?: number }) {
  const maxR = opts?.maxRadius ?? Math.max(30, approxBeamwidthDeg() * 8);
  const centerPower = lutPowerAtThetaDeg(0);

  function radialToAppDb(rDeg: number) {
    const p = lutPowerAtThetaDeg(rDeg);
    // if other dish centered -> overlap approx = p*1 so norm=p
    return normalizedToAppDb(clamp(p, 0, 1));
  }

  return thresholdsDb.map((tDb) => {
    let lo = 0, hi = maxR, mid = 0;
    for (let i=0;i<64;i++){
      mid = (lo + hi) / 2;
      const est = radialToAppDb(mid);
      if (Math.abs(est - tDb) < 1e-4) break;
      if (est > tDb) lo = mid; else hi = mid;
    }
    return { db: tDb, radius: mid };
  });
}

/* ---------- UI helpers ---------- */
export function mechanicalToBoresightRF(state: MechanicalState) {
  return { x: ((state.azimuth % 360) + 360) % 360, y: state.tilt - 90 };
}
export function boresightRayForState(state: MechanicalState) {
  const origin: Position = state.position ?? { x: 0, y: 0, z: 30 };
  const dir = boresightVectorFromAzTilt(state.azimuth, state.tilt);
  return { origin, dir };
}

/* ---------- setters ---------- */
export function setDishParams(params: Partial<{
  diameter: number; freq: number; taperAlpha: number; taperExp: number;
  blockage: number; surfaceRms: number; corrugatedFeed: boolean;
  edgeTaperDb: number; strutCount: number; strutAmp: number; strutWidthDeg: number; strutStartDeg: number;
}>) {
  if (typeof params.diameter === "number") dishDiameterM = params.diameter;
  if (typeof params.freq === "number") freqHz = params.freq;
  if (typeof params.taperAlpha === "number") TAPER_ALPHA = params.taperAlpha;
  if (typeof params.taperExp === "number") TAPER_EXP = params.taperExp;
  if (typeof params.blockage === "number") CENTRAL_BLOCKAGE_RATIO = params.blockage;
  if (typeof params.surfaceRms === "number") SURFACE_RMS_M = params.surfaceRms;
  if (typeof params.corrugatedFeed === "boolean") USE_CORRUGATED_FEED = params.corrugatedFeed;
  if (typeof params.edgeTaperDb === "number") FEED_EDGE_TAPER_DB = params.edgeTaperDb;
  if (typeof params.strutCount === "number") STRUT_COUNT = params.strutCount;
  if (typeof params.strutAmp === "number") STRUT_AMP = params.strutAmp;
  if (typeof params.strutWidthDeg === "number") STRUT_WIDTH_DEG = params.strutWidthDeg;
  if (typeof params.strutStartDeg === "number") STRUT_START_DEG = params.strutStartDeg;
  _LUT = null;
  _LUT_KEY = null;
}
