import { createMpv, type Mpv, type Screenshot } from '@ximu3/libmpv-node'

export async function declarations(player: Mpv, extension: string) {
  const image: Screenshot = await player.command(['screenshot-raw'])
  const width: bigint = image.w
  const source: 'vo' | 'software' = image.source
  await player.command(['seek', 42, 'absolute+exact'])
  await player.command({ name: 'seek', target: 42, flags: ['absolute', 'exact'] })
  await player.command({ _name: 'set', name: 'pause', value: 'yes' })
  await player.command(['playlist-play-index', 0n])
  await player.command(['script-message', extension, 'data'])
  await player.command([extension, 7n])
  await createMpv({
    options: [
      ['force-window', 'immediate'],
      ['loop-file', 3n],
    ],
  })
  const duration: number = await player.getProperty('duration')
  const id: bigint = await player.getProperty('track-list/0/id')

  // @ts-expect-error A known command requires its URL.
  await player.command(['loadfile'])
  // @ts-expect-error Labels outside the native flags grammar are invalid.
  await player.command(['seek', 12, 'absolute+missing'])
  // @ts-expect-error A named call cannot skip a required argument.
  await player.command({ name: 'seek', flags: 'absolute' })
  // @ts-expect-error The upstream parser only accepts positional varargs.
  await player.command({ name: 'script-message', args: 'test' })
  // @ts-expect-error A double node cannot serve as an integer command argument.
  await player.command(['playlist-move', 1.5, 2n])
  // @ts-expect-error A known initialization choice retains its declared choices.
  await createMpv({ options: [['force-window', 'later']] })
  // @ts-expect-error A property name fixes the type of its new value.
  await player.setProperty('pause', 5)
  return { width, source, duration, id }
}
