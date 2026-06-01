import React, { useEffect, useMemo, useRef, useState } from 'react'
import { useApp } from '../context/AppContext'
import { ChatBubble, EmptyState, Panel, TypingDots, Badge } from '../components/UI'
import { streamCoachResponse } from '../utils/coachApi'

export default function AICoachPage() {
  const { state } = useApp()
  const [coachingMode, setCoachingMode] = useState('Beginner')
  const [messages, setMessages] = useState([])
  const [inputValue, setInputValue] = useState('')
  const [streaming, setStreaming] = useState(false)
  const [typing, setTyping] = useState(false)
  const [statusMessage, setStatusMessage] = useState('')
  const controllerRef = useRef(null)
  const bottomRef = useRef(null)

  const sim = state.simResult

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, typing, streaming])

  const systemPrompt = useMemo(() => {
    if (!sim) {
      return 'You are an expert badminton biomechanics coach. No simulation data is available yet.'
    }

    return [
      'You are an expert badminton biomechanics coach.',
      `Player mode: ${coachingMode}`,
      `Stroke: ${sim.session.stroke}`,
      `Skill level: ${sim.session.skill}`,
      `Faults: ${sim.faults.map(item => `${item.name}=${(item.score * 100).toFixed(1)} (${item.status})`).join('; ')}`,
      `Biomechanics scores: technique ${sim.biomechanics.technique}, timing ${sim.biomechanics.timing}, power ${sim.biomechanics.power}`,
      `Classifier: ${sim.classifier.label} (${sim.classifier.confidence}%)`,
      'Give specific drills, correction cues, and short training schedules.'
    ].join('\n')
  }, [coachingMode, sim])

  async function sendMessage(content) {
    if (!content.trim() || streaming) return

    if (!sim) {
      setStatusMessage('Run the simulator first so the coach has biomechanics context.')
      return
    }

    const userMessage = { role: 'user', content }
    const nextMessages = [...messages, userMessage]
    setMessages(nextMessages)
    setInputValue('')
    setTyping(true)
    setStreaming(true)
    setStatusMessage('Sending request...')

    const assistantIndex = nextMessages.length
    setMessages(prev => [...prev, { role: 'assistant', content: '' }])

    controllerRef.current?.abort()
    controllerRef.current = new AbortController()

    try {
      const response = await streamCoachResponse({
        systemPrompt,
        messages: nextMessages,
        signal: controllerRef.current.signal
      })

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { value, done } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const parts = buffer.split('\n\n')
        buffer = parts.pop() || ''

        for (const part of parts) {
          const lines = part.split('\n').filter(line => line.startsWith('data:'))
          for (const line of lines) {
            const payload = line.replace(/^data:\s*/, '').trim()
            if (!payload || payload === '[DONE]') continue

            const parsed = JSON.parse(payload)
            const token = parsed.choices?.[0]?.delta?.content || ''
            if (!token) continue

            setMessages(prev => {
              const copy = [...prev]
              const current = copy[assistantIndex] || { role: 'assistant', content: '' }
              copy[assistantIndex] = { ...current, content: `${current.content}${token}` }
              return copy
            })
          }
        }
      }

      setStatusMessage('Response complete.')
    } catch (error) {
      setMessages(prev => {
        const copy = [...prev]
        copy[assistantIndex] = {
          role: 'assistant',
          content: 'The backend could not reach the coaching service. Check the server connection and retry.'
        }
        return copy
      })
      setStatusMessage('Request failed.')
    } finally {
      setTyping(false)
      setStreaming(false)
    }
  }

  function quickAsk(question) {
    void sendMessage(question)
  }

  return (
    <div className="grid gap-4 xl:grid-cols-[0.82fr_1.18fr]">
      <Panel title="Player context" subtitle="Pulled from the latest simulation">
        <div className="space-y-4">
          <div className="rounded-2xl border border-slate-200/10 bg-white/5 p-4">
            <div className="text-xs uppercase tracking-[0.22em] text-slate-500">Current stroke</div>
            <div className="mt-2 text-lg font-medium text-white">{sim?.session.stroke || state.playerProfile.currentStroke}</div>
            <div className="mt-2 text-sm text-slate-400">Skill {sim?.session.skill || state.playerProfile.skill}</div>
          </div>

          <div className="rounded-2xl border border-slate-200/10 bg-white/5 p-4">
            <div className="flex items-center justify-between">
              <div className="text-xs uppercase tracking-[0.22em] text-slate-500">Fault list</div>
              <Badge tone={sim ? 'neutral' : 'warning'}>{sim ? 'Ready' : 'No sim data'}</Badge>
            </div>
            <div className="mt-3 space-y-2">
              {sim?.faults?.length ? sim.faults.map(fault => (
                <div key={fault.name} className="rounded-xl border border-slate-200/10 bg-black/20 px-3 py-2 text-sm text-slate-300">
                  <div className="flex items-center justify-between gap-2">
                    <span>{fault.name}</span>
                    <Badge tone={fault.status === 'OK' ? 'success' : fault.status === 'Minor Fault' ? 'warning' : 'danger'}>{fault.status}</Badge>
                  </div>
                </div>
              )) : <EmptyState title="No faults yet" message="Run the simulator to generate coach context." />}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200/10 bg-white/5 p-4">
            <div className="text-xs uppercase tracking-[0.22em] text-slate-500">Coaching mode</div>
            <div className="mt-3 inline-flex rounded-full border border-slate-200/10 bg-black/20 p-1">
              <button className={`rounded-full px-3 py-2 text-sm ${coachingMode === 'Beginner' ? 'bg-white/10 text-white' : 'text-slate-400'}`} onClick={() => setCoachingMode('Beginner')}>Beginner</button>
              <button className={`rounded-full px-3 py-2 text-sm ${coachingMode === 'Competitive' ? 'bg-white/10 text-white' : 'text-slate-400'}`} onClick={() => setCoachingMode('Competitive')}>Competitive</button>
            </div>
          </div>

        </div>
      </Panel>

      <Panel title="Coach" subtitle="Live session guidance">
        <div className="flex min-h-[720px] flex-col">
          <div className="mb-4 flex flex-wrap gap-2">
            <button className="rounded-full border border-slate-200/10 bg-white/5 px-3 py-2 text-sm text-slate-200" onClick={() => quickAsk("What's my biggest fault?")}>What's my biggest fault?</button>
            <button className="rounded-full border border-slate-200/10 bg-white/5 px-3 py-2 text-sm text-slate-200" onClick={() => quickAsk('Give me a drill plan')}>Give me a drill plan</button>
            <button className="rounded-full border border-slate-200/10 bg-white/5 px-3 py-2 text-sm text-slate-200" onClick={() => quickAsk('Explain DTW analysis')}>Explain DTW analysis</button>
          </div>

          <div className="flex-1 space-y-4 overflow-y-auto rounded-2xl border border-slate-200/10 bg-black/20 p-4">
            {messages.length ? messages.map((message, index) => (
              <ChatBubble key={`${message.role}-${index}`} role={message.role} content={message.content} />
            )) : <EmptyState title="Ask the coach" message="Start with a quick question or write your own coaching prompt." />}

            {typing ? (
              <div className="flex items-start gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200/10 bg-white/5 text-xs text-emerald-300">Coach</div>
                <div className="rounded-2xl border border-slate-200/10 bg-white/5 px-4 py-3">
                  <TypingDots />
                </div>
              </div>
            ) : null}
            <div ref={bottomRef} />
          </div>

          <div className="mt-4 rounded-2xl border border-slate-200/10 bg-white/5 p-3">
            <div className="flex gap-3">
              <input
                value={inputValue}
                onChange={event => setInputValue(event.target.value)}
                onKeyDown={event => {
                  if (event.key === 'Enter') {
                    void sendMessage(inputValue)
                  }
                }}
                placeholder={sim ? 'Ask for a drill, cue, or explanation...' : 'Run the simulator first.'}
                className="flex-1 rounded-xl border border-slate-200/10 bg-black/20 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500"
              />
              <button className="rounded-xl bg-[color:var(--brand)] px-4 py-3 text-sm font-medium text-slate-950" onClick={() => void sendMessage(inputValue)} disabled={streaming}>
                Send
              </button>
            </div>
            <div className="mt-2 text-xs text-slate-500">{statusMessage || 'Responses appear here once ready.'}</div>
          </div>
        </div>
      </Panel>
    </div>
  )
}
