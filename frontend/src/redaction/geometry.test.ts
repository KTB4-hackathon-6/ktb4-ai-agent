import { describe, expect, it } from 'vitest'
import { createNormalizedBox, isUsableBox, toPixelBox } from './geometry'

describe('redaction geometry', () => {
  it('creates a box regardless of drag direction', () => {
    expect(createNormalizedBox(0.8, 0.7, 0.2, 0.1)).toEqual({
      x: 0.2,
      y: 0.1,
      width: 0.6000000000000001,
      height: 0.6,
    })
  })

  it('clamps a dragged box to the page boundary', () => {
    expect(createNormalizedBox(-0.2, 0.2, 1.4, 0.9)).toEqual({
      x: 0,
      y: 0.2,
      width: 1,
      height: 0.7,
    })
  })

  it('converts normalized coordinates to export pixels', () => {
    expect(toPixelBox({ x: 0.25, y: 0.1, width: 0.5, height: 0.2 }, 2000, 1000)).toEqual({
      x: 500,
      y: 100,
      width: 1000,
      height: 200,
    })
  })

  it('rejects accidental clicks and tiny drags', () => {
    expect(isUsableBox({ x: 0.2, y: 0.2, width: 0.005, height: 0.2 })).toBe(false)
    expect(isUsableBox({ x: 0.2, y: 0.2, width: 0.02, height: 0.02 })).toBe(true)
  })
})
