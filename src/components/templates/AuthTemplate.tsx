import type { ReactNode } from 'react'
import { Card, CardContent } from '../atoms/ui/card'

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
          <h1 className="font-heading text-3xl font-semibold leading-tight">{title}</h1>
          {children}
        </CardContent>
      </Card>
    </main>
  )
}
