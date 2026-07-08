import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

// Catch global runtime errors and display them on screen if the app crashes
window.addEventListener('error', (event) => {
  const rootEl = document.getElementById('root');
  if (rootEl) {
    rootEl.innerHTML = `
      <div style="background: #0C0C0E; color: #FF5C00; font-family: monospace; padding: 20px; min-height: 100vh; display: flex; flex-direction: column; justify-content: center; align-items: center; border: 2px solid #FF5C00;">
        <h1 style="font-size: 20px; text-transform: uppercase;">[ RUNTIME CRASH DETECTED ]</h1>
        <pre style="background: #050506; border: 1px solid #222226; padding: 15px; border-radius: 4px; color: #F4F4F5; max-width: 90%; white-space: pre-wrap; margin-top: 10px;">${event.error ? event.error.stack : event.message}</pre>
        <p style="color: #71717A; font-size: 11px; text-transform: uppercase; margin-top: 15px;">// Send this stack trace to resolve the blank page.</p>
      </div>
    `;
  }
});

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
