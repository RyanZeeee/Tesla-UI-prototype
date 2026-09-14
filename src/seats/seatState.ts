export type SeatSide = 0 | 1
export type SeatAxis = 'position' | 'recline'
export interface SeatPose { position: number; recline: number }
export type SeatPair = [SeatPose, SeatPose]
export const defaultSeat = (): SeatPose => ({ position: 0, recline: 0 })
export const defaultSeats = (): SeatPair => [defaultSeat(), defaultSeat()]
export const seatLimits: Record<SeatAxis, [number, number]> = { position: [-1, 1], recline: [-.16, .48] }
export function clampSeat(axis: SeatAxis, value: number) { const [min, max] = seatLimits[axis]; return Math.max(min, Math.min(max, value)) }
export const seatStorageKey = 'tesla-prototype.front-seats.v1'
export function readSeats(): SeatPair {
  try {
    const saved: unknown = JSON.parse(localStorage.getItem(seatStorageKey) || 'null')
    if (!Array.isArray(saved) || saved.length !== 2) return defaultSeats()
    return saved.map(value => {
      if (!value || typeof value !== 'object') return defaultSeat()
      const pose = defaultSeat()
      // Keep saved fore/aft and backrest settings; ignore legacy seat lift values.
      for (const axis of ['position', 'recline'] as const) {
        if (typeof value[axis] === 'number' && Number.isFinite(value[axis])) pose[axis] = clampSeat(axis, value[axis])
      }
      return pose
    }) as SeatPair
  } catch { return defaultSeats() }
}
