import { Button } from '../atoms/ui/button'

type ActionAlertProps = { message: string; onDismiss: () => void }

/**
 * A write that did not go through, announced by `role="alert"` right above the bottom navigation. The
 * focus stays on the button the parent just pressed.
 */
export function ActionAlert({ message, onDismiss }: ActionAlertProps) {
  return (
    <div
      role="alert"
      className="fixed inset-x-4 bottom-[calc(var(--bottom-nav-height)+env(safe-area-inset-bottom)+0.5rem)] z-50 mx-auto flex max-w-md items-start gap-3 rounded-2xl bg-foreground px-4 py-3 text-sm text-background shadow-lg"
    >
      <p className="flex-1">{message}</p>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={onDismiss}
        className="text-background hover:bg-background/15 hover:text-background"
      >
        Fermer
      </Button>
    </div>
  )
}
