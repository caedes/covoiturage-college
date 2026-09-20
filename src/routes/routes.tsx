import type { RouteObject } from 'react-router'
import { AuthGate } from '../auth/AuthGate'
import { Layout } from '../components/Layout'
import { Home } from './Home'
import { NotFound } from './NotFound'

export const routes: RouteObject[] = [
  {
    element: <AuthGate />,
    children: [
      {
        element: <Layout />,
        children: [
          { path: '/', element: <Home /> },
          { path: '*', element: <NotFound /> },
        ],
      },
    ],
  },
]
