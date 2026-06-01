import React, { useEffect, useMemo, useState } from 'react'
import { Line, LineChart, Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid } from 'recharts'
import { useApp } from '../context/AppContext'
import { Panel, CountUp, DarkTooltip } from '../components/UI'

export default function DashboardPage() {
  const { state } = useApp()
  const [tick, setTick] = useState(0)

  useEffect(() => {
    const timer = window.setInterval(() => setTick(value => value + 1), 120)
    return () => window.clearInterval(timer)
  }, [])

  const previewData = useMemo(() => {
    return Array.from({ length: 42 }, (_, index) => {
      const t = index / 6 + tick * 0.05
      return {
        t: index,
        gx: Math.sin(t * 1.8) * 24 + Math.sin(t * 4.2) * 6,
        gy: Math.sin(t * 2.2 + 0.8) * 18 + Math.cos(t * 3.7) * 5,
        gz: Math.cos(t * 1.4 + 0.7) * 14 + Math.sin(t * 5.1) * 8
      }
    })
  }, [tick])

  const radarData = [
    { axis: 'Wrist Snap', value: state.playerProfile.axes.wristSnap },
    { axis: 'Timing', value: state.playerProfile.axes.timing },
    { axis: 'Power', value: state.playerProfile.axes.power },
    { axis: 'Consistency', value: state.playerProfile.axes.consistency },
    { axis: 'Follow-Through', value: state.playerProfile.axes.followThrough },
    { axis: 'Footwork', value: state.playerProfile.axes.footwork }
  ]

  return (
    <div className="space-y-4">
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Metric title="Session score" value={state.simResult?.score ?? '—'} suffix={state.simResult ? '/100' : ''} />
        <Metric title="Fault rate" value={state.simResult?.faultRate ?? '—'} suffix={state.simResult ? '%' : ''} />
        <Metric title="Sessions run" value={state.sessions.length} />
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
        <Panel title="IMU signal preview" subtitle="Simple, looping Gx/Gy/Gz preview">
          <div className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={previewData}>
                <CartesianGrid stroke="rgba(148,163,184,0.12)" vertical={false} />
                <XAxis dataKey="t" hide />
                <YAxis hide />
                <Tooltip content={<DarkTooltip />} />
                <Line type="monotone" dataKey="gx" stroke="var(--brand)" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="gy" stroke="var(--accent)" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="gz" stroke="#94a3b8" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Panel>

        <Panel title="Player radar" subtitle="Current profile axes">
          <div className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={radarData}>
                <PolarGrid stroke="rgba(148,163,184,0.18)" />
                <PolarAngleAxis dataKey="axis" tick={{ fill: '#cbd5e1', fontSize: 11 }} />
                <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
                <Radar dataKey="value" stroke="var(--brand)" fill="var(--brand)" fillOpacity={0.12} />
                <Tooltip content={<DarkTooltip />} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </Panel>
      </section>

      <section className="grid gap-4">
        <Panel title="Recent sessions" subtitle="Latest saved analysis runs">
          <div className="overflow-hidden rounded-2xl border border-slate-200/10">
            <table className="w-full text-left text-sm">
              <thead className="bg-white/5 text-xs uppercase tracking-[0.2em] text-slate-400">
                <tr>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Stroke</th>
                  <th className="px-4 py-3">Score</th>
                  <th className="px-4 py-3">Faults</th>
                  <th className="px-4 py-3">Trend</th>
                </tr>
              </thead>
              <tbody>
                {state.sessions.slice(0, 5).map(session => (
                  <tr key={session.id} className="border-t border-slate-200/10">
                    <td className="px-4 py-3 text-slate-300">{session.date}</td>
                    <td className="px-4 py-3">{session.stroke}</td>
                    <td className="px-4 py-3">{session.score}</td>
                    <td className="px-4 py-3 text-slate-300">{session.faults}</td>
                    <td className="px-4 py-3 text-slate-300">{session.trend === 'up' ? '▲ improving' : session.trend === 'flat' ? '• steady' : '▼ softening'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      </section>
    </div>
  )
}

function Metric({ title, value, suffix = '' }) {
  const isNumber = typeof value === 'number' && Number.isFinite(value)

  return (
    <div className="rounded-2xl border border-slate-200/10 bg-white/5 p-4">
      <div className="text-xs uppercase tracking-[0.22em] text-slate-400">{title}</div>
      <div className="mt-3 flex items-end gap-1">
        <div className="text-3xl font-medium text-white">{isNumber ? <CountUp value={value} /> : value}</div>
        {suffix ? <div className="pb-1 text-sm text-slate-400">{suffix}</div> : null}
      </div>
      <div className="mt-3 h-1 rounded-full bg-white/5">
        <div className="h-full rounded-full bg-[color:var(--brand)]/80" style={{ width: `${Math.min(100, isNumber ? value : 0)}%` }} />
      </div>
    </div>
  )
}
