import { useMemo, useRef, useState } from 'react'
import { Client } from '@gradio/client'
import { signInWithPopup, signOut } from 'firebase/auth'
import { auth, googleProvider } from './firebase'
import { useAuth } from './useAuth'

type ChatMessage = {
  role: 'user' | 'assistant'
  content: string
}

function useGradioUrl() {
  const url = import.meta.env.VITE_GRADIO_URL as string | undefined
  return (url && url.trim()) || 'http://127.0.0.1:7860'
}

export default function App() {
  const gradioUrl = useGradioUrl()
  const clientRef = useRef<Awaited<ReturnType<typeof Client.connect>> | null>(null)
  const { user, loading } = useAuth()

  const [tab, setTab] = useState<'chat' | 'skin'>('chat')

  const [chatInput, setChatInput] = useState('')
  const [chat, setChat] = useState<ChatMessage[]>([])
  const [chatBusy, setChatBusy] = useState(false)
  const [chatError, setChatError] = useState<string | null>(null)

  const [imageFile, setImageFile] = useState<File | null>(null)
  const [skinBusy, setSkinBusy] = useState(false)
  const [skinResult, setSkinResult] = useState<string>('')
  const [skinError, setSkinError] = useState<string | null>(null)

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
    setChat((prev) => [...prev, { role: 'user', content: message }])

    try {
      const client = await getClient()
      // ChatBot_1.0 exposes api_name="chat" and returns [text_output, text_output]
      const result = await client.predict('/chat', [message])
      const reply = Array.isArray(result?.data) ? String(result.data[0] ?? '') : String(result?.data ?? '')

      setChat((prev) => [...prev, { role: 'assistant', content: reply }])
    } catch (e) {
      setChatError(e instanceof Error ? e.message : String(e))
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
      // Gradio expects a file-like object; @gradio/client supports passing a File directly.
      const result = await client.predict('/skin', [imageFile])
      const text = Array.isArray(result?.data) ? String(result.data[0] ?? '') : String(result?.data ?? '')
      setSkinResult(text)
    } catch (e) {
      setSkinError(e instanceof Error ? e.message : String(e))
    } finally {
      setSkinBusy(false)
    }
  }

  async function onLogin() {
    await signInWithPopup(auth, googleProvider)
  }

  async function onLogout() {
    await signOut(auth)
    setChat([])
    setChatInput('')
    setChatError(null)
    setImageFile(null)
    setSkinResult('')
    setSkinError(null)
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
            <div className="title">AI Medical Chatbot</div>
            <div className="subtitle">
              Sign in required • Backend: <code>{gradioUrl}</code>
            </div>
          </div>
        </header>
        <main className="card">
          <div className="empty">
            Please sign in to continue.
            <div className="actions" style={{ marginTop: 12 }}>
              <button onClick={onLogin}>Sign in with Google</button>
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
          <div className="title">AI Medical Chatbot</div>
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
            {chat.length === 0 ? (
              <div className="empty">
                Describe symptoms like <code>I have headache and fever</code>.
              </div>
            ) : (
              chat.map((m, idx) => (
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
              placeholder="Type your symptoms..."
              disabled={chatBusy}
            />
            <button onClick={onSendChat} disabled={chatBusy || !chatInput.trim()}>
              {chatBusy ? 'Sending…' : 'Send'}
            </button>
            <button
              onClick={() => {
                setChat([])
                setChatError(null)
              }}
              disabled={chatBusy || chat.length === 0}
              className="secondary"
            >
              Clear
            </button>
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

      <footer className="footer">
        Disclaimer: educational only; not medical advice.
      </footer>
    </div>
  )
}

