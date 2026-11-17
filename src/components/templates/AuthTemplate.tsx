import type { ReactNode } from 'react'
import { APP_VERSION } from '@/lib/version'
import { Card, CardContent } from '../atoms/ui/card'
import { AppTitle } from '../molecules/AppTitle'

type AuthTemplateProps = {
  title: string
  children: ReactNode
}

/**
 * Frame shared by the screens shown before access is granted. They sit above `Layout`, so the
 * template carries their `main` landmark and their single `h1`.
 */
export function AuthTemplate({ title, children }: AuthTemplateProps) {
  return (
    <main
      id="main"
      tabIndex={-1}
      className="grid min-h-dvh place-items-center bg-background px-4 py-8"
    >
      <Card className="w-full max-w-md">
        <CardContent className="flex flex-col gap-4">
          <AppTitle title={title} version={APP_VERSION} />
          {children}
        </CardContent>
      </Card>
    </main>
  )
}
