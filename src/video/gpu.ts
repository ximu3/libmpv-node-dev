import { posix } from 'node:path'
import { MpvBindingError } from '../errors.js'
import type { NativeClient } from '../native.js'
import type { Subscriptions } from '../subscriptions.js'
import type { VideoDeviceInfo, VideoDeviceSelection } from './devices.js'
import { wrapFrame, type FrameImage, type NativeFrame } from './frame.js'
import {
  ManagedOutput,
  validateInput,
  type Dimensions,
  type NativeOutput,
  type VideoOperation,
  type WireConfiguration,
} from './output.js'

export interface VideoTarget {
  readonly colorSpace: 'srgb' | 'display-p3'
}
export interface GpuVideoOptions extends Dimensions {
  readonly renderer?: 'gpu'
  readonly target?: VideoTarget | undefined
  readonly frameCapacity?: number
  readonly device?: VideoDeviceSelection
}
export interface GpuVideoConfiguration extends Dimensions {
  readonly target: VideoTarget
}
export interface NativeGpu extends NativeOutput<GpuVideoConfiguration, FrameImage> {
  readonly renderer: 'gpu'
  readonly device: VideoDeviceInfo
  readonly frameCapacity: number
}

function deviceSelection(device: VideoDeviceSelection): Partial<WireConfiguration> {
  const op = 'createMpv'
  if (!device || typeof device !== 'object' || Object.keys(device).length !== 2) {
    throw new MpvBindingError('invalidArgument', op)
  }
  let result: Partial<WireConfiguration>
  switch (device.platform) {
    case 'win32':
      if (
        typeof device.adapterLuid !== 'bigint' ||
        device.adapterLuid < 0n ||
        device.adapterLuid > 0xffffffffffffffffn
      ) {
        throw new MpvBindingError('invalidArgument', op)
      }
      result = { adapterLuid: device.adapterLuid }
      break
    case 'darwin':
      if (
        !Number.isInteger(device.rendererId) ||
        device.rendererId < 0 ||
        device.rendererId > 0xffffffff
      ) {
        throw new MpvBindingError('invalidArgument', op)
      }
      result = { rendererId: device.rendererId }
      break
    case 'linux':
      if (
        typeof device.renderNode !== 'string' ||
        !posix.isAbsolute(device.renderNode) ||
        device.renderNode.includes('\0')
      ) {
        throw new MpvBindingError('invalidArgument', op)
      }
      result = { renderNode: device.renderNode }
      break
    default:
      throw new MpvBindingError('invalidArgument', op)
  }
  if (device.platform !== process.platform) {
    throw new MpvBindingError('unsupportedCapability', op)
  }
  return result
}

export function gpuConfiguration(
  input: GpuVideoOptions | GpuVideoConfiguration,
  op: VideoOperation,
): WireConfiguration {
  const create = op === 'createMpv'
  validateInput(
    input,
    create
      ? ['renderer', 'width', 'height', 'target', 'frameCapacity', 'device']
      : ['width', 'height', 'target'],
    op,
  )
  const target =
    input.target === undefined && create ? { colorSpace: 'srgb' as const } : input.target
  if (
    !target ||
    typeof target !== 'object' ||
    Object.keys(target).some((k) => k !== 'colorSpace') ||
    (target.colorSpace !== 'srgb' && target.colorSpace !== 'display-p3')
  ) {
    throw new MpvBindingError('invalidArgument', op)
  }
  const common = { width: input.width, height: input.height, colorSpace: target.colorSpace }
  if (!create) {
    return common
  }
  const options: GpuVideoOptions = input
  if (options.renderer !== undefined && options.renderer !== 'gpu') {
    throw new MpvBindingError('invalidArgument', op)
  }
  const capacity = options.frameCapacity === undefined ? 3 : options.frameCapacity
  if (!Number.isInteger(capacity) || capacity < 2 || capacity > 0xffffffff) {
    throw new MpvBindingError('invalidArgument', op)
  }
  return {
    ...common,
    capacity,
    ...(options.device === undefined ? {} : deviceSelection(options.device)),
  }
}

export let wrapGpuOutput: (
  output: NativeGpu,
  client: NativeClient,
  subscriptions: Subscriptions,
) => GpuVideoOutput
export class GpuVideoOutput extends ManagedOutput<GpuVideoConfiguration, FrameImage, NativeFrame> {
  readonly renderer = 'gpu' as const
  readonly frameCapacity: number
  readonly device: VideoDeviceInfo
  private constructor(output: NativeGpu, client: NativeClient, subscriptions: Subscriptions) {
    super(output, client, subscriptions, gpuConfiguration, wrapFrame)
    this.frameCapacity = output.frameCapacity
    this.device = Object.freeze({
      ...output.device,
      selection: Object.freeze(output.device.selection),
    })
  }
  static {
    wrapGpuOutput = (output, client, subscriptions) =>
      new GpuVideoOutput(output, client, subscriptions)
  }
}
