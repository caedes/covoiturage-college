/** The documented example, with fictitious families only: what `npm run dev` loads by default. */
export const DEFAULT_DATA_PATH = 'data/import.example.json'

/** The data file to import into the emulators: the first argument, or the documented example. */
export function resolveDataPath(args: string[]): string {
  return args[0] ?? DEFAULT_DATA_PATH
}

/** Quotes one argument for `sh`, which runs the command handed to `emulators:exec`. */
function shellQuote(value: string): string {
  return `'${value.replaceAll("'", `'\\''`)}'`
}

/** The command run inside `emulators:exec`: import the data, then start Vite. */
export function sessionCommand(dataPath: string): string {
  return `tsx scripts/dev/session.ts ${shellQuote(dataPath)}`
}

/** `npx` arguments that start the Auth and Firestore emulators around the dev session. */
export function emulatorsExecArgs(dataPath: string): string[] {
  return [
    '--yes',
    'firebase-tools@15',
    'emulators:exec',
    '--project',
    'demo-covoiturage',
    '--only',
    'auth,firestore',
    sessionCommand(dataPath),
  ]
}

/**
 * A copy of the environment without the service account key: whatever the developer's shell
 * exports, nothing started by `npm run dev` holds the credentials of the production project.
 */
export function withoutServiceAccount(env: NodeJS.ProcessEnv): NodeJS.ProcessEnv {
  const { GOOGLE_APPLICATION_CREDENTIALS: _removed, ...rest } = env
  return rest
}

/** Whether the import script reported the emulator as its target, on its first line. */
export function isEmulatorImport(output: string): boolean {
  return output.startsWith('Cible : émulateur')
}
