import { MpvBindingError } from '../errors.js'
import type { NativeClient } from '../native.js'
import type { Subscriptions } from '../subscriptions.js'
import { ManagedOutput, validateInput, type NativeOutput, type VideoOperation } from './output.js'

const formats = ['rgb0', 'bgr0', '0rgb', '0bgr', 'rgb24'] as const
export type SoftwarePixelFormat = (typeof formats)[number]
export interface SoftwareVideoConfiguration {
  readonly width: number
  readonly height: number
  readonly pixelFormat: SoftwarePixelFormat
}
export interface SoftwareVideoOptions {
  readonly renderer: 'software'
  readonly width: number
  readonly height: number
  readonly pixelFormat?: SoftwarePixelFormat
}
export interface SoftwareFrame extends SoftwareVideoConfiguration {
  readonly sequence: bigint
  readonly stride: number
  readonly data: Uint8Array<ArrayBuffer>
  readonly targetTimeNs: bigint | null
  readonly redraw: boolean
  readonly repeat: boolean
  readonly blockVsync: boolean
}
export interface NativeSoftware extends NativeOutput<SoftwareVideoConfiguration, SoftwareFrame> {
  readonly renderer: 'software'
}

export function softwareConfiguration(
  input: SoftwareVideoOptions | SoftwareVideoConfiguration,
  operation: VideoOperation,
): SoftwareVideoConfiguration {
  const create = operation === 'createMpv'
  validateInput(
    input,
    create ? ['renderer', 'width', 'height', 'pixelFormat'] : ['width', 'height', 'pixelFormat'],
    operation,
  )
  const format = input.pixelFormat === undefined && create ? 'bgr0' : input.pixelFormat
  if (!format || !formats.includes(format)) {
    throw new MpvBindingError('invalidArgument', operation)
  }
  return { width: input.width, height: input.height, pixelFormat: format }
}

export let wrapSoftwareOutput: (
  output: NativeSoftware,
  client: NativeClient,
  subscriptions: Subscriptions,
) => SoftwareVideoOutput
export class SoftwareVideoOutput extends ManagedOutput<
  SoftwareVideoConfiguration,
  SoftwareFrame,
  SoftwareFrame
> {
  readonly renderer = 'software' as const
  private constructor(output: NativeSoftware, client: NativeClient, subscriptions: Subscriptions) {
    super(output, client, subscriptions, softwareConfiguration, (frame) => frame)
  }
  static {
    wrapSoftwareOutput = (output, client, subscriptions) =>
      new SoftwareVideoOutput(output, client, subscriptions)
  }
}
