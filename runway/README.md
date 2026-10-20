# Taal — Bhangra feedback demo

Phone-friendly web MVP for side-by-side coach vs student dance feedback (working title was **Runway**). Pose runs in-browser with MediaPipe; footage stays client-side.

## Quick start

```bash
cd runway
npm install
npm run dev
```

Open the printed local URL (use the network URL on a phone).

## Deploy (Vercel)

From repo root, set **Root Directory** to `runway`, or:

```bash
cd runway
npx vercel --prod
```

Build command: `npm run build` · Output: `dist`

## Demo flow

1. **Try sample Bhangra routine** — synthetic poses + sample clips (no upload).
2. Or upload coach + student videos of the same routine → on-device MediaPipe Pose.
3. Side-by-side playback with skeleton overlays, beat markers, section scores, ~3 weak moments.
4. **Practice** — slowed + mirrored loops of a weak segment.
5. **Feedback** after practice (not live).

## Real vs simplified

| Piece | Status |
| --- | --- |
| Pose overlay | **Real** MediaPipe Pose Landmarker on uploads; **synthetic** tracks for sample demo |
| Section / weak scores | Lightweight landmark distance (not production DTW) |
| Beat sync | Visual markers + small offset pill (mocked alignment) |
| Practice loops | Real playback rate + CSS mirror + segment loop |
| Accounts / social / AI choreography | Out of scope |

## Stack

Vite + React + TypeScript + `@mediapipe/tasks-vision`
