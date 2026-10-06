type SplashScreenProps = {
  /** Read by screen readers only: the screen shows no visible title. */
  title: string
  /** Announced by screen readers only. */
  status: string
}

/**
 * Full-screen car shown while access is checked. It reuses the `splash` class that `index.html`
 * styles inline, so it takes over from the static splash without a visible change.
 */
export function SplashScreen({ title, status }: SplashScreenProps) {
  return (
    <main id="main" tabIndex={-1} className="splash">
      <h1 className="sr-only">{title}</h1>
      <img src="/icons/car.svg" alt="" />
      <p role="status" className="sr-only">
        {status}
      </p>
    </main>
  )
}
