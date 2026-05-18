import React, { useState } from 'react'
import { AppProvider } from './context/AppContext'
import DashboardPage from './pages/DashboardPage'
import StrokeSimulatorPage from './pages/StrokeSimulatorPage'
import AICoachPage from './pages/AICoachPage'
import HistoryPage from './pages/HistoryPage'
import SettingsPage from './pages/SettingsPage'
import { Badge } from './components/UI'

const NAV_ITEMS = [
  { id: 'dashboard', label: 'Dashboard', short: 'DB' },
  { id: 'simulator', label: 'Simulator', short: 'SI' },
  { id: 'coach', label: 'Coach', short: 'AI' },
  { id: 'history', label: 'History', short: 'HS' },
  { id: 'settings', label: 'Settings', short: 'ST' }
]

export default function App() {
  return (
    <AppProvider>
      <Shell />
    </AppProvider>
  )
}

function Shell() {
  const [page, setPage] = useState('dashboard')

  return (
    <div className="min-h-screen bg-[var(--bg)] text-slate-100">
      <aside className="app-sidebar group">
        <div className="flex items-center gap-3 px-1">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200/10 bg-white/5 text-sm font-semibold text-white">BI</div>
          <div className="sidebar-copy hidden group-hover:block">
            <div className="text-xs uppercase tracking-[0.25em] text-slate-500">SmashIt</div>
            <div className="text-sm text-slate-200">Biomechanics</div>
          </div>
        </div>

        <nav className="mt-6 flex flex-col gap-2">
          {NAV_ITEMS.map(item => (
            <button
              key={item.id}
              onClick={() => setPage(item.id)}
              className={`sidebar-item ${page === item.id ? 'sidebar-item-active' : ''}`}
              title={item.label}
            >
              <span className="sidebar-short">{item.short}</span>
              <span className="sidebar-label hidden group-hover:inline">{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="mt-auto px-1 pb-1 text-xs text-slate-500">
          <div className="hidden group-hover:block">OpenRouter via backend proxy</div>
        </div>
      </aside>

      <div className="app-main">
        <header className="app-topbar">
          <div>
            <div className="text-xs uppercase tracking-[0.28em] text-slate-500">SmashIt</div>
            <h1 className="mt-1 text-lg font-medium text-white">{pageTitle(page)}</h1>
            <p className="text-sm text-slate-400">Minimal biomechanics workspace</p>
          </div>
          <div className="flex items-center gap-2">
            <Badge tone="neutral">IMU</Badge>
            <Badge tone="neutral">AI</Badge>
          </div>
        </header>

        <main className="page-fade px-4 py-4 md:px-6 lg:px-8">
          {page === 'dashboard' ? <DashboardPage onJumpToSimulator={() => setPage('simulator')} /> : null}
          {page === 'simulator' ? <StrokeSimulatorPage onJumpToCoach={() => setPage('coach')} /> : null}
          {page === 'coach' ? <AICoachPage /> : null}
          {page === 'history' ? <HistoryPage /> : null}
          {page === 'settings' ? <SettingsPage /> : null}
        </main>
      </div>
    </div>
  )
}

function pageTitle(page) {
  const titles = {
    dashboard: 'Dashboard',
    simulator: 'Stroke Simulator',
    coach: 'AI Coach',
    history: 'Session History',
    settings: 'Calibration & Settings'
  }

  return titles[page] || 'SmashIt'
}
