import { MpvBindingError } from '../errors.js'
import type { VideoTarget } from './gpu.js'

export interface NativeDmaBufPlane {
  readonly fd: number
  readonly stride: number
  readonly offset: bigint
  readonly size: bigint
}

export type NativeFrameSurface =
  | {
      readonly kind: 'd3d11'
      readonly handle: Uint8Array<ArrayBuffer>
      readonly adapterLuid: bigint
    }
  | { readonly kind: 'ioSurface'; readonly handle: Uint8Array<ArrayBuffer> }
  | {
      readonly kind: 'dmaBuf'
      readonly format: number
      readonly modifier: bigint
      readonly planes: readonly [NativeDmaBufPlane, ...NativeDmaBufPlane[]]
    }

interface NativeLease {
  duplicate(): NativeLease | null
  release(): void
  surface(): NativeFrameSurface | null
}

export interface FrameImage {
  readonly sequence: bigint
  readonly width: number
  readonly height: number
  readonly pixelFormat: 'bgra8unorm' | 'rgba8unorm'
  readonly colorSpace: VideoTarget['colorSpace']
  readonly targetTimeNs: bigint | null
  readonly redraw: boolean
  readonly repeat: boolean
  readonly blockVsync: boolean
  readonly lease: NativeLease
}

export let wrapFrame: (image: FrameImage) => NativeFrame

export class NativeFrame {
  #lease: NativeLease | null
  readonly sequence: bigint
  readonly width: number
  readonly height: number
  readonly visibleRect: Readonly<{ x: number; y: number; width: number; height: number }>
  readonly pixelFormat: FrameImage['pixelFormat']
  readonly alphaMode = 'opaque' as const
  readonly target: VideoTarget
  readonly targetTimeNs: bigint | null
  readonly redraw: boolean
  readonly repeat: boolean
  readonly blockVsync: boolean

  private constructor(
    image: Omit<FrameImage, 'colorSpace' | 'lease'>,
    target: VideoTarget,
    lease: NativeLease,
  ) {
    this.#lease = lease
    this.sequence = image.sequence
    this.width = image.width
    this.height = image.height
    this.visibleRect = Object.freeze({ x: 0, y: 0, width: image.width, height: image.height })
    this.pixelFormat = image.pixelFormat
    this.target = target
    this.targetTimeNs = image.targetTimeNs
    this.redraw = image.redraw
    this.repeat = image.repeat
    this.blockVsync = image.blockVsync
    Object.freeze(this)
  }
  static {
    wrapFrame = (image) =>
      new NativeFrame(image, Object.freeze({ colorSpace: image.colorSpace }), image.lease)
  }
  get released() {
    return this.#lease === null
  }
  getSurface(): NativeFrameSurface {
    const surface = this.#lease?.surface()
    if (!surface) {
      throw new MpvBindingError('frameReleased', 'getFrameSurface')
    }
    return surface
  }
  clone(): NativeFrame {
    const lease = this.#lease?.duplicate()
    if (!lease) {
      throw new MpvBindingError('frameReleased', 'cloneFrame')
    }
    return new NativeFrame(this, this.target, lease)
  }
  release() {
    this.#lease?.release()
    this.#lease = null
  }
  [Symbol.dispose]() {
    this.release()
  }
}
