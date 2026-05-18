# SmashIt

SmashIt is a React and Vite badminton biomechanics workspace with a simulated IMU pipeline, stroke analysis dashboards, a history view, calibration controls, and an AI coach backed by a small Express proxy server.

The frontend stays focused on presentation and analysis. OpenRouter credentials are kept on the server side only and are never placed in the browser bundle.

## Features

- Stroke simulator with a motion preview, sensor signals, and biomechanical scoring
- Dashboard with recent sessions and quick performance summaries
- Session history with comparisons and exports
- Calibration and backend health checks
- AI coach chat that streams responses through the local backend proxy

## Tech Stack

- React 18
- Vite
- Express
- Recharts
- Tailwind CSS tooling

## Project Structure

- `src/` contains the React UI
- `src/pages/` contains the separate page views
- `src/components/` contains reusable UI pieces
- `src/context/` contains shared application state
- `src/data/` contains simulated badminton and IMU logic
- `server/` contains the Express proxy for OpenRouter

## Setup

### Prerequisites

- Node.js 18 or newer
- npm

### Install dependencies

```bash
npm install
```

### Configure environment variables

Copy `.env.example` to `.env` and fill in your OpenRouter key:

```bash
OPENROUTER_API_KEY=your_openrouter_api_key_here
PORT=3001
VITE_API_BASE_URL=http://localhost:3001
```

The `.env` file is ignored by Git and should stay local.

### Start development

Run both the frontend and backend together:

```bash
npm run dev
```

This starts:

- Vite on the frontend
- Express on port `3001` for the AI coach proxy and health checks

## Scripts

- `npm run dev` starts the client and server together
- `npm run dev:client` starts only the Vite frontend
- `npm run dev:server` starts only the Express backend
- `npm run build` creates a production build
- `npm run preview` previews the production build locally
- `npm run start` starts the backend server only

## Backend Routes

- `GET /api/health` checks whether the server is running and whether OpenRouter is configured
- `POST /api/test-openrouter` sends a small OpenRouter test request
- `POST /api/coach` streams AI coaching responses from OpenRouter

## Notes

- The simulation data is synthetic and intended for product demo and workflow testing
- The motion preview is an SVG-based badminton player animation, not a physics engine
- If you change the backend port, update `VITE_API_BASE_URL` in `.env`

## Build

To produce a production build:

```bash
npm run build
```

Then preview it with:

```bash
npm run preview
```
