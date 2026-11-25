import { MpvBindingError, type MpvOperation } from '../errors.js'

function invalid(operation: MpvOperation): never {
  throw new MpvBindingError(
    'invalidArgument',
    operation,
    false,
    operation === 'createMpv' ? { stage: 'input' } : undefined,
  )
}
export function checkOptions(options: object, operation: MpvOperation) {
  if (!options || typeof options !== 'object' || Array.isArray(options)) {
    invalid(operation)
  }
}
export function callSignal(options: { readonly signal?: AbortSignal }, operation: MpvOperation) {
  checkOptions(options, operation)
  const signal = options.signal
  if (signal !== undefined) {
    try {
      Reflect.get(AbortSignal.prototype, 'aborted', signal)
    } catch {
      invalid(operation)
    }
  }
  return signal
}
