/**
 * Strings that only a build wired to the Firebase emulators may contain. The bare loopback address
 * catches Firestore too, whose host and port are passed as two arguments.
 */
const TRACES = ['127.0.0.1', 'demo-covoiturage']

/** The emulator traces found in one bundle file, in the order of `TRACES`. */
export function emulatorTraces(content: string): string[] {
  return TRACES.filter((trace) => content.includes(trace))
}
