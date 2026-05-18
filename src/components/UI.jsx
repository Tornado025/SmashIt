import React, { useEffect, useState } from 'react'

export function Panel({ title, subtitle, actions, children, className = '' }) {
  return (
    <section className={`rounded-2xl border border-slate-200/10 bg-white/5 p-5 ${className}`}>
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-medium text-white">{title}</h2>
          {subtitle ? <p className="mt-1 text-sm text-slate-400">{subtitle}</p> : null}
        </div>
        {actions ? <div>{actions}</div> : null}
      </div>
      {children}
    </section>
  )
}

export function CountUp({ value, className = '' }) {
  const [displayValue, setDisplayValue] = useState(0)

  useEffect(() => {
    let frame = 0
    const start = performance.now()
    const duration = 700

    function tick(now) {
      const progress = Math.min(1, (now - start) / duration)
      setDisplayValue(Math.round(value * progress))
      if (progress < 1) {
        frame = requestAnimationFrame(tick)
      }
    }

    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [value])

  return <span className={className}>{displayValue}</span>
}

export function Badge({ children, tone = 'neutral' }) {
  const toneClass =
    tone === 'success'
      ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20'
      : tone === 'warning'
        ? 'bg-amber-500/10 text-amber-200 border-amber-500/20'
        : tone === 'danger'
          ? 'bg-rose-500/10 text-rose-200 border-rose-500/20'
          : 'bg-white/5 text-slate-300 border-slate-200/10'

  return <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs ${toneClass}`}>{children}</span>
}

export function MiniStat({ label, value, accent = 'var(--brand)' }) {
  return (
    <div className="rounded-2xl border border-slate-200/10 bg-white/5 p-4">
      <div className="text-xs uppercase tracking-[0.22em] text-slate-400">{label}</div>
      <div className="mt-3 text-3xl font-medium text-white" style={{ color: accent }}>
        {value}
      </div>
    </div>
  )
}

export function EmptyState({ title, message }) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-200/10 bg-white/[0.03] p-5 text-sm text-slate-400">
      <div className="font-medium text-slate-200">{title}</div>
      <div className="mt-1 leading-6">{message}</div>
    </div>
  )
}

export function DarkTooltip({ active, payload, label }) {
  if (!active || !payload || !payload.length) {
    return null
  }

  return (
    <div className="rounded-xl border border-slate-200/10 bg-[#11161d] px-3 py-2 text-xs text-slate-100 shadow-lg">
      {label !== undefined ? <div className="mb-1 text-[11px] uppercase tracking-[0.22em] text-slate-400">{label}</div> : null}
      {payload.map(item => (
        <div key={item.dataKey} className="flex items-center justify-between gap-6">
          <span className="text-slate-300">{item.name || item.dataKey}</span>
          <span className="font-medium text-white">{typeof item.value === 'number' ? item.value.toFixed(2) : item.value}</span>
        </div>
      ))}
    </div>
  )
}

export function ChatBubble({ role, content, onSpeak }) {
  const isUser = role === 'user'

  return (
    <div className={`flex items-start gap-3 ${isUser ? 'justify-end' : ''}`}>
      {!isUser ? <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200/10 bg-white/5 text-xs text-emerald-300">BIQ</div> : null}
      <div className={`max-w-[760px] rounded-2xl border px-4 py-3 ${isUser ? 'border-slate-200/10 bg-white/[0.08]' : 'border-slate-200/10 bg-white/5'}`}>
        <div className="whitespace-pre-wrap text-sm leading-6 text-slate-100">{content}</div>
        {!isUser ? (
          <button className="mt-3 text-xs text-slate-300 underline decoration-slate-500/60 underline-offset-4" onClick={onSpeak}>
            Speak
          </button>
        ) : null}
      </div>
      {isUser ? <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200/10 bg-slate-100/10 text-xs text-slate-200">You</div> : null}
    </div>
  )
}

export function TypingDots() {
  return (
    <div className="flex items-center gap-1.5">
      <span className="typing-dot" />
      <span className="typing-dot" />
      <span className="typing-dot" />
    </div>
  )
}
