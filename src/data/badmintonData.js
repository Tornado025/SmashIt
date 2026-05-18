export const STROKES = [
  { id: 'Overhead Smash', short: 'Smash', baseFreq: 8.4 },
  { id: 'Backhand Clear', short: 'Clear', baseFreq: 6.0 },
  { id: 'Net Drop Shot', short: 'Drop', baseFreq: 4.0 },
  { id: 'Forehand Drive', short: 'Drive', baseFreq: 7.1 },
  { id: 'Jump Smash', short: 'Jump', baseFreq: 9.2 }
]

export const BASELINE_PROFILES = [
  { id: 'Lin Dan style', label: 'Lin Dan style', curvature: 1.18, timingBias: 0.88, snapBias: 1.12 },
  { id: 'Kento Momota style', label: 'Kento Momota style', curvature: 0.96, timingBias: 1.14, snapBias: 0.95 },
  { id: 'Generic Elite', label: 'Generic Elite', curvature: 1.0, timingBias: 1.0, snapBias: 1.0 }
]

export const DEFAULT_SETTINGS = {
  samplingRate: 100,
  filterCutoff: 40,
  noiseFloor: 0.18,
  dtwWindow: 24,
  baselineProfile: 'Lin Dan style'
}

export const STROKE_DTW_PARAMS = {
  'Overhead Smash': ['Wrist snap velocity', 'Racket face angle', 'Forearm pronation timing', 'Follow-through arc'],
  'Backhand Clear': ['Elbow extension speed', 'Forearm pronation depth', 'Wrist release timing', 'Contact point consistency'],
  'Net Drop Shot': ['Deceleration control', 'Wrist disguise angle', 'Finger tension', 'Touch gentleness'],
  'Forehand Drive': ['Racket path compactness', 'Contact height', 'Shoulder rotation', 'Transition speed'],
  'Jump Smash': ['Jump timing', 'Landing balance', 'Hip rotation', 'Racket acceleration']
}

export function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value))
}

export function lerp(a, b, t) {
  return a + (b - a) * t
}

export function buildPlayerAxes(skill, mode) {
  const modeBoost = mode === 'Pro' ? 1.08 : 0.94
  const base = {
    wristSnap: 54,
    timing: 58,
    power: 56,
    consistency: 57,
    followThrough: 55,
    footwork: 53
  }

  return Object.fromEntries(Object.entries(base).map(([key, value], index) => {
    const spread = [1.08, 0.97, 1.12, 1.0, 0.93, 1.05][index]
    return [key, clamp(Math.round(value * modeBoost + skill * 0.34 * spread), 0, 100)]
  }))
}

export function buildPlayerProfile(skill, mode, stroke) {
  return {
    name: 'Court Player',
    mode,
    skill,
    currentStroke: stroke,
    axes: buildPlayerAxes(skill, mode)
  }
}

export function getProfileShape(profileName) {
  return BASELINE_PROFILES.find(item => item.id === profileName) || BASELINE_PROFILES[2]
}

export function generateStrokeFrames(stroke, skill) {
  const profile = STROKES.find(item => item.id === stroke) || STROKES[0]
  const total = 120
  const frames = []

  for (let index = 0; index < total; index += 1) {
    const t = index / (total - 1)
    const smooth = Math.sin(t * Math.PI)
    const impact = Math.exp(-Math.pow((t - 0.72) / 0.1, 2))
    const skillFactor = skill / 100
    const swing = profile.baseFreq / 10
    let shoulder = -12 + smooth * -42 * skillFactor
    let elbow = 18 + smooth * -34 * skillFactor
    let wristSnap = -8 + Math.pow(smooth, 3) * 96 * skillFactor

    if (stroke === 'Overhead Smash' || stroke === 'Jump Smash') {
      shoulder = -14 + Math.sin(t * Math.PI) * -84 * skillFactor
      elbow = 20 + Math.sin(Math.pow(t, 1.7) * Math.PI) * -52 * skillFactor
      wristSnap = -10 + Math.pow(smooth, 3.4) * 126 * skillFactor
    } else if (stroke === 'Backhand Clear') {
      shoulder = -10 + Math.sin(t * Math.PI) * -48 * skillFactor
      elbow = 20 + Math.sin(t * Math.PI) * -38 * skillFactor
      wristSnap = -6 + Math.sin(t * Math.PI * 0.96) * 72 * skillFactor
    } else if (stroke === 'Net Drop Shot') {
      shoulder = -8 + Math.sin(t * Math.PI) * -18 * skillFactor
      elbow = 12 + Math.sin(t * Math.PI) * -14 * skillFactor
      wristSnap = -4 + Math.sin(t * Math.PI * 1.9) * 26 * skillFactor
    } else if (stroke === 'Forehand Drive') {
      shoulder = -9 + Math.sin(t * Math.PI) * -28 * skillFactor
      elbow = 16 + Math.sin(t * Math.PI) * -24 * skillFactor
      wristSnap = -6 + Math.sin(t * Math.PI * 1.5) * 52 * skillFactor
    }

    const faultScore = clamp(0.1 + (1 - skillFactor) * 0.75 + impact * 0.2 + Math.abs(Math.sin((t + swing) * 4.1)) * 0.05, 0, 1)
    frames.push({ shoulder, elbow, wristSnap, faultScore })
  }

  return frames
}

