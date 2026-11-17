import { releaseUrl } from '@/lib/version'

type AppTitleProps = {
  title: string
  version: string
}

/**
 * The page's single `h1`, followed by the app version linking to its release notes. The link sits
 * outside the heading so screen readers keep announcing the bare title; its padding, offset by a
 * negative margin, gives a finger-sized hit area without moving the baseline.
 */
export function AppTitle({ title, version }: AppTitleProps) {
  return (
    <div className="flex flex-wrap items-baseline gap-x-2">
      <h1 className="font-heading text-3xl font-semibold leading-tight">{title}</h1>
      <a
        href={releaseUrl(version)}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={`Notes de la version ${version} (nouvel onglet)`}
        className="-my-3 rounded-sm py-3 text-sm text-muted-foreground underline-offset-4 hover:underline focus-visible:underline"
      >
        v{version}
      </a>
    </div>
  )
}
