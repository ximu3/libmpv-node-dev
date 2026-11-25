import {
  createMpv,
  type MpvControl,
  type MpvNode,
  type MpvCommandNode,
  type MpvValue,
  type MpvPropertyFormat,
  type PropertyOptions,
  type PropertyState,
  type PropertyTextOptions,
  type ValueRepresentation,
  type GpuVideoOptions,
  type GpuVideoOutput,
} from '@ximu3/libmpv-node'

export async function propertyFormats(
  client: MpvControl,
  selected: MpvPropertyFormat,
  output: 'native' | 'javascript',
) {
  const control = await createMpv(undefined)
  const absent: null = control.videoOutput
  const defaults: GpuVideoOptions = { width: 64, height: 48, target: undefined }
  const gpu: GpuVideoOutput = (await createMpv({ videoOutput: defaults })).videoOutput
  const result = await client.getProperty('volume', { format: 'int64', output: 'native' })
  const integer: bigint = result.value
  const tag: 'int64' = result.format
  const dynamic: boolean | bigint | number = await client.getProperty('pause', { format: selected })
  const converted: bigint | Extract<MpvNode, { format: 'int64' }> = await client.getProperty(
    'volume',
    { format: 'int64', output },
  )
  await client.observeProperty(
    'volume',
    {
      next(state) {
        if (state.status === 'available') {
          const value: bigint = state.value.value
          void value
        }
      },
      error() {},
    },
    { format: 'int64', output: 'native' },
  )
  const peak = { width: 10, height: 10, target: { colorSpace: 'srgb', peakNits: 100 } } as const
  // @ts-expect-error An SDR target must reject extra HDR parameters even through a variable.
  await createMpv({ videoOutput: peak })
  // @ts-expect-error Native option representation does not change the managed target.
  await createMpv({ input: 'native', videoOutput: peak })
  const repeated = [
    ['pause', true],
    ['pause', 'yes'],
  ] as const
  // @ts-expect-error Known boolean initialization options use boolean values.
  await createMpv({ options: repeated })
  // @ts-expect-error The ordinary volume option uses a floating-point number.
  await createMpv({ options: [['volume', 80n]] })
  return { absent, gpu, integer, tag, dynamic, converted }
}

export async function forwardOutputOptions(
  client: MpvControl,
  textOptions: PropertyTextOptions | undefined,
  commandOptions: { readonly output?: ValueRepresentation } | undefined,
  nativeCommand: MpvCommandNode,
) {
  const text: string | Uint8Array<ArrayBuffer> = await client.getPropertyText('path', textOptions)
  const expanded: string | MpvNode = await client.command(['expand-text', 'sample'], commandOptions)
  const raw: MpvValue | MpvNode = await client.command(nativeCommand, {
    ...commandOptions,
    input: 'native',
  })
  // @ts-expect-error A dynamic text representation can also return bytes.
  const onlyText: string = await client.getPropertyText('path', textOptions)
  // @ts-expect-error A dynamic command representation can also return a native node.
  const onlyString: string = await client.command(['expand-text', 'sample'], commandOptions)
  // @ts-expect-error Output selection does not make the required URL optional.
  await client.command(['loadfile'], commandOptions)
  return { text, expanded, raw, onlyText, onlyString }
}

export async function forwardPropertyOptions(
  client: MpvControl,
  options?: PropertyOptions,
  integer?: { readonly format?: 'int64' },
) {
  const volume: number | bigint | boolean | MpvNode = await client.getProperty('volume', options)
  const scalar: number | bigint = await client.getProperty('volume', integer)
  const subscription = await client.observeProperty(
    'volume',
    {
      next(state: PropertyState<typeof volume>) {
        void state
      },
      error() {},
    },
    options,
  )
  // @ts-expect-error The caller can omit int64 and receive the ordinary volume value.
  const onlyInteger: bigint = await client.getProperty('volume', integer)
  const onlyIntegers = { next(_state: PropertyState<bigint>) {}, error() {} }
  // @ts-expect-error The observer must also accept the ordinary volume value.
  await client.observeProperty('volume', onlyIntegers, integer)
  return { volume, scalar, subscription, onlyInteger }
}
