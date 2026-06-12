import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './style.css'

// Global error handler to help catch crashes
window.onerror = (msg, url, line, col, error) => {
  const root = document.getElementById('root')
  if (root) {
    root.innerHTML = `<div style="color: red; padding: 20px; font-family: monospace;">
      <h3>Runtime Error:</h3>
      <p>${msg}</p>
      <pre>${error?.stack || ''}</pre>
    </div>`
  }
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)

