export type LoadOperation = 'getClientApiVersion' | 'createMpv'
export type LoadErrorCode = 'libraryLoadFailed' | 'incompatibleLibrary'

export abstract class MpvError extends Error {
  abstract readonly source: 'binding' | 'mpv'
  abstract readonly code: string | number

  protected constructor(
    message: string,
    readonly operation: LoadOperation,
    readonly submitted: boolean,
  ) {
    super(message)
    this.name = new.target.name
  }
}

export class MpvBindingError extends MpvError {
  readonly source = 'binding' as const

  constructor(readonly code: LoadErrorCode, operation: LoadOperation) {
    super(code === 'libraryLoadFailed' ? 'Unable to load the media runtime.' : 'Incompatible media runtime.', operation, false)
  }
}
