import type { NormalizedBox } from './types'

const clampUnit = (value: number) => Math.min(1, Math.max(0, value))

export function createNormalizedBox(
  startX: number,
  startY: number,
  endX: number,
  endY: number,
): NormalizedBox {
  const left = clampUnit(Math.min(startX, endX))
  const top = clampUnit(Math.min(startY, endY))
  const right = clampUnit(Math.max(startX, endX))
  const bottom = clampUnit(Math.max(startY, endY))

  return {
    x: left,
    y: top,
    width: right - left,
    height: bottom - top,
  }
}

export function toPixelBox(box: NormalizedBox, width: number, height: number) {
  return {
    x: Math.floor(box.x * width),
    y: Math.floor(box.y * height),
    width: Math.ceil(box.width * width),
    height: Math.ceil(box.height * height),
  }
}

export function isUsableBox(box: NormalizedBox) {
  return box.width >= 0.01 && box.height >= 0.01
}
