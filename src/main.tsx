import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { createBrowserRouter, RouterProvider } from 'react-router'
import './index.css'
import { env } from './env'
import { routes } from './routes/routes'

const router = createBrowserRouter(routes, { basename: env.BASE_URL })

const rootElement = document.getElementById('root')
if (!rootElement) {
  throw new Error("L'élément racine #root est introuvable.")
}

createRoot(rootElement).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
)
