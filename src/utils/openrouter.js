const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001'

export async function streamCoachResponse({ systemPrompt, messages, signal }) {
  const response = await fetch(`${API_BASE_URL}/api/coach`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ systemPrompt, messages, model: 'google/gemini-2.0-flash-001' }),
    signal
  })

  if (!response.ok || !response.body) {
    throw new Error('Coach request failed')
  }

  return response
}

export async function testOpenRouterConnection() {
  const response = await fetch(`${API_BASE_URL}/api/test-openrouter`, { method: 'POST' })
  if (!response.ok) {
    throw new Error('Connection test failed')
  }
  return response.json()
}

export async function fetchBackendHealth() {
  const response = await fetch(`${API_BASE_URL}/api/health`)
  if (!response.ok) {
    throw new Error('Health check failed')
  }
  return response.json()
}
