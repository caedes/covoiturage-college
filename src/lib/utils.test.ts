import { describe, expect, it } from 'vitest'
import { cn } from './utils'

describe('cn', () => {
  it('laisse la dernière classe Tailwind gagner en cas de conflit', () => {
    expect(cn('px-2 text-sm', 'px-4')).toBe('text-sm px-4')
  })

  it('ignore les valeurs fausses', () => {
    expect(cn('font-heading', false, undefined, null, '')).toBe('font-heading')
  })
})
