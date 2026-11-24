import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { join, resolve } from 'node:path'
import { parseArgs } from 'node:util'
import { digest, requireNewDirectory, requiredPath, writeJson } from '../../../tools/files.ts'
import cases from './cases.json' with { type: 'json' }

interface Frame {
  info(): {
    width: number
    height: number
    backend: string
    pixelFormat: string
    coreDestroyed: boolean
  }
  pixels(): Buffer
  release(): void
}
interface Probe {
  produceFrames(
    dll: string,
    angle: string,
    media: string,
    script: string,
    preinit: boolean,
    d3d11: boolean,
    storage: string,
  ): Promise<Frame[]>
}
interface Scene {
  name: string
  source: string
  primaries: string
  transfer: string
  peak: number
  toneMapping: string
  subtitle?: string
  overlay?: boolean
  shader?: string
}
function asset(path: string) {
  return resolve(import.meta.dirname, path).replaceAll('\\', '/')
}
async function capture(scene: Scene, dll: string, probe: string, dir: string) {
  const observation = join(dir, scene.name + '.json')
  const options = [
    ['target-prim', scene.primaries],
    ['target-trc', scene.transfer],
    ['target-peak', String(scene.peak)],
    ['hdr-compute-peak', 'no'],
    ['gamut-mapping-mode', 'clip'],
    ['tone-mapping', scene.toneMapping],
    ['background', 'color'],
    ['background-color', '#000000'],
    ['video-aspect-override', '4:3'],
    ['sub-visibility', 'yes'],
    ['gpu-shader-cache', 'no'],
  ]
  if (scene.shader) {
    options.push(['glsl-shaders', asset(scene.shader)])
  }
  const settings = {
    options,
    source: asset(scene.source),
    subtitle: scene.subtitle && asset(scene.subtitle),
    overlay: !!scene.overlay,
    receipt: observation.replaceAll('\\', '/'),
  }
  const startup = join(dir, scene.name + '.lua')
  const lua = await readFile(join(import.meta.dirname, 'setup.lua'), 'utf8')
  await writeFile(
    startup,
    'local scene=require("mp.utils").parse_json(' +
      JSON.stringify(JSON.stringify(settings)) +
      ')\n' +
      lua,
  )
  const native = createRequire(import.meta.url)(probe) as Probe
  const frames = await native.produceFrames(dll, '', settings.source, startup, true, true, 'pq')
  try {
    const seen = JSON.parse(await readFile(observation, 'utf8')) as Record<string, unknown>
    assert.deepEqual(seen, {
      primaries: scene.primaries,
      transfer: scene.transfer,
      peak: scene.peak,
      toneMapping: scene.toneMapping,
      subtitle: !!scene.subtitle,
      overlay: !!scene.overlay,
    })
    assert.equal(frames.length, 2)
    for (const [i, frame] of frames.entries()) {
      const info = frame.info()
      assert.ok(info.coreDestroyed)
      assert.equal(info.backend, 'd3d11')
      assert.equal(info.pixelFormat, 'rgba16float')
      assert.deepEqual([info.width, info.height], i === 0 ? [63, 47] : [31, 23])
      const pixels = frame.pixels()
      assert.equal(pixels.length, info.width * info.height * 8)
      await writeFile(join(dir, scene.name + '-' + i + '.rgba16f'), pixels)
    }
  } finally {
    for (const f of frames) {
      f.release()
    }
  }
}

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    probe: { type: 'string' },
    baseline: { type: 'string' },
    candidate: { type: 'string' },
    delivered: { type: 'string' },
    case: { type: 'string' },
  },
})
const out = requiredPath(positionals[0], 'output')
const probe = requiredPath(values.probe, '--probe')
if (values.case !== undefined) {
  const num = Number(values.case)
  const scene = cases[num]
  if (!scene) {
    throw new Error('Unknown diagnostic case')
  }
  await capture(scene, requiredPath(values.candidate, '--candidate'), probe, out)
} else {
  await requireNewDirectory(out)
  const variants = {
    baseline: requiredPath(values.baseline, '--baseline'),
    candidate: requiredPath(values.candidate, '--candidate'),
    delivered: requiredPath(values.delivered, '--delivered'),
  }
  const inputs: Record<string, string> = {}
  for (const [variant, dll] of Object.entries(variants)) {
    const dir = join(out, variant)
    await mkdir(dir, { recursive: true })
    inputs[variant] = await digest(dll)
    for (let i = 0; i < cases.length; i++) {
      execFileSync(
        process.execPath,
        [import.meta.filename, dir, '--probe', probe, '--candidate', dll, '--case', String(i)],
        { stdio: 'inherit', windowsHide: true, timeout: 60000 },
      )
    }
  }
  let finite = 0,
    resolved = 0,
    changed = 0,
    nonfinite = 0,
    nonopaque = 0,
    deliveryDifferences = 0
  for (const scene of cases) {
    for (const i of [0, 1]) {
      const name = scene.name + '-' + i + '.rgba16f'
      const [base, after, delivered] = await Promise.all(
        (['baseline', 'candidate', 'delivered'] as const).map((dir) =>
          readFile(join(out, dir, name)),
        ),
      )
      assert.equal(base!.length, after!.length)
      assert.equal(after!.length, delivered!.length)
      for (let offset = 0; offset < base!.length; offset += 2) {
        const a = base!.readUInt16LE(offset),
          b = after!.readUInt16LE(offset)
        if (b !== delivered!.readUInt16LE(offset)) {
          deliveryDifferences++
        }
        if (offset % 8 === 6) {
          if (a !== 0x3c00 || b !== 0x3c00) {
            nonopaque++
          }
          continue
        }
        if ((b & 0x7c00) === 0x7c00) {
          nonfinite++
        }
        if ((a & 0x7c00) === 0x7c00) {
          if ((b & 0x7c00) !== 0x7c00) {
            resolved++
          }
        } else {
          finite++
          if (a !== b) {
            changed++
          }
        }
      }
    }
  }
  await writeJson(join(out, 'comparison.json'), {
    inputs,
    probe: await digest(probe),
    cases: cases.length,
    framesPerVariant: cases.length * 2,
    finite,
    resolved,
    changed,
    nonfinite,
    nonopaque,
    deliveryDifferences,
  })
  assert.ok(resolved > 0)
  assert.equal(changed, 0)
  assert.equal(nonfinite, 0)
  assert.equal(nonopaque, 0)
  assert.equal(deliveryDifferences, 0)
}
