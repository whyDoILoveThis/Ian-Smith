import FingerprintJS from "@fingerprintjs/fingerprintjs";

export interface FingerprintInfo {
  visitorId: string;
  os?: string;
  browserUA?: string;
  timezone?: string;
  languages?: string | string[];
  screenResolution?: number[];
  cpuCores?: number;
  memoryGB?: number;
  gpuInfo?: string;
}

function getValue<T>(comp: unknown): T | undefined {
  if (
    typeof comp === "object" &&
    comp !== null &&
    "value" in (comp as Record<string, unknown>)
  ) {
    return (comp as { value: T }).value;
  }
  return undefined;
}

/**
 * ALWAYS returns a FingerprintInfo object.
 * Never returns null.
 * Safe for direct destructuring.
 */
export const doFingerprintThing = async (
  mounted: boolean,
  setFingerprint: (fp: string | null) => void
): Promise<FingerprintInfo> => {
  // 🚪 If unmounted, return a SAFE FALLBACK OBJECT
  if (!mounted) {
    return {
      visitorId: "UNMOUNTED",
    };
  }

  const fp = await FingerprintJS.load();
  const result = await fp.get();
  const { visitorId, components } = result;

  setFingerprint(visitorId);

  const browserUA =
    typeof navigator !== "undefined" ? navigator.userAgent : undefined;

  const os = getValue<string>(components.platform);
  const timezone = getValue<string>(components.timezone);
  const languages = getValue<string[] | string>(components.languages);
  const screenResolution = getValue<number[]>(components.screenResolution);
  const cpuCores = getValue<number>(components.hardwareConcurrency);
  const memoryGB = getValue<number>(components.deviceMemory);

  const webGlBasics = getValue<any>(components.webGlBasics);
  let gpuInfo: string | undefined;

  if (webGlBasics && typeof webGlBasics === "object") {
    gpuInfo =
      webGlBasics.rendererUnmasked ??
      webGlBasics.renderer ??
      undefined;
  } else {
    const webGlExt = getValue<any>(components.webGlExtensions);
    if (webGlExt && typeof webGlExt === "object") {
      gpuInfo = JSON.stringify({
        params: webGlExt.parameters?.slice?.(0, 6),
        extensions: webGlExt.extensions?.slice?.(0, 6),
      });
    }
  }

  return {
    visitorId,
    os,
    browserUA,
    timezone,
    languages,
    screenResolution,
    cpuCores,
    memoryGB,
    gpuInfo,
  };
};
