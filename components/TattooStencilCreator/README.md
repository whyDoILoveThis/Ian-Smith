# Tattoo Stencil Creator

A fully modular Next.js feature that converts a photo of a tattoo on an arm or leg into a flat, high-contrast stencil image (PNG + optional SVG) suitable for printing or transfer.

## Architecture

```
app/
  tattoo-stencil/
    page.tsx                     ← Main route (client component)
  api/tattoo-stencil/
    route.ts                     ← POST endpoint – LAB color-space pipeline (v6)

components/TattooStencilCreator/
  components/
    TattooUploader.tsx           ← Drag-and-drop upload + preview
    RegionEditor.tsx             ← Polygon limb outline + brush tattoo highlighter
    StencilPreview.tsx           ← Result display + download + debug overlay
    ProcessingStatus.tsx         ← Animated progress indicator
    StencilOptions.tsx           ← User-configurable knobs
    BoundarySelector.tsx         ← (deprecated) Old 4-point boundary editor
  hooks/
    useTattooStencil.ts          ← Orchestration hook (upload → detect → regions → API → result)
  lib/
    constants.ts                 ← Shared configuration & MediaPipe paths
  types/
    index.ts                     ← TypeScript interfaces
    potrace.d.ts                 ← Type declarations for potrace
  utils/
    imageProcessing.ts           ← Client-side validation, compression, download helpers
    poseDetection.ts             ← MediaPipe Tasks-Vision pose detection (client-side)
    limbExtraction.ts            ← Limb region extraction from pose landmarks
```

## Processing Pipeline (v6 — LAB color-space)

| Step | Where  | What                                                                     |
| ---- | ------ | ------------------------------------------------------------------------ |
| 1    | Client | MediaPipe Pose Landmarker detects 33 body keypoints                      |
| 2    | Client | Best limb (arm preferred) is isolated with bounding box                  |
| 3    | Client | User outlines the limb (polygon) and paints over the tattoo (brush mask) |
| 4    | Client | Image is compressed to JPEG (max 1536 px) for upload                     |
| 5    | Server | Flatten alpha → optional crop → resize → median denoise                  |
| 6    | Server | Convert RGB → CIE-LAB color space per-pixel                              |
| 7    | Server | Ink/skin separation: supervised (mask) or unsupervised (histogram)       |
| 8    | Server | Cylindrical surface unwrap (PCA from polygon or AI landmarks)            |
| 9    | Server | Otsu auto-threshold → binary stencil                                     |
| 10   | Server | Cleanup: median filter + anti-alias blur + re-threshold                  |
| 11   | Server | Rotate to correct limb axis                                              |
| 12   | Server | PNG output + optional SVG via Potrace                                    |

### Key algorithms

- **CIE-LAB color space**: Separates lightness (L) from chrominance (a, b), making ink detection robust under varying illumination.
- **Supervised separation**: When the user paints over the tattoo, ink/skin LAB statistics are computed from the mask. Each pixel is scored by standardised distance from the skin model.
- **Unsupervised separation**: Without a mask, the dominant skin color is estimated via histogram peak in L channel, then per-pixel LAB distance is computed.
- **Otsu's method**: Automatic threshold selection that maximises between-class variance — adapts to each image instead of using hard-coded values.
- **PCA cylinder fitting**: A polygon outline of the limb gives cylinder axis via principal component analysis, replacing the old 4-point system.

## Dependencies

| Package                   | Purpose                                        | Free Tier               |
| ------------------------- | ---------------------------------------------- | ----------------------- |
| `react-dropzone`          | Drag-and-drop file upload                      | Fully free / MIT        |
| `@mediapipe/tasks-vision` | Client-side pose detection (WASM + CDN models) | Fully free / Apache-2.0 |
| `sharp`                   | Server-side image processing (libvips)         | Fully free / Apache-2.0 |
| `potrace`                 | Bitmap → SVG vectorisation                     | Fully free / GPL-2.0    |
| `lucide-react`            | Icons                                          | Fully free / ISC        |

All processing runs **locally** – no third-party API keys or paid services required.

## Setup

```bash
# 1. Install dependencies (from project root)
npm install react-dropzone sharp potrace @mediapipe/tasks-vision

# 2. (Optional) Install type declarations
npm install -D @types/potrace

# 3. Run the dev server
npm run dev
```

Then visit [http://localhost:3000/tattoo-stencil](http://localhost:3000/tattoo-stencil).

## Environment Variables

**None required.** All models and WASM runtimes are loaded from public CDNs at runtime.

## Testing with Sample Images

1. Navigate to `/tattoo-stencil` in a modern browser (Chrome / Edge recommended for GPU-accelerated pose detection).
2. Upload a clear photo of a tattoo on an arm or leg.
3. Adjust options (contrast, edge thickness, noise reduction) if desired.
4. Click **Generate Stencil**.
5. Download the resulting PNG and/or SVG.

**Best results with:**

- Well-lit photos with the tattoo clearly visible
- Minimal background clutter
- Single limb in focus
- Resolution ≥ 600 px on the shortest side

## Edge Cases Handled

- **No pose detected** → processes the full image (no limb crop)
- **Low resolution** → validates minimum 200 px; resizes to max 2048 px
- **Multiple limbs** → selects the most confident arm, falls back to leg
- **Extreme angles** → uses limb-axis rotation for surface flattening
- **SVG generation fails** → returns PNG only with a warning
- **Oversized file** → client-side compression before upload (< 4.5 MB payload)

## Deployment

The feature is serverless-ready:

- **Vercel**: works out of the box (`sharp` has native Vercel support, `potrace` is pure JS)
- **AWS Lambda / other**: ensure the Node.js runtime is ≥ 18 and `sharp` platform binaries are bundled

`maxDuration` is set to 30 s in the API route to accommodate slower cold starts.
