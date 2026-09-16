import type { RouteObject } from 'react-router'
import { Home } from './Home'
import { NotFound } from './NotFound'

export const routes: RouteObject[] = [
  { path: '/', element: <Home /> },
  { path: '*', element: <NotFound /> },
]