export function generateIMUSignal(stroke, skill, n = 600, settings = DEFAULT_SETTINGS, baselineProfile = DEFAULT_SETTINGS.baselineProfile) {
  const profile = STROKES.find(item => item.id === stroke) || STROKES[0]
  const elite = getProfileShape(baselineProfile)
  const sampleRate = settings.samplingRate || 100
  const dt = 1 / sampleRate
  const impactFrame = clamp(150 + Math.floor(Math.random() * 51), 30, n - 30)
  const baseNoise = settings.noiseFloor + (1 - skill / 100) * 0.34
  const alpha = clamp((2 * Math.PI * settings.filterCutoff * dt) / (1 + 2 * Math.PI * settings.filterCutoff * dt), 0.06, 0.86)
  const wristRaw = []
  const accRaw = []
  const dtwData = []
  const filteredWrist = []
  const filteredAcc = []
  let prevGx = 0
  let prevGy = 0
  let prevGz = 0
  let prevAx = 0
  let prevAy = 0
  let prevDtw = 0.16

  for (let index = 0; index < n; index += 1) {
    const time = index * dt
    const normalized = index / Math.max(1, n - 1)
    const envelope = Math.sin(Math.PI * normalized)
    const baseline = elite.curvature * Math.sin(normalized * Math.PI * 2.1 + elite.timingBias * 0.4)
    const secondary = Math.sin(normalized * Math.PI * profile.baseFreq * elite.snapBias)
    const noise = (Math.random() * 2 - 1) * baseNoise
    const impactLift = Math.exp(-Math.pow((index - impactFrame) / 10, 2))
    const skillFactor = skill / 100
    const rawGx = (baseline * 58 + secondary * 22 + impactLift * 95) * skillFactor + noise * 28
    const rawGy = (Math.cos(normalized * Math.PI * 3.2) * 46 + Math.sin(normalized * Math.PI * 1.3) * 18 + impactLift * 75) * skillFactor + noise * 22
    const rawGz = (Math.sin(normalized * Math.PI * 4.3) * 35 + envelope * 32 + impactLift * 55) * skillFactor + noise * 18
    const rawAx = (Math.sin(normalized * Math.PI * 3.4) * 5.4 + impactLift * 13.5 + noise * 4.2) * (0.65 + skillFactor * 0.5)
    const rawAy = (Math.cos(normalized * Math.PI * 2.7) * 4.4 + impactLift * 9.8 + noise * 3.6) * (0.6 + skillFactor * 0.45)

    prevGx += alpha * (rawGx - prevGx)
    prevGy += alpha * (rawGy - prevGy)
    prevGz += alpha * (rawGz - prevGz)
    prevAx += alpha * (rawAx - prevAx)
    prevAy += alpha * (rawAy - prevAy)

    const filteredImpact = clamp(Math.abs(prevAx) / 18 + Math.abs(prevAy) / 18 + impactLift * 0.25, 0, 1)
    const rawDistance = clamp(0.08 + (1 - skillFactor) * 0.58 + Math.abs(rawGx - prevGx) / 150 + Math.abs(rawAx) / 22, 0.02, 1)
    prevDtw = lerp(prevDtw, rawDistance, 0.18)

    wristRaw.push({ t: index, time, gx: rawGx, gy: rawGy, gz: rawGz, fault: filteredImpact })
    filteredWrist.push({ t: index, time, gx: prevGx, gy: prevGy, gz: prevGz, fault: filteredImpact })
    accRaw.push({ t: index, time, ax: rawAx, ay: rawAy, filteredAx: prevAx, filteredAy: prevAy, impact: impactLift })
    filteredAcc.push({ t: index, time, ax: prevAx, ay: prevAy, impact: impactLift })
    dtwData.push({ t: index, time, distance: clamp(prevDtw + impactLift * 0.2, 0, 1) })
  }

  return { sampleRate, duration: n / sampleRate, impactFrame, wristRaw, wristFiltered: filteredWrist, accRaw, accFiltered: filteredAcc, dtwData }
}

export function detectFaults(stroke, skill, dtwData, settings) {
  const faultNames = STROKE_DTW_PARAMS[stroke] || STROKE_DTW_PARAMS['Overhead Smash']
  return faultNames.slice(0, 4).map((name, index) => {
    const sample = dtwData[Math.min(dtwData.length - 1, Math.round((index + 1) * dtwData.length / 5))] || dtwData[dtwData.length - 1]
    const windowBoost = clamp(0.08 + settings.dtwWindow / 60, 0.1, 0.95)
    const score = clamp((sample?.distance || 0.2) * (0.9 + index * 0.08) + (1 - skill / 100) * 0.18 + windowBoost * 0.05, 0, 1)
    return { name, score, status: score < 0.33 ? 'OK' : score < 0.66 ? 'Minor Fault' : 'Fault Detected' }
  })
}

