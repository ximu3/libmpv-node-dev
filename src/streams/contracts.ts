export interface MpvStreamRequest<T = string> {
  readonly uri: T
  readonly signal: AbortSignal
}
export interface MpvStreamSource {
  readonly read: (
    maxBytes: number,
  ) => Uint8Array<ArrayBuffer> | null | PromiseLike<Uint8Array<ArrayBuffer> | null>
  readonly seek?: (offset: bigint) => void | PromiseLike<void>
  readonly getSize?: () => bigint | null | PromiseLike<bigint | null>
  readonly close: () => void | PromiseLike<void>
}
export type MpvStreamFailure<T = string> =
  | {
      readonly operation: 'open'
      readonly reason: unknown
      readonly request: MpvStreamRequest<T> | null
    }
  | {
      readonly operation: 'read' | 'seek' | 'getSize' | 'close'
      readonly reason: unknown
      readonly request: MpvStreamRequest<T>
    }
export interface MpvStreamProvider<T = string> {
  readonly open: (request: MpvStreamRequest<T>) => MpvStreamSource | PromiseLike<MpvStreamSource>
  readonly onError: (failure: MpvStreamFailure<T>) => void
}

type Work = { stream: bigint; job: bigint }
export type Action =
  | (Work & { kind: 'open'; uri: Uint8Array<ArrayBuffer> })
  | (Work & { kind: 'limit' })
  | (Work & { kind: 'getSize' })
  | (Work & { kind: 'read'; max: number })
  | (Work & { kind: 'seek'; offset: bigint })
  | { kind: 'close' | 'cancel'; stream: bigint }
  | { kind: 'shutdown' | 'end' }
export type Reply =
  | { kind: 'open'; seek: boolean; size: boolean }
  | { kind: 'bytes'; bytes: Uint8Array<ArrayBuffer> }
  | { kind: 'size'; number: bigint }
  | { kind: 'eof' | 'ok' | 'failed' | 'unknown' }
export interface NativeProtocol {
  next(): Action | null
  reply(stream: bigint, job: bigint, result: Reply): void
  finished(stream: bigint): void
}
