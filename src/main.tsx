import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import ErrorBoundary from './components/ErrorBoundary'
import './index.css'

// HashRouter routes live after # (e.g. /#/login). Redirect plain paths like /login for local dev bookmarks.
const { pathname, search, hash } = window.location
if (!hash && pathname && pathname !== '/') {
  window.location.replace(`${window.location.origin}/#${pathname}${search}`)
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>,
)

