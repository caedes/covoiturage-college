import { describe, expect, it } from 'vitest'

/**
 * Atomic Design levels, lowest first. A file may import from its own level or a lower one — never
 * from a higher one.
 */
const LEVELS = ['atoms', 'molecules', 'organisms', 'templates', 'pages'] as const
type Level = (typeof LEVELS)[number]

/** Stateful modules and ports: below the page level, only type imports may reach them. */
const PAGE_ONLY_ROOTS = ['src/auth/', 'src/planning/']

const sources = import.meta.glob<string>(['./**/*.{ts,tsx}', '!./**/*.test.{ts,tsx}'], {
  query: '?raw',
  import: 'default',
  eager: true,
})

type ImportRef = { specifier: string; typeOnly: boolean }

const IMPORT_PATTERN =
  /(?:^|\n)\s*(?:import|export)\s+(type\s+)?(?:[^'";]*?\sfrom\s+)?['"]([^'"]+)['"]/g

function readImports(source: string): ImportRef[] {
  return [...source.matchAll(IMPORT_PATTERN)].map((match) => ({
    specifier: match[2] ?? '',
    typeOnly: match[1] !== undefined,
  }))
}

/** Resolves an import to a path from the repository root, or `null` for a package. */
function toRepoPath(fileKey: string, specifier: string): string | null {
  if (specifier.startsWith('@/')) {
    return `src/${specifier.slice(2)}`
  }
  if (!specifier.startsWith('.')) {
    return null
  }
  const segments = `src/components/${fileKey.slice(2)}`.split('/').slice(0, -1)
  for (const part of specifier.split('/')) {
    if (part === '..') {
      segments.pop()
    } else if (part !== '.') {
      segments.push(part)
    }
  }
  return segments.join('/')
}

function levelOf(repoPath: string): Level | null {
  const folder = /^src\/components\/([^/]+)\//.exec(repoPath)?.[1]
  return LEVELS.find((level) => level === folder) ?? null
}

function isFirebase(specifier: string, repoPath: string | null): boolean {
  return (
    specifier === 'firebase' ||
    specifier.startsWith('firebase/') ||
    (repoPath?.startsWith('src/firebase/') ?? false)
  )
}

function eachImport(
  visit: (file: string, level: Level, ref: ImportRef, target: string | null) => void,
) {
  for (const [fileKey, source] of Object.entries(sources)) {
    const level = levelOf(`src/components/${fileKey.slice(2)}`)
    if (level === null) {
      continue
    }
    for (const ref of readImports(source)) {
      visit(fileKey, level, ref, toRepoPath(fileKey, ref.specifier))
    }
  }
}

describe('lecture des imports', () => {
  it('reconnaît les imports multilignes, de type et à effet de bord', () => {
    const source = [
      "import type { Member } from '../../auth/ports'",
      'import {',
      '  Card,',
      '  CardContent,',
      "} from '../atoms/ui/card'",
      "import './styles.css'",
      "export { Button } from '@/components/atoms/ui/button'",
    ].join('\n')

    expect(readImports(source)).toEqual([
      { specifier: '../../auth/ports', typeOnly: true },
      { specifier: '../atoms/ui/card', typeOnly: false },
      { specifier: './styles.css', typeOnly: false },
      { specifier: '@/components/atoms/ui/button', typeOnly: false },
    ])
  })

  it('résout les chemins relatifs et l’alias depuis la racine du dépôt', () => {
    expect(toRepoPath('./templates/AuthTemplate.tsx', '../atoms/ui/card')).toBe(
      'src/components/atoms/ui/card',
    )
    expect(toRepoPath('./atoms/ui/button.tsx', '@/lib/utils')).toBe('src/lib/utils')
    expect(toRepoPath('./atoms/ui/button.tsx', 'react')).toBeNull()
  })
})

describe('architecture Atomic Design', () => {
  it('trouve les composants à contrôler', () => {
    expect(Object.keys(sources)).toContain('./atoms/ui/button.tsx')
  })

  it('range chaque fichier dans un niveau', () => {
    const stray = Object.keys(sources).filter(
      (fileKey) => levelOf(`src/components/${fileKey.slice(2)}`) === null,
    )
    expect(stray).toEqual([])
  })

  it("n'importe jamais un niveau supérieur", () => {
    const violations: string[] = []
    eachImport((file, level, ref, target) => {
      const targetLevel = target === null ? null : levelOf(`${target}/`)
      if (targetLevel !== null && LEVELS.indexOf(targetLevel) > LEVELS.indexOf(level)) {
        violations.push(`${file} (${level}) importe ${ref.specifier} (${targetLevel})`)
      }
    })
    expect(violations).toEqual([])
  })

  it("réserve aux pages l'accès à l'état et aux ports", () => {
    const violations: string[] = []
    eachImport((file, level, ref, target) => {
      const reachesState = PAGE_ONLY_ROOTS.some((root) => target?.startsWith(root) ?? false)
      if (level !== 'pages' && reachesState && !ref.typeOnly) {
        violations.push(`${file} (${level}) importe ${ref.specifier}`)
      }
    })
    expect(violations).toEqual([])
  })

  it('ne laisse aucun composant toucher Firebase', () => {
    const violations: string[] = []
    eachImport((file, _level, ref, target) => {
      if (isFirebase(ref.specifier, target)) {
        violations.push(`${file} importe ${ref.specifier}`)
      }
    })
    expect(violations).toEqual([])
  })
})
