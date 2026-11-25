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
import type { MpvValue, MpvNode, ValueRepresentation } from '../values.js'
import type {
  MpvSubscription,
  MpvObserver,
  MpvEvent,
  MpvEventName,
  MpvNativeEvent,
  PropertyState,
} from '../subscriptions.js'

export type Name = string | Uint8Array<ArrayBuffer>

export type Format = 'node' | 'flag' | 'int64' | 'double'
export type MpvPropertyValue<F extends Format, T = MpvValue> = F extends 'flag'
  ? boolean
  : F extends 'int64'
    ? bigint
    : F extends 'double'
      ? number
      : T
export type MpvPropertyNode<F extends Format> = F extends 'node'
  ? MpvNode
  : Extract<MpvNode, { readonly format: F }>
type Output<T, M extends ValueRepresentation> = M extends 'native' ? MpvNode : T
export type Options = { readonly signal?: AbortSignal }
export type ObserveOptions = Options & { readonly output?: ValueRepresentation }
export type ObserveEventsOptions = ObserveOptions & { readonly events?: readonly MpvEventName[] }
export type ObserveLogsOptions = ObserveOptions & { readonly level?: LogLevel }
export type PropertyTextOptions = ObserveOptions & { readonly format?: 'plain' | 'osd' }
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
    | {
        readonly input?: 'javascript'
        readonly options?: P & NoInfer<OptionEntries extends P ? unknown : ValidOptions<P>>
      }
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
    options: ObserveLogsOptions | undefined,
  ): Promise<MpvSubscription>
  observeProperty<N extends Name>(
    name: N,
    observer: MpvObserver<PropertyState<PropertyRead<NoInfer<N>>>>,
    options?: Options & { readonly format?: 'node'; readonly output?: 'javascript' },
  ): Promise<MpvSubscription>
  observeProperty<N extends Name>(
    name: N,
    observer: MpvObserver<PropertyState<MpvNode>>,
    options: Options & { readonly format?: 'node'; readonly output: 'native' },
  ): Promise<MpvSubscription>
  observeProperty<N extends Name>(
    name: N,
    observer: MpvObserver<PropertyState<PropertyRead<NoInfer<N>> | MpvNode>>,
    options:
      | (Options & { readonly format?: 'node'; readonly output?: ValueRepresentation })
      | undefined,
  ): Promise<MpvSubscription>
  observeProperty<N extends Name, F extends Format>(
    name: N,
    observer: MpvObserver<PropertyState<MpvPropertyValue<NoInfer<F>, PropertyRead<NoInfer<N>>>>>,
    options: Options & { readonly format: F; readonly output?: 'javascript' },
  ): Promise<MpvSubscription>
  observeProperty<N extends Name, F extends Format>(
    name: N,
    observer: MpvObserver<PropertyState<MpvPropertyNode<NoInfer<F>>>>,
    options: Options & { readonly format: F; readonly output: 'native' },
  ): Promise<MpvSubscription>
  observeProperty<N extends Name, F extends Format>(
    name: N,
    observer: MpvObserver<
      PropertyState<
        MpvPropertyValue<NoInfer<F>, PropertyRead<NoInfer<N>>> | MpvPropertyNode<NoInfer<F>>
      >
    >,
    options: Options & { readonly format: F; readonly output?: ValueRepresentation },
  ): Promise<MpvSubscription>
  observeProperty(
    name: Name,
    observer: MpvObserver<void>,
    options: Options & { readonly format: 'none'; readonly output?: never },
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
  observePropertyText(
    name: Name,
    observer: MpvObserver<PropertyState<string | Uint8Array<ArrayBuffer>>>,
    options: ObserveOptions | undefined,
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
    options: ObserveEventsOptions | undefined,
  ): Promise<MpvSubscription>
  readonly clientName: string
  readonly clientId: bigint
  getTimeNs(): bigint
  getProperty<N extends Name>(
    name: N,
    options?: Options & { readonly format?: 'node'; readonly output?: 'javascript' },
  ): Promise<PropertyRead<N>>
  getProperty<N extends Name>(
    name: N,
    options: Options & { readonly format?: 'node'; readonly output: 'native' },
  ): Promise<MpvNode>
  getProperty<N extends Name>(
    name: N,
    options:
      | (Options & { readonly format?: 'node'; readonly output?: ValueRepresentation })
      | undefined,
  ): Promise<PropertyRead<N> | MpvNode>
  getProperty<N extends Name, F extends Format>(
    name: N,
    options: Options & { readonly format: F; readonly output?: 'javascript' },
  ): Promise<MpvPropertyValue<F, PropertyRead<N>>>
  getProperty<N extends Name, F extends Format>(
    name: N,
    options: Options & { readonly format: F; readonly output: 'native' },
  ): Promise<MpvPropertyNode<F>>
  getProperty<N extends Name, F extends Format>(
    name: N,
    options: Options & { readonly format: F; readonly output?: ValueRepresentation },
  ): Promise<MpvPropertyValue<F, PropertyRead<N>> | MpvPropertyNode<F>>
  getPropertyText(
    name: Name,
    options?: PropertyTextOptions & { readonly output?: 'javascript' },
  ): Promise<string>
  getPropertyText<M extends ValueRepresentation>(
    name: Name,
    options: PropertyTextOptions & { readonly output: M },
  ): Promise<M extends 'native' ? Uint8Array<ArrayBuffer> : string>
  getPropertyText(
    name: Name,
    options: PropertyTextOptions | undefined,
  ): Promise<string | Uint8Array<ArrayBuffer>>
  setProperty<N extends Name>(
    name: N,
    value: PropertyWrite<NoInfer<N>>,
    options?: Options & { input?: 'javascript' },
  ): Promise<void>
  setProperty(name: Name, value: MpvNode, options: Options & { input: 'native' }): Promise<void>
  command<const A extends Command>(
    args: A & NoInfer<CheckedCommand<A>>,
    options?: Options & { input?: 'javascript'; output?: 'javascript' },
  ): Promise<CommandResult<A>>
  command<const A extends Command, M extends ValueRepresentation>(
    args: A & NoInfer<CheckedCommand<A>>,
    options: Options & { input?: 'javascript'; output: M },
  ): Promise<Output<CommandResult<A>, M>>
  command<const A extends Command>(
    args: A & NoInfer<CheckedCommand<A>>,
    options:
      | (Options & { readonly input?: 'javascript'; readonly output?: ValueRepresentation })
      | undefined,
  ): Promise<CommandResult<A> | MpvNode>
  command(
    args: NativeCommand,
    options: Options & { input: 'native'; output?: 'javascript' },
  ): Promise<MpvValue>
  command<M extends ValueRepresentation>(
    args: NativeCommand,
    options: Options & { input: 'native'; output: M },
  ): Promise<Output<MpvValue, M>>
  command(
    args: NativeCommand,
    options: Options & { readonly input: 'native'; readonly output?: ValueRepresentation },
  ): Promise<MpvValue | MpvNode>
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
    options: { readonly output?: ValueRepresentation } | undefined,
  ): Promise<void>
  readonly videoOutput: V
  createClient(options?: Options & { name?: string }): Promise<MpvClient>
  ref(): this
  unref(): this
  hasRef(): boolean
  close(): Promise<void>
  [Symbol.asyncDispose](): Promise<void>
}
