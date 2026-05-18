import React, { useEffect, useMemo, useRef, useState } from 'react'
import {
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts'
import { useApp } from '../context/AppContext'
import { Badge, DarkTooltip, EmptyState, Panel } from '../components/UI'
import { STROKES, buildPlayerProfile, buildSimulationBundle } from '../data/badmintonData'

export default function StrokeSimulatorPage({ onJumpToCoach }) {
  const { state, dispatch } = useApp()
  const [stroke, setStroke] = useState(state.playerProfile.currentStroke)
  const [skill, setSkill] = useState(state.playerProfile.skill)
  const [mode, setMode] = useState(state.playerProfile.mode)
  const [frames, setFrames] = useState([])
  const [playhead, setPlayhead] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [frameIndex, setFrameIndex] = useState(0)
  const timerRef = useRef(null)

  const effectiveSkill = mode === 'Pro' ? 95 : skill
  const simulation = state.simResult

  useEffect(() => {
    dispatch({ type: 'SET_PLAYER_PROFILE', payload: buildPlayerProfile(effectiveSkill, mode, stroke) })
  }, [dispatch, effectiveSkill, mode, stroke])

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        window.clearInterval(timerRef.current)
      }
    }
  }, [])

  useEffect(() => {
    if (!playing || !frames.length) return undefined

    timerRef.current = window.setInterval(() => {
      setPlayhead(current => {
        const next = current + 2
        const nextFrame = Math.min(frames.length - 1, Math.floor(next / 2))
        setFrameIndex(nextFrame)
        if (next >= frames.length - 1) {
          setPlaying(false)
          window.clearInterval(timerRef.current)
        }
        return next
      })
    }, 25)

    return () => window.clearInterval(timerRef.current)
  }, [frames, playing])

  const visibleWrist = simulation ? simulation.signal.wristFiltered.slice(0, Math.max(12, Math.min(playhead, simulation.signal.wristFiltered.length))) : []
  const visibleAcc = simulation ? simulation.signal.accRaw.slice(0, Math.max(12, Math.min(playhead, simulation.signal.accRaw.length))) : []
  const visibleDtw = simulation ? simulation.signal.dtwData.slice(0, Math.max(12, Math.min(playhead, simulation.signal.dtwData.length))) : []
  const currentFrame = frames[frameIndex] || { shoulder: -12, elbow: 16, wristSnap: -8, faultScore: 0.18 }

  const shuttlePoint = useMemo(() => {
    const progress = Math.min(1, frames.length ? playhead / Math.max(1, frames.length - 1) : 0)
    const x = 110 + progress * 310
    const y = 250 - Math.sin(progress * Math.PI) * 70 - progress * 110
    return { x, y }
  }, [frames.length, playhead])

  function wristColor(score) {
    if (score < 0.33) return 'rgba(16,185,129,0.95)'
    if (score < 0.66) return 'rgba(245,158,11,0.95)'
    return 'rgba(248,113,113,0.95)'
  }

  function setPlayerMode(nextMode) {
    setMode(nextMode)
    setSkill(nextMode === 'Pro' ? 95 : 68)
  }

  function runSimulation() {
    const bundle = buildSimulationBundle({
      stroke,
      skill,
      mode,
      settings: state.settings
    })

    dispatch({ type: 'SET_PLAYER_PROFILE', payload: bundle.playerProfile })
    dispatch({ type: 'SET_SIM_RESULT', payload: bundle })
    dispatch({ type: 'ADD_SESSION', payload: bundle.session })
    setFrames(bundle.frames)
    setPlayhead(0)
    setFrameIndex(0)
    setPlaying(true)
  }

  function replay() {
    if (!frames.length) return
    setPlayhead(0)
    setFrameIndex(0)
    setPlaying(true)
  }

  const activeStroke = STROKES.find(item => item.id === stroke) || STROKES[0]

  return (
    <div className="grid gap-4 xl:grid-cols-[0.96fr_1.04fr]">
      <section className="space-y-4">
        <Panel title="Stroke controls" subtitle="Pick a stroke, adjust skill, then simulate">
          <div className="grid gap-3 md:grid-cols-2">
            {STROKES.map(item => (
              <button
                key={item.id}
                onClick={() => setStroke(item.id)}
                className={`rounded-2xl border p-4 text-left transition ${stroke === item.id ? 'border-[color:var(--brand)] bg-white/[0.08]' : 'border-slate-200/10 bg-white/5 hover:bg-white/[0.08]'}`}
              >
                <div className="text-sm font-medium text-white">{item.id}</div>
                <div className="mt-1 text-xs uppercase tracking-[0.2em] text-slate-500">{item.short}</div>
              </button>
            ))}
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-[1fr_auto] md:items-end">
            <label className="block">
              <div className="flex items-center justify-between text-sm text-slate-300">
                <span>Skill level</span>
                <span>{skill}</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={skill}
                onChange={event => setSkill(Number(event.target.value))}
                className="mt-2 w-full accent-[color:var(--brand)]"
              />
            </label>

            <div className="inline-flex rounded-full border border-slate-200/10 bg-white/5 p-1">
              <button className={`rounded-full px-3 py-2 text-sm ${mode === 'Amateur' ? 'bg-white/10 text-white' : 'text-slate-400'}`} onClick={() => setPlayerMode('Amateur')}>
                Amateur
              </button>
              <button className={`rounded-full px-3 py-2 text-sm ${mode === 'Pro' ? 'bg-white/10 text-white' : 'text-slate-400'}`} onClick={() => setPlayerMode('Pro')}>
                Pro
              </button>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-3">
            <button className="rounded-xl bg-[color:var(--brand)] px-4 py-2 text-sm font-medium text-slate-950 transition hover:opacity-90" onClick={runSimulation}>
              Simulate &amp; Analyse
            </button>
            <button className="rounded-xl border border-slate-200/10 bg-white/5 px-4 py-2 text-sm text-slate-100 transition hover:bg-white/[0.08]" onClick={replay} disabled={!frames.length}>
              Replay
            </button>
            <button className="rounded-xl border border-slate-200/10 bg-white/5 px-4 py-2 text-sm text-slate-100 transition hover:bg-white/[0.08]" onClick={onJumpToCoach} disabled={!simulation}>
              Open coach
            </button>
          </div>
        </Panel>

        <Panel title="Motion preview" subtitle={`${activeStroke.id} motion with player silhouette and racquet`}>
          <div className="rounded-2xl border border-slate-200/10 bg-[#0c1117] p-4">
            <svg viewBox="0 0 640 360" className="h-[300px] w-full">
              <defs>
                <linearGradient id="playerFill" x1="0" x2="1">
                  <stop offset="0%" stopColor="#f8fafc" stopOpacity="0.98" />
                  <stop offset="100%" stopColor="#cbd5e1" stopOpacity="0.92" />
                </linearGradient>
              </defs>
              <rect width="640" height="360" fill="#0c1117" />
              <path d="M44 278 H596" stroke="rgba(148,163,184,0.26)" strokeWidth="2" />
              <path d="M58 268 H272" stroke="rgba(255,255,255,0.08)" strokeWidth="1.5" />
              <path d="M312 268 H586" stroke="rgba(255,255,255,0.08)" strokeWidth="1.5" />
              <path d="M68 120 L596 120" stroke="rgba(255,255,255,0.05)" strokeWidth="1" strokeDasharray="4 8" />

              {activeStroke.id === 'Overhead Smash' || activeStroke.id === 'Jump Smash' ? (
                <path d="M252 214 C310 168, 352 140, 408 108 S510 68, 554 46" stroke="rgba(0,229,160,0.35)" strokeWidth="2" fill="none" strokeDasharray="6 8" />
              ) : null}

              {activeStroke.id === 'Overhead Smash' || activeStroke.id === 'Jump Smash' ? (
                <circle cx={shuttlePoint.x} cy={shuttlePoint.y} r="6" fill="#f8fafc" stroke="rgba(0,229,160,0.55)" strokeWidth="4" />
              ) : null}

              <ellipse cx="258" cy="286" rx="96" ry="14" fill="rgba(0,0,0,0.22)" />

              <g transform="translate(236,78)">
                <g transform={`translate(0, ${activeStroke.id === 'Jump Smash' ? -10 : 0})`}>
                  <circle cx="74" cy="26" r="18" fill="url(#playerFill)" />
                  <path d="M74 44 C72 58, 72 70, 74 82" stroke="url(#playerFill)" strokeWidth="9" strokeLinecap="round" fill="none" />

                  <g transform={`translate(74,82) rotate(${currentFrame.shoulder * 0.16})`}>
                    <path d="M0 0 C18 8, 30 12, 46 14" stroke="url(#playerFill)" strokeWidth="9" strokeLinecap="round" fill="none" />
                    <g transform={`translate(46,14) rotate(${currentFrame.elbow * 0.55 - 22})`}>
                      <path d="M0 0 C18 2, 30 -2, 44 -8" stroke="url(#playerFill)" strokeWidth="8" strokeLinecap="round" fill="none" />
                      <g transform={`translate(44,-8) rotate(${currentFrame.wristSnap * 0.55 + 18})`}>
                        <path d="M0 0 C18 -4, 32 -10, 48 -18" stroke="url(#playerFill)" strokeWidth="6" strokeLinecap="round" fill="none" />
                        <path d="M46 -16 L82 -30" stroke="rgba(255,255,255,0.88)" strokeWidth="4" strokeLinecap="round" />
                        <ellipse cx="92" cy="-34" rx="11" ry="7" fill="none" stroke="rgba(255,255,255,0.95)" strokeWidth="4" />
                        <path d="M102 -36 L124 -48" stroke="rgba(255,255,255,0.75)" strokeWidth="4" strokeLinecap="round" />
                        <path d="M100 -30 L126 -30" stroke="rgba(255,255,255,0.75)" strokeWidth="4" strokeLinecap="round" />
                        <circle cx="0" cy="0" r="6" fill={wristColor(currentFrame.faultScore)} />
                      </g>
                    </g>

                    <path d="M0 0 C-12 22, -18 52, -16 84" stroke="url(#playerFill)" strokeWidth="8" strokeLinecap="round" fill="none" />
                    <path d="M0 0 C-10 18, -24 38, -46 48" stroke="url(#playerFill)" strokeWidth="8" strokeLinecap="round" fill="none" />
                  </g>

                  <g transform={`translate(74,82) rotate(${currentFrame.shoulder * 0.06})`}>
                    <path d="M0 0 C-22 18, -34 42, -38 74" stroke="url(#playerFill)" strokeWidth="8" strokeLinecap="round" fill="none" opacity="0.95" />
                  </g>

                  <g transform={`translate(74,164) rotate(${currentFrame.shoulder * 0.05})`}>
                    <path d="M0 0 C-18 20, -28 44, -28 74" stroke="url(#playerFill)" strokeWidth="8" strokeLinecap="round" fill="none" />
                    <path d="M0 0 C8 20, 18 44, 28 74" stroke="url(#playerFill)" strokeWidth="8" strokeLinecap="round" fill="none" />
                  </g>

                  <path d="M74 160 C62 192, 54 224, 54 260" stroke="url(#playerFill)" strokeWidth="8" strokeLinecap="round" fill="none" />
                  <path d="M74 160 C92 196, 108 228, 120 258" stroke="url(#playerFill)" strokeWidth="8" strokeLinecap="round" fill="none" />

                  <circle cx="74" cy="124" r="4" fill="#f8fafc" />
                  <circle cx="120" cy="258" r="4" fill="#f8fafc" />
                  <circle cx="54" cy="260" r="4" fill="#f8fafc" />
                </g>
              </g>
            </svg>
          </div>

          <div className="mt-3 flex items-center gap-3">
            <input
              type="range"
              min="0"
              max={frames.length ? frames.length - 1 : 119}
              value={frames.length ? Math.min(playhead, frames.length - 1) : 0}
              onChange={event => {
                setPlayhead(Number(event.target.value))
                setFrameIndex(Math.floor(Number(event.target.value) / 2))
                setPlaying(false)
              }}
              className="w-full accent-[color:var(--accent)]"
            />
            <div className="text-xs text-slate-400">{frames.length ? Math.min(playhead, frames.length - 1) : 0}/{frames.length || 120}</div>
          </div>
        </Panel>
      </section>

      <section className="space-y-4">
        <Panel title="Sensor charts" subtitle="Shared playback with simple synced charts">
          <div className="space-y-4">
            <ChartBox title="Wrist gyroscope" data={visibleWrist} empty={!simulation}>
              <LineChart data={visibleWrist} syncId="imu">
                <CartesianGrid stroke="rgba(148,163,184,0.12)" vertical={false} />
                <XAxis dataKey="t" hide />
                <YAxis hide />
                <Tooltip content={<DarkTooltip />} />
                <Line type="monotone" dataKey="gx" stroke="var(--brand)" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="gy" stroke="var(--accent)" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="gz" stroke="#94a3b8" strokeWidth={2} dot={false} />
              </LineChart>
            </ChartBox>

            <ChartBox title="Racket accelerometer" data={visibleAcc} empty={!simulation}>
              <LineChart data={visibleAcc} syncId="imu">
                <CartesianGrid stroke="rgba(148,163,184,0.12)" vertical={false} />
                <XAxis dataKey="t" hide />
                <YAxis hide />
                <Tooltip content={<DarkTooltip />} />
                <Line type="monotone" dataKey="ax" stroke="rgba(148,163,184,0.3)" strokeWidth={1.5} dot={false} />
                <Line type="monotone" dataKey="filteredAx" stroke="var(--brand)" strokeWidth={2.25} dot={false} />
                <Line type="monotone" dataKey="ay" stroke="rgba(59,130,246,0.35)" strokeWidth={1.5} dot={false} />
              </LineChart>
            </ChartBox>

            <ChartBox title="DTW distance" data={visibleDtw} empty={!simulation}>
              <LineChart data={visibleDtw} syncId="imu">
                <CartesianGrid stroke="rgba(148,163,184,0.12)" vertical={false} />
                <XAxis dataKey="t" hide />
                <YAxis hide domain={[0, 1]} />
                <Tooltip content={<DarkTooltip />} />
                <ReferenceLine y={0.4} stroke="rgba(148,163,184,0.45)" strokeDasharray="4 4" />
                <Line type="monotone" dataKey="distance" stroke="var(--accent)" strokeWidth={2.2} dot={false} />
              </LineChart>
            </ChartBox>
          </div>
        </Panel>

        <section className="grid gap-4 xl:grid-cols-2">
          <Panel title="DTW fault panel" subtitle="Four parameters with severity labels">
            {simulation ? (
              <div className="space-y-3">
                {simulation.faults.map(fault => (
                  <div key={fault.name} className="rounded-2xl border border-slate-200/10 bg-white/5 p-3">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <div className="text-sm font-medium text-white">{fault.name}</div>
                        <div className="text-xs text-slate-400">DTW {(fault.score * 100).toFixed(1)}</div>
                      </div>
                      <Badge tone={fault.status === 'OK' ? 'success' : fault.status === 'Minor Fault' ? 'warning' : 'danger'}>{fault.status}</Badge>
                    </div>
                    <div className="mt-3 h-2 rounded-full bg-white/5">
                      <div className="h-full rounded-full bg-[color:var(--brand)]" style={{ width: `${Math.min(100, fault.score * 100)}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState title="No simulation yet" message="Run the simulator to populate the fault table." />
            )}
          </Panel>

          <Panel title="Biomechanics scores" subtitle="Simple score rings">
            {simulation ? (
              <div className="grid gap-3 md:grid-cols-3">
                <Ring label="Technique" value={simulation.biomechanics.technique} color="var(--brand)" />
                <Ring label="Timing" value={simulation.biomechanics.timing} color="var(--accent)" />
                <Ring label="Power" value={simulation.biomechanics.power} color="#94a3b8" />
              </div>
            ) : (
              <EmptyState title="No score rings yet" message="The biomech scores appear after simulation." />
            )}
          </Panel>
        </section>

        <Panel title="Classifier" subtitle="Detected stroke and small confusion matrix">
          {simulation ? (
            <div className="grid gap-4 lg:grid-cols-[0.8fr_1.2fr]">
              <div>
                <div className="text-lg font-medium text-white">{simulation.classifier.label}</div>
                <div className="mt-1 text-sm text-slate-400">Confidence {simulation.classifier.confidence}%</div>
                <div className="mt-3 text-sm text-slate-300">Divergence {simulation.classifier.divergence.toFixed(2)}</div>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {simulation.classifier.matrix.flatMap((row, rowIndex) => row.map((value, colIndex) => (
                  <div key={`${rowIndex}-${colIndex}`} className="rounded-2xl border border-slate-200/10 p-3" style={{ background: heatCell(value) }}>
                    <div className="text-[10px] uppercase tracking-[0.18em] text-white/60">{rowIndex === colIndex ? 'Hit' : 'Near'}</div>
                    <div className="mt-2 text-base font-medium text-white">{value}%</div>
                  </div>
                )))}
              </div>
            </div>
          ) : (
            <EmptyState title="No classifier output" message="Run a simulation to see the detection result." />
          )}
        </Panel>
      </section>
    </div>
  )
}

function ChartBox({ title, data, empty, children }) {
  return (
    <div className="rounded-2xl border border-slate-200/10 bg-white/5 p-4">
      <div className="mb-2 flex items-center justify-between">
        <div className="text-sm font-medium text-white">{title}</div>
        <div className="text-xs text-slate-500">{empty ? 'waiting' : 'live'}</div>
      </div>
      <div className="relative h-[180px]">
        {empty ? <div className="absolute inset-0 rounded-2xl border border-dashed border-slate-200/10 bg-white/[0.02]" /> : null}
        <ResponsiveContainer width="100%" height="100%">{children}</ResponsiveContainer>
      </div>
    </div>
  )
}

function Ring({ label, value, color }) {
  const radius = 34
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (value / 100) * circumference

  return (
    <div className="rounded-2xl border border-slate-200/10 bg-white/5 p-3 text-center">
      <svg viewBox="0 0 90 90" className="mx-auto h-20 w-20">
        <circle cx="45" cy="45" r={radius} fill="none" stroke="rgba(148,163,184,0.18)" strokeWidth="8" />
        <circle cx="45" cy="45" r={radius} fill="none" stroke={color} strokeWidth="8" strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round" transform="rotate(-90 45 45)" />
      </svg>
      <div className="text-base font-medium text-white">{value}%</div>
      <div className="mt-1 text-xs uppercase tracking-[0.2em] text-slate-400">{label}</div>
    </div>
  )
}

function heatCell(value) {
  const ratio = Math.max(0, Math.min(1, value / 100))
  return `rgba(${Math.round(20 + 40 * ratio)}, ${Math.round(64 + 130 * ratio)}, ${Math.round(80 + 40 * ratio)}, 0.12)`
}
