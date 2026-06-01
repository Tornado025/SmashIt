import React, { useEffect, useRef, useState } from 'react'
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts'
import { useApp } from '../context/AppContext'
import { Badge, DarkTooltip, EmptyState, Panel } from '../components/UI'
import { STROKES, buildPlayerProfile, buildSimulationBundle } from '../data/badmintonData'

const CATEGORIES = [
  { label: 'Beginner', skill: 35 },
  { label: 'Intermediate', skill: 68 },
  { label: 'Pro', skill: 95 }
]

const FAULT_WHY = {
  'Wrist snap velocity': 'Gx peak too low at impact — wrist rotation is slow.',
  'Racket face angle': 'Gy deviation at contact — racket face is open or closed.',
  'Forearm pronation timing': 'Gx peaks after the accelerometer spike — pronation is late.',
  'Follow-through arc': 'Gx drops sharply post-impact — follow-through is cut short.',
  'Elbow extension speed': 'Gy rise rate is shallow — elbow is not fully extending.',
  'Forearm pronation depth': 'Gz amplitude is low — forearm rotation is incomplete.',
  'Wrist release timing': 'Gx lags the impact spike — wrist releases too late.',
  'Contact point consistency': 'High DTW variance — contact point changes between strokes.',
  'Deceleration control': 'Gx drops too fast post-contact — no controlled deceleration.',
  'Wrist disguise angle': 'Gy pre-impact pattern is predictable — no disguise.',
  'Finger tension': 'Low-frequency Gz noise — grip is inconsistent.',
  'Touch gentleness': 'Accelerometer spike is too sharp — too much force applied.',
  'Racket path compactness': 'High Gz variance — racket path is looping.',
  'Contact height': 'Gy at impact deviates from reference — contact is low.',
  'Shoulder rotation': 'Low Gx amplitude overall — shoulder is not rotating.',
  'Transition speed': 'Long DTW window needed — stroke preparation is slow.',
  'Jump timing': 'Accelerometer pre-spike is early — jump is mistimed.',
  'Landing balance': 'Post-impact Gz oscillation — landing is unstable.',
  'Hip rotation': 'Low Gx in early phase — hips are not driving the stroke.',
  'Racket acceleration': 'Gx slope to peak is shallow — racket speed is building slowly.'
}

export default function StrokeSimulatorPage({ onJumpToCoach }) {
  const { state, dispatch } = useApp()
  const [stroke, setStroke] = useState(state.playerProfile.currentStroke)
  const [category, setCategory] = useState('Intermediate')
  const skill = CATEGORIES.find(item => item.label === category).skill
  const [frames, setFrames] = useState([])
  const [playhead, setPlayhead] = useState(0)
  const [playing, setPlaying] = useState(false)
  const timerRef = useRef(null)

  const simulation = state.simResult
  const gxPeak = simulation
    ? Math.round(Math.max(...simulation.signal.wristFiltered.map(item => Math.abs(item.gx))))
    : null

  useEffect(() => {
    dispatch({ type: 'SET_PLAYER_PROFILE', payload: buildPlayerProfile(skill, 'Amateur', stroke) })
  }, [dispatch, skill, stroke])

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
  function runSimulation() {
    const bundle = buildSimulationBundle({
      stroke,
      skill,
      mode: 'Amateur',
      settings: state.settings
    })

    dispatch({ type: 'SET_PLAYER_PROFILE', payload: bundle.playerProfile })
    dispatch({ type: 'SET_SIM_RESULT', payload: bundle })
    dispatch({ type: 'ADD_SESSION', payload: bundle.session })
    setFrames(bundle.frames)
    setPlayhead(0)
    setPlaying(true)
  }

  function replay() {
    if (!frames.length) return
    setPlayhead(0)
    setPlaying(true)
  }

  return (
    <div className="space-y-4">
      <section>
        <Panel title="Stroke controls" subtitle="Pick a stroke, choose category, then simulate">
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

          <div className="mt-4 flex gap-3">
            {CATEGORIES.map(item => (
              <button
                key={item.label}
                onClick={() => setCategory(item.label)}
                className={`rounded-xl px-5 py-3 text-sm font-medium transition ${
                  category === item.label
                    ? 'bg-[color:var(--brand)] text-slate-950'
                    : 'border border-slate-200/10 bg-white/5 text-slate-300 hover:bg-white/[0.08]'
                }`}
              >
                {item.label}
              </button>
            ))}
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
      </section>

      <section>
        <div className="rounded-2xl border border-slate-200/10 bg-white/[0.04] px-4 py-3 text-sm text-slate-400 space-y-1">
          <div><span className="text-white font-medium">Wrist gyroscope</span> — rotational velocity of the wrist (°/s). The Gx peak at impact is the key fault signal.</div>
          <div><span className="text-white font-medium">Accelerometer</span> — linear force at the racquet. The spike = shuttle contact moment.</div>
          <div><span className="text-white font-medium">DTW distance</span> — how far this stroke deviates from the Pro reference, sample by sample. Above 0.4 = fault zone.</div>
        </div>

        <Panel title="Sensor charts" subtitle="Shared playback with simple synced charts">
          <div className="space-y-4">
            <ChartBox
              title="Wrist gyroscope (°/s)"
              subtitle={gxPeak ? `Peak Gx: ${gxPeak} °/s — ${category === 'Pro' ? 'elite range' : category === 'Beginner' ? 'below threshold' : 'developing'}` : 'Gx / Gy / Gz axes'}
              data={visibleWrist}
              empty={!simulation}
            >
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

            <ChartBox title="Racket accelerometer (g)" subtitle="Raw vs filtered — spike marks shuttle contact" data={visibleAcc} empty={!simulation}>
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

            <ChartBox title="DTW deviation score" subtitle="Deviation from Pro reference — above 0.4 line = fault zone" data={visibleDtw} empty={!simulation}>
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

      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <Panel title="DTW fault panel" subtitle="Four parameters with severity labels">
          {simulation ? (
            <div className="space-y-3">
              {simulation.faults.map(fault => (
                <div key={fault.name} className="rounded-2xl border border-slate-200/10 bg-white/5 p-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="text-sm font-medium text-white">{fault.name}</div>
                      <div className="mt-0.5 text-xs text-slate-500">{FAULT_WHY[fault.name] || ''}</div>
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
    </div>
  )
}

function ChartBox({ title, subtitle, data, empty, children }) {
  return (
    <div className="rounded-2xl border border-slate-200/10 bg-white/5 p-4">
      <div className="mb-2">
        <div className="flex items-center justify-between">
          <div className="text-sm font-medium text-white">{title}</div>
          <div className="text-xs text-slate-500">{empty ? 'waiting' : 'live'}</div>
        </div>
        {subtitle ? <div className="mt-0.5 text-xs text-slate-500">{subtitle}</div> : null}
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