export function deriveBiomechanicsScores(playerProfile, faults) {
  const axes = playerProfile.axes
  const faultPenalty = clamp(faults.reduce((acc, fault) => acc + fault.score, 0) / Math.max(1, faults.length), 0, 1)
  return {
    technique: clamp(Math.round((axes.wristSnap * 0.42 + axes.followThrough * 0.34 + axes.consistency * 0.24) - faultPenalty * 18), 0, 100),
    timing: clamp(Math.round((axes.timing * 0.54 + axes.footwork * 0.22 + axes.consistency * 0.24) - faultPenalty * 16), 0, 100),
    power: clamp(Math.round((axes.power * 0.56 + axes.wristSnap * 0.22 + axes.footwork * 0.22) - faultPenalty * 14), 0, 100)
  }
}

export function buildClassifier(stroke, skill, dtwData) {
  const top = [stroke, ...STROKES.map(item => item.id).filter(name => name !== stroke)].slice(0, 3)
  const confidence = clamp(Math.round(skill * 0.72 + 22), 35, 99)
  const matrix = top.map((rowStroke, rowIndex) => top.map((colStroke, colIndex) => {
    const bias = rowStroke === stroke ? 0.58 : 0.2
    const closeness = 1 - Math.abs(rowIndex - colIndex) * 0.22
    return clamp(Math.round(100 * (bias * closeness + (rowStroke === colStroke ? 0.22 : 0.04))), 4, 96)
  }))

  return {
    label: stroke,
    confidence,
    top,
    matrix,
    divergence: clamp(dtwData[dtwData.length - 1]?.distance || 0.2, 0, 1)
  }
}

export function buildSimulationBundle({ stroke, skill, mode, settings }) {
  const effectiveSkill = mode === 'Pro' ? 95 : skill
  const playerProfile = buildPlayerProfile(effectiveSkill, mode, stroke)
  const frames = generateStrokeFrames(stroke, effectiveSkill)
  const signal = generateIMUSignal(stroke, effectiveSkill, settings.samplingRate * 6, settings, settings.baselineProfile)
  const faults = detectFaults(stroke, effectiveSkill, signal.dtwData, settings)
  const biomechanics = deriveBiomechanicsScores(playerProfile, faults)
  const classifier = buildClassifier(stroke, effectiveSkill, signal.dtwData)
  const score = clamp(Math.round((biomechanics.technique * 0.39 + biomechanics.timing * 0.33 + biomechanics.power * 0.28) - faults.reduce((acc, fault) => acc + fault.score * 11, 0)), 0, 100)
  const faultRate = clamp(Math.round(faults.reduce((acc, fault) => acc + fault.score, 0) / faults.length * 100), 0, 100)

  const session = {
    id: `${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
    date: new Date().toISOString().slice(0, 10),
    stroke,
    skill: effectiveSkill,
    score,
    faults: faults.length,
    trend: score >= 80 ? 'up' : score >= 65 ? 'flat' : 'down',
    dtwData: signal.dtwData,
    faultDetails: faults,
    summary: `${stroke}: ${faults[0]?.status || 'stable'} mechanics with a ${faultRate}% fault rate.`,
    biomechanics,
    classifier,
    settingsSnapshot: settings,
    playerProfile
  }

  return { playerProfile, frames, signal, faults, biomechanics, classifier, score, faultRate, session }
}

export function seedSessions() {
  const demo = [
    { stroke: 'Overhead Smash', skill: 92, score: 88, faults: 2, dtw: 0.24 },
    { stroke: 'Backhand Clear', skill: 76, score: 71, faults: 4, dtw: 0.42 },
    { stroke: 'Net Drop Shot', skill: 64, score: 66, faults: 3, dtw: 0.38 },
    { stroke: 'Forehand Drive', skill: 84, score: 79, faults: 2, dtw: 0.31 }
  ]

  return demo.map((item, index) => {
    const dtwData = Array.from({ length: 24 }, (_, timelineIndex) => ({
      t: timelineIndex,
      distance: clamp(item.dtw + Math.sin(timelineIndex / 4 + index) * 0.08 + timelineIndex * 0.003, 0.04, 0.95)
    }))

    return {
      id: `seed-${index + 1}`,
      date: new Date(Date.now() - index * 86400000 * 2).toISOString().slice(0, 10),
      stroke: item.stroke,
      skill: item.skill,
      score: item.score,
      faults: item.faults,
      trend: index % 2 === 0 ? 'up' : 'down',
      dtwData,
      faultDetails: [
        { name: 'Wrist snap velocity', score: 0.22, status: 'OK' },
        { name: 'Follow-through arc', score: 0.51, status: 'Minor Fault' }
      ],
      summary: `Seed session for ${item.stroke.toLowerCase()} with balanced control and a few late-contact faults.`
    }
  })
}
