/** Strings that only a build wired to the Firebase emulators may contain. */
const TRACES = ['127.0.0.1:9099', '127.0.0.1:8080', 'demo-covoiturage']

/** The emulator traces found in one bundle file, in the order of `TRACES`. */
export function emulatorTraces(content: string): string[] {
  return TRACES.filter((trace) => content.includes(trace))
}
