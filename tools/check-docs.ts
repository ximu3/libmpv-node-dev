import { execFileSync } from 'node:child_process'
import { readFile, stat } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'

const files = execFileSync('git', ['ls-files', '-z', '*.md'], { encoding: 'utf8' })
  .split('\0')
  .filter(Boolean)
for (const file of files) {
  const document = (await readFile(file, 'utf8'))
    .replace(/^`{3}[^\n]*\n[\s\S]*?^`{3}[^\n]*$/gm, '')
    .replace(/`[^`\n]*`/g, '')
  for (const match of document.matchAll(/\]\((?:<([^>]+)>|([^\s)]+))\)/g)) {
    const href = match[1] ?? match[2]!
    if (/^(\w+:|\/\/)/.test(href)) {
      continue
    }
    const [relative, fragment] = decodeURI(href).split('#')
    const target = relative ? resolve(dirname(file), relative) : file
    await stat(target)
    if (!fragment || !target.endsWith('.md')) {
      continue
    }
    const body = await readFile(target, 'utf8')
    const headings = Array.from(body.matchAll(/^#{1,6} +(.+)$/gm), (item) =>
      item[1]!
        .trim()
        .toLowerCase()
        .replace(/[^\p{L}\p{N}\s_-]/gu, '')
        .replace(/\s+/g, '-'),
    )
    if (!headings.includes(fragment) && !body.includes(`id="${fragment}"`)) {
      throw new Error(`Unresolved link in ${file}: ${href}`)
    }
  }
}
