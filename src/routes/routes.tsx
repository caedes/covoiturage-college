import type { RouteObject } from 'react-router'
import { AuthGate } from '../auth/AuthGate'
import { PlanningPage } from '../components/pages/PlanningPage'
import { Layout } from './Layout'
import { NotFound } from './NotFound'

export const routes: RouteObject[] = [
  {
    element: <AuthGate />,
    children: [
      {
        element: <Layout />,
        children: [
          { path: '/', element: <PlanningPage /> },
          { path: '*', element: <NotFound /> },
        ],
      },
    ],
  },
]
