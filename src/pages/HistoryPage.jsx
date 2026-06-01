import React, { useMemo, useState } from 'react'
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { useApp } from '../context/AppContext'
import { Badge, DarkTooltip, EmptyState, Panel } from '../components/UI'

export default function HistoryPage() {
  const { state } = useApp()
  const [selectedId, setSelectedId] = useState(state.sessions[0]?.id || '')

  const selectedSession = state.sessions.find(session => session.id === selectedId) || state.sessions[0]

  const analytics = useMemo(() => {
    const scoreSeries = state.sessions.slice().reverse().map(session => ({ name: session.date, score: session.score }))
    const faultMap = new Map()
    state.sessions.forEach(session => {
      session.faultDetails?.forEach(fault => {
        faultMap.set(fault.name, (faultMap.get(fault.name) || 0) + 1)
      })
    })

    const faultSeries = [...faultMap.entries()].slice(0, 6).map(([fault, count]) => ({ fault, count }))
    const commonFault = faultSeries.slice().sort((a, b) => b.count - a.count)[0] || { fault: 'No data yet', count: 0 }

    return { scoreSeries, faultSeries, commonFault }
  }, [state.sessions])

  function exportSessions() {
    const blob = new Blob([JSON.stringify(state.sessions, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'smashit-sessions.json'
    link.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-4">
      <section className="grid gap-4 xl:grid-cols-3">
        <Panel title="Score over sessions" subtitle="Aggregate score trend">
          <div className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={analytics.scoreSeries}>
                <CartesianGrid stroke="rgba(148,163,184,0.12)" vertical={false} />
                <XAxis dataKey="name" tick={{ fill: '#94a3b8', fontSize: 11 }} />
                <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} />
                <Tooltip content={<DarkTooltip />} />
                <Area type="monotone" dataKey="score" stroke="var(--brand)" fill="rgba(0,229,160,0.12)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Panel>

        <Panel title="Fault frequency" subtitle="Most recurring issues">
          <div className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={analytics.faultSeries}>
                <CartesianGrid stroke="rgba(148,163,184,0.12)" vertical={false} />
                <XAxis dataKey="fault" tick={{ fill: '#94a3b8', fontSize: 11 }} />
                <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} />
                <Tooltip content={<DarkTooltip />} />
                <Bar dataKey="count" fill="var(--accent)" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Panel>

        <Panel title="Most common fault" subtitle="Top recurring issue">
          <div className="flex min-h-[250px] flex-col justify-between">
            <div>
              <div className="text-sm text-slate-400">Fault name</div>
              <div className="mt-2 text-2xl font-medium text-white">{analytics.commonFault.fault}</div>
              <div className="mt-2 text-sm text-slate-400">{analytics.commonFault.count} occurrences</div>
            </div>
            <button className="rounded-xl border border-slate-200/10 bg-white/5 px-4 py-3 text-sm text-white transition hover:bg-white/[0.08]" onClick={exportSessions}>
              Export sessions JSON
            </button>
          </div>
        </Panel>
      </section>

      <section className="grid gap-4 xl:grid-cols-[0.82fr_1.18fr]">
        <Panel title="Session list" subtitle="Select a saved run">
          <div className="space-y-3">
            {state.sessions.map(session => (
              <button
                key={session.id}
                onClick={() => setSelectedId(session.id)}
                className={`w-full rounded-2xl border p-4 text-left transition ${selectedId === session.id ? 'border-[color:var(--brand)] bg-white/[0.08]' : 'border-slate-200/10 bg-white/5 hover:bg-white/[0.08]'}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-sm font-medium text-white">{session.stroke}</div>
                    <div className="text-xs text-slate-400">{session.date} · skill {session.skill}</div>
                  </div>
                  <Badge tone={session.trend === 'up' ? 'success' : session.trend === 'flat' ? 'neutral' : 'warning'}>{session.score}</Badge>
                </div>
              </button>
            ))}
          </div>
        </Panel>

        <Panel title="Session detail" subtitle="Saved charts and summaries">
          {selectedSession ? (
            <div className="space-y-4">
              <div className="grid gap-3 md:grid-cols-3">
                <Metric label="Score" value={`${selectedSession.score}/100`} />
                <Metric label="Faults" value={`${selectedSession.faults}`} />
                <Metric label="Skill" value={`${selectedSession.skill}`} />
              </div>

              <div className="grid gap-4 xl:grid-cols-2">
                <SmallChart title="DTW curve" data={selectedSession.dtwData}>
                  <LineChart data={selectedSession.dtwData}>
                    <CartesianGrid stroke="rgba(148,163,184,0.12)" vertical={false} />
                    <XAxis dataKey="t" hide />
                    <YAxis hide domain={[0, 1]} />
                    <Tooltip content={<DarkTooltip />} />
                    <Line type="monotone" dataKey="distance" stroke="var(--brand)" strokeWidth={2} dot={false} />
                  </LineChart>
                </SmallChart>

                <Panel title="Fault breakdown" subtitle="Saved notes from the session">
                  <div className="space-y-3">
                    {selectedSession.faultDetails?.length ? selectedSession.faultDetails.map(fault => (
                      <div key={fault.name} className="rounded-2xl border border-slate-200/10 bg-white/5 p-3">
                        <div className="flex items-center justify-between gap-3">
                          <div className="text-sm text-white">{fault.name}</div>
                          <Badge tone={fault.status === 'OK' ? 'success' : fault.status === 'Minor Fault' ? 'warning' : 'danger'}>{fault.status}</Badge>
                        </div>
                        <div className="mt-2 h-2 rounded-full bg-white/5">
                          <div className="h-full rounded-full bg-[color:var(--brand)]" style={{ width: `${Math.min(100, fault.score * 100)}%` }} />
                        </div>
                      </div>
                    )) : <EmptyState title="No faults" message="This session has no stored fault detail." />}
                    <div className="rounded-2xl border border-slate-200/10 bg-white/5 p-3 text-sm text-slate-300">Session summary: {selectedSession.summary}</div>
                  </div>
                </Panel>
              </div>

            </div>
          ) : (
            <EmptyState title="No selected session" message="Run the simulator to populate the history view." />
          )}
        </Panel>
      </section>
    </div>
  )
}

function Metric({ label, value }) {
  return (
    <div className="rounded-2xl border border-slate-200/10 bg-white/5 p-4">
      <div className="text-xs uppercase tracking-[0.22em] text-slate-500">{label}</div>
      <div className="mt-2 text-2xl font-medium text-white">{value}</div>
    </div>
  )
}

function SmallChart({ title, children }) {
  return (
    <Panel title={title} subtitle="Re-rendered from saved data">
      <div className="h-[220px]">
        <ResponsiveContainer width="100%" height="100%">{children}</ResponsiveContainer>
      </div>
    </Panel>
  )
}

