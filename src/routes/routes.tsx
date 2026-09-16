import type { RouteObject } from 'react-router'
import { Layout } from '../components/Layout'
import { Home } from './Home'
import { NotFound } from './NotFound'

export const routes: RouteObject[] = [
  {
    element: <Layout />,
    children: [
      { path: '/', element: <Home /> },
      { path: '*', element: <NotFound /> },
    ],
  },
]
