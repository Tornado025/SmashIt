# SmashIt — Badminton Biomechanics Demo

SmashIt demonstrates how low-cost IMU sensors can detect micro-movement errors
in badminton strokes. Because no physical hardware is required for this demo,
a virtual IMU generates realistic gyroscope and accelerometer signals in software.

## How it works
1. You choose a stroke type and a skill level in the Simulator.
2. A virtual IMU signal is synthesised using real signal parameters (sampling rate, filter cutoff, noise floor).
3. Dynamic Time Warping (DTW) compares the stroke against an elite player reference profile.
4. Faults are labelled and scored. An AI coach explains corrections.

## Running locally
```bash
npm install
npm run dev        # frontend on :5173
node server/index.js  # backend proxy on :3001
```

Set OPENROUTER_API_KEY in the server environment to enable the AI coach.
