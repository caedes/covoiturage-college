import { render, waitFor } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { AuthProvider } from '../auth/AuthProvider'
import { routes } from '../routes/routes'
import { type AuthScenario, member } from './fakeAuth'

type RenderRouteOptions = {
  auth?: AuthScenario
  /** Pass `false` to observe the loading screen itself. */
  waitForSettled?: boolean
}

/**
 * Renders a route through the real route table, behind a controlled auth scenario.
 *
 * Settling waits for the loading indicator to be *absent* rather than to disappear: depending
 * on the scenario the state can resolve on the first render, and the indicator then never
 * appears at all.
 */
export async function renderRoute(initialPath: string, options: RenderRouteOptions = {}) {
  const scenario = options.auth ?? member()
  const router = createMemoryRouter(routes, { initialEntries: [initialPath] })

  const result = render(
    <AuthProvider auth={scenario.auth} members={scenario.members}>
      <RouterProvider router={router} />
    </AuthProvider>,
  )

  if (options.waitForSettled !== false) {
    await waitFor(() => {
      if (result.queryByRole('status') !== null) {
        throw new Error("L'écran de chargement est toujours affiché.")
      }
    })
  }

  return result
}
