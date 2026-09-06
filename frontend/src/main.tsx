import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { getAppConfig } from '@/api/config'

/**
 * `VITE_PREVIEW` swaps the network for mocks so the real app can be reviewed in
 * a browser with no backend (`pnpm dev:mock`). The import is dynamic so msw and
 * the fixtures never reach a production bundle, and the worker is awaited before
 * anything renders — a request that escapes before it is listening would hit a
 * server that isn't there and bounce the router to /sign-in.
 */
async function bootstrap() {
  if (import.meta.env.VITE_PREVIEW === 'true') {
    const { startPreview } = await import('./preview/start')
    await startPreview()
  }

  // Warm the GitHub-OAuth gate config before React mounts so the auth screens
  // render the button without a per-page round-trip (matters on slow networks).
  // Consumers fail closed, so the warm-up's own rejection is swallowed here.
  void getAppConfig().catch(() => {})

  // Agentation's annotation toolbar: click anything in the running app to pin a
  // note, which syncs back to the coding agent over MCP. Dynamic import for the
  // same reason as the mocks above — it never reaches a production bundle.
  const Agentation = import.meta.env.DEV
    ? (await import('agentation')).Agentation
    : null

  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
      {Agentation && <Agentation />}
    </StrictMode>,
  )
}

void bootstrap()
