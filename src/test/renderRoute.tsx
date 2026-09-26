import { render, waitFor } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { AuthProvider } from '../auth/AuthProvider'
import { PlanningProvider } from '../components/pages/PlanningProvider'
import { routes } from '../routes/routes'
import { type AuthScenario, member } from './fakeAuth'
import { type PlanningScenario, planning } from './fakePlanning'

/** Wednesday 30 September 2026, 10:00 in Paris: "Cette semaine" starts on Monday 28. */
export const TEST_NOW = new Date('2026-09-30T08:00:00Z')

type RenderRouteOptions = {
  auth?: AuthScenario
  planning?: PlanningScenario
  now?: Date
  /** Pass `false` to observe a loading screen itself. */
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
  const current = options.planning ?? planning()
  const now = options.now ?? TEST_NOW
  const router = createMemoryRouter(routes, { initialEntries: [initialPath] })

  const result = render(
    <AuthProvider auth={scenario.auth} members={scenario.members}>
      <PlanningProvider repository={current.repository} now={() => now}>
        <RouterProvider router={router} />
      </PlanningProvider>
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
