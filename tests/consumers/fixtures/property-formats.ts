import {
  createMpv,
  type MpvControl,
  type MpvNode,
  type MpvPropertyFormat,
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
