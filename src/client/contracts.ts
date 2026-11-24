import type {
  Command,
  CheckedCommand,
  CommandResult,
  PropertyRead,
  PropertyWrite,
  OptionInput,
} from '../catalog/types.js'
export type { Command } from '../catalog/types.js'
import type { GpuVideoOptions, GpuVideoOutput } from '../video/gpu.js'
import type { SoftwareVideoOutput, SoftwareVideoOptions } from '../video/software.js'
import type { MpvStreamProvider } from '../streams/contracts.js'
import type { MpvHookOptions, MpvHookHandler } from '../hooks.js'
import type { InitializationLogs } from './initialization.js'
import type { LogLevel, MpvLogRecord, MpvNativeLogRecord } from '../logs.js'
import type { MpvValue, MpvNode } from '../values.js'
import type {
  MpvSubscription,
  MpvObserver,
  MpvEvent,
  MpvEventName,
  MpvNativeEvent,
  PropertyState,
} from '../subscriptions.js'

export type Name = string | Uint8Array<ArrayBuffer>
export type Mode = 'native' | 'javascript'
export type Format = 'node' | 'flag' | 'int64' | 'double'
type FormatValue<F extends Format> = F extends 'flag'
  ? boolean
  : F extends 'int64'
    ? bigint
    : F extends 'double'
      ? number
      : MpvValue
type Output<T, M extends Mode> = M extends 'native' ? MpvNode : T
export type Options = { readonly signal?: AbortSignal }
export type NativeCommand = Extract<MpvNode, { readonly format: 'array' | 'map' }>

export type VideoOutputOptions = SoftwareVideoOptions | GpuVideoOptions
export type VideoOutput = SoftwareVideoOutput | GpuVideoOutput
export type CreateMpvOptions = CreateOptions & {
  readonly initializationLogs?: InitializationLogs
  readonly videoOutput?: VideoOutputOptions | undefined
}
export type OptionEntries = readonly (readonly [Name, MpvValue])[]
type ValidOptions<P extends OptionEntries> = {
  readonly [I in keyof P]: P[I] extends readonly [infer N, unknown]
    ? readonly [N, OptionInput<N>]
    : never
}
export type CreateOptions<P extends OptionEntries = OptionEntries> = Options &
  (
    | { readonly input?: 'javascript'; readonly options?: P & ValidOptions<NoInfer<P>> }
    | { readonly input: 'native'; readonly options?: readonly (readonly [Name, MpvNode])[] }
  )

