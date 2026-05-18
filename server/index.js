const express = require('express')
const cors = require('cors')
const dotenv = require('dotenv')

dotenv.config()

const app = express()
const port = Number(process.env.PORT || 3001)
const openRouterKey = process.env.OPENROUTER_API_KEY || ''
const model = 'google/gemini-2.0-flash-001'

app.use(cors())
app.use(express.json({ limit: '1mb' }))

app.get('/api/health', (req, res) => {
  res.json({ ok: true, openRouterConfigured: Boolean(openRouterKey) })
})

app.post('/api/test-openrouter', async (req, res) => {
  if (!openRouterKey) {
    return res.status(400).json({ ok: false, error: 'OPENROUTER_API_KEY is missing' })
  }

  try {
    const upstream = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${openRouterKey}`
      },
      body: JSON.stringify({
        model,
        messages: [{ role: 'user', content: 'ping' }],
        max_tokens: 1,
        stream: false
      })
    })

    const payload = await upstream.json().catch(() => ({}))
    res.status(upstream.status).json({ ok: upstream.ok, payload })
  } catch (error) {
    res.status(500).json({ ok: false, error: 'Failed to reach OpenRouter' })
  }
})

app.post('/api/coach', async (req, res) => {
  if (!openRouterKey) {
    return res.status(400).json({ error: 'OPENROUTER_API_KEY is missing' })
  }

  const { systemPrompt = '', messages = [], model: requestedModel = model } = req.body || {}

  try {
    const upstream = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${openRouterKey}`
      },
      body: JSON.stringify({
        model: requestedModel,
        messages: [{ role: 'system', content: systemPrompt }, ...messages],
        stream: true
      })
    })

    if (!upstream.ok || !upstream.body) {
      const text = await upstream.text().catch(() => '')
      res.status(upstream.status).send(text || 'Upstream request failed')
      return
    }

    res.status(upstream.status)
    res.setHeader('Content-Type', upstream.headers.get('content-type') || 'text/event-stream')
    res.setHeader('Cache-Control', 'no-cache, no-transform')
    res.setHeader('Connection', 'keep-alive')

    for await (const chunk of upstream.body) {
      res.write(Buffer.from(chunk))
    }

    res.end()
  } catch (error) {
    res.status(500).json({ error: 'Failed to stream OpenRouter response' })
  }
})

app.listen(port, () => {
  console.log(`SmashIt backend listening on ${port}`)
})
