export type CameraTrack = {
  duration: number
  fps: number
  referenceAspect: number
  keys: number[][]
}

export type LoadState = {
  phase: 'loading' | 'preparing' | 'ready' | 'error'
  loaded: number
  total: number
}

export const ATELIER_INVALIDATE = 'atelier:invalidate'
export const STATIC_CAMERA_TIME = 11.8
export const STATIC_SCENE_TIME = 20.5

// Keep the approved horizontal framing; widen only to preserve height on wide screens.
// At the final close-up, portrait screens must also be covered by the black underside.
export function cameraWidth(width: number, aspect: number, referenceAspect: number, progress: number) {
  const fitted = width * Math.max(1, aspect / referenceAspect)
  const blend = Math.max(0, Math.min(1, (progress - 25 / 27) / (2 / 27)))
  const ease = blend * blend * (3 - 2 * blend)
  return fitted + (Math.min(fitted, 5.1 * aspect) - fitted) * ease
}
