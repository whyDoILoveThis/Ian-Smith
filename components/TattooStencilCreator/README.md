# Tattoo Stencil Creator

A fully modular Next.js feature that converts a photo of a tattoo on an arm or leg into a flat, high-contrast stencil image (PNG + optional SVG) suitable for printing or transfer.

## Architecture

```
app/
  tattoo-stencil/
    page.tsx                     ← Main route (client component)
  api/tattoo-stencil/
    route.ts                     ← POST endpoint – image processing pipeline

components/TattooStencilCreator/
  components/
    TattooUploader.tsx           ← Drag-and-drop upload + preview
    StencilPreview.tsx           ← Result display + download
    ProcessingStatus.tsx         ← Animated progress indicator
    StencilOptions.tsx           ← User-configurable knobs
  hooks/
    useTattooStencil.ts          ← Orchestration hook (upload → detect → API → result)
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

## Processing Pipeline

| Step | Where  | What                                                    |
| ---- | ------ | ------------------------------------------------------- |
| 1    | Client | MediaPipe Pose Landmarker detects 33 body keypoints     |
| 2    | Client | Best limb (arm preferred) is isolated with bounding box |
| 3    | Client | Image is compressed to JPEG (max 2048 px) for upload    |
| 4    | Server | Crop to limb ROI                                        |
| 5    | Server | Grayscale → median filter → normalise → contrast boost  |
| 6    | Server | Unsharp-mask sharpening                                 |
| 7    | Server | Laplacian edge detection                                |
| 8    | Server | Threshold → binary stencil                              |
| 9    | Server | Morphological dilation (edge thickness)                 |
| 10   | Server | Negate (dark lines on white)                            |
| 11   | Server | Rotate to correct limb axis (surface flattening)        |
| 12   | Server | PNG output                                              |
| 13   | Server | Optional SVG via Potrace                                |

## Dependencies

| Package                   | Purpose                                        | Free Tier               |
| ------------------------- | ---------------------------------------------- | ----------------------- |
| `react-dropzone`          | Drag-and-drop file upload                      | Fully free / MIT        |
| `@mediapipe/tasks-vision` | Client-side pose detection (WASM + CDN models) | Fully free / Apache-2.0 |
| `sharp`                   | Server-side image processing                   | Fully free / Apache-2.0 |
| `potrace`                 | Bitmap → SVG vectorisation                     | Fully free / GPL-2.0    |

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