export interface MpvControl {
  addHook(name: Name, handler: MpvHookHandler, options?: MpvHookOptions): Promise<MpvSubscription>
  observeLogs(
    observer: MpvObserver<MpvLogRecord>,
    options?: Options & { level?: LogLevel; output?: 'javascript' },
  ): Promise<MpvSubscription>
  observeLogs(
    observer: MpvObserver<MpvNativeLogRecord>,
    options: Options & { level?: LogLevel; output: 'native' },
  ): Promise<MpvSubscription>
  observeLogs(
    observer: MpvObserver<MpvLogRecord | MpvNativeLogRecord>,
    options: (Options & { level?: LogLevel; output?: Mode }) | undefined,
  ): Promise<MpvSubscription>
  observeProperty<N extends Name>(
    name: N,
    observer: MpvObserver<PropertyState<PropertyRead<NoInfer<N>>>>,
    options?: Options & { format?: 'node'; output?: 'javascript' },
  ): Promise<MpvSubscription>
  observeProperty<F extends Format>(
    name: Name,
    observer: MpvObserver<PropertyState<FormatValue<NoInfer<F>>>>,
    options: Options & { format: F; output?: 'javascript' },
  ): Promise<MpvSubscription>
  observeProperty(
    name: Name,
    observer: MpvObserver<PropertyState<MpvNode>>,
    options: Options & { format?: Format; output: 'native' },
  ): Promise<MpvSubscription>
  observeProperty(
    name: Name,
    observer: MpvObserver<void>,
    options: Options & { format: 'none'; output?: never },
  ): Promise<MpvSubscription>
  observePropertyText(
    name: Name,
    observer: MpvObserver<PropertyState<string>>,
    options?: Options & { output?: 'javascript' },
  ): Promise<MpvSubscription>
  observePropertyText(
    name: Name,
    observer: MpvObserver<PropertyState<Uint8Array<ArrayBuffer>>>,
    options: Options & { output: 'native' },
  ): Promise<MpvSubscription>
  observeEvents(
    observer: MpvObserver<MpvEvent>,
    options?: Options & { output?: 'javascript'; events?: readonly MpvEventName[] },
  ): Promise<MpvSubscription>
  observeEvents(
    observer: MpvObserver<MpvNativeEvent>,
    options: Options & { output: 'native'; events?: readonly MpvEventName[] },
  ): Promise<MpvSubscription>
  observeEvents(
    observer: MpvObserver<MpvEvent | MpvNativeEvent>,
    options: (Options & { output?: Mode; events?: readonly MpvEventName[] }) | undefined,
  ): Promise<MpvSubscription>
  observePropertyText(
    name: Name,
    observer: MpvObserver<PropertyState<string | Uint8Array<ArrayBuffer>>>,
    options: (Options & { output?: Mode }) | undefined,
  ): Promise<MpvSubscription>
  observeProperty<N extends Name>(
    name: N,
    observer: MpvObserver<PropertyState<PropertyRead<NoInfer<N>> | MpvNode>>,
    options: (Options & { format?: 'node'; output?: Mode }) | undefined,
  ): Promise<MpvSubscription>
  observeProperty<F extends Format>(
    name: Name,
    observer: MpvObserver<PropertyState<FormatValue<NoInfer<F>> | MpvNode>>,
    options: Options & { format: F; output?: Mode },
  ): Promise<MpvSubscription>
  readonly clientName: string
  readonly clientId: bigint
  getTimeNs(): bigint
  getProperty<N extends Name>(
    name: N,
    options?: Options & { format?: 'node'; output?: 'javascript' },
  ): Promise<PropertyRead<N>>
  getProperty<F extends Format>(
    name: Name,
    options: Options & { format: F; output?: 'javascript' },
  ): Promise<FormatValue<F>>
  getProperty<M extends Mode>(
    name: Name,
    options: Options & { format?: Format; output: M },
  ): Promise<Output<MpvValue, M>>
  getPropertyText(
    name: Name,
    options?: Options & { format?: 'plain' | 'osd'; output?: 'javascript' },
  ): Promise<string>
  getPropertyText<M extends Mode>(
    name: Name,
    options: Options & { format?: 'plain' | 'osd'; output: M },
  ): Promise<M extends 'native' ? Uint8Array<ArrayBuffer> : string>
  setProperty<N extends Name>(
    name: N,
    value: PropertyWrite<NoInfer<N>>,
    options?: Options & { input?: 'javascript' },
  ): Promise<void>
  setProperty(name: Name, value: MpvNode, options: Options & { input: 'native' }): Promise<void>
  command<const A extends Command>(
    args: A & CheckedCommand<NoInfer<A>>,
    options?: Options & { input?: 'javascript'; output?: 'javascript' },
  ): Promise<CommandResult<A>>
  command<const A extends Command, M extends Mode>(
    args: A & CheckedCommand<NoInfer<A>>,
    options: Options & { input?: 'javascript'; output: M },
  ): Promise<Output<CommandResult<A>, M>>
  command(
    args: NativeCommand,
    options: Options & { input: 'native'; output?: 'javascript' },
  ): Promise<MpvValue>
  command<M extends Mode>(
    args: NativeCommand,
    options: Options & { input: 'native'; output: M },
  ): Promise<Output<MpvValue, M>>
  loadConfigFile(path: Name, options?: Options): Promise<void>
}

export interface MpvClient extends MpvControl {
  dispose(): Promise<void>
  [Symbol.asyncDispose](): Promise<void>
}

export interface Mpv<V extends VideoOutput | null = VideoOutput | null> extends MpvControl {
  registerProtocol(
    name: Name,
    provider: MpvStreamProvider<string>,
    options?: { readonly output?: 'javascript' },
  ): Promise<void>
  registerProtocol(
    name: Name,
    provider: MpvStreamProvider<Uint8Array<ArrayBuffer>>,
    options: { readonly output: 'native' },
  ): Promise<void>
  registerProtocol(
    name: Name,
    provider: MpvStreamProvider<string | Uint8Array<ArrayBuffer>>,
    options: { readonly output?: Mode } | undefined,
  ): Promise<void>
  readonly videoOutput: V
  createClient(options?: Options & { name?: string }): Promise<MpvClient>
  ref(): this
  unref(): this
  hasRef(): boolean
  close(): Promise<void>
  [Symbol.asyncDispose](): Promise<void>
}
