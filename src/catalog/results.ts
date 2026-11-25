import { object, union, literal, type ShapeValue } from './shape.js'

export const screenshotFile = object({ filename: 'string' })
export const commandResults = {
  screenshot: union(screenshotFile, 'none'),
  'screenshot-raw': object({
    w: 'bigint',
    h: 'bigint',
    stride: 'bigint',
    format: union(literal('bgr0'), literal('bgra'), literal('rgba'), literal('rgba64')),
    source: union(literal('vo'), literal('software')),
    data: 'bytes',
  }),
  loadfile: object({ playlist_entry_id: 'bigint' }),
  loadlist: object({}, { playlist_entry_id: 'bigint', num_entries: 'bigint' }),
  'load-script': object({ client_id: 'bigint' }),
  'osd-overlay': object({}, { x0: 'number', y0: 'number', x1: 'number', y1: 'number' }),
  subprocess: object(
    { status: 'bigint', killed_by_us: 'boolean', error_string: 'string' },
    { stdout: 'bytes', stderr: 'bytes' },
  ),
  'expand-text': 'string',
  'expand-path': 'string',
  'normalize-path': 'string',
  'escape-ass': 'string',
} as const
export type Screenshot = ShapeValue<(typeof commandResults)['screenshot-raw']>
