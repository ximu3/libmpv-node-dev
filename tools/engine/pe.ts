export function imports(image: Buffer): string[] {
  const header = image.readUInt32LE(0x3c)
  if (image.readUInt16LE(0) !== 0x5a4d || image.readUInt32LE(header) !== 0x4550) {
    throw new Error('Invalid PE image')
  }
  const coff = header + 4
  const optional = coff + 20
  if (image.readUInt16LE(coff) !== 0x8664 || image.readUInt16LE(optional) !== 0x20b) {
    throw new Error('Expected a 64-bit AMD64 PE image')
  }
  const sections = optional + image.readUInt16LE(coff + 16)
  const count = image.readUInt16LE(coff + 2)
  function offset(rva: number) {
    for (let index = 0; index < count; index++) {
      const section = sections + index * 40
      const base = image.readUInt32LE(section + 12)
      const length = image.readUInt32LE(section + 16)
      if (rva >= base && rva - base < length) {
        return image.readUInt32LE(section + 20) + rva - base
      }
    }
    throw new Error('PE import address outside file-backed sections')
  }
  const names = new Set<string>()
  function table(index: number, width: number, nameOffset: number) {
    if (index >= image.readUInt32LE(optional + 108)) {
      return
    }
    const directory = optional + 112 + index * 8
    const rva = image.readUInt32LE(directory)
    if (!rva) {
      return
    }
    const start = offset(rva)
    const end = start + image.readUInt32LE(directory + 4)
    for (let entry = start; entry + width <= end; entry += width) {
      const name = image.readUInt32LE(entry + nameOffset)
      if (!name) {
        return
      }
      if (index === 13 && image.readUInt32LE(entry) !== 1) {
        throw new Error('Unexpected delay-import address format')
      }
      const begin = offset(name)
      const terminator = image.indexOf(0, begin)
      if (terminator < begin) {
        throw new Error('Unterminated PE import name')
      }
      const text = image.toString('ascii', begin, terminator).toLowerCase()
      if (!/^[a-z0-9_.+-]+\.dll$/.test(text)) {
        throw new Error(`Invalid import name: ${text}`)
      }
      names.add(text)
    }
    throw new Error('Unterminated PE import directory')
  }
  table(1, 20, 12)
  table(13, 32, 4)
  return [...names].sort()
}
