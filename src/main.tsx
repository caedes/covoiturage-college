import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { createBrowserRouter, RouterProvider } from 'react-router'
import './index.css'
import { AuthProvider } from './auth/AuthProvider'
import { env } from './env'
import { firebaseAuthPort } from './firebase/firebaseAuth'
import { firebaseMemberRepository } from './firebase/firebaseMembers'
import { routes } from './routes/routes'

const router = createBrowserRouter(routes, { basename: env.BASE_URL })

const rootElement = document.getElementById('root')
if (!rootElement) {
  throw new Error("L'élément racine #root est introuvable.")
}

createRoot(rootElement).render(
  <StrictMode>
    <AuthProvider auth={firebaseAuthPort} members={firebaseMemberRepository}>
      <RouterProvider router={router} />
    </AuthProvider>
  </StrictMode>,
)
