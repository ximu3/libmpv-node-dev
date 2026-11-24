import { execFileSync } from 'node:child_process'
import { writeFile } from 'node:fs/promises'

const mediaLibraries =
  /^lib(?:av(?:codec|device|filter|format|util)|sw(?:resample|scale)|ass|placebo|dav1d|vpx|opus|vorbis(?:enc|file)?|ogg|dovi|soxr|zimg|lcms2|freetype|harfbuzz(?:-subset)?|fribidi|fontconfig|png\d*|z)\.so(?:\.|$)/
export async function mediaSymbols(
  libraries: Iterable<{ name: string; path: string }>,
  id: string,
  destination: string,
) {
  const names = new Set<string>()
  for (const library of libraries) {
    if (!mediaLibraries.test(library.name)) {
      continue
    }
    const table = execFileSync('nm', ['-D', '--defined-only', '--format=posix', library.path], {
      encoding: 'utf8',
      maxBuffer: 16 * 1024 * 1024,
    })
    for (const row of table.split('\n')) {
      const [symbol, kind] = row.split(/\s+/, 2)
      const name = symbol?.split('@', 1)[0]
      // These libraries expose their C APIs through ELF. Leave toolchain and process symbols in the host's scope.
      if (name && kind && /^[TDBR]$/.test(kind) && /^[A-Za-z][A-Za-z0-9_]*$/.test(name)) {
        names.add(name)
      }
    }
  }
  for (const name of [
    'avcodec_find_decoder_by_name',
    'avcodec_version',
    'avformat_version',
    'ass_library_init',
    'hb_version_string',
  ]) {
    if (!names.has(name)) {
      throw new Error('Missing media ABI export ' + name)
    }
  }
  await writeFile(
    destination,
    [...names]
      .sort()
      .map((name) => name + ' mpv_node_' + id + '_' + name)
      .join('\n') + '\n',
  )
}
