import React, { useEffect, useState } from 'react'
import { useApp } from '../context/AppContext'
import { Badge, EmptyState, Panel } from '../components/UI'
import { BASELINE_PROFILES, DEFAULT_SETTINGS } from '../data/badmintonData'
import { fetchBackendHealth, testOpenRouterConnection } from '../utils/coachApi'

export default function SettingsPage() {
  const { state, dispatch } = useApp()
  const [health, setHealth] = useState(null)
  const [message, setMessage] = useState('')
  const [testing, setTesting] = useState(false)

  useEffect(() => {
    fetchBackendHealth()
      .then(result => setHealth(result))
      .catch(() => setHealth({ ok: false, openRouterConfigured: false }))
  }, [])

  async function handleTestConnection() {
    setTesting(true)
    setMessage('Testing backend connection...')
    try {
      const result = await testOpenRouterConnection()
      setMessage(result.ok ? 'OpenRouter connection is ready.' : 'OpenRouter test returned an error.')
    } catch (error) {
      setMessage('Connection failed. Set OPENROUTER_API_KEY in the server environment.')
    } finally {
      setTesting(false)
    }
  }

  return (
    <div className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
      <Panel title="IMU placement guide" subtitle="Simple wrist and racket sensor map">
        <svg viewBox="0 0 620 420" className="w-full rounded-2xl border border-slate-200/10 bg-[#0c1117]">
          <rect width="620" height="420" fill="#0c1117" />
          <path d="M210 80 C180 120, 176 180, 194 240 L220 326" stroke="rgba(248,250,252,0.7)" strokeWidth="14" strokeLinecap="round" fill="none" />
          <path d="M220 176 C286 148, 322 126, 364 92" stroke="rgba(248,250,252,0.7)" strokeWidth="14" strokeLinecap="round" fill="none" />
          <path d="M364 92 C414 76, 474 92, 528 122" stroke="rgba(248,250,252,0.7)" strokeWidth="10" strokeLinecap="round" fill="none" />
          <rect x="175" y="216" width="50" height="26" rx="10" fill="var(--brand)" opacity="0.85" />
          <rect x="300" y="120" width="50" height="26" rx="10" fill="var(--accent)" opacity="0.85" />
          <rect x="450" y="104" width="58" height="28" rx="10" fill="var(--brand)" opacity="0.85" />
          <text x="164" y="212" fill="#cbd5e1" fontSize="15">Wrist IMU</text>
          <text x="286" y="114" fill="#cbd5e1" fontSize="15">Forearm IMU</text>
          <text x="439" y="98" fill="#cbd5e1" fontSize="15">Racket IMU</text>
        </svg>
      </Panel>

      <Panel title="Calibration" subtitle="Tune signal settings used by the simulator">
        <div className="grid gap-4 md:grid-cols-2">
          <SelectField
            label="Sampling rate"
            value={state.settings.samplingRate}
            options={[
              { label: '100Hz', value: 100 },
              { label: '200Hz', value: 200 },
              { label: '400Hz', value: 400 }
            ]}
            onChange={value => dispatch({ type: 'UPDATE_SETTINGS', payload: { samplingRate: Number(value) } })}
          />

          <SelectField
            label="Baseline profile"
            value={state.settings.baselineProfile}
            options={BASELINE_PROFILES.map(profile => ({ label: profile.label, value: profile.id }))}
            onChange={value => dispatch({ type: 'UPDATE_SETTINGS', payload: { baselineProfile: value } })}
          />
        </div>

        <div className="mt-4 space-y-4">
          <SliderField
            label={`Filter cutoff (${state.settings.filterCutoff} Hz)`}
            min={20}
            max={80}
            value={state.settings.filterCutoff}
            onChange={value => dispatch({ type: 'UPDATE_SETTINGS', payload: { filterCutoff: Number(value) } })}
          />
          <SliderField
            label={`Noise floor (${state.settings.noiseFloor.toFixed(2)}g)`}
            min={0.05}
            max={0.5}
            step={0.01}
            value={state.settings.noiseFloor}
            onChange={value => dispatch({ type: 'UPDATE_SETTINGS', payload: { noiseFloor: Number(value) } })}
          />
          <SliderField
            label={`DTW window (${state.settings.dtwWindow} samples)`}
            min={10}
            max={50}
            value={state.settings.dtwWindow}
            onChange={value => dispatch({ type: 'UPDATE_SETTINGS', payload: { dtwWindow: Number(value) } })}
          />
        </div>

        <div className="mt-4 rounded-2xl border border-slate-200/10 bg-white/5 p-4 text-sm text-slate-300">
          <div className="text-xs uppercase tracking-[0.22em] text-slate-500">Backend key</div>
          <p className="mt-2 leading-6">Set <span className="font-medium text-white">OPENROUTER_API_KEY</span> in the backend environment. The frontend never receives the key.</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button className="rounded-xl bg-[color:var(--brand)] px-4 py-2 text-sm font-medium text-slate-950" onClick={handleTestConnection} disabled={testing}>
              {testing ? 'Testing...' : 'Test connection'}
            </button>
            <Badge tone={health?.openRouterConfigured ? 'success' : 'warning'}>{health?.openRouterConfigured ? 'Configured' : 'Not configured'}</Badge>
          </div>
          <div className="mt-3 text-xs text-slate-400">{message || (health ? `Backend ${health.ok ? 'online' : 'offline'}` : 'Checking backend health...')}</div>
        </div>

        <div className="mt-4">
          <EmptyState title="Current defaults" message={`Sampling ${DEFAULT_SETTINGS.samplingRate}Hz, cutoff ${DEFAULT_SETTINGS.filterCutoff}Hz, DTW window ${DEFAULT_SETTINGS.dtwWindow} samples.`} />
        </div>
      </Panel>
    </div>
  )
}

function SliderField({ label, min, max, step = 1, value, onChange }) {
  return (
    <label className="block rounded-2xl border border-slate-200/10 bg-white/5 p-4">
      <div className="flex items-center justify-between text-sm text-slate-300">
        <span>{label}</span>
        <span className="text-xs text-slate-500">{min} - {max}</span>
      </div>
      <input type="range" min={min} max={max} step={step} value={value} onChange={event => onChange(event.target.value)} className="mt-3 w-full accent-[color:var(--accent)]" />
    </label>
  )
}

function SelectField({ label, value, options, onChange }) {
  return (
    <label className="block rounded-2xl border border-slate-200/10 bg-white/5 p-4">
      <div className="text-sm text-slate-300">{label}</div>
      <select value={value} onChange={event => onChange(event.target.value)} className="mt-3 w-full rounded-xl border border-slate-200/10 bg-black/20 px-3 py-2 text-sm text-white outline-none">
        {options.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
      </select>
    </label>
  )
}
