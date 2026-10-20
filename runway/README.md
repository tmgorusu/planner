# Taal

Compare coach and student dance video. Pose runs on-device (MediaPipe).

## Run

```bash
cd runway
npm install
npm run dev
```

## Deploy

Root Directory = `runway`, or `cd runway && npx vercel --prod`.

## Flow

1. **Open Mahal sample** — keyframed Mahal poses, or upload any-style videos.
2. Side-by-side overlay → Match score → Weak spots.
3. **Practice** — slow + mirror loop → result with XP (session only).

## Real vs simplified

| Piece | Status |
| --- | --- |
| Upload pose | MediaPipe Pose Landmarker |
| Mahal sample | Keyframed landmarks |
| Scores / sync | Lightweight / visual |
| XP / streak / level | `sessionStorage` only |
