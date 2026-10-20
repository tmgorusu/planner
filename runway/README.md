# Taal — dance feedback demo

Phone-friendly web MVP: coach vs you pose comparison, focus-beat challenges, on-device MediaPipe. (Working title was **Runway**.)

## Quick start

```bash
cd runway
npm install
npm run dev
```

## Deploy (Vercel)

Root Directory = `runway`, or:

```bash
cd runway
npx vercel --prod
```

## Demo flow

1. **Try sample: Mahal step** — keyframed Mahal coach/student poses (readable arm-pump + bounce), not abstract noise.
2. Or upload any-style coach + student videos → MediaPipe Pose on-device.
3. Side-by-side overlays, beat timeline, section scores, XP / streak / levels (session-only).
4. Practice: slowed + mirrored loops of focus beats → feedback after drill.

## Real vs simplified

| Piece | Status |
| --- | --- |
| Upload pose | **Real** MediaPipe Pose Landmarker |
| Mahal sample | **Keyframed** landmarks (not filmed dancers) |
| Scores | Lightweight landmark distance |
| Beat sync | Visual markers + offset pill |
| XP / streak / level | Session `sessionStorage` only — no accounts |

## Stack

Vite + React + TypeScript + `@mediapipe/tasks-vision`
