import { useEffect, useMemo, useRef, useState } from 'react'
import { Client } from '@gradio/client'
import { signInWithPopup, signOut, type AuthProvider } from 'firebase/auth'
import { auth, googleProvider, githubProvider } from './firebase'
import { useAuth } from './useAuth'
import './history.css'

type HistoryMessage = { role: 'user' | 'assistant'; content: string }
type ChatSession = { id: string; date: string; messages: HistoryMessage[] }

function useGradioUrl() {
  const url = import.meta.env.VITE_GRADIO_URL as string | undefined
  return (url && url.trim()) || 'http://127.0.0.1:7861'
}

export default function App() {
  // console.log('App starting...')
  const gradioUrl = useGradioUrl()
  const clientRef = useRef<Awaited<ReturnType<typeof Client.connect>> | null>(null)
  const { user, loading } = useAuth()

  const [tab, setTab] = useState<'chat' | 'skin' | 'history'>('chat')

  const [chatInput, setChatInput] = useState('')
  const [history, setHistory] = useState<HistoryMessage[]>([])
  const [sessions, setSessions] = useState<ChatSession[]>([])
  const [chatBusy, setChatBusy] = useState(false)
  const [chatError, setChatError] = useState<string | null>(null)

  const [imageFile, setImageFile] = useState<File | null>(null)
  const [skinBusy, setSkinBusy] = useState(false)
  const [skinResult, setSkinResult] = useState<string>('')
  const [skinError, setSkinError] = useState<string | null>(null)

  // Load everything from localStorage
  useEffect(() => {
    if (user) {
      const savedHistory = localStorage.getItem(`chat_history_${user.uid}`)
      const savedSessions = localStorage.getItem(`chat_sessions_${user.uid}`)
      
      if (savedHistory) {
        try { setHistory(JSON.parse(savedHistory)) } catch(e) {}
      }
      if (savedSessions) {
        try { setSessions(JSON.parse(savedSessions)) } catch(e) {}
      }
    } else {
      setHistory([])
      setSessions([])
    }
  }, [user])

  // Save active history
  useEffect(() => {
    if (user && history.length > 0) {
      localStorage.setItem(`chat_history_${user.uid}`, JSON.stringify(history))
    }
  }, [history, user])

  // Save all sessions
  useEffect(() => {
    if (user) {
      localStorage.setItem(`chat_sessions_${user.uid}`, JSON.stringify(sessions))
    }
  }, [sessions, user])

  const imagePreviewUrl = useMemo(() => {
    if (!imageFile) return null
    return URL.createObjectURL(imageFile)
  }, [imageFile])

  async function getClient() {
    if (!clientRef.current) clientRef.current = await Client.connect(gradioUrl)
    return clientRef.current
  }

  async function onSendChat() {
    const message = chatInput.trim()
    if (!message || chatBusy) return

    setChatError(null)
    setChatBusy(true)
    setChatInput('')
    
    // Add user message optimistically
    const currentHistory = [...history]
    setHistory([...currentHistory, { role: 'user', content: message }])

    try {
      const client = await getClient()
      
      // Use submit() for better event handling and queue support
      const job = client.submit('/chat', [message, history])
      
      for await (const msg of job) {
        if (msg.type === 'data') {
          const result = msg.data
          const data = Array.isArray(result) ? result : [result]
          
          let updated = data?.[1] ?? data?.[0]

          if (Array.isArray(updated)) {
            const normalized = updated
              .map((m: any) => {
                if (m && typeof m === 'object') {
                  const role = m.role === 'user' || m.role === 0 ? 'user' : 'assistant'
                  let content = ''
                  const raw = m.content ?? m.text ?? m.value
                  
                  if (typeof raw === 'string') {
                    content = raw
                  } else if (Array.isArray(raw)) {
                    content = raw
                      .map((block: any) => (typeof block === 'string' ? block : block?.text ?? block?.value ?? ''))
                      .join('\n')
                  } else if (raw && typeof raw === 'object') {
                    content = raw.text ?? raw.value ?? JSON.stringify(raw)
                  }
                  return { role, content: content.trim() }
                }
                return null
              })
              .filter(Boolean) as HistoryMessage[]
            
            if (normalized.length) {
              setHistory(normalized)
            }
          } else if (typeof updated === 'string') {
            setHistory(prev => [...prev, { role: 'assistant', content: updated as string }])
          }
        }
      }
    } catch (e) {
      console.error('Chat Error:', e)
      setChatError(e instanceof Error ? e.message : JSON.stringify(e))
    } finally {
      setChatBusy(false)
    }
  }

  async function onAnalyzeSkin() {
    if (!imageFile || skinBusy) return
    setSkinError(null)
    setSkinBusy(true)
    setSkinResult('')

    try {
      const client = await getClient()
      const result = await client.predict('/skin', [imageFile])
      const text = Array.isArray(result?.data) ? String(result.data[0] ?? '') : String(result?.data ?? '')
      setSkinResult(text)
    } catch (e) {
      setSkinError(e instanceof Error ? e.message : String(e))
    } finally {
      setSkinBusy(false)
    }
  }

  async function onLogin(provider: AuthProvider | undefined) {
    if (!auth || !provider) {
      alert('Login is currently unavailable. Check your Firebase configuration.')
      return
    }
    try {
      await signInWithPopup(auth, provider)
    } catch (e) {
      console.error('Login Error:', e)
    }
  }

  async function onLogout() {
    if (!auth) return
    if (user) {
      localStorage.removeItem(`chat_history_${user.uid}`)
      localStorage.removeItem(`chat_sessions_${user.uid}`)
    }
    await signOut(auth)
    setHistory([])
    setSessions([])
    setChatInput('')
    setChatError(null)
    setImageFile(null)
    setSkinResult('')
    setSkinError(null)
  }

  function onSaveAndNew() {
    if (history.length > 0) {
      const newSession: ChatSession = {
        id: crypto.randomUUID(),
        date: new Date().toLocaleString(),
        messages: [...history],
      }
      setSessions([newSession, ...sessions])
      setHistory([])
      localStorage.removeItem(`chat_history_${user?.uid}`)
    }
  }

  function onRestoreSession(session: ChatSession) {
    // If current history exists, save it before overwriting
    if (history.length > 0) {
      const currentAsSession: ChatSession = {
        id: crypto.randomUUID(),
        date: new Date().toLocaleString(),
        messages: [...history],
      }
      setSessions([currentAsSession, ...sessions.filter(s => s.id !== session.id)])
    } else {
      setSessions(sessions.filter(s => s.id !== session.id))
    }
    setHistory(session.messages)
    setTab('chat')
  }

  function onDeleteSession(id: string) {
    setSessions(sessions.filter(s => s.id !== id))
  }

  if (loading) {
    return (
      <div className="page">
        <main className="card">
          <div className="empty">Loading…</div>
        </main>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="page">
        <header className="header">
          <div>
            <div className="title">AI Medical Assistant</div>
            <div className="subtitle">
              Sign in required • Backend: <code>{gradioUrl}</code>
            </div>
          </div>
        </header>
        <main className="card">
          <div className="empty">
            Please sign in to continue.
            <div className="actions" style={{ marginTop: 12, display: 'flex', gap: 8 }}>
              <button onClick={() => onLogin(googleProvider)}>Sign in with Google</button>
              <button onClick={() => onLogin(githubProvider)}>Sign in with GitHub</button>
            </div>
          </div>
        </main>
        <footer className="footer">Disclaimer: educational only; not medical advice.</footer>
      </div>
    )
  }

  return (
    <div className="page">
      <header className="header">
        <div>
          <div className="title">AI Medical Assistant</div>
          <div className="subtitle">
            React UI • Backend: <code>{gradioUrl}</code>
          </div>
          <div className="subtitle">
            Signed in as <code>{user.email ?? user.displayName ?? 'user'}</code>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <nav className="tabs" aria-label="Sections">
            <button className={tab === 'chat' ? 'tab active' : 'tab'} onClick={() => setTab('chat')}>
              Medical Chat
            </button>
            <button className={tab === 'history' ? 'tab active' : 'tab'} onClick={() => setTab('history')}>
              History
            </button>
            <button className={tab === 'skin' ? 'tab active' : 'tab'} onClick={() => setTab('skin')}>
              Skin Disease Detection
            </button>
          </nav>
          <button className="secondary" onClick={onLogout}>
            Logout
          </button>
        </div>
      </header>

      {tab === 'chat' ? (
        <main className="card">
          <div className="chat">
            {history.length === 0 ? (
              <div className="empty">Describe your symptoms to get guidance.</div>
            ) : (
              history.map((m, idx) => (
                <div key={idx} className={m.role === 'user' ? 'msg user' : 'msg bot'}>
                  <div className="msgRole">{m.role === 'user' ? 'You' : 'AI'}</div>
                  <div className="msgText">{m.content}</div>
                </div>
              ))
            )}
          </div>

          {chatError ? <div className="error">Error: {chatError}</div> : null}

          <div className="composer">
            <input
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') onSendChat()
              }}
              placeholder="Describe your symptoms..."
              disabled={chatBusy}
            />
            <button onClick={onSendChat} disabled={chatBusy || !chatInput.trim()}>
              {chatBusy ? 'Sending…' : 'Send'}
            </button>
            <button className="secondary" onClick={onSaveAndNew} disabled={chatBusy || history.length === 0}>
              Save & New Chat
            </button>
            <button
              className="secondary"
              onClick={() => {
                setHistory([])
                setChatError(null)
                if (user) localStorage.removeItem(`chat_history_${user.uid}`)
              }}
              disabled={chatBusy || history.length === 0}
            >
              Clear
            </button>
          </div>
        </main>
      ) : tab === 'history' ? (
        <main className="card">
          <div className="sessions">
            {sessions.length === 0 ? (
              <div className="empty">No saved conversations yet.</div>
            ) : (
              <div className="sessionsList">
                {sessions.map((s) => (
                  <div key={s.id} className="sessionItem">
                    <div className="sessionInfo">
                      <div className="sessionDate">{s.date}</div>
                      <div className="sessionPreview">
                        "{s.messages[0]?.content.substring(0, 60)}..."
                      </div>
                    </div>
                    <div className="sessionActions">
                      <button onClick={() => onRestoreSession(s)}>Restore</button>
                      <button className="secondary" onClick={() => onDeleteSession(s.id)}>Delete</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </main>
      ) : (
        <main className="card">
          <div className="row">
            <div className="col">
              <label className="label">Upload skin image</label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setImageFile(e.target.files?.[0] ?? null)}
                disabled={skinBusy}
              />
              {imagePreviewUrl ? (
                <img className="preview" src={imagePreviewUrl} alt="Selected skin" />
              ) : (
                <div className="empty">Choose an image to analyze.</div>
              )}
              <div className="actions">
                <button onClick={onAnalyzeSkin} disabled={!imageFile || skinBusy}>
                  {skinBusy ? 'Analyzing…' : 'Analyze'}
                </button>
                <button
                  className="secondary"
                  onClick={() => {
                    setImageFile(null)
                    setSkinResult('')
                    setSkinError(null)
                  }}
                  disabled={skinBusy || (!imageFile && !skinResult && !skinError)}
                >
                  Reset
                </button>
              </div>
              {skinError ? <div className="error">Error: {skinError}</div> : null}
            </div>
            <div className="col">
              <label className="label">Result</label>
              <pre className="result">{skinResult || '—'}</pre>
            </div>
          </div>
        </main>
      )}

      <footer className="footer">Disclaimer: educational only; not medical advice.</footer>
    </div>
  )
}

