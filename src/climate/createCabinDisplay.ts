import { CanvasTexture, SRGBColorSpace } from 'three'

/** A subdued standby screen, drawn in code on the original LCD surface. */
export function createCabinDisplay() {
  const canvas = document.createElement('canvas')
  canvas.width = 512; canvas.height = 384
  const context = canvas.getContext('2d')!
  context.fillStyle = '#080c12'
  context.fillRect(0, 0, 512, 384)
  const glow = context.createRadialGradient(285, 260, 0, 265, 215, 290)
  glow.addColorStop(0, '#283747')
  glow.addColorStop(.55, '#17232f')
  glow.addColorStop(1, '#090e16')
  context.fillStyle = glow
  context.fillRect(14, 14, 484, 356)
  context.textAlign = 'center'
  context.textBaseline = 'middle'
  context.font = '300 48px -apple-system, BlinkMacSystemFont, sans-serif'
  context.fillStyle = '#7e8995'
  // Match the prototype's dashboard clock.
  context.fillText('10:21', 256, 173)
  context.font = '500 12px -apple-system, BlinkMacSystemFont, sans-serif'
  context.fillStyle = '#526172'
  context.fillText('T E S L A', 256, 219)
  context.fillStyle = '#3c5365'
  context.fillRect(242, 324, 28, 2)
  const texture = new CanvasTexture(canvas)
  texture.colorSpace = SRGBColorSpace
  return texture
}
