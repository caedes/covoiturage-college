import type { RouteObject } from 'react-router'
import { AuthGate } from '../auth/AuthGate'
import { Home } from './Home'
import { Layout } from './Layout'
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
