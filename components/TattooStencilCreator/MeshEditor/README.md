# MeshEditor — 3D Tattoo Stencil Flattening System

A React Three Fiber-based 3D mesh editor that converts a photograph of a tattoo on a curved body surface into a **proportionally flat stencil** suitable for printing or thermal transfer. The core idea: wrap your tattoo photo onto a 3D body mesh, sculpt it to match the real curvature, then "unwrap" it back to 2D — compensating for all the distortion that a camera introduces when photographing curved skin.

---

## Table of Contents

1. [Concept — Why 3D?](#concept--why-3d)
2. [Architecture](#architecture)
3. [Data Flow Overview](#data-flow-overview)
4. [Mesh Shapes & Body Presets](#mesh-shapes--body-presets)
5. [Sculpt Tools](#sculpt-tools)
   - [Grab](#grab)
   - [Push](#push)
   - [Pull](#pull)
   - [Smooth / Flatten](#smooth--flatten)
   - [Warp / Bend / Twist](#warp--bend--twist)
   - [Pin & Edge Lock](#pin--edge-lock)
6. [Region System](#region-system)
7. [Seam System](#seam-system)
8. [Curve Deformer](#curve-deformer)
9. [Hook / Flap Deformer (Uncurve)](#hook--flap-deformer-uncurve)
10. [Screenshot Export Pipeline](#screenshot-export-pipeline)
    - [Capture Phase](#capture-phase)
    - [Stencil Post-Processing Pipeline](#stencil-post-processing-pipeline)
11. [UV Unwrap Export](#uv-unwrap-export)
12. [Undo / Redo & Snapshots](#undo--redo--snapshots)
13. [File Reference](#file-reference)

---

## Concept — Why 3D?

A tattoo on a forearm or calf sits on a **curved surface**. A flat photograph of that tattoo introduces perspective distortion, foreshortening, and non-uniform scaling — the edges of the limb curve away from the camera, compressing the image. A simple 2D crop cannot fix this.

The MeshEditor solves this by:

1. **Fitting a 3D mesh** to the body part (forearm, calf, shoulder, etc.)
2. **Projecting the tattoo photo** as a texture onto that mesh
3. Letting the user **sculpt** the mesh until the texture visually matches the real curvature
4. **Flattening** the curved mesh back to 2D (either via screenshot with camera flattening, or via ARAP UV unwrap)
5. **Post-processing** the result into a high-contrast black-and-white stencil

The result is a stencil where every line is the correct proportional length — edges that were foreshortened in the photo are stretched back to their true size.

---

## Architecture

```
MeshEditor/
  MeshEditor.tsx          ← Main component: Canvas, lights, export logic, ScreenshotHelper
  store.ts                ← Zustand global state (~50 fields, ~40 actions)
  types.ts                ← All TypeScript interfaces & type unions
  sculptEngine.ts         ← Pure math: applySculpt, laplacianSmooth, adjacency, distortion
  curveDeformer.ts        ← CatmullRom curve deform + hook/flap rigid rotation + flatten
  uvUnwrap.ts             ← ARAP UV parameterization + stencil post-processing pipeline
  bodyMeshes.ts           ← Anatomical mesh generators (forearm, calf, shoulder, etc.)
  index.ts                ← Re-export

  components/
    DeformableMesh.tsx    ← Interactive 3D mesh: geometry build, raycast, sculpt handlers
    MeshEditorToolbar.tsx ← Full toolbar UI: collapsible sections, sliders, tool buttons
    HookDeformerOverlay.tsx  ← Visual spheres + lines for hook control points
    CurveDeformerOverlay.tsx ← Visual spheres + lines for curve control points
    MeshOverlays.tsx      ← Distortion / stretch / depth / curvature color overlays
    SilhouetteOverlay.tsx ← Reference silhouette image overlay
```

### Tech Stack

| Library              | Role                                 |
| -------------------- | ------------------------------------ |
| `@react-three/fiber` | React renderer for Three.js          |
| `@react-three/drei`  | OrbitControls, camera helpers        |
| `three`              | WebGL 3D engine, geometry, materials |
| `zustand`            | Global state management              |

---

## Data Flow Overview

```
┌─────────────────┐
│  Upload Photo    │
└────────┬────────┘
         ▼
┌─────────────────┐     setImage() creates objectURL
│  Select Mesh     │     setMeshShape() → buildGeometry() → initVertexState()
│  Shape (e.g.     │     Copies position buffer into VertexState:
│  "forearm")      │       • original: Float32Array (rest positions)
└────────┬────────┘       • current:  Float32Array (deformed positions)
         ▼                 • pinned[], edgeLocked[], regionId[], seams
┌─────────────────┐
│  Sculpt to Match │     Raycaster → find closest vertex → applySculpt()
│  Real Curvature  │     modifies vs.current in-place → syncs to GPU
└────────┬────────┘
         ▼
┌─────────────────┐
│  (Optional)      │     Paint regions → Place hook points on hinge line
│  Hook/Flap to    │     → applyHookDeformation() rigid-rotates region flat
│  Uncurve Region  │     → optional flatten pass projects onto plane
└────────┬────────┘
         ▼
┌─────────────────┐
│  Export          │     Screenshot: auto-fit camera renders to square canvas
│  (Screenshot or  │     UV Unwrap:  ARAP parameterization → rasterize triangles
│   UV Unwrap)     │     Both → applyStencilPostProcessing() → base64 PNG
└─────────────────┘
```

---

## Mesh Shapes & Body Presets

The editor provides **4 geometric primitives** and **7 anatomical body presets**.

### Primitives

| Shape           | Geometry           | Dimensions         |
| --------------- | ------------------ | ------------------ |
| `cylinder`      | Full 360° cylinder | Radius 1, Height 3 |
| `half-cylinder` | 180° arc cylinder  | Radius 1, Height 3 |
| `sphere`        | Full sphere        | Radius 1.5         |
| `plane`         | Flat quad          | 3 × 3              |

### Body Presets

Body meshes are built using `THREE.LatheGeometry` with anatomically-inspired **radius profiles** — arrays of `[t, radius]` pairs that define how the cross-section radius varies from bottom to top.

| Shape       | Height | Profile Description                                        |
| ----------- | ------ | ---------------------------------------------------------- |
| `forearm`   | 3.5    | Tapered: wrist (0.42) → muscle belly (0.58) → elbow (0.50) |
| `upper-arm` | 3.2    | Elbow (0.48) → bicep peak (0.62) → shoulder cap (0.70)     |
| `calf`      | 3.8    | Ankle (0.38) → gastrocnemius bulge (0.55) → knee (0.46)    |
| `thigh`     | 4.0    | Gradual taper: knee (0.50) → hip (0.72)                    |
| `shoulder`  | —      | Hemisphere dome (55% of π), SphereGeometry-based           |
| `chest`     | —      | Barrel-curved plane (4×3) with cosine curvature            |
| `back`      | —      | Barrel curve + spine valley + shoulder-blade bumps         |

All body meshes support 5 **shape adjustment parameters**:

- **Width** (`radiusX`) — Scales the X radius of the cross-section
- **Depth** (`radiusY`) — Scales the Z radius (oval cross-sections)
- **Height** — Scales total mesh height
- **Taper** — Linearly reduces radius toward the top end
- **Flatness** — Compresses the negative-Z side (simulates the inner flat of a limb)

Base segment counts: 64 radial × 48 height for limbs, 48×48 or 48×64 for flat surfaces. All are multiplied by the **subdivision level** (1x–4x).

---

## Sculpt Tools

All sculpt tools work the same way at the pointer level:

1. **Raycast** the mouse position against the mesh → get hit point, face normal, closest vertex index
2. **Find all vertices** within the brush radius of the hit point
3. For each vertex, compute a **falloff weight**: `(1 - (dist/radius)²)^falloff × strength`
4. Skip **pinned** or **edge-locked** vertices, and vertices outside the active **region filter**
5. Apply the tool-specific displacement
6. If **symmetry** is enabled, find the mirror vertex across the chosen axis and apply a mirrored delta

### Grab

**Purpose**: Freely drag a patch of vertices in 3D space.

The grab tool computes a `delta` vector on each `pointerMove` event — the difference between the current hit point and the previous hit point. Each vertex within the brush radius is translated by `delta × weight`.

This is the primary tool for matching the mesh to the real curvature of a body part. Select a body preset, then grab vertices to pull them into alignment with the tattoo photo.

**Behavior**: Click-and-drag. Vertices move in the direction you drag.

### Push

**Purpose**: Displace vertices outward along the surface normal.

On each pointer event, vertices within the brush radius are moved along the **hit face normal** by `weight × 0.05`. This inflates the surface outward from the point of contact.

**Use case**: Adding localized volume — e.g. making a calf muscle bulge more prominent so the texture wraps correctly around it.

### Pull

**Purpose**: Displace vertices inward along the surface normal.

Identical to push but in the **opposite direction** — moves vertices against the hit normal by `weight × 0.05`.

**Use case**: Creating indentations — e.g. sculpting the hollow at the inner elbow or the dip between muscle groups.

### Smooth / Flatten

**Smooth**: Laplacian smoothing — each vertex moves toward the average of its neighbors. Uses double-buffered iteration to prevent drift. Controllable `strength` and `iterations` (2 per click, continuous on drag). An optional **live smoothing** mode runs a gentle pass (0.02 strength, 1 iteration) every frame.

**Flatten**: Projects vertices onto a plane defined by the hit point and hit normal. Vertices within the brush are interpolated toward this plane by `weight`. Useful for creating flat credential-card–like regions on an otherwise curved mesh.

### Warp / Bend / Twist

Three specialized deformation tools for advanced shaping:

- **Warp**: Like grab but at 0.1× scale — for fine positional adjustments
- **Bend**: Rotates vertices around the hit normal axis by an angle proportional to drag distance × weight. Creates arching deformations.
- **Twist**: Rotates vertices around the hit normal axis with angle **increasing with distance** from the hit center. Creates a twisting/wringing deformation.

### Pin & Edge Lock

**Pin**: Marks vertices as immovable. Pinned vertices are immune to all sculpt operations, smoothing, curve deformations, and hook rotations. Pin critical anchor points before performing large deformations to prevent unwanted drift.

**Unpin**: Removes the pin from vertices.

**Edge Lock**: Marks vertices as constrained (same immunity as pinned). Typically used for boundary vertices to prevent mesh edges from deforming.

---

## Region System

Regions are a **per-vertex coloring system** that partitions the mesh into up to 6 named zones (R0–R5). Each vertex stores a `regionId` in a shared `Int8Array` (-1 = unassigned).

### Painting Regions

With the **Region** tool selected:

- Click/drag on the mesh to paint the **active region ID** onto vertices within the brush radius
- Toggle **Erase mode** to reset vertices back to unassigned (-1)
- Each region is visually distinguished by a color (red, green, blue, yellow, cyan, magenta) rendered via vertex colors on a transparent overlay (45% opacity)

### Region Filtering

Once regions are painted, you can enable **"Restrict sculpt to region"** and select a region ID. All sculpt operations (grab, push, pull, smooth, etc.) will then **only affect vertices in that region**, leaving everything else untouched.

This is critical for the hook/flap workflow — you paint a region on the part of the mesh you want to "uncurve," then the flap deformer operates exclusively on that region.

### Auto-Split from Seams

Regions can also be **auto-generated** from painted seams using flood-fill (see [Seam System](#seam-system)).

---

## Seam System

Seams are **edge markers** that define cut lines on the mesh surface. With the **Seam** tool selected, painting over the mesh marks edges (pairs of vertices) as seams. Seams are stored as a `Set<string>` of edge keys (`"a-b"` where a < b).

Seams are visualized as **red line segments** rendered on top of the mesh (depth test disabled, so they're always visible).

### Auto-Split Regions

The **"Auto-Split Regions"** button triggers a **flood-fill** algorithm:

1. Builds vertex adjacency from the index buffer
2. BFS-traverses from each unvisited vertex, **stopping at seam edges**
3. Each connected component receives an incrementing region ID (0, 1, 2, ...)

This lets you draw a seam line across the mesh, hit auto-split, and instantly have two named regions separated by that line — ready for independent sculpting or hook/flap deformation.

---

## Curve Deformer

The curve deformer bends the mesh along a user-defined path.

### Placing Control Points

With the **Curve** tool active, click on the mesh to place control points. Each click adds a point at the 3D hit position. The overlay shows spheres at each point and lines connecting them.

### How It Works

1. **Rest axis**: A straight line from the first control point to the last
2. **CatmullRom spline**: A smooth curve interpolated through all control points (tension 0.5)
3. For each unpinned vertex within the `influenceRadius` of the rest axis:
   - Project the vertex onto the rest axis → parameter `t ∈ [0, 1]`
   - Measure perpendicular distance → compute smooth falloff: `1 - (dist/radius)²`
   - Sample the spline at `t` → get `splinePoint`
   - Displacement = `(splinePoint - axisPointAtT) × falloff`
4. Vertex is moved by that displacement

**Effect**: Vertices near the control-point path are bent to follow the spline curve. Vertices far away are unaffected. This is useful for matching the arch of a limb or adjusting overall mesh curvature before fine-tuning with sculpt tools.

A **direction** dropdown constrains the displacement to a single axis (±X, ±Y, ±Z) or leaves it unconstrained ("auto").

---

## Hook / Flap Deformer (Uncurve)

This is the **key tool for flattening curved tattoos**. It performs a rigid-body rotation of a region around a hinge line — conceptually "unfolding" a section of the mesh like opening the flap of a box.

### The Problem It Solves

A tattoo wraps around a forearm. In the photo, you can only see the side facing the camera — the edges that wrap around the sides are foreshortened and compressed. The hook/flap tool lets you:

1. Paint a region on the side of the mesh that wraps away from view
2. Define a hinge line at the boundary where the visible and hidden parts meet
3. Rotate that region flat, as if you peeled the skin off the arm and laid it flat

### Step-by-Step Workflow

1. **Paint a region** (e.g. R0) on the section of the mesh you want to flatten
2. Switch to the **Hook** tool
3. **Click two or more points** along the hinge line — this is the line the region will rotate around (typically along the boundary between the front-facing and side-facing parts of the mesh)
4. In the toolbar, click **"Activate Flap"**
5. Adjust the **Angle** slider (0–360°) to rotate the region around the hinge
6. Optionally enable **Flatten** to project the rotated vertices onto a flat plane

### How The Math Works

**`applyHookDeformation(vs, controlPoints, settings, regionFilter)`** in `curveDeformer.ts`:

1. **Hinge line**: Vector from the first hook point to the last
2. **Flap direction**: Either auto-computed (perpendicular to the hinge in the most logical direction) or user-specified via the Direction dropdown
3. **Rotation quaternion**: A single rotation around the hinge axis by `settings.angle` degrees
4. **For each vertex in the target region**:
   - Project the vertex onto the hinge line → find the closest pivot point on the hinge
   - Compute the offset vector from pivot to vertex
   - Rotate this offset by the quaternion
   - New position = pivot + rotated offset
5. **Flatten pass** (if enabled):
   - Compute the centroid of all affected vertices
   - Derive a plane normal from `hingeDirection × (hingeTocentroid)`
   - Project every affected vertex onto that plane

**Important**: This is a **rigid rotation** — every vertex rotates by the same angle. This preserves proportional distances. The tattoo region doesn't stretch or compress; it simply folds flat like a sheet of paper.

### Live Preview

Changing the angle, direction, or flatten toggle while the flap is active causes the deformation to **re-apply in real time** — the editor restores the pre-flap snapshot, then re-runs the deformation with the new settings.

---

## Screenshot Export Pipeline

The screenshot export mode renders the 3D scene to a 2D image, then processes it into a black-and-white stencil. This is the primary export path.

### Capture Phase

**`ScreenshotHelper.capture(crop?, outputSize?)`** in `MeshEditor.tsx`:

1. **Save current state**: Camera position, rotation, FOV, aspect ratio; renderer size and pixel ratio; scene background color; visibility of grid helpers and gizmos
2. **Set white background**: `scene.background = new Color("#ffffff")`
3. **Resize renderer** to a square `outputSize × outputSize` canvas at pixel ratio 1
4. **Set camera aspect to 1:1** (square viewport)
5. **Auto-fit camera to bounding box**:
   - Traverse the scene to find the mesh object
   - Compute its bounding box
   - Calculate the distance needed to fit the entire mesh in frame at the current FOV, with 20% padding margin
   - Move the camera along its current view direction to that distance, aimed at the bounding box center
6. **Render** the scene via `gl.render(scene, camera)`
7. **Copy** the WebGL canvas pixels to a new 2D canvas (the output)
8. **Restore** all saved state and re-render the normal interactive view

The result is a clean, square, white-background image of the mesh with the tattoo texture — no grid, no overlays, no handles.

### Stencil Post-Processing Pipeline

**`applyStencilPostProcessing(ctx, size, settings)`** in `uvUnwrap.ts`:

After capture, the color photograph is converted to a high-contrast black-and-white stencil through a **10-step image processing pipeline**:

#### Step 1 — Grayscale

Convert to luminance using standard perceptual weights:

```
gray = 0.299 × R + 0.587 × G + 0.114 × B
```

#### Step 2 — Box Blur (Smoothing)

Separable running-sum blur to eliminate pixel-level render noise. Radius scales with image size: `smoothing × size / 1024` (minimum 1 pixel). This prevents single-pixel artifacts from surviving the threshold step.

#### Step 3 — Contrast Adjustment

Standard contrast curve using the 259-based formula:

```
factor = (259 × (contrast × 255 + 255)) / (255 × (259 - contrast × 255))
pixel  = factor × (pixel - 128) + 128
```

Default contrast is 1.0 (slight enhancement). Pushes ink tones darker and skin tones lighter.

#### Step 4 — Unsharp Mask

Sharpens local contrast to make subtle ink-vs-skin boundaries more visible:

1. Create a double-blurred copy of the image (blur radius = `max(2, size/256)`)
2. For each pixel: `sharpened = original + amount × (original - blurred)` where `amount = 2.0`

This amplifies fine tattoo lines that might otherwise be lost during thresholding.

#### Step 5 — Edge Darken (Sobel)

If `edgeDetect` is enabled (default: on):

1. Run 3×3 Sobel kernels (horizontal and vertical gradient)
2. Compute edge magnitude: `sqrt(gx² + gy²)`
3. Scale by ×2.5 and **subtract** from the pixel value

This darkens pixels along edges — reinforcing tattoo outlines and line work so they survive the threshold step as solid black.

#### Step 6 — Multi-Scale Adaptive Threshold

This is the core "convert to black and white" step. Instead of a single global threshold, the system uses **three different window sizes** and unions the results:

1. **Auto-calibrate bias** from image statistics:
   - Compute image mean and standard deviation
   - `bias = max(1.5, stdDev × (0.08 + threshold/255 × 0.55))`
   - Low-contrast images (small stdDev) get a small bias → more sensitive detection
   - High-contrast images get a larger bias → avoids false positives on skin texture

2. **Three window scales** (each uses an integral image for O(1) per-pixel local mean):
   - **Fine** (`size/128`) — Catches hairline details and thin linework
   - **Medium** (`size/32`) — Standard adaptive window for normal stroke width
   - **Coarse** (`size/12`) — Captures broad shading and large filled areas

3. **Per scale**: If a pixel's value is below `localMean - bias`, it's classified as ink (black). Larger windows use a slightly higher bias multiplier to avoid noise.

4. **Union**: If **any** of the three scales marks a pixel as ink, the final result is black. This ensures both fine details and broad regions are captured.

#### Step 7 — Morphological Close

Dilate dark pixels (3×3 minimum), then erode (3×3 maximum). This connects small gaps in fine lines without significantly thickening strokes. Cleans up broken line segments from the threshold step.

#### Step 8 — Line Thickness Adjustment

If `lineThickness ≠ 1.0`:

- **> 1.0**: Multiple passes of morphological dilation (thickens all lines)
- **< 1.0**: Multiple passes of morphological erosion (thins all lines)

Default is 1.0 (no change).

#### Step 9 — Denoise (Median Filter)

A 3×3 median filter: sorts the 9 neighborhood values, picks the median. Applied for `denoiseIterations` passes (default 0). Removes salt-and-pepper noise without blurring edges.

#### Step 10 — Invert (Optional)

If `invert` is enabled: `pixel = 255 - pixel`. Flips black ↔ white. Useful if the target transfer method needs white ink on black background.

**Final**: All alpha values set to 255 (fully opaque). Result is exported as base64 PNG.

---

## UV Unwrap Export

An alternative export mode that uses mathematical UV parameterization instead of a camera screenshot.

### ARAP UV Parameterization

**`computeARAPUVs(geometry, iterations=8)`** implements As-Rigid-As-Possible parameterization:

1. **Initial guess**: Uses the mesh's existing UV coordinates
2. **Pre-computation**: For each triangle, computes cotangent edge weights and 3D edge vectors
3. **Iterative optimization** (8 rounds):
   - **Local step**: For each triangle, find the 2D rotation that best matches the 3D edge lengths. Uses the covariance matrix `S = Σ wᵢ × edge3D × edge2D^T` and extracts the rotation angle via `atan2`.
   - **Global step**: Weighted Jacobi iteration updates UV coordinates to minimize the energy `Σ w × |R × edge3D - edge2D|²`. Vertex 0 is pinned as an anchor.
4. **Normalize** UVs to [0,1] range, preserving aspect ratio
5. Computes per-triangle **distortion metric**: ratio of 2D vs 3D edge lengths, averaged deviation from 1.0

### Rasterization

**`unwrapMeshToStencil(geometry, texture, settings)`**:

1. Compute ARAP UVs
2. Create a white background canvas at `outputSize × outputSize`
3. For each triangle: clip to the triangle region, then use `drawAffineTriangle()` to map source texture triangle → destination ARAP UV triangle via a 2D affine transform (`ctx.setTransform()`)
4. Apply the same stencil post-processing pipeline as the screenshot export
5. Return base64 PNG + distortion statistics

The ARAP unwrap produces the most **proportionally accurate** result because it minimizes geometric distortion mathematically. However, the screenshot export is faster and often sufficient for most tattoo stencil work.

---

## Undo / Redo & Snapshots

### Undo Stack

Every sculpt operation, curve deformation, and hook/flap activation pushes a snapshot of the current vertex positions (plus pinned/edgeLocked arrays) onto the undo stack. Maximum depth: **50 entries**. Redo is populated when you undo.

### Mesh Snapshots

Named snapshots with timestamps. Save the current mesh state at any point and compare between saved snapshots. Useful for A/B testing different sculpting approaches.

### Reset

Restores all vertex positions to the original geometry (as built by `buildGeometry()`), clears all pins and edge locks.

---

## File Reference

| File                       | Purpose                                                                                                                                                   |
| -------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `MeshEditor.tsx`           | Canvas composition, lighting, ScreenshotHelper capture logic, export orchestration, crop rectangle, depth map upload                                      |
| `store.ts`                 | Zustand store: all state, defaults, actions (setImage, initVertexState, pushUndo, applyCurveDeform, toggleFlap, etc.)                                     |
| `types.ts`                 | Type definitions: MeshShape, SculptTool, VertexState, BrushSettings, HookSettings, StencilSettings, etc.                                                  |
| `sculptEngine.ts`          | Pure functions: applySculpt (per-tool displacement), laplacianSmooth, buildAdjacency, applyDepthDisplacement, aiAutoFix, distortion/curvature computation |
| `curveDeformer.ts`         | applyCurveDeformation (CatmullRom spline bending), applyHookDeformation (rigid rotation + flatten), floodFillRegions                                      |
| `uvUnwrap.ts`              | computeARAPUVs, unwrapMeshToStencil, applyStencilPostProcessing (the 10-step pipeline), screenshotToStencil                                               |
| `bodyMeshes.ts`            | buildBodyMesh: anatomical LatheGeometry builders with radius profiles, shape param support                                                                |
| `DeformableMesh.tsx`       | Geometry building, raycast hit detection, pointer event handlers for all 15 tools, region/seam painting, vertex color sync                                |
| `MeshEditorToolbar.tsx`    | Full UI: collapsible sections, tool buttons, sliders, region controls, stencil settings, export button                                                    |
| `HookDeformerOverlay.tsx`  | Visual overlay: spheres at hook control points, connecting lines                                                                                          |
| `CurveDeformerOverlay.tsx` | Visual overlay: spheres at curve control points, connecting lines                                                                                         |
| `MeshOverlays.tsx`         | Distortion / stretch / depth / curvature / pins color overlay rendering                                                                                   |
| `SilhouetteOverlay.tsx`    | Reference silhouette image overlay on the mesh                                                                                                            |
