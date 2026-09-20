import { render, waitFor } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { AuthProvider } from '../auth/AuthProvider'
import { routes } from '../routes/routes'
import { type AuthScenario, member } from './fakeAuth'

type RenderRouteOptions = {
  auth?: AuthScenario
  /** À passer à `false` pour observer l'écran de chargement lui-même. */
  waitForSettled?: boolean
}

export async function renderRoute(initialPath: string, options: RenderRouteOptions = {}) {
  const scenario = options.auth ?? member()
  const router = createMemoryRouter(routes, { initialEntries: [initialPath] })

  const result = render(
    <AuthProvider auth={scenario.auth} members={scenario.members}>
      <RouterProvider router={router} />
    </AuthProvider>,
  )

  if (options.waitForSettled !== false) {
    // On attend l'absence, pas la disparition : selon le scénario, l'état peut
    // être résolu dès le premier rendu et l'indicateur n'apparaître jamais.
    await waitFor(() => {
      if (result.queryByRole('status') !== null) {
        throw new Error("L'écran de chargement est toujours affiché.")
      }
    })
  }

  return result
}
