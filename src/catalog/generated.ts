import type { At, FlagInput, IntegerArgument, RealArgument } from './types.js'
import type { MpvValue } from '../values.js'
type ObjectSetting = {
  readonly name: string
  readonly label?: string
  readonly enabled?: boolean
  readonly params?: Readonly<Record<string, string>>
}
export interface CommandDefinitions<A> {
  'ab-loop': {
    args: readonly []
    named: { readonly name: 'ab-loop' } | { readonly _name: 'ab-loop' }
  }
  'ab-loop-align-cache': {
    args: readonly []
    named: { readonly name: 'ab-loop-align-cache' } | { readonly _name: 'ab-loop-align-cache' }
  }
  'ab-loop-dump-cache': {
    args: readonly [string]
    named: ({ readonly name: 'ab-loop-dump-cache' } | { readonly _name: 'ab-loop-dump-cache' }) & {
      readonly filename: string
    }
  }
  add: {
    args: readonly [string, RealArgument?]
    named: { readonly _name: 'add' } & { readonly name: string; readonly value?: RealArgument }
  }
  af: {
    args: readonly [string, string]
    named: ({ readonly name: 'af' } | { readonly _name: 'af' }) & {
      readonly operation: string
      readonly value: string
    }
  }
  'af-command': {
    args: readonly [string, string, string, string?]
    named: ({ readonly name: 'af-command' } | { readonly _name: 'af-command' }) & {
      readonly label: string
      readonly command: string
      readonly argument: string
      readonly target?: string
    }
  }
  'ao-reload': {
    args: readonly []
    named: { readonly name: 'ao-reload' } | { readonly _name: 'ao-reload' }
  }
  'apply-profile': {
    args: readonly [string, ('apply' | 'restore')?]
    named: { readonly _name: 'apply-profile' } & {
      readonly name: string
      readonly mode?: 'apply' | 'restore'
    }
  }
  'audio-add': {
    args: readonly [
      string,
      FlagInput<
        | 'select'
        | 'auto'
        | 'cached'
        | 'hearing-impaired'
        | 'visual-impaired'
        | 'forced'
        | 'default'
        | 'commentary',
        At<A, 2>
      >?,
      string?,
      string?,
    ]
    named: ({ readonly name: 'audio-add' } | { readonly _name: 'audio-add' }) & {
      readonly url: string
      readonly flags?: FlagInput<
        | 'select'
        | 'auto'
        | 'cached'
        | 'hearing-impaired'
        | 'visual-impaired'
        | 'forced'
        | 'default'
        | 'commentary',
        At<A, 'flags'>
      >
      readonly title?: string
      readonly lang?: string
    }
  }
  'audio-reload': {
    args: readonly [IntegerArgument?]
    named: ({ readonly name: 'audio-reload' } | { readonly _name: 'audio-reload' }) & {
      readonly id?: IntegerArgument
    }
  }
  'audio-remove': {
    args: readonly [IntegerArgument?]
    named: ({ readonly name: 'audio-remove' } | { readonly _name: 'audio-remove' }) & {
      readonly id?: IntegerArgument
    }
  }
  'begin-vo-dragging': {
    args: readonly []
    named: { readonly name: 'begin-vo-dragging' } | { readonly _name: 'begin-vo-dragging' }
  }
  'change-list': {
    args: readonly [string, string, string]
    named: { readonly _name: 'change-list' } & {
      readonly name: string
      readonly operation: string
      readonly value: string
    }
  }
  'context-menu': {
    args: readonly []
    named: { readonly name: 'context-menu' } | { readonly _name: 'context-menu' }
  }
  cycle: {
    args: readonly [string, ('up' | 'down' | RealArgument)?]
    named: { readonly _name: 'cycle' } & {
      readonly name: string
      readonly value?: 'up' | 'down' | RealArgument
    }
  }
  'cycle-values': { args: readonly [string, string, ...string[]]; named: never }
  'define-section': {
    args: readonly [string, string, ('default' | 'force')?]
    named: { readonly _name: 'define-section' } & {
      readonly name: string
      readonly contents: string
      readonly flags?: 'default' | 'force'
    }
  }
  del: { args: readonly [string]; named: { readonly _name: 'del' } & { readonly name: string } }
  'delete-watch-later-config': {
    args: readonly [string?]
    named: (
      | { readonly name: 'delete-watch-later-config' }
      | { readonly _name: 'delete-watch-later-config' }
    ) & { readonly filename?: string }
  }
  'disable-section': {
    args: readonly [string]
    named: { readonly _name: 'disable-section' } & { readonly name: string }
  }
  discnav: {
    args: readonly [
      (
        | 'up'
        | 'down'
        | 'left'
        | 'right'
        | 'select'
        | 'menu'
        | 'title-menu'
        | 'popup'
        | 'audio-menu'
        | 'sub-menu'
        | 'angle-menu'
        | 'up-menu'
        | 'prev'
        | 'red'
        | 'green'
        | 'yellow'
        | 'blue'
        | 'mouse-move'
        | 'mouse-click'
      ),
      RealArgument?,
      RealArgument?,
    ]
    named: ({ readonly name: 'discnav' } | { readonly _name: 'discnav' }) & {
      readonly action:
        | 'up'
        | 'down'
        | 'left'
        | 'right'
        | 'select'
        | 'menu'
        | 'title-menu'
        | 'popup'
        | 'audio-menu'
        | 'sub-menu'
        | 'angle-menu'
        | 'up-menu'
        | 'prev'
        | 'red'
        | 'green'
        | 'yellow'
        | 'blue'
        | 'mouse-move'
        | 'mouse-click'
      readonly x?: RealArgument
      readonly y?: RealArgument
    }
  }
  'drop-buffers': {
    args: readonly []
    named: { readonly name: 'drop-buffers' } | { readonly _name: 'drop-buffers' }
  }
  'dump-cache': {
    args: readonly [number | bigint | string, number | bigint | string, string]
    named: ({ readonly name: 'dump-cache' } | { readonly _name: 'dump-cache' }) & {
      readonly start: number | bigint | string
      readonly end: number | bigint | string
      readonly filename: string
    }
  }
  'enable-section': {
    args: readonly [
      string,
      FlagInput<'default' | 'exclusive' | 'allow-hide-cursor' | 'allow-vo-dragging', At<A, 2>>?,
    ]
    named: { readonly _name: 'enable-section' } & {
      readonly name: string
      readonly flags?: FlagInput<
        'default' | 'exclusive' | 'allow-hide-cursor' | 'allow-vo-dragging',
        At<A, 'flags'>
      >
    }
  }
  'escape-ass': {
    args: readonly [string]
    named: ({ readonly name: 'escape-ass' } | { readonly _name: 'escape-ass' }) & {
      readonly text: string
    }
  }
  'expand-path': {
    args: readonly [string]
    named: ({ readonly name: 'expand-path' } | { readonly _name: 'expand-path' }) & {
      readonly text: string
    }
  }
  'expand-text': {
    args: readonly [string]
    named: ({ readonly name: 'expand-text' } | { readonly _name: 'expand-text' }) & {
      readonly text: string
    }
  }
  'flush-status-line': {
    args: readonly [boolean | 'yes' | 'no']
    named: ({ readonly name: 'flush-status-line' } | { readonly _name: 'flush-status-line' }) & {
      readonly clear: boolean | 'yes' | 'no'
    }
  }
  'frame-back-step': {
    args: readonly []
    named: { readonly name: 'frame-back-step' } | { readonly _name: 'frame-back-step' }
  }
  'frame-step': {
    args: readonly [IntegerArgument?, ('play' | 'seek' | 'mute')?]
    named: ({ readonly name: 'frame-step' } | { readonly _name: 'frame-step' }) & {
      readonly frames?: IntegerArgument
      readonly flags?: 'play' | 'seek' | 'mute'
    }
  }
  ignore: { args: readonly []; named: { readonly name: 'ignore' } | { readonly _name: 'ignore' } }
  keybind: {
    args: readonly [string, string, string?]
    named: { readonly _name: 'keybind' } & {
      readonly name: string
      readonly cmd: string
      readonly comment?: string
    }
  }
  keydown: {
    args: readonly [string]
    named: { readonly _name: 'keydown' } & { readonly name: string }
  }
  keypress: {
    args: readonly [string, RealArgument?]
    named: { readonly _name: 'keypress' } & { readonly name: string; readonly scale?: RealArgument }
  }
  keyup: {
    args: readonly [string?]
    named: { readonly _name: 'keyup' } & { readonly name?: string }
  }
  'load-config-file': {
    args: readonly [string]
    named: ({ readonly name: 'load-config-file' } | { readonly _name: 'load-config-file' }) & {
      readonly filename: string
    }
  }
  'load-input-conf': {
    args: readonly [string]
    named: ({ readonly name: 'load-input-conf' } | { readonly _name: 'load-input-conf' }) & {
      readonly filename: string
    }
  }
  'load-script': {
    args: readonly [string]
    named: ({ readonly name: 'load-script' } | { readonly _name: 'load-script' }) & {
      readonly filename: string
    }
  }
  loadfile: {
    args: readonly [
      string,
      FlagInput<
        | 'replace'
        | 'append'
        | 'insert-next'
        | 'insert-at'
        | 'play'
        | 'append-play'
        | 'insert-next-play'
        | 'insert-at-play',
        At<A, 2>
      >?,
      IntegerArgument?,
      (string | Readonly<Record<string, string>>)?,
    ]
    named: ({ readonly name: 'loadfile' } | { readonly _name: 'loadfile' }) & {
      readonly url: string
      readonly flags?: FlagInput<
        | 'replace'
        | 'append'
        | 'insert-next'
        | 'insert-at'
        | 'play'
        | 'append-play'
        | 'insert-next-play'
        | 'insert-at-play',
        At<A, 'flags'>
      >
      readonly index?: IntegerArgument
      readonly options?: string | Readonly<Record<string, string>>
    }
  }
  loadlist: {
    args: readonly [
      string,
      FlagInput<
        | 'replace'
        | 'append'
        | 'insert-next'
        | 'insert-at'
        | 'play'
        | 'append-play'
        | 'insert-next-play'
        | 'insert-at-play',
        At<A, 2>
      >?,
      IntegerArgument?,
    ]
    named: ({ readonly name: 'loadlist' } | { readonly _name: 'loadlist' }) & {
      readonly url: string
      readonly flags?: FlagInput<
        | 'replace'
        | 'append'
        | 'insert-next'
        | 'insert-at'
        | 'play'
        | 'append-play'
        | 'insert-next-play'
        | 'insert-at-play',
        At<A, 'flags'>
      >
      readonly index?: IntegerArgument
    }
  }
  mouse: {
    args: readonly [IntegerArgument, IntegerArgument, IntegerArgument?, ('single' | 'double')?]
    named: ({ readonly name: 'mouse' } | { readonly _name: 'mouse' }) & {
      readonly x: IntegerArgument
      readonly y: IntegerArgument
      readonly button?: IntegerArgument
      readonly mode?: 'single' | 'double'
    }
  }
  multiply: {
    args: readonly [string, RealArgument]
    named: { readonly _name: 'multiply' } & { readonly name: string; readonly value: RealArgument }
  }
  'normalize-path': {
    args: readonly [string]
    named: ({ readonly name: 'normalize-path' } | { readonly _name: 'normalize-path' }) & {
      readonly filename: string
    }
  }
  'notify-property': {
    args: readonly [string]
    named: ({ readonly name: 'notify-property' } | { readonly _name: 'notify-property' }) & {
      readonly property: string
    }
  }
  'osd-overlay': {
    args: readonly [
      IntegerArgument,
      'none' | 'ass-events',
      string,
      IntegerArgument?,
      IntegerArgument?,
      IntegerArgument?,
      (boolean | 'yes' | 'no')?,
      (boolean | 'yes' | 'no')?,
    ]
    named: ({ readonly name: 'osd-overlay' } | { readonly _name: 'osd-overlay' }) & {
      readonly id: IntegerArgument
      readonly format: 'none' | 'ass-events'
      readonly data: string
      readonly res_x?: IntegerArgument
      readonly res_y?: IntegerArgument
      readonly z?: IntegerArgument
      readonly hidden?: boolean | 'yes' | 'no'
      readonly compute_bounds?: boolean | 'yes' | 'no'
    }
  }
  'overlay-add': {
    args: readonly [
      IntegerArgument,
      IntegerArgument,
      IntegerArgument,
      string,
      IntegerArgument,
      string,
      IntegerArgument,
      IntegerArgument,
      IntegerArgument,
      IntegerArgument?,
      IntegerArgument?,
      (boolean | 'yes' | 'no')?,
      RealArgument?,
      (
        | 'auto'
        | 'bt.601-525'
        | 'bt.601-625'
        | 'bt.709'
        | 'bt.2020'
        | 'bt.470m'
        | 'apple'
        | 'adobe'
        | 'prophoto'
        | 'cie1931'
        | 'dci-p3'
        | 'display-p3'
        | 'v-gamut'
        | 's-gamut'
        | 'ebu3213'
        | 'film-c'
        | 'aces-ap0'
        | 'aces-ap1'
      )?,
      (
        | 'auto'
        | 'bt.1886'
        | 'srgb'
        | 'linear'
        | 'gamma1.8'
        | 'gamma2.0'
        | 'gamma2.2'
        | 'gamma2.4'
        | 'gamma2.6'
        | 'gamma2.8'
        | 'prophoto'
        | 'pq'
        | 'hlg'
        | 'v-log'
        | 's-log1'
        | 's-log2'
        | 'st428'
        | 'scrgb'
      )?,
    ]
    named: ({ readonly name: 'overlay-add' } | { readonly _name: 'overlay-add' }) & {
      readonly id: IntegerArgument
      readonly x: IntegerArgument
      readonly y: IntegerArgument
      readonly file: string
      readonly offset: IntegerArgument
      readonly fmt: string
      readonly w: IntegerArgument
      readonly h: IntegerArgument
      readonly stride: IntegerArgument
      readonly dw?: IntegerArgument
      readonly dh?: IntegerArgument
      readonly video_colorspace?: boolean | 'yes' | 'no'
      readonly max_luma?: RealArgument
      readonly primaries?:
        | 'auto'
        | 'bt.601-525'
        | 'bt.601-625'
        | 'bt.709'
        | 'bt.2020'
        | 'bt.470m'
        | 'apple'
        | 'adobe'
        | 'prophoto'
        | 'cie1931'
        | 'dci-p3'
        | 'display-p3'
        | 'v-gamut'
        | 's-gamut'
        | 'ebu3213'
        | 'film-c'
        | 'aces-ap0'
        | 'aces-ap1'
      readonly transfer?:
        | 'auto'
        | 'bt.1886'
        | 'srgb'
        | 'linear'
        | 'gamma1.8'
        | 'gamma2.0'
        | 'gamma2.2'
        | 'gamma2.4'
        | 'gamma2.6'
        | 'gamma2.8'
        | 'prophoto'
        | 'pq'
        | 'hlg'
        | 'v-log'
        | 's-log1'
        | 's-log2'
        | 'st428'
        | 'scrgb'
    }
  }
  'overlay-remove': {
    args: readonly [IntegerArgument]
    named: ({ readonly name: 'overlay-remove' } | { readonly _name: 'overlay-remove' }) & {
      readonly id: IntegerArgument
    }
  }
  'playlist-clear': {
    args: readonly []
    named: { readonly name: 'playlist-clear' } | { readonly _name: 'playlist-clear' }
  }
  'playlist-move': {
    args: readonly [IntegerArgument, IntegerArgument]
    named: ({ readonly name: 'playlist-move' } | { readonly _name: 'playlist-move' }) & {
      readonly index1: IntegerArgument
      readonly index2: IntegerArgument
    }
  }
  'playlist-next': {
    args: readonly [('weak' | 'force')?]
    named: ({ readonly name: 'playlist-next' } | { readonly _name: 'playlist-next' }) & {
      readonly flags?: 'weak' | 'force'
    }
  }
  'playlist-next-playlist': {
    args: readonly []
    named:
      | { readonly name: 'playlist-next-playlist' }
      | { readonly _name: 'playlist-next-playlist' }
  }
  'playlist-play-index': {
    args: readonly ['current' | 'none' | IntegerArgument, (boolean | 'yes' | 'no')?]
    named: (
      | { readonly name: 'playlist-play-index' }
      | { readonly _name: 'playlist-play-index' }
    ) & {
      readonly index: 'current' | 'none' | IntegerArgument
      readonly 'preserve-options'?: boolean | 'yes' | 'no'
    }
  }
  'playlist-prev': {
    args: readonly [('weak' | 'force')?]
    named: ({ readonly name: 'playlist-prev' } | { readonly _name: 'playlist-prev' }) & {
      readonly flags?: 'weak' | 'force'
    }
  }
  'playlist-prev-playlist': {
    args: readonly []
    named:
      | { readonly name: 'playlist-prev-playlist' }
      | { readonly _name: 'playlist-prev-playlist' }
  }
  'playlist-remove': {
    args: readonly ['current' | IntegerArgument]
    named: ({ readonly name: 'playlist-remove' } | { readonly _name: 'playlist-remove' }) & {
      readonly index: 'current' | IntegerArgument
    }
  }
  'playlist-shuffle': {
    args: readonly []
    named: { readonly name: 'playlist-shuffle' } | { readonly _name: 'playlist-shuffle' }
  }
  'playlist-unshuffle': {
    args: readonly []
    named: { readonly name: 'playlist-unshuffle' } | { readonly _name: 'playlist-unshuffle' }
  }
  'print-text': {
    args: readonly [string]
    named: ({ readonly name: 'print-text' } | { readonly _name: 'print-text' }) & {
      readonly text: string
    }
  }
  quit: {
    args: readonly [IntegerArgument?]
    named: ({ readonly name: 'quit' } | { readonly _name: 'quit' }) & {
      readonly code?: IntegerArgument
    }
  }
  'quit-watch-later': {
    args: readonly [IntegerArgument?]
    named: ({ readonly name: 'quit-watch-later' } | { readonly _name: 'quit-watch-later' }) & {
      readonly code?: IntegerArgument
    }
  }
  'rescan-external-files': {
    args: readonly [('keep-selection' | 'reselect')?]
    named: (
      | { readonly name: 'rescan-external-files' }
      | { readonly _name: 'rescan-external-files' }
    ) & { readonly flags?: 'keep-selection' | 'reselect' }
  }
  'revert-seek': {
    args: readonly [FlagInput<'mark' | 'mark-permanent', At<A, 1>>?]
    named: ({ readonly name: 'revert-seek' } | { readonly _name: 'revert-seek' }) & {
      readonly flags?: FlagInput<'mark' | 'mark-permanent', At<A, 'flags'>>
    }
  }
  run: { args: readonly [string, ...string[]]; named: never }
  screenshot: {
    args: readonly [
      FlagInput<
        'video' | 'scaled' | 'subtitles' | 'osd' | 'each-frame' | '-' | 'window',
        At<A, 1>
      >?,
      ('unused' | 'single' | 'each-frame')?,
    ]
    named: ({ readonly name: 'screenshot' } | { readonly _name: 'screenshot' }) & {
      readonly flags?: FlagInput<
        'video' | 'scaled' | 'subtitles' | 'osd' | 'each-frame' | '-' | 'window',
        At<A, 'flags'>
      >
      readonly legacy?: 'unused' | 'single' | 'each-frame'
    }
  }
  'screenshot-raw': {
    args: readonly [
      ('video' | 'scaled' | 'subtitles' | 'osd' | 'window')?,
      ('bgr0' | 'bgra' | 'rgba' | 'rgba64')?,
    ]
    named: ({ readonly name: 'screenshot-raw' } | { readonly _name: 'screenshot-raw' }) & {
      readonly flags?: 'video' | 'scaled' | 'subtitles' | 'osd' | 'window'
      readonly format?: 'bgr0' | 'bgra' | 'rgba' | 'rgba64'
    }
  }
  'screenshot-to-file': {
    args: readonly [string, ('video' | 'scaled' | 'subtitles' | 'osd' | 'window')?]
    named: ({ readonly name: 'screenshot-to-file' } | { readonly _name: 'screenshot-to-file' }) & {
      readonly filename: string
      readonly flags?: 'video' | 'scaled' | 'subtitles' | 'osd' | 'window'
    }
  }
  'script-binding': {
    args: readonly [string, string?]
    named: { readonly _name: 'script-binding' } & { readonly name: string; readonly arg?: string }
  }
  'script-message': { args: readonly [...string[]]; named: never }
  'script-message-to': { args: readonly [string, ...string[]]; named: never }
  seek: {
    args: readonly [
      number | bigint | string,
      FlagInput<
        | 'relative'
        | '-'
        | 'absolute-percent'
        | 'absolute'
        | 'relative-percent'
        | 'keyframes'
        | 'exact',
        At<A, 2>
      >?,
      ('unused' | 'default-precise' | 'keyframes' | 'exact')?,
    ]
    named: ({ readonly name: 'seek' } | { readonly _name: 'seek' }) & {
      readonly target: number | bigint | string
      readonly flags?: FlagInput<
        | 'relative'
        | '-'
        | 'absolute-percent'
        | 'absolute'
        | 'relative-percent'
        | 'keyframes'
        | 'exact',
        At<A, 'flags'>
      >
      readonly legacy?: 'unused' | 'default-precise' | 'keyframes' | 'exact'
    }
  }
  set: {
    args: readonly [string, string]
    named: { readonly _name: 'set' } & { readonly name: string; readonly value: string }
  }
  'show-progress': {
    args: readonly []
    named: { readonly name: 'show-progress' } | { readonly _name: 'show-progress' }
  }
  'show-text': {
    args: readonly [string, IntegerArgument?, IntegerArgument?]
    named: ({ readonly name: 'show-text' } | { readonly _name: 'show-text' }) & {
      readonly text: string
      readonly duration?: IntegerArgument
      readonly level?: IntegerArgument
    }
  }
  stop: {
    args: readonly [FlagInput<'keep-playlist', At<A, 1>>?]
    named: ({ readonly name: 'stop' } | { readonly _name: 'stop' }) & {
      readonly flags?: FlagInput<'keep-playlist', At<A, 'flags'>>
    }
  }
  'sub-add': {
    args: readonly [
      string,
      FlagInput<
        | 'select'
        | 'auto'
        | 'cached'
        | 'hearing-impaired'
        | 'visual-impaired'
        | 'forced'
        | 'default'
        | 'commentary',
        At<A, 2>
      >?,
      string?,
      string?,
    ]
    named: ({ readonly name: 'sub-add' } | { readonly _name: 'sub-add' }) & {
      readonly url: string
      readonly flags?: FlagInput<
        | 'select'
        | 'auto'
        | 'cached'
        | 'hearing-impaired'
        | 'visual-impaired'
        | 'forced'
        | 'default'
        | 'commentary',
        At<A, 'flags'>
      >
      readonly title?: string
      readonly lang?: string
    }
  }
  'sub-reload': {
    args: readonly [IntegerArgument?]
    named: ({ readonly name: 'sub-reload' } | { readonly _name: 'sub-reload' }) & {
      readonly id?: IntegerArgument
    }
  }
  'sub-remove': {
    args: readonly [IntegerArgument?]
    named: ({ readonly name: 'sub-remove' } | { readonly _name: 'sub-remove' }) & {
      readonly id?: IntegerArgument
    }
  }
  'sub-seek': {
    args: readonly [IntegerArgument, ('primary' | 'secondary')?]
    named: ({ readonly name: 'sub-seek' } | { readonly _name: 'sub-seek' }) & {
      readonly skip: IntegerArgument
      readonly flags?: 'primary' | 'secondary'
    }
  }
  'sub-step': {
    args: readonly [IntegerArgument, ('primary' | 'secondary')?]
    named: ({ readonly name: 'sub-step' } | { readonly _name: 'sub-step' }) & {
      readonly skip: IntegerArgument
      readonly flags?: 'primary' | 'secondary'
    }
  }
  subprocess: {
    args: readonly [
      string | readonly string[],
      (boolean | 'yes' | 'no')?,
      (bigint | string)?,
      (boolean | 'yes' | 'no')?,
      (boolean | 'yes' | 'no')?,
      (boolean | 'yes' | 'no')?,
      (string | readonly string[])?,
      string?,
      (boolean | 'yes' | 'no')?,
    ]
    named: ({ readonly name: 'subprocess' } | { readonly _name: 'subprocess' }) & {
      readonly args: string | readonly string[]
      readonly playback_only?: boolean | 'yes' | 'no'
      readonly capture_size?: bigint | string
      readonly capture_stdout?: boolean | 'yes' | 'no'
      readonly capture_stderr?: boolean | 'yes' | 'no'
      readonly detach?: boolean | 'yes' | 'no'
      readonly env?: string | readonly string[]
      readonly stdin_data?: string
      readonly passthrough_stdin?: boolean | 'yes' | 'no'
    }
  }
  'update-clipboard': {
    args: readonly ['text' | 'text-primary', IntegerArgument?]
    named: ({ readonly name: 'update-clipboard' } | { readonly _name: 'update-clipboard' }) & {
      readonly type: 'text' | 'text-primary'
      readonly timeout?: IntegerArgument
    }
  }
  vf: {
    args: readonly [string, string]
    named: ({ readonly name: 'vf' } | { readonly _name: 'vf' }) & {
      readonly operation: string
      readonly value: string
    }
  }
  'vf-command': {
    args: readonly [string, string, string, string?]
    named: ({ readonly name: 'vf-command' } | { readonly _name: 'vf-command' }) & {
      readonly label: string
      readonly command: string
      readonly argument: string
      readonly target?: string
    }
  }
  'video-add': {
    args: readonly [
      string,
      FlagInput<
        | 'select'
        | 'auto'
        | 'cached'
        | 'hearing-impaired'
        | 'visual-impaired'
        | 'attached-picture'
        | 'forced'
        | 'default'
        | 'commentary',
        At<A, 2>
      >?,
      string?,
      string?,
      (boolean | 'yes' | 'no')?,
    ]
    named: ({ readonly name: 'video-add' } | { readonly _name: 'video-add' }) & {
      readonly url: string
      readonly flags?: FlagInput<
        | 'select'
        | 'auto'
        | 'cached'
        | 'hearing-impaired'
        | 'visual-impaired'
        | 'attached-picture'
        | 'forced'
        | 'default'
        | 'commentary',
        At<A, 'flags'>
      >
      readonly title?: string
      readonly lang?: string
      readonly albumart?: boolean | 'yes' | 'no'
    }
  }
  'video-reload': {
    args: readonly [IntegerArgument?]
    named: ({ readonly name: 'video-reload' } | { readonly _name: 'video-reload' }) & {
      readonly id?: IntegerArgument
    }
  }
  'video-remove': {
    args: readonly [IntegerArgument?]
    named: ({ readonly name: 'video-remove' } | { readonly _name: 'video-remove' }) & {
      readonly id?: IntegerArgument
    }
  }
  'write-watch-later-config': {
    args: readonly []
    named:
      | { readonly name: 'write-watch-later-config' }
      | { readonly _name: 'write-watch-later-config' }
  }
}
export interface OptionDefinitions {
  V: { read: MpvValue; write: string }
  'ab-loop-a': { read: number; write: number | bigint | string }
  'ab-loop-b': { read: number; write: number | bigint | string }
  'ab-loop-count': { read: 'inf' | bigint; write: 'inf' | IntegerArgument }
  'access-references': { read: boolean; write: boolean | 'yes' | 'no' }
  ad: { read: string; write: string }
  'ad-lavc-ac3drc': { read: number; write: RealArgument }
  'ad-lavc-downmix': { read: boolean; write: boolean | 'yes' | 'no' }
  'ad-lavc-o': {
    read: Readonly<Record<string, string>>
    write: string | Readonly<Record<string, string>>
  }
  'ad-lavc-threads': { read: bigint; write: IntegerArgument }
  'ad-queue-enable': { read: boolean; write: boolean | 'yes' | 'no' }
  'ad-queue-max-bytes': { read: bigint; write: bigint | string }
  'ad-queue-max-samples': { read: bigint; write: IntegerArgument }
  'ad-queue-max-secs': { read: number; write: RealArgument }
  af: { read: readonly ObjectSetting[]; write: string | readonly ObjectSetting[] }
  aid: { read: 'auto' | false | bigint; write: 'no' | 'auto' | false | IntegerArgument }
  alang: { read: readonly string[]; write: string | readonly string[] }
  'allow-delayed-peak-detect': { read: boolean; write: boolean | 'yes' | 'no' }
  'alsa-buffer-time': { read: bigint; write: IntegerArgument }
  'alsa-ignore-chmap': { read: boolean; write: boolean | 'yes' | 'no' }
  'alsa-mixer-device': { read: string; write: string }
  'alsa-mixer-index': { read: bigint; write: IntegerArgument }
  'alsa-mixer-name': { read: string; write: string }
  'alsa-non-interleaved': { read: boolean; write: boolean | 'yes' | 'no' }
  'alsa-periods': { read: bigint; write: IntegerArgument }
  'alsa-resample': { read: boolean; write: boolean | 'yes' | 'no' }
  ao: { read: readonly ObjectSetting[]; write: string | readonly ObjectSetting[] }
  'ao-null-broken-delay': { read: boolean; write: boolean | 'yes' | 'no' }
  'ao-null-broken-eof': { read: boolean; write: boolean | 'yes' | 'no' }
  'ao-null-buffer': { read: number; write: RealArgument }
  'ao-null-channel-layouts': { read: string; write: string }
  'ao-null-format': { read: string; write: string }
  'ao-null-latency': { read: number; write: RealArgument }
  'ao-null-outburst': { read: bigint; write: IntegerArgument }
  'ao-null-speed': { read: number; write: RealArgument }
  'ao-null-untimed': { read: boolean; write: boolean | 'yes' | 'no' }
  'ao-pcm-append': { read: boolean; write: boolean | 'yes' | 'no' }
  'ao-pcm-file': { read: string; write: string }
  'ao-pcm-waveheader': { read: boolean; write: boolean | 'yes' | 'no' }
  'archive-exts': { read: readonly string[]; write: string | readonly string[] }
  audio: { read: 'auto' | false | bigint; write: 'no' | 'auto' | false | IntegerArgument }
  'audio-backward-batch': { read: bigint; write: IntegerArgument }
  'audio-backward-overlap': { read: 'auto' | bigint; write: 'auto' | IntegerArgument }
  'audio-buffer': { read: number; write: RealArgument }
  'audio-channels': { read: string; write: string }
  'audio-client-name': { read: string; write: string }
  'audio-delay': { read: number; write: RealArgument }
  'audio-demuxer': { read: string; write: string }
  'audio-device': { read: string; write: string }
  'audio-display': {
    read: 'embedded-first' | 'external-first' | false
    write: 'no' | 'embedded-first' | 'external-first' | false
  }
  'audio-exclusive': { read: boolean; write: boolean | 'yes' | 'no' }
  'audio-exts': { read: readonly string[]; write: string | readonly string[] }
  'audio-fallback-to-null': { read: boolean; write: boolean | 'yes' | 'no' }
  'audio-file': { read: MpvValue; write: MpvValue }
  'audio-file-auto': {
    read: 'exact' | 'fuzzy' | 'all' | false
    write: 'no' | 'exact' | 'fuzzy' | 'all' | false
  }
  'audio-file-auto-exts': { read: readonly string[]; write: string | readonly string[] }
  'audio-file-paths': { read: readonly string[]; write: string | readonly string[] }
  'audio-files': { read: readonly string[]; write: string | readonly string[] }
  'audio-format': { read: string; write: string }
  'audio-normalize-downmix': { read: boolean; write: boolean | 'yes' | 'no' }
  'audio-pitch-correction': { read: boolean; write: boolean | 'yes' | 'no' }
  'audio-resample-cutoff': { read: number; write: RealArgument }
  'audio-resample-filter-size': { read: bigint; write: IntegerArgument }
  'audio-resample-linear': { read: boolean; write: boolean | 'yes' | 'no' }
  'audio-resample-max-output-size': { read: number; write: RealArgument }
  'audio-resample-phase-shift': { read: bigint; write: IntegerArgument }
  'audio-reversal-buffer': { read: bigint; write: bigint | string }
  'audio-samplerate': { read: bigint; write: IntegerArgument }
  'audio-set-media-role': { read: boolean; write: boolean | 'yes' | 'no' }
  'audio-spdif': { read: string; write: string }
  'audio-stream-silence': { read: boolean; write: boolean | 'yes' | 'no' }
  'audio-swresample-o': {
    read: Readonly<Record<string, string>>
    write: string | Readonly<Record<string, string>>
  }
  'audio-wait-open': { read: number; write: RealArgument }
  'auto-window-resize': { read: boolean; write: boolean | 'yes' | 'no' }
  'autocreate-playlist': {
    read: 'filter' | 'same' | false
    write: 'no' | 'filter' | 'same' | false
  }
  autofit: { read: string; write: string }
  'autofit-larger': { read: string; write: string }
  'autofit-smaller': { read: string; write: string }
  'autoload-files': { read: boolean; write: boolean | 'yes' | 'no' }
  autosync: { read: false | bigint; write: 'no' | false | IntegerArgument }
  'backdrop-type': {
    read: 'auto' | 'none' | 'mica' | 'acrylic' | 'mica-alt'
    write: 'auto' | 'none' | 'mica' | 'acrylic' | 'mica-alt'
  }
  background: { read: 'none' | 'color' | 'tiles'; write: 'none' | 'color' | 'tiles' }
  'background-blur-radius': { read: number; write: RealArgument }
  'background-color': { read: string; write: string }
  'background-tile-color-0': { read: string; write: string }
  'background-tile-color-1': { read: string; write: string }
  'background-tile-size': { read: bigint; write: IntegerArgument }
  'blend-subtitles': { read: 'video' | true | false; write: 'no' | 'yes' | 'video' | true | false }
  border: { read: boolean; write: boolean | 'yes' | 'no' }
  'border-background': {
    read: 'none' | 'color' | 'tiles' | 'blur'
    write: 'none' | 'color' | 'tiles' | 'blur'
  }
  brightness: { read: number; write: RealArgument }
  cache: { read: 'auto' | true | false; write: 'no' | 'auto' | 'yes' | true | false }
  'cache-on-disk': { read: boolean; write: boolean | 'yes' | 'no' }
  'cache-pause': { read: boolean; write: boolean | 'yes' | 'no' }
  'cache-pause-initial': { read: boolean; write: boolean | 'yes' | 'no' }
  'cache-pause-wait': { read: number; write: RealArgument }
  'cache-secs': { read: number; write: RealArgument }
  'chapter-merge-threshold': { read: bigint; write: IntegerArgument }
  'chapter-seek-threshold': { read: number; write: RealArgument }
  'chapters-file': { read: string; write: string }
  'clipboard-backends': { read: readonly ObjectSetting[]; write: string | readonly ObjectSetting[] }
  'clipboard-monitor': { read: boolean; write: boolean | 'yes' | 'no' }
  'clipboard-xwayland': { read: boolean; write: boolean | 'yes' | 'no' }
  'cocoa-cb-10bit-context': { read: boolean; write: boolean | 'yes' | 'no' }
  'cocoa-cb-output-csp': {
    read:
      | 'auto'
      | 'display-p3'
      | 'display-p3-hlg'
      | 'display-p3-pq'
      | 'display-p3-linear'
      | 'dci-p3'
      | 'bt.2020'
      | 'bt.2020-linear'
      | 'bt.2100-hlg'
      | 'bt.2100-pq'
      | 'bt.709'
      | 'srgb'
      | 'srgb-linear'
      | 'rgb-linear'
      | 'adobe'
    write:
      | 'auto'
      | 'display-p3'
      | 'display-p3-hlg'
      | 'display-p3-pq'
      | 'display-p3-linear'
      | 'dci-p3'
      | 'bt.2020'
      | 'bt.2020-linear'
      | 'bt.2100-hlg'
      | 'bt.2100-pq'
      | 'bt.709'
      | 'srgb'
      | 'srgb-linear'
      | 'rgb-linear'
      | 'adobe'
  }
  'cocoa-cb-sw-renderer': {
    read: 'auto' | true | false
    write: 'auto' | 'no' | 'yes' | true | false
  }
  config: { read: boolean; write: boolean | 'yes' | 'no' }
  'config-dir': { read: string; write: string }
  'container-fps-override': { read: number; write: RealArgument }
  contrast: { read: number; write: RealArgument }
  cookies: { read: boolean; write: boolean | 'yes' | 'no' }
  'cookies-file': { read: string; write: string }
  'coreaudio-change-physical-format': { read: boolean; write: boolean | 'yes' | 'no' }
  'coreaudio-spdif-hack': { read: boolean; write: boolean | 'yes' | 'no' }
  'corner-rounding': { read: number; write: RealArgument }
  'correct-downscaling': { read: boolean; write: boolean | 'yes' | 'no' }
  'correct-pts': { read: boolean; write: boolean | 'yes' | 'no' }
  'cover-art-auto': {
    read: 'exact' | 'fuzzy' | 'all' | false
    write: 'no' | 'exact' | 'fuzzy' | 'all' | false
  }
  'cover-art-auto-exts': { read: readonly string[]; write: string | readonly string[] }
  'cover-art-file': { read: MpvValue; write: MpvValue }
  'cover-art-files': { read: readonly string[]; write: string | readonly string[] }
  'cover-art-whitelist': { read: readonly string[]; write: string | readonly string[] }
  cscale: {
    read:
      | ''
      | 'bilinear'
      | 'bicubic_fast'
      | 'oversample'
      | 'spline16'
      | 'spline36'
      | 'spline64'
      | 'sinc'
      | 'lanczos'
      | 'ginseng'
      | 'bicubic'
      | 'hermite'
      | 'catmull_rom'
      | 'mitchell'
      | 'robidoux'
      | 'robidouxsharp'
      | 'box'
      | 'nearest'
      | 'triangle'
      | 'gaussian'
      | 'jinc'
      | 'ewa_lanczos'
      | 'ewa_hanning'
      | 'ewa_ginseng'
      | 'ewa_lanczossharp'
      | 'ewa_lanczos4sharpest'
      | 'ewa_lanczossoft'
      | 'haasnsoft'
      | 'ewa_robidoux'
      | 'ewa_robidouxsharp'
      | 'bartlett'
      | 'cosine'
      | 'hanning'
      | 'tukey'
      | 'hamming'
      | 'quadric'
      | 'welch'
      | 'kaiser'
      | 'blackman'
      | 'sphinx'
    write:
      | ''
      | 'bilinear'
      | 'bicubic_fast'
      | 'oversample'
      | 'spline16'
      | 'spline36'
      | 'spline64'
      | 'sinc'
      | 'lanczos'
      | 'ginseng'
      | 'bicubic'
      | 'hermite'
      | 'catmull_rom'
      | 'mitchell'
      | 'robidoux'
      | 'robidouxsharp'
      | 'box'
      | 'nearest'
      | 'triangle'
      | 'gaussian'
      | 'jinc'
      | 'ewa_lanczos'
      | 'ewa_hanning'
      | 'ewa_ginseng'
      | 'ewa_lanczossharp'
      | 'ewa_lanczos4sharpest'
      | 'ewa_lanczossoft'
      | 'haasnsoft'
      | 'ewa_robidoux'
      | 'ewa_robidouxsharp'
      | 'bartlett'
      | 'cosine'
      | 'hanning'
      | 'tukey'
      | 'hamming'
      | 'quadric'
      | 'welch'
      | 'kaiser'
      | 'blackman'
      | 'sphinx'
  }
  'cscale-antiring': { read: number; write: RealArgument }
  'cscale-blur': { read: number; write: RealArgument }
  'cscale-clamp': { read: number; write: RealArgument }
  'cscale-param1': { read: number; write: RealArgument }
  'cscale-param2': { read: number; write: RealArgument }
  'cscale-radius': { read: number; write: RealArgument }
  'cscale-taper': { read: number; write: RealArgument }
  'cscale-window': {
    read:
      | ''
      | 'bartlett'
      | 'cosine'
      | 'hanning'
      | 'tukey'
      | 'hamming'
      | 'quadric'
      | 'welch'
      | 'kaiser'
      | 'blackman'
      | 'sphinx'
      | 'jinc'
    write:
      | ''
      | 'bartlett'
      | 'cosine'
      | 'hanning'
      | 'tukey'
      | 'hamming'
      | 'quadric'
      | 'welch'
      | 'kaiser'
      | 'blackman'
      | 'sphinx'
      | 'jinc'
  }
  'cscale-wparam': { read: number; write: RealArgument }
  'cscale-wtaper': { read: number; write: RealArgument }
  'cursor-autohide': {
    read: 'always' | false | bigint
    write: 'no' | 'always' | false | IntegerArgument
  }
  'cursor-autohide-fs-only': { read: boolean; write: boolean | 'yes' | 'no' }
  'd3d11-adapter': { read: string; write: string }
  'd3d11-composition-size': { read: string; write: string }
  'd3d11-exclusive-fs': { read: boolean; write: boolean | 'yes' | 'no' }
  'd3d11-feature-level': {
    read: '12_1' | '12_0' | '11_1' | '11_0' | '10_1' | '10_0' | '9_3' | '9_2' | '9_1'
    write: '12_1' | '12_0' | '11_1' | '11_0' | '10_1' | '10_0' | '9_3' | '9_2' | '9_1'
  }
  'd3d11-flip': { read: boolean; write: boolean | 'yes' | 'no' }
  'd3d11-output-csp': {
    read: 'auto' | 'srgb' | 'linear' | 'pq' | 'bt.2020'
    write: 'auto' | 'srgb' | 'linear' | 'pq' | 'bt.2020'
  }
  'd3d11-output-format': {
    read: 'auto' | 'rgba8' | 'bgra8' | 'rgb10_a2' | 'rgba16f'
    write: 'auto' | 'rgba8' | 'bgra8' | 'rgb10_a2' | 'rgba16f'
  }
  'd3d11-output-mode': {
    read: 'auto' | 'window' | 'composition'
    write: 'auto' | 'window' | 'composition'
  }
  'd3d11-sync-interval': { read: bigint; write: IntegerArgument }
  'd3d11-warp': { read: 'auto' | true | false; write: 'auto' | 'no' | 'yes' | true | false }
  'd3d11va-zero-copy': { read: boolean; write: boolean | 'yes' | 'no' }
  deband: { read: boolean; write: boolean | 'yes' | 'no' }
  'deband-grain': { read: number; write: RealArgument }
  'deband-iterations': { read: bigint; write: IntegerArgument }
  'deband-range': { read: number; write: RealArgument }
  'deband-threshold': { read: number; write: RealArgument }
  deinterlace: { read: 'auto' | true | false; write: 'no' | 'yes' | 'auto' | true | false }
  'deinterlace-field-parity': { read: 'tff' | 'bff' | 'auto'; write: 'tff' | 'bff' | 'auto' }
  demuxer: { read: string; write: string }
  'demuxer-backward-playback-step': { read: number; write: RealArgument }
  'demuxer-cache-dir': { read: string; write: string }
  'demuxer-cache-unlink-files': {
    read: 'immediate' | 'whendone' | false
    write: 'immediate' | 'whendone' | 'no' | false
  }
  'demuxer-cache-wait': { read: boolean; write: boolean | 'yes' | 'no' }
  'demuxer-donate-buffer': { read: boolean; write: boolean | 'yes' | 'no' }
  'demuxer-hysteresis-bytes': { read: bigint; write: bigint | string }
  'demuxer-hysteresis-secs': { read: number; write: RealArgument }
  'demuxer-lavf-allow-mimetype': { read: boolean; write: boolean | 'yes' | 'no' }
  'demuxer-lavf-analyzeduration': { read: number; write: RealArgument }
  'demuxer-lavf-buffersize': { read: bigint; write: bigint | string }
  'demuxer-lavf-format': { read: string; write: string }
  'demuxer-lavf-hacks': { read: boolean; write: boolean | 'yes' | 'no' }
  'demuxer-lavf-linearize-timestamps': {
    read: 'auto' | true | false
    write: 'no' | 'auto' | 'yes' | true | false
  }
  'demuxer-lavf-o': {
    read: Readonly<Record<string, string>>
    write: string | Readonly<Record<string, string>>
  }
  'demuxer-lavf-probe-info': {
    read: 'auto' | 'nostreams' | true | false
    write: 'no' | 'yes' | 'auto' | 'nostreams' | true | false
  }
  'demuxer-lavf-probescore': { read: bigint; write: IntegerArgument }
  'demuxer-lavf-probesize': { read: bigint; write: bigint | string }
  'demuxer-lavf-propagate-opts': { read: boolean; write: boolean | 'yes' | 'no' }
  'demuxer-max-back-bytes': { read: bigint; write: bigint | string }
  'demuxer-max-bytes': { read: bigint; write: bigint | string }
  'demuxer-mkv-crop-compat': { read: boolean; write: boolean | 'yes' | 'no' }
  'demuxer-mkv-probe-start-time': { read: boolean; write: boolean | 'yes' | 'no' }
  'demuxer-mkv-probe-video-duration': {
    read: 'full' | true | false
    write: 'no' | 'yes' | 'full' | true | false
  }
  'demuxer-mkv-subtitle-preroll': {
    read: 'index' | true | false
    write: 'no' | 'yes' | 'index' | true | false
  }
  'demuxer-mkv-subtitle-preroll-secs': { read: number; write: RealArgument }
  'demuxer-mkv-subtitle-preroll-secs-index': { read: number; write: RealArgument }
  'demuxer-rawaudio-channels': { read: string; write: string }
  'demuxer-rawaudio-format': {
    read:
      | 'u8'
      | 's8'
      | 'u16le'
      | 'u16be'
      | 's16le'
      | 's16be'
      | 'u24le'
      | 'u24be'
      | 's24le'
      | 's24be'
      | 'u32le'
      | 'u32be'
      | 's32le'
      | 's32be'
      | 'floatle'
      | 'floatbe'
      | 'doublele'
      | 'doublebe'
      | 'u16'
      | 's16'
      | 'u24'
      | 's24'
      | 'u32'
      | 's32'
      | 'float'
      | 'double'
    write:
      | 'u8'
      | 's8'
      | 'u16le'
      | 'u16be'
      | 's16le'
      | 's16be'
      | 'u24le'
      | 'u24be'
      | 's24le'
      | 's24be'
      | 'u32le'
      | 'u32be'
      | 's32le'
      | 's32be'
      | 'floatle'
      | 'floatbe'
      | 'doublele'
      | 'doublebe'
      | 'u16'
      | 's16'
      | 'u24'
      | 's24'
      | 'u32'
      | 's32'
      | 'float'
      | 'double'
  }
  'demuxer-rawaudio-rate': { read: bigint; write: IntegerArgument }
  'demuxer-rawvideo-codec': { read: string; write: string }
  'demuxer-rawvideo-format': { read: string; write: string }
  'demuxer-rawvideo-fps': { read: number; write: RealArgument }
  'demuxer-rawvideo-h': { read: bigint; write: IntegerArgument }
  'demuxer-rawvideo-mp-format': { read: string; write: string }
  'demuxer-rawvideo-size': { read: bigint; write: IntegerArgument }
  'demuxer-rawvideo-w': { read: bigint; write: IntegerArgument }
  'demuxer-readahead-secs': { read: number; write: RealArgument }
  'demuxer-seekable-cache': {
    read: 'auto' | true | false
    write: 'auto' | 'no' | 'yes' | true | false
  }
  'demuxer-termination-timeout': { read: number; write: RealArgument }
  'demuxer-thread': { read: boolean; write: boolean | 'yes' | 'no' }
  'directory-filter-types': { read: readonly string[]; write: string | readonly string[] }
  'directory-mode': {
    read: 'auto' | 'lazy' | 'recursive' | 'ignore'
    write: 'auto' | 'lazy' | 'recursive' | 'ignore'
  }
  'disc-menu': { read: boolean; write: boolean | 'yes' | 'no' }
  'display-fps-override': { read: number; write: RealArgument }
  'display-tags': { read: readonly string[]; write: string | readonly string[] }
  dither: {
    read: 'fruit' | 'ordered' | 'error-diffusion' | false
    write: 'fruit' | 'ordered' | 'error-diffusion' | 'no' | false
  }
  'dither-depth': { read: 'auto' | false | bigint; write: 'no' | 'auto' | false | IntegerArgument }
  'dither-size-fruit': { read: bigint; write: IntegerArgument }
  'drag-and-drop': {
    read: 'auto' | 'replace' | 'append' | 'insert-next' | false
    write: 'no' | 'auto' | 'replace' | 'append' | 'insert-next' | false
  }
  'drm-connector': { read: string; write: string }
  'drm-device': { read: string; write: string }
  'drm-draw-plane': {
    read: 'primary' | 'overlay' | bigint
    write: 'primary' | 'overlay' | IntegerArgument
  }
  'drm-draw-surface-size': { read: string; write: string }
  'drm-drmprime-video-plane': {
    read: 'primary' | 'overlay' | bigint
    write: 'primary' | 'overlay' | IntegerArgument
  }
  'drm-format': {
    read: 'xrgb8888' | 'xrgb2101010' | 'xbgr8888' | 'xbgr2101010' | 'rgb565' | 'yuyv'
    write: 'xrgb8888' | 'xrgb2101010' | 'xbgr8888' | 'xbgr2101010' | 'rgb565' | 'yuyv'
  }
  'drm-mode': { read: string; write: string }
  'drm-vrr-enabled': { read: 'auto' | true | false; write: 'no' | 'yes' | 'auto' | true | false }
  dscale: {
    read:
      | ''
      | 'bilinear'
      | 'bicubic_fast'
      | 'oversample'
      | 'spline16'
      | 'spline36'
      | 'spline64'
      | 'sinc'
      | 'lanczos'
      | 'ginseng'
      | 'bicubic'
      | 'hermite'
      | 'catmull_rom'
      | 'mitchell'
      | 'robidoux'
      | 'robidouxsharp'
      | 'box'
      | 'nearest'
      | 'triangle'
      | 'gaussian'
      | 'jinc'
      | 'ewa_lanczos'
      | 'ewa_hanning'
      | 'ewa_ginseng'
      | 'ewa_lanczossharp'
      | 'ewa_lanczos4sharpest'
      | 'ewa_lanczossoft'
      | 'haasnsoft'
      | 'ewa_robidoux'
      | 'ewa_robidouxsharp'
      | 'bartlett'
      | 'cosine'
      | 'hanning'
      | 'tukey'
      | 'hamming'
      | 'quadric'
      | 'welch'
      | 'kaiser'
      | 'blackman'
      | 'sphinx'
    write:
      | ''
      | 'bilinear'
      | 'bicubic_fast'
      | 'oversample'
      | 'spline16'
      | 'spline36'
      | 'spline64'
      | 'sinc'
      | 'lanczos'
      | 'ginseng'
      | 'bicubic'
      | 'hermite'
      | 'catmull_rom'
      | 'mitchell'
      | 'robidoux'
      | 'robidouxsharp'
      | 'box'
      | 'nearest'
      | 'triangle'
      | 'gaussian'
      | 'jinc'
      | 'ewa_lanczos'
      | 'ewa_hanning'
      | 'ewa_ginseng'
      | 'ewa_lanczossharp'
      | 'ewa_lanczos4sharpest'
      | 'ewa_lanczossoft'
      | 'haasnsoft'
      | 'ewa_robidoux'
      | 'ewa_robidouxsharp'
      | 'bartlett'
      | 'cosine'
      | 'hanning'
      | 'tukey'
      | 'hamming'
      | 'quadric'
      | 'welch'
      | 'kaiser'
      | 'blackman'
      | 'sphinx'
  }
  'dscale-antiring': { read: number; write: RealArgument }
  'dscale-blur': { read: number; write: RealArgument }
  'dscale-clamp': { read: number; write: RealArgument }
  'dscale-param1': { read: number; write: RealArgument }
  'dscale-param2': { read: number; write: RealArgument }
  'dscale-radius': { read: number; write: RealArgument }
  'dscale-taper': { read: number; write: RealArgument }
  'dscale-window': {
    read:
      | ''
      | 'bartlett'
      | 'cosine'
      | 'hanning'
      | 'tukey'
      | 'hamming'
      | 'quadric'
      | 'welch'
      | 'kaiser'
      | 'blackman'
      | 'sphinx'
      | 'jinc'
    write:
      | ''
      | 'bartlett'
      | 'cosine'
      | 'hanning'
      | 'tukey'
      | 'hamming'
      | 'quadric'
      | 'welch'
      | 'kaiser'
      | 'blackman'
      | 'sphinx'
      | 'jinc'
  }
  'dscale-wparam': { read: number; write: RealArgument }
  'dscale-wtaper': { read: number; write: RealArgument }
  'dump-stats': { read: string; write: string }
  edition: { read: 'auto' | bigint; write: 'auto' | IntegerArgument }
  'egl-config-id': { read: bigint; write: IntegerArgument }
  'egl-output-format': {
    read:
      | 'auto'
      | 'rgb8'
      | 'rgba8'
      | 'rgb10'
      | 'rgb10_a2'
      | 'rgb16'
      | 'rgba16'
      | 'rgb16f'
      | 'rgba16f'
      | 'rgb32f'
      | 'rgba32f'
    write:
      | 'auto'
      | 'rgb8'
      | 'rgba8'
      | 'rgb10'
      | 'rgb10_a2'
      | 'rgb16'
      | 'rgba16'
      | 'rgb16f'
      | 'rgba16f'
      | 'rgb32f'
      | 'rgba32f'
  }
  embeddedfonts: { read: boolean; write: boolean | 'yes' | 'no' }
  end: { read: string; write: string }
  'error-diffusion': { read: string; write: string }
  'external-file': { read: MpvValue; write: MpvValue }
  'external-files': { read: readonly string[]; write: string | readonly string[] }
  'fbo-format': { read: string; write: string }
  'flatten-editions': { read: boolean; write: boolean | 'yes' | 'no' }
  'focus-on': { read: 'never' | 'open' | 'all'; write: 'never' | 'open' | 'all' }
  'focus-on-open': { read: MpvValue; write: MpvValue }
  'force-media-title': { read: string; write: string }
  'force-render': { read: boolean; write: boolean | 'yes' | 'no' }
  'force-rgba-osd-rendering': { read: boolean; write: boolean | 'yes' | 'no' }
  'force-seekable': { read: boolean; write: boolean | 'yes' | 'no' }
  'force-window': {
    read: 'immediate' | true | false
    write: 'no' | 'yes' | 'immediate' | true | false
  }
  'force-window-position': { read: boolean; write: boolean | 'yes' | 'no' }
  framedrop: {
    read: 'vo' | 'decoder' | 'decoder+vo' | false
    write: 'no' | 'vo' | 'decoder' | 'decoder+vo' | false
  }
  frames: { read: 'all' | bigint; write: 'all' | IntegerArgument }
  fs: { read: boolean; write: boolean | 'yes' | 'no' }
  'fs-screen': { read: 'all' | 'current' | bigint; write: 'all' | 'current' | IntegerArgument }
  'fs-screen-name': { read: string; write: string }
  fullscreen: { read: boolean; write: boolean | 'yes' | 'no' }
  gamma: { read: number; write: RealArgument }
  'gamma-auto': { read: boolean; write: boolean | 'yes' | 'no' }
  'gamma-factor': { read: number; write: RealArgument }
  'gamut-clipping': { read: MpvValue; write: MpvValue }
  'gamut-mapping-mode': {
    read:
      | 'auto'
      | 'clip'
      | 'perceptual'
      | 'relative'
      | 'saturation'
      | 'absolute'
      | 'desaturate'
      | 'darken'
      | 'warn'
      | 'linear'
    write:
      | 'auto'
      | 'clip'
      | 'perceptual'
      | 'relative'
      | 'saturation'
      | 'absolute'
      | 'desaturate'
      | 'darken'
      | 'warn'
      | 'linear'
  }
  'gamut-warning': { read: MpvValue; write: MpvValue }
  'gapless-audio': { read: 'weak' | true | false; write: 'no' | 'yes' | 'weak' | true | false }
  geometry: { read: string; write: string }
  'glsl-shader': { read: MpvValue; write: MpvValue }
  'glsl-shader-opts': {
    read: Readonly<Record<string, string>>
    write: string | Readonly<Record<string, string>>
  }
  'glsl-shaders': { read: readonly string[]; write: string | readonly string[] }
  'gpu-api': { read: readonly ObjectSetting[]; write: string | readonly ObjectSetting[] }
  'gpu-context': { read: readonly ObjectSetting[]; write: string | readonly ObjectSetting[] }
  'gpu-debug': { read: boolean; write: boolean | 'yes' | 'no' }
  'gpu-dumb-mode': { read: 'auto' | true | false; write: 'auto' | 'yes' | 'no' | true | false }
  'gpu-hwdec-interop': { read: string; write: string }
  'gpu-shader-cache': { read: boolean; write: boolean | 'yes' | 'no' }
  'gpu-shader-cache-dir': { read: string; write: string }
  'gpu-sw': { read: boolean; write: boolean | 'yes' | 'no' }
  'gpu-tex-pad-x': { read: bigint; write: IntegerArgument }
  'gpu-tex-pad-y': { read: bigint; write: IntegerArgument }
  h: { read: string; write: string }
  'hdr-compute-peak': { read: 'auto' | true | false; write: 'auto' | 'yes' | 'no' | true | false }
  'hdr-contrast-recovery': { read: number; write: RealArgument }
  'hdr-contrast-smoothness': { read: number; write: RealArgument }
  'hdr-film-strength': { read: number; write: RealArgument }
  'hdr-mastering-clip': { read: number; write: RealArgument }
  'hdr-peak-decay-rate': { read: number; write: RealArgument }
  'hdr-peak-percentile': { read: number; write: RealArgument }
  'hdr-reference-white': { read: 'auto' | bigint; write: 'auto' | IntegerArgument }
  'hdr-scene-threshold-high': { read: number; write: RealArgument }
  'hdr-scene-threshold-low': { read: number; write: RealArgument }
  help: { read: string; write: string }
  'hidpi-window-scale': { read: boolean; write: boolean | 'yes' | 'no' }
  'hls-bitrate': {
    read: 'min' | 'max' | false | bigint
    write: 'no' | 'min' | 'max' | false | IntegerArgument
  }
  'hr-seek': {
    read: 'absolute' | 'always' | 'default' | true | false
    write: 'no' | 'absolute' | 'yes' | 'always' | 'default' | true | false
  }
  'hr-seek-demuxer-offset': { read: number; write: RealArgument }
  'hr-seek-framedrop': { read: boolean; write: boolean | 'yes' | 'no' }
  'http-header-fields': { read: readonly string[]; write: string | readonly string[] }
  'http-proxy': { read: string; write: string }
  hue: { read: number; write: RealArgument }
  hwdec: { read: readonly string[]; write: string | readonly string[] }
  'hwdec-codecs': { read: string; write: string }
  'hwdec-extra-frames': { read: 'auto' | bigint; write: 'auto' | IntegerArgument }
  'hwdec-image-format': { read: string; write: string }
  'hwdec-software-fallback': {
    read: true | false | bigint
    write: 'no' | 'yes' | true | false | IntegerArgument
  }
  'hwdec-threads': { read: bigint; write: IntegerArgument }
  'icc-3dlut-size': { read: string; write: string }
  'icc-cache': { read: boolean; write: boolean | 'yes' | 'no' }
  'icc-cache-dir': { read: string; write: string }
  'icc-force-contrast': {
    read: 'inf' | false | bigint
    write: 'no' | 'inf' | false | IntegerArgument
  }
  'icc-intent': { read: bigint; write: IntegerArgument }
  'icc-profile': { read: string; write: string }
  'icc-profile-auto': { read: boolean; write: boolean | 'yes' | 'no' }
  'icc-use-luma': { read: boolean; write: boolean | 'yes' | 'no' }
  idle: { read: 'once' | true | false; write: 'no' | 'once' | 'yes' | true | false }
  'ignore-path-in-watch-later-config': { read: boolean; write: boolean | 'yes' | 'no' }
  'image-display-duration': { read: number; write: RealArgument | 'inf' }
  'image-exts': { read: readonly string[]; write: string | readonly string[] }
  'image-lut': { read: string; write: string }
  'image-lut-type': {
    read: 'auto' | 'native' | 'normalized' | 'conversion'
    write: 'auto' | 'native' | 'normalized' | 'conversion'
  }
  'image-subs-hdr-peak': {
    read: 'sdr' | 'video' | 'video-static' | 'video-dynamic' | bigint
    write: 'sdr' | 'video' | 'video-static' | 'video-dynamic' | IntegerArgument
  }
  'image-subs-video-resolution': { read: boolean; write: boolean | 'yes' | 'no' }
  include: { read: string; write: string }
  index: { read: 'default' | 'recreate'; write: 'default' | 'recreate' }
  'initial-audio-sync': { read: boolean; write: boolean | 'yes' | 'no' }
  'input-ar-delay': { read: bigint; write: IntegerArgument }
  'input-ar-rate': { read: bigint; write: IntegerArgument }
  'input-builtin-bindings': { read: boolean; write: boolean | 'yes' | 'no' }
  'input-builtin-drag-and-drop': { read: boolean; write: boolean | 'yes' | 'no' }
  'input-builtin-dragging': { read: boolean; write: boolean | 'yes' | 'no' }
  'input-cmdlist': { read: MpvValue; write: string }
  'input-commands': { read: readonly string[]; write: string | readonly string[] }
  'input-conf': { read: string; write: string }
  'input-cursor': { read: boolean; write: boolean | 'yes' | 'no' }
  'input-cursor-passthrough': { read: boolean; write: boolean | 'yes' | 'no' }
  'input-default-bindings': { read: boolean; write: boolean | 'yes' | 'no' }
  'input-doubleclick-time': { read: bigint; write: IntegerArgument }
  'input-dragging-deadzone': { read: bigint; write: IntegerArgument }
  'input-ime': { read: boolean; write: boolean | 'yes' | 'no' }
  'input-ipc-client': { read: string; write: string }
  'input-ipc-server': { read: string; write: string }
  'input-key-fifo-size': { read: bigint; write: IntegerArgument }
  'input-keylist': { read: MpvValue; write: string }
  'input-media-keys': { read: boolean; write: boolean | 'yes' | 'no' }
  'input-preprocess-wheel': { read: boolean; write: boolean | 'yes' | 'no' }
  'input-right-alt-gr': { read: boolean; write: boolean | 'yes' | 'no' }
  'input-tablet-emulate-mouse': { read: boolean; write: boolean | 'yes' | 'no' }
  'input-terminal': { read: boolean; write: boolean | 'yes' | 'no' }
  'input-test': { read: boolean; write: boolean | 'yes' | 'no' }
  'input-touch-emulate-mouse': { read: boolean; write: boolean | 'yes' | 'no' }
  'input-vo-keyboard': { read: boolean; write: boolean | 'yes' | 'no' }
  interpolation: { read: boolean; write: boolean | 'yes' | 'no' }
  'interpolation-preserve': { read: boolean; write: boolean | 'yes' | 'no' }
  'interpolation-threshold': { read: number; write: RealArgument }
  'inverse-tone-mapping': { read: boolean; write: boolean | 'yes' | 'no' }
  'js-memory-report': { read: boolean; write: boolean | 'yes' | 'no' }
  'keep-open': { read: 'always' | true | false; write: 'no' | 'yes' | 'always' | true | false }
  'keep-open-pause': { read: boolean; write: boolean | 'yes' | 'no' }
  keepaspect: { read: boolean; write: boolean | 'yes' | 'no' }
  'keepaspect-window': { read: boolean; write: boolean | 'yes' | 'no' }
  'lavfi-complex': { read: string; write: string }
  length: { read: string; write: string }
  'libplacebo-opts': {
    read: Readonly<Record<string, string>>
    write: string | Readonly<Record<string, string>>
  }
  'linear-downscaling': { read: boolean; write: boolean | 'yes' | 'no' }
  'linear-upscaling': { read: boolean; write: boolean | 'yes' | 'no' }
  'list-options': { read: boolean; write: boolean | 'yes' | 'no' }
  'list-properties': { read: boolean; write: boolean | 'yes' | 'no' }
  'list-protocols': { read: MpvValue; write: string }
  'load-auto-profiles': { read: 'auto' | true | false; write: 'no' | 'yes' | 'auto' | true | false }
  'load-commands': { read: boolean; write: boolean | 'yes' | 'no' }
  'load-console': { read: boolean; write: boolean | 'yes' | 'no' }
  'load-context-menu': { read: boolean; write: boolean | 'yes' | 'no' }
  'load-osd-console': { read: boolean; write: boolean | 'yes' | 'no' }
  'load-positioning': { read: boolean; write: boolean | 'yes' | 'no' }
  'load-scripts': { read: boolean; write: boolean | 'yes' | 'no' }
  'load-select': { read: boolean; write: boolean | 'yes' | 'no' }
  'load-stats-overlay': { read: boolean; write: boolean | 'yes' | 'no' }
  'load-unsafe-playlists': { read: boolean; write: boolean | 'yes' | 'no' }
  'log-file': { read: string; write: string }
  loop: {
    read: 'inf' | true | false | bigint
    write: 'no' | 'inf' | 'yes' | true | false | IntegerArgument
  }
  'loop-file': {
    read: 'inf' | true | false | bigint
    write: 'no' | 'inf' | 'yes' | true | false | IntegerArgument
  }
  'loop-playlist': {
    read: 'inf' | 'force' | true | false | bigint
    write: 'no' | 'inf' | 'yes' | 'force' | true | false | IntegerArgument
  }
  lut: { read: string; write: string }
  'lut-type': {
    read: 'auto' | 'native' | 'normalized' | 'conversion'
    write: 'auto' | 'native' | 'normalized' | 'conversion'
  }
  'macos-app-activation-policy': {
    read: 'regular' | 'accessory' | 'prohibited'
    write: 'regular' | 'accessory' | 'prohibited'
  }
  'macos-bundle-path': { read: readonly string[]; write: string | readonly string[] }
  'macos-force-dedicated-gpu': { read: boolean; write: boolean | 'yes' | 'no' }
  'macos-fs-animation-duration': { read: 'default' | bigint; write: 'default' | IntegerArgument }
  'macos-geometry-calculation': { read: 'visible' | 'whole'; write: 'visible' | 'whole' }
  'macos-menu-shortcuts': { read: boolean; write: boolean | 'yes' | 'no' }
  'macos-render-timer': {
    read: 'callback' | 'precise' | 'system' | 'feedback'
    write: 'callback' | 'precise' | 'system' | 'feedback'
  }
  'macos-title-bar-appearance': {
    read:
      | 'auto'
      | 'aqua'
      | 'darkAqua'
      | 'vibrantLight'
      | 'vibrantDark'
      | 'aquaHighContrast'
      | 'darkAquaHighContrast'
      | 'vibrantLightHighContrast'
      | 'vibrantDarkHighContrast'
    write:
      | 'auto'
      | 'aqua'
      | 'darkAqua'
      | 'vibrantLight'
      | 'vibrantDark'
      | 'aquaHighContrast'
      | 'darkAquaHighContrast'
      | 'vibrantLightHighContrast'
      | 'vibrantDarkHighContrast'
  }
  'macos-title-bar-color': { read: string; write: string }
  'macos-title-bar-material': {
    read:
      | 'titlebar'
      | 'selection'
      | 'menu'
      | 'popover'
      | 'sidebar'
      | 'headerView'
      | 'sheet'
      | 'windowBackground'
      | 'hudWindow'
      | 'fullScreen'
      | 'toolTip'
      | 'contentBackground'
      | 'underWindowBackground'
      | 'underPageBackground'
      | 'dark'
      | 'light'
      | 'mediumLight'
      | 'ultraDark'
    write:
      | 'titlebar'
      | 'selection'
      | 'menu'
      | 'popover'
      | 'sidebar'
      | 'headerView'
      | 'sheet'
      | 'windowBackground'
      | 'hudWindow'
      | 'fullScreen'
      | 'toolTip'
      | 'contentBackground'
      | 'underWindowBackground'
      | 'underPageBackground'
      | 'dark'
      | 'light'
      | 'mediumLight'
      | 'ultraDark'
  }
  mc: { read: number; write: RealArgument }
  'media-controls': { read: boolean; write: boolean | 'yes' | 'no' }
  'merge-files': { read: boolean; write: boolean | 'yes' | 'no' }
  'metadata-codepage': { read: string; write: string }
  'mf-fps': { read: number; write: RealArgument }
  'mf-type': { read: string; write: string }
  monitoraspect: { read: number; write: RealArgument }
  monitorpixelaspect: { read: number; write: RealArgument }
  'msg-color': { read: boolean; write: boolean | 'yes' | 'no' }
  'msg-level': {
    read: Readonly<Record<string, string>>
    write: string | Readonly<Record<string, string>>
  }
  'msg-module': { read: boolean; write: boolean | 'yes' | 'no' }
  'msg-time': { read: boolean; write: boolean | 'yes' | 'no' }
  mute: { read: boolean; write: boolean | 'yes' | 'no' }
  'native-fs': { read: boolean; write: boolean | 'yes' | 'no' }
  'native-keyrepeat': { read: boolean; write: boolean | 'yes' | 'no' }
  'native-touch': { read: boolean; write: boolean | 'yes' | 'no' }
  'network-timeout': { read: number; write: RealArgument }
  o: { read: string; write: string }
  oac: { read: string; write: string }
  oacopts: {
    read: Readonly<Record<string, string>>
    write: string | Readonly<Record<string, string>>
  }
  'ocopy-metadata': { read: boolean; write: boolean | 'yes' | 'no' }
  of: { read: string; write: string }
  ofopts: {
    read: Readonly<Record<string, string>>
    write: string | Readonly<Record<string, string>>
  }
  'on-all-workspaces': { read: boolean; write: boolean | 'yes' | 'no' }
  ontop: { read: boolean; write: boolean | 'yes' | 'no' }
  'ontop-level': {
    read: 'window' | 'system' | 'desktop' | bigint
    write: 'window' | 'system' | 'desktop' | IntegerArgument
  }
  'opengl-check-pattern-a': { read: bigint; write: IntegerArgument }
  'opengl-check-pattern-b': { read: bigint; write: IntegerArgument }
  'opengl-early-flush': { read: 'auto' | true | false; write: 'no' | 'yes' | 'auto' | true | false }
  'opengl-es': { read: 'auto' | true | false; write: 'auto' | 'yes' | 'no' | true | false }
  'opengl-glfinish': { read: boolean; write: boolean | 'yes' | 'no' }
  'opengl-pbo': { read: boolean; write: boolean | 'yes' | 'no' }
  'opengl-rectangle-textures': { read: boolean; write: boolean | 'yes' | 'no' }
  'opengl-swapinterval': { read: bigint; write: IntegerArgument }
  'opengl-waitvsync': { read: boolean; write: boolean | 'yes' | 'no' }
  orawts: { read: boolean; write: boolean | 'yes' | 'no' }
  'ordered-chapters': { read: boolean; write: boolean | 'yes' | 'no' }
  'ordered-chapters-files': { read: string; write: string }
  'oremove-metadata': { read: readonly string[]; write: string | readonly string[] }
  osc: { read: boolean; write: boolean | 'yes' | 'no' }
  'osd-align-x': { read: 'left' | 'center' | 'right'; write: 'left' | 'center' | 'right' }
  'osd-align-y': { read: 'top' | 'center' | 'bottom'; write: 'top' | 'center' | 'bottom' }
  'osd-back-color': { read: string; write: string }
  'osd-bar': { read: boolean; write: boolean | 'yes' | 'no' }
  'osd-bar-align-x': { read: number; write: RealArgument }
  'osd-bar-align-y': { read: number; write: RealArgument }
  'osd-bar-border-size': { read: number; write: RealArgument }
  'osd-bar-h': { read: number; write: RealArgument }
  'osd-bar-marker-min-size': { read: number; write: RealArgument }
  'osd-bar-marker-scale': { read: number; write: RealArgument }
  'osd-bar-marker-style': {
    read: 'none' | 'triangle' | 'line'
    write: 'none' | 'triangle' | 'line'
  }
  'osd-bar-outline-size': { read: number; write: RealArgument }
  'osd-bar-w': { read: number; write: RealArgument }
  'osd-bitmap-max-size': { read: bigint; write: IntegerArgument }
  'osd-blur': { read: number; write: RealArgument }
  'osd-bold': { read: boolean; write: boolean | 'yes' | 'no' }
  'osd-border-color': { read: string; write: string }
  'osd-border-size': { read: number; write: RealArgument }
  'osd-border-style': {
    read: 'outline-and-shadow' | 'opaque-box' | 'background-box'
    write: 'outline-and-shadow' | 'opaque-box' | 'background-box'
  }
  'osd-color': { read: string; write: string }
  'osd-duration': { read: bigint; write: IntegerArgument }
  'osd-font': { read: string; write: string }
  'osd-font-provider': {
    read: 'auto' | 'none' | 'fontconfig'
    write: 'auto' | 'none' | 'fontconfig'
  }
  'osd-font-size': { read: number; write: RealArgument }
  'osd-fonts-dir': { read: string; write: string }
  'osd-fractions': { read: boolean; write: boolean | 'yes' | 'no' }
  'osd-glyph-limit': { read: bigint; write: IntegerArgument }
  'osd-italic': { read: boolean; write: boolean | 'yes' | 'no' }
  'osd-justify': {
    read: 'auto' | 'left' | 'center' | 'right'
    write: 'auto' | 'left' | 'center' | 'right'
  }
  'osd-level': { read: 0n | 1n | 2n | 3n; write: '0' | '1' | '2' | '3' | 0n | 1n | 2n | 3n }
  'osd-margin-x': { read: bigint; write: IntegerArgument }
  'osd-margin-y': { read: bigint; write: IntegerArgument }
  'osd-margin-y-offset': { read: bigint; write: IntegerArgument }
  'osd-msg1': { read: string; write: string }
  'osd-msg2': { read: string; write: string }
  'osd-msg3': { read: string; write: string }
  'osd-on-seek': {
    read: 'bar' | 'msg' | 'msg-bar' | false
    write: 'no' | 'bar' | 'msg' | 'msg-bar' | false
  }
  'osd-outline-color': { read: string; write: string }
  'osd-outline-size': { read: number; write: RealArgument }
  'osd-playing-msg': { read: string; write: string }
  'osd-playing-msg-duration': { read: bigint; write: IntegerArgument }
  'osd-playlist-entry': {
    read: 'title' | 'filename' | 'both'
    write: 'title' | 'filename' | 'both'
  }
  'osd-prune-delay': { read: number; write: RealArgument }
  'osd-scale': { read: number; write: RealArgument }
  'osd-scale-by-window': { read: boolean; write: boolean | 'yes' | 'no' }
  'osd-selected-color': { read: string; write: string }
  'osd-selected-outline-color': { read: string; write: string }
  'osd-shadow-color': { read: string; write: string }
  'osd-shadow-offset': { read: number; write: RealArgument }
  'osd-shaper': { read: 'simple' | 'complex'; write: 'simple' | 'complex' }
  'osd-spacing': { read: number; write: RealArgument }
  'osd-status-msg': { read: string; write: string }
  'oset-metadata': {
    read: Readonly<Record<string, string>>
    write: string | Readonly<Record<string, string>>
  }
  ovc: { read: string; write: string }
  ovcopts: {
    read: Readonly<Record<string, string>>
    write: string | Readonly<Record<string, string>>
  }
  'override-display-fps': { read: number; write: RealArgument }
  panscan: { read: number; write: RealArgument }
  pause: { read: boolean; write: boolean | 'yes' | 'no' }
  pitch: { read: number; write: RealArgument }
  'play-dir': {
    read: 'forward' | '+' | 'backward' | '-'
    write: 'forward' | '+' | 'backward' | '-'
  }
  'play-direction': {
    read: 'forward' | '+' | 'backward' | '-'
    write: 'forward' | '+' | 'backward' | '-'
  }
  'player-operation-mode': { read: 'cplayer' | 'pseudo-gui'; write: 'cplayer' | 'pseudo-gui' }
  playlist: { read: string; write: string }
  'playlist-exts': { read: readonly string[]; write: string | readonly string[] }
  'playlist-inherit-options': {
    read: 'current' | true | false
    write: 'no' | 'yes' | 'current' | true | false
  }
  'playlist-start': {
    read: 'auto' | false | bigint
    write: 'auto' | 'no' | false | IntegerArgument
  }
  'prefetch-playlist': { read: boolean; write: boolean | 'yes' | 'no' }
  priority: {
    read: 'realtime' | 'high' | 'abovenormal' | 'normal' | 'belownormal' | 'idle' | false
    write: 'no' | 'realtime' | 'high' | 'abovenormal' | 'normal' | 'belownormal' | 'idle' | false
  }
  profile: { read: readonly string[]; write: string | readonly string[] }
  'pulse-allow-suspended': { read: boolean; write: boolean | 'yes' | 'no' }
  'pulse-buffer': { read: 'native' | bigint; write: 'native' | IntegerArgument }
  'pulse-host': { read: string; write: string }
  'pulse-latency-hacks': { read: boolean; write: boolean | 'yes' | 'no' }
  quiet: { read: boolean; write: boolean | 'yes' | 'no' }
  'really-quiet': { read: boolean; write: boolean | 'yes' | 'no' }
  'rebase-start-time': { read: boolean; write: boolean | 'yes' | 'no' }
  referrer: { read: string; write: string }
  register: { read: boolean; write: boolean | 'yes' | 'no' }
  'register-rpath': { read: string; write: string }
  replaygain: { read: 'track' | 'album' | false; write: 'no' | 'track' | 'album' | false }
  'replaygain-clip': { read: boolean; write: boolean | 'yes' | 'no' }
  'replaygain-fallback': { read: number; write: RealArgument }
  'replaygain-preamp': { read: number; write: RealArgument }
  'reset-on-next-file': { read: readonly string[]; write: string | readonly string[] }
  'resume-playback': { read: boolean; write: boolean | 'yes' | 'no' }
  'resume-playback-check-mtime': { read: boolean; write: boolean | 'yes' | 'no' }
  'rtsp-transport': {
    read: 'lavf' | 'udp' | 'tcp' | 'http' | 'udp_multicast'
    write: 'lavf' | 'udp' | 'tcp' | 'http' | 'udp_multicast'
  }
  saturation: { read: number; write: RealArgument }
  'save-position-on-quit': { read: boolean; write: boolean | 'yes' | 'no' }
  'save-watch-history': { read: boolean; write: boolean | 'yes' | 'no' }
  scale: {
    read:
      | 'bilinear'
      | 'bicubic_fast'
      | 'oversample'
      | 'spline16'
      | 'spline36'
      | 'spline64'
      | 'sinc'
      | 'lanczos'
      | 'ginseng'
      | 'bicubic'
      | 'hermite'
      | 'catmull_rom'
      | 'mitchell'
      | 'robidoux'
      | 'robidouxsharp'
      | 'box'
      | 'nearest'
      | 'triangle'
      | 'gaussian'
      | 'jinc'
      | 'ewa_lanczos'
      | 'ewa_hanning'
      | 'ewa_ginseng'
      | 'ewa_lanczossharp'
      | 'ewa_lanczos4sharpest'
      | 'ewa_lanczossoft'
      | 'haasnsoft'
      | 'ewa_robidoux'
      | 'ewa_robidouxsharp'
      | 'bartlett'
      | 'cosine'
      | 'hanning'
      | 'tukey'
      | 'hamming'
      | 'quadric'
      | 'welch'
      | 'kaiser'
      | 'blackman'
      | 'sphinx'
    write:
      | 'bilinear'
      | 'bicubic_fast'
      | 'oversample'
      | 'spline16'
      | 'spline36'
      | 'spline64'
      | 'sinc'
      | 'lanczos'
      | 'ginseng'
      | 'bicubic'
      | 'hermite'
      | 'catmull_rom'
      | 'mitchell'
      | 'robidoux'
      | 'robidouxsharp'
      | 'box'
      | 'nearest'
      | 'triangle'
      | 'gaussian'
      | 'jinc'
      | 'ewa_lanczos'
      | 'ewa_hanning'
      | 'ewa_ginseng'
      | 'ewa_lanczossharp'
      | 'ewa_lanczos4sharpest'
      | 'ewa_lanczossoft'
      | 'haasnsoft'
      | 'ewa_robidoux'
      | 'ewa_robidouxsharp'
      | 'bartlett'
      | 'cosine'
      | 'hanning'
      | 'tukey'
      | 'hamming'
      | 'quadric'
      | 'welch'
      | 'kaiser'
      | 'blackman'
      | 'sphinx'
  }
  'scale-antiring': { read: number; write: RealArgument }
  'scale-blur': { read: number; write: RealArgument }
  'scale-clamp': { read: number; write: RealArgument }
  'scale-param1': { read: number; write: RealArgument }
  'scale-param2': { read: number; write: RealArgument }
  'scale-radius': { read: number; write: RealArgument }
  'scale-taper': { read: number; write: RealArgument }
  'scale-window': {
    read:
      | ''
      | 'bartlett'
      | 'cosine'
      | 'hanning'
      | 'tukey'
      | 'hamming'
      | 'quadric'
      | 'welch'
      | 'kaiser'
      | 'blackman'
      | 'sphinx'
      | 'jinc'
    write:
      | ''
      | 'bartlett'
      | 'cosine'
      | 'hanning'
      | 'tukey'
      | 'hamming'
      | 'quadric'
      | 'welch'
      | 'kaiser'
      | 'blackman'
      | 'sphinx'
      | 'jinc'
  }
  'scale-wparam': { read: number; write: RealArgument }
  'scale-wtaper': { read: number; write: RealArgument }
  'scaler-resizes-only': { read: boolean; write: boolean | 'yes' | 'no' }
  screen: { read: 'default' | bigint; write: 'default' | IntegerArgument }
  'screen-name': { read: string; write: string }
  'screenshot-avif-encoder': { read: string; write: string }
  'screenshot-avif-opts': {
    read: Readonly<Record<string, string>>
    write: string | Readonly<Record<string, string>>
  }
  'screenshot-avif-pixfmt': { read: string; write: string }
  'screenshot-dir': { read: string; write: string }
  'screenshot-directory': { read: string; write: string }
  'screenshot-format': {
    read: 'jpg' | 'jpeg' | 'png' | 'webp' | 'jxl' | 'avif'
    write: 'jpg' | 'jpeg' | 'png' | 'webp' | 'jxl' | 'avif'
  }
  'screenshot-high-bit-depth': { read: boolean; write: boolean | 'yes' | 'no' }
  'screenshot-jpeg-quality': { read: bigint; write: IntegerArgument }
  'screenshot-jpeg-source-chroma': { read: boolean; write: boolean | 'yes' | 'no' }
  'screenshot-jxl-distance': { read: number; write: RealArgument }
  'screenshot-jxl-effort': { read: bigint; write: IntegerArgument }
  'screenshot-png-compression': { read: bigint; write: IntegerArgument }
  'screenshot-png-filter': { read: bigint; write: IntegerArgument }
  'screenshot-sw': { read: boolean; write: boolean | 'yes' | 'no' }
  'screenshot-tag-colorspace': { read: boolean; write: boolean | 'yes' | 'no' }
  'screenshot-template': { read: string; write: string }
  'screenshot-webp-compression': { read: bigint; write: IntegerArgument }
  'screenshot-webp-lossless': { read: boolean; write: boolean | 'yes' | 'no' }
  'screenshot-webp-quality': { read: bigint; write: IntegerArgument }
  script: { read: MpvValue; write: MpvValue }
  'script-opt': { read: MpvValue; write: MpvValue }
  'script-opts': {
    read: Readonly<Record<string, string>>
    write: string | Readonly<Record<string, string>>
  }
  scripts: { read: readonly string[]; write: string | readonly string[] }
  'sdr-adjust-gamma': { read: 'auto' | true | false; write: 'auto' | 'yes' | 'no' | true | false }
  'secondary-sid': { read: 'auto' | false | bigint; write: 'no' | 'auto' | false | IntegerArgument }
  'secondary-sub-ass-override': {
    read: 'scale' | 'force' | 'strip' | true | false
    write: 'no' | 'yes' | 'scale' | 'force' | 'strip' | true | false
  }
  'secondary-sub-delay': { read: number; write: RealArgument }
  'secondary-sub-pos': { read: number; write: RealArgument }
  'secondary-sub-scale': { read: number; write: RealArgument }
  'secondary-sub-visibility': { read: boolean; write: boolean | 'yes' | 'no' }
  sharpen: { read: number; write: RealArgument }
  'show-dependent-tracks': { read: boolean; write: boolean | 'yes' | 'no' }
  'show-in-taskbar': { read: boolean; write: boolean | 'yes' | 'no' }
  'show-profile': { read: string; write: string }
  shuffle: { read: boolean; write: boolean | 'yes' | 'no' }
  sid: { read: 'auto' | false | bigint; write: 'no' | 'auto' | false | IntegerArgument }
  'sigmoid-center': { read: number; write: RealArgument }
  'sigmoid-slope': { read: number; write: RealArgument }
  'sigmoid-upscaling': { read: boolean; write: boolean | 'yes' | 'no' }
  slang: { read: readonly string[]; write: string | readonly string[] }
  'snap-window': { read: boolean; write: boolean | 'yes' | 'no' }
  speed: { read: number; write: RealArgument }
  'spirv-compiler':
    | { read: 'auto'; write: 'auto' }
    | { read: 'auto' | 'shaderc'; write: 'auto' | 'shaderc' }
  sstep: { read: number; write: RealArgument }
  start: { read: string; write: string }
  'stop-playback-on-init-failure': { read: boolean; write: boolean | 'yes' | 'no' }
  'stop-screensaver': {
    read: 'always' | true | false
    write: 'no' | 'yes' | 'always' | true | false
  }
  'stream-buffer-size': { read: bigint; write: bigint | string }
  'stream-dump': { read: string; write: string }
  'stream-lavf-o': {
    read: Readonly<Record<string, string>>
    write: string | Readonly<Record<string, string>>
  }
  'stream-record': { read: string; write: string }
  'stretch-dvd-subs': { read: boolean; write: boolean | 'yes' | 'no' }
  'stretch-image-subs-to-screen': { read: boolean; write: boolean | 'yes' | 'no' }
  sub: { read: 'auto' | false | bigint; write: 'no' | 'auto' | false | IntegerArgument }
  'sub-align-x': { read: 'left' | 'center' | 'right'; write: 'left' | 'center' | 'right' }
  'sub-align-y': { read: 'top' | 'center' | 'bottom'; write: 'top' | 'center' | 'bottom' }
  'sub-ass': { read: boolean; write: boolean | 'yes' | 'no' }
  'sub-ass-force-margins': { read: boolean; write: boolean | 'yes' | 'no' }
  'sub-ass-force-style': { read: readonly string[]; write: string | readonly string[] }
  'sub-ass-hinting': {
    read: 'none' | 'light' | 'normal' | 'native'
    write: 'none' | 'light' | 'normal' | 'native'
  }
  'sub-ass-justify': { read: boolean; write: boolean | 'yes' | 'no' }
  'sub-ass-line-spacing': { read: number; write: RealArgument }
  'sub-ass-override': {
    read: 'scale' | 'force' | 'strip' | true | false
    write: 'no' | 'yes' | 'scale' | 'force' | 'strip' | true | false
  }
  'sub-ass-prune-delay': { read: number; write: RealArgument }
  'sub-ass-scale-with-window': { read: boolean; write: boolean | 'yes' | 'no' }
  'sub-ass-shaper': { read: 'simple' | 'complex'; write: 'simple' | 'complex' }
  'sub-ass-style-overrides': { read: readonly string[]; write: string | readonly string[] }
  'sub-ass-styles': { read: string; write: string }
  'sub-ass-use-video-data': {
    read: 'none' | 'aspect-ratio' | 'all'
    write: 'none' | 'aspect-ratio' | 'all'
  }
  'sub-ass-video-aspect-override': { read: number; write: number | bigint | string }
  'sub-ass-vsfilter-aspect-compat': { read: MpvValue; write: MpvValue }
  'sub-ass-vsfilter-blur-compat': { read: MpvValue; write: MpvValue }
  'sub-ass-vsfilter-color-compat': {
    read: 'basic' | 'full' | 'force-601' | false
    write: 'no' | 'basic' | 'full' | 'force-601' | false
  }
  'sub-auto': {
    read: 'exact' | 'fuzzy' | 'all' | false
    write: 'no' | 'exact' | 'fuzzy' | 'all' | false
  }
  'sub-auto-exts': { read: readonly string[]; write: string | readonly string[] }
  'sub-back-color': { read: string; write: string }
  'sub-bitmap-max-size': { read: bigint; write: IntegerArgument }
  'sub-blur': { read: number; write: RealArgument }
  'sub-bold': { read: boolean; write: boolean | 'yes' | 'no' }
  'sub-border-color': { read: string; write: string }
  'sub-border-size': { read: number; write: RealArgument }
  'sub-border-style': {
    read: 'outline-and-shadow' | 'opaque-box' | 'background-box'
    write: 'outline-and-shadow' | 'opaque-box' | 'background-box'
  }
  'sub-clear-on-seek': { read: boolean; write: boolean | 'yes' | 'no' }
  'sub-codepage': { read: string; write: string }
  'sub-color': { read: string; write: string }
  'sub-create-cc-track': { read: boolean; write: boolean | 'yes' | 'no' }
  'sub-delay': { read: number; write: RealArgument }
  'sub-demuxer': { read: string; write: string }
  'sub-file': { read: MpvValue; write: MpvValue }
  'sub-file-paths': { read: readonly string[]; write: string | readonly string[] }
  'sub-files': { read: readonly string[]; write: string | readonly string[] }
  'sub-filter-jsre': { read: readonly string[]; write: string | readonly string[] }
  'sub-filter-regex': { read: readonly string[]; write: string | readonly string[] }
  'sub-filter-regex-enable': { read: boolean; write: boolean | 'yes' | 'no' }
  'sub-filter-regex-plain': { read: boolean; write: boolean | 'yes' | 'no' }
  'sub-filter-regex-warn': { read: boolean; write: boolean | 'yes' | 'no' }
  'sub-filter-sdh': { read: boolean; write: boolean | 'yes' | 'no' }
  'sub-filter-sdh-enclosures': { read: readonly string[]; write: string | readonly string[] }
  'sub-filter-sdh-harder': { read: boolean; write: boolean | 'yes' | 'no' }
  'sub-fix-timing': { read: boolean; write: boolean | 'yes' | 'no' }
  'sub-fix-timing-keep': { read: bigint; write: IntegerArgument }
  'sub-fix-timing-threshold': { read: bigint; write: IntegerArgument }
  'sub-font': { read: string; write: string }
  'sub-font-provider': {
    read: 'auto' | 'none' | 'fontconfig'
    write: 'auto' | 'none' | 'fontconfig'
  }
  'sub-font-size': { read: number; write: RealArgument }
  'sub-fonts-dir': { read: string; write: string }
  'sub-forced-events-only': { read: boolean; write: boolean | 'yes' | 'no' }
  'sub-fps': { read: number; write: RealArgument }
  'sub-gauss': { read: number; write: RealArgument }
  'sub-glyph-limit': { read: bigint; write: IntegerArgument }
  'sub-gray': { read: boolean; write: boolean | 'yes' | 'no' }
  'sub-hdr-peak': { read: 'auto' | 'sdr' | bigint; write: 'auto' | 'sdr' | IntegerArgument }
  'sub-hinting': {
    read: 'none' | 'light' | 'normal' | 'native'
    write: 'none' | 'light' | 'normal' | 'native'
  }
  'sub-italic': { read: boolean; write: boolean | 'yes' | 'no' }
  'sub-justify': {
    read: 'auto' | 'left' | 'center' | 'right'
    write: 'auto' | 'left' | 'center' | 'right'
  }
  'sub-lavc-o': {
    read: Readonly<Record<string, string>>
    write: string | Readonly<Record<string, string>>
  }
  'sub-line-spacing': { read: number; write: RealArgument }
  'sub-margin-x': { read: bigint; write: IntegerArgument }
  'sub-margin-y': { read: bigint; write: IntegerArgument }
  'sub-margin-y-offset': { read: bigint; write: IntegerArgument }
  'sub-outline-color': { read: string; write: string }
  'sub-outline-size': { read: number; write: RealArgument }
  'sub-past-video-end': { read: boolean; write: boolean | 'yes' | 'no' }
  'sub-pos': { read: number; write: RealArgument }
  'sub-scale': { read: number; write: RealArgument }
  'sub-scale-by-window': { read: boolean; write: boolean | 'yes' | 'no' }
  'sub-scale-signs': { read: boolean; write: boolean | 'yes' | 'no' }
  'sub-scale-with-window': { read: boolean; write: boolean | 'yes' | 'no' }
  'sub-shadow-color': { read: string; write: string }
  'sub-shadow-offset': { read: number; write: RealArgument }
  'sub-shaper': { read: 'simple' | 'complex'; write: 'simple' | 'complex' }
  'sub-spacing': { read: number; write: RealArgument }
  'sub-speed': { read: number; write: RealArgument }
  'sub-stretch-durations': { read: boolean; write: boolean | 'yes' | 'no' }
  'sub-use-margins': { read: boolean; write: boolean | 'yes' | 'no' }
  'sub-visibility': { read: boolean; write: boolean | 'yes' | 'no' }
  'sub-vsfilter-bidi-compat': { read: boolean; write: boolean | 'yes' | 'no' }
  'subs-fallback': {
    read: 'default' | true | false
    write: 'no' | 'default' | 'yes' | true | false
  }
  'subs-fallback-forced': {
    read: 'always' | true | false
    write: 'no' | 'yes' | 'always' | true | false
  }
  'subs-match-os-language': { read: boolean; write: boolean | 'yes' | 'no' }
  'subs-with-matching-audio': {
    read: 'forced' | true | false
    write: 'no' | 'forced' | 'yes' | true | false
  }
  'swapchain-depth': { read: bigint; write: IntegerArgument }
  'sws-allow-zimg': { read: boolean; write: boolean | 'yes' | 'no' }
  'sws-bitexact': { read: boolean; write: boolean | 'yes' | 'no' }
  'sws-cgb': { read: number; write: RealArgument }
  'sws-chs': { read: bigint; write: IntegerArgument }
  'sws-cs': { read: number; write: RealArgument }
  'sws-cvs': { read: bigint; write: IntegerArgument }
  'sws-fast': { read: boolean; write: boolean | 'yes' | 'no' }
  'sws-lgb': { read: number; write: RealArgument }
  'sws-ls': { read: number; write: RealArgument }
  'sws-scaler': {
    read:
      | 'fast-bilinear'
      | 'bilinear'
      | 'bicubic'
      | 'x'
      | 'point'
      | 'area'
      | 'bicublin'
      | 'gauss'
      | 'sinc'
      | 'lanczos'
      | 'spline'
    write:
      | 'fast-bilinear'
      | 'bilinear'
      | 'bicubic'
      | 'x'
      | 'point'
      | 'area'
      | 'bicublin'
      | 'gauss'
      | 'sinc'
      | 'lanczos'
      | 'spline'
  }
  'target-colorspace-hint': {
    read: 'auto' | true | false
    write: 'auto' | 'no' | 'yes' | true | false
  }
  'target-colorspace-hint-mode': {
    read: 'target' | 'source' | 'source-dynamic'
    write: 'target' | 'source' | 'source-dynamic'
  }
  'target-colorspace-hint-strict': { read: boolean; write: boolean | 'yes' | 'no' }
  'target-contrast': { read: 'auto' | 'inf' | bigint; write: 'auto' | 'inf' | IntegerArgument }
  'target-gamut': { read: string; write: string }
  'target-lut': { read: string; write: string }
  'target-peak': { read: 'auto' | bigint; write: 'auto' | IntegerArgument }
  'target-prim': {
    read:
      | 'auto'
      | 'bt.601-525'
      | 'bt.601-625'
      | 'bt.709'
      | 'bt.2020'
      | 'bt.470m'
      | 'apple'
      | 'adobe'
      | 'prophoto'
      | 'cie1931'
      | 'dci-p3'
      | 'display-p3'
      | 'v-gamut'
      | 's-gamut'
      | 'ebu3213'
      | 'film-c'
      | 'aces-ap0'
      | 'aces-ap1'
    write:
      | 'auto'
      | 'bt.601-525'
      | 'bt.601-625'
      | 'bt.709'
      | 'bt.2020'
      | 'bt.470m'
      | 'apple'
      | 'adobe'
      | 'prophoto'
      | 'cie1931'
      | 'dci-p3'
      | 'display-p3'
      | 'v-gamut'
      | 's-gamut'
      | 'ebu3213'
      | 'film-c'
      | 'aces-ap0'
      | 'aces-ap1'
  }
  'target-trc': {
    read:
      | 'auto'
      | 'bt.1886'
      | 'srgb'
      | 'linear'
      | 'gamma1.8'
      | 'gamma2.0'
      | 'gamma2.2'
      | 'gamma2.4'
      | 'gamma2.6'
      | 'gamma2.8'
      | 'prophoto'
      | 'pq'
      | 'hlg'
      | 'v-log'
      | 's-log1'
      | 's-log2'
      | 'st428'
      | 'scrgb'
    write:
      | 'auto'
      | 'bt.1886'
      | 'srgb'
      | 'linear'
      | 'gamma1.8'
      | 'gamma2.0'
      | 'gamma2.2'
      | 'gamma2.4'
      | 'gamma2.6'
      | 'gamma2.8'
      | 'prophoto'
      | 'pq'
      | 'hlg'
      | 'v-log'
      | 's-log1'
      | 's-log2'
      | 'st428'
      | 'scrgb'
  }
  'taskbar-progress': { read: boolean; write: boolean | 'yes' | 'no' }
  'teletext-page': { read: bigint; write: IntegerArgument }
  'temporal-dither': { read: boolean; write: boolean | 'yes' | 'no' }
  'temporal-dither-period': { read: bigint; write: IntegerArgument }
  'term-osd': { read: 'force' | 'auto' | false; write: 'force' | 'auto' | 'no' | false }
  'term-osd-bar': { read: boolean; write: boolean | 'yes' | 'no' }
  'term-osd-bar-chars': { read: string; write: string }
  'term-playing-msg': { read: string; write: string }
  'term-status-msg': { read: string; write: string }
  'term-title': { read: string; write: string }
  terminal: { read: boolean; write: boolean | 'yes' | 'no' }
  title: { read: string; write: string }
  'title-bar': { read: boolean; write: boolean | 'yes' | 'no' }
  'tls-ca-file': { read: string; write: string }
  'tls-cert-file': { read: string; write: string }
  'tls-key-file': { read: string; write: string }
  'tls-verify': { read: boolean; write: boolean | 'yes' | 'no' }
  'tone-mapping': {
    read:
      | 'auto'
      | 'clip'
      | 'mobius'
      | 'reinhard'
      | 'hable'
      | 'gamma'
      | 'linear'
      | 'spline'
      | 'bt.2390'
      | 'bt.2446a'
      | 'st2094-40'
      | 'st2094-10'
    write:
      | 'auto'
      | 'clip'
      | 'mobius'
      | 'reinhard'
      | 'hable'
      | 'gamma'
      | 'linear'
      | 'spline'
      | 'bt.2390'
      | 'bt.2446a'
      | 'st2094-40'
      | 'st2094-10'
  }
  'tone-mapping-desaturate': { read: MpvValue; write: MpvValue }
  'tone-mapping-desaturate-exponent': { read: MpvValue; write: MpvValue }
  'tone-mapping-exposure': { read: number; write: RealArgument }
  'tone-mapping-knee-adaptation': { read: number; write: RealArgument }
  'tone-mapping-knee-default': { read: number; write: RealArgument }
  'tone-mapping-knee-maximum': { read: number; write: RealArgument }
  'tone-mapping-knee-minimum': { read: number; write: RealArgument }
  'tone-mapping-knee-offset': { read: number; write: RealArgument }
  'tone-mapping-linear-knee': { read: number; write: RealArgument }
  'tone-mapping-max-boost': { read: number; write: RealArgument }
  'tone-mapping-param': { read: number; write: RealArgument }
  'tone-mapping-reinhard-contrast': { read: number; write: RealArgument }
  'tone-mapping-slope-offset': { read: number; write: RealArgument }
  'tone-mapping-slope-tuning': { read: number; write: RealArgument }
  'tone-mapping-spline-contrast': { read: number; write: RealArgument }
  'tone-mapping-visualize': { read: boolean; write: boolean | 'yes' | 'no' }
  'track-auto-selection': { read: boolean; write: boolean | 'yes' | 'no' }
  'treat-srgb-as-power22': {
    read: 'input' | 'output' | 'both' | 'auto' | false
    write: 'no' | 'input' | 'output' | 'both' | 'auto' | false
  }
  tscale: {
    read:
      | 'oversample'
      | 'linear'
      | 'spline16'
      | 'spline36'
      | 'spline64'
      | 'sinc'
      | 'lanczos'
      | 'ginseng'
      | 'bicubic'
      | 'hermite'
      | 'catmull_rom'
      | 'mitchell'
      | 'robidoux'
      | 'robidouxsharp'
      | 'box'
      | 'nearest'
      | 'triangle'
      | 'gaussian'
      | 'bartlett'
      | 'cosine'
      | 'hanning'
      | 'tukey'
      | 'hamming'
      | 'quadric'
      | 'welch'
      | 'kaiser'
      | 'blackman'
      | 'sphinx'
      | 'jinc'
    write:
      | 'oversample'
      | 'linear'
      | 'spline16'
      | 'spline36'
      | 'spline64'
      | 'sinc'
      | 'lanczos'
      | 'ginseng'
      | 'bicubic'
      | 'hermite'
      | 'catmull_rom'
      | 'mitchell'
      | 'robidoux'
      | 'robidouxsharp'
      | 'box'
      | 'nearest'
      | 'triangle'
      | 'gaussian'
      | 'bartlett'
      | 'cosine'
      | 'hanning'
      | 'tukey'
      | 'hamming'
      | 'quadric'
      | 'welch'
      | 'kaiser'
      | 'blackman'
      | 'sphinx'
      | 'jinc'
  }
  'tscale-antiring': { read: number; write: RealArgument }
  'tscale-blur': { read: number; write: RealArgument }
  'tscale-clamp': { read: number; write: RealArgument }
  'tscale-param1': { read: number; write: RealArgument }
  'tscale-param2': { read: number; write: RealArgument }
  'tscale-radius': { read: number; write: RealArgument }
  'tscale-taper': { read: number; write: RealArgument }
  'tscale-window': {
    read:
      | ''
      | 'bartlett'
      | 'cosine'
      | 'hanning'
      | 'tukey'
      | 'hamming'
      | 'quadric'
      | 'welch'
      | 'kaiser'
      | 'blackman'
      | 'sphinx'
      | 'jinc'
    write:
      | ''
      | 'bartlett'
      | 'cosine'
      | 'hanning'
      | 'tukey'
      | 'hamming'
      | 'quadric'
      | 'welch'
      | 'kaiser'
      | 'blackman'
      | 'sphinx'
      | 'jinc'
  }
  'tscale-wparam': { read: number; write: RealArgument }
  'tscale-wtaper': { read: number; write: RealArgument }
  unregister: { read: boolean; write: boolean | 'yes' | 'no' }
  untimed: { read: boolean; write: boolean | 'yes' | 'no' }
  'use-embedded-icc-profile': { read: boolean; write: boolean | 'yes' | 'no' }
  'use-filedir-conf': { read: boolean; write: boolean | 'yes' | 'no' }
  'user-agent': { read: string; write: string }
  v: { read: boolean; write: boolean | 'yes' | 'no' }
  'vaapi-device': { read: string; write: string }
  vd: { read: string; write: string }
  'vd-apply-cropping': { read: boolean; write: boolean | 'yes' | 'no' }
  'vd-lavc-assume-old-x264': { read: boolean; write: boolean | 'yes' | 'no' }
  'vd-lavc-bitexact': { read: boolean; write: boolean | 'yes' | 'no' }
  'vd-lavc-check-hw-profile': { read: boolean; write: boolean | 'yes' | 'no' }
  'vd-lavc-dr': { read: 'auto' | true | false; write: 'auto' | 'no' | 'yes' | true | false }
  'vd-lavc-fast': { read: boolean; write: boolean | 'yes' | 'no' }
  'vd-lavc-film-grain': { read: 'auto' | 'cpu' | 'gpu'; write: 'auto' | 'cpu' | 'gpu' }
  'vd-lavc-framedrop': {
    read: 'none' | 'default' | 'nonref' | 'bidir' | 'nonkey' | 'all'
    write: 'none' | 'default' | 'nonref' | 'bidir' | 'nonkey' | 'all'
  }
  'vd-lavc-o': {
    read: Readonly<Record<string, string>>
    write: string | Readonly<Record<string, string>>
  }
  'vd-lavc-show-all': { read: boolean; write: boolean | 'yes' | 'no' }
  'vd-lavc-skipframe': {
    read: 'none' | 'default' | 'nonref' | 'bidir' | 'nonkey' | 'all'
    write: 'none' | 'default' | 'nonref' | 'bidir' | 'nonkey' | 'all'
  }
  'vd-lavc-skipidct': {
    read: 'none' | 'default' | 'nonref' | 'bidir' | 'nonkey' | 'all'
    write: 'none' | 'default' | 'nonref' | 'bidir' | 'nonkey' | 'all'
  }
  'vd-lavc-skiploopfilter': {
    read: 'none' | 'default' | 'nonref' | 'bidir' | 'nonkey' | 'all'
    write: 'none' | 'default' | 'nonref' | 'bidir' | 'nonkey' | 'all'
  }
  'vd-lavc-software-fallback': {
    read: true | false | bigint
    write: 'no' | 'yes' | true | false | IntegerArgument
  }
  'vd-lavc-threads': { read: bigint; write: IntegerArgument }
  'vd-queue-enable': { read: boolean; write: boolean | 'yes' | 'no' }
  'vd-queue-max-bytes': { read: bigint; write: bigint | string }
  'vd-queue-max-samples': { read: bigint; write: IntegerArgument }
  'vd-queue-max-secs': { read: number; write: RealArgument }
  version: { read: MpvValue; write: string }
  vf: { read: readonly ObjectSetting[]; write: string | readonly ObjectSetting[] }
  vid: { read: 'auto' | false | bigint; write: 'no' | 'auto' | false | IntegerArgument }
  video: { read: 'auto' | false | bigint; write: 'no' | 'auto' | false | IntegerArgument }
  'video-align-x': { read: number; write: RealArgument }
  'video-align-y': { read: number; write: RealArgument }
  'video-aspect-method': {
    read: 'bitstream' | 'container' | 'ignore'
    write: 'bitstream' | 'container' | 'ignore'
  }
  'video-aspect-override': { read: number; write: number | bigint | string }
  'video-backward-batch': { read: bigint; write: IntegerArgument }
  'video-backward-overlap': { read: 'auto' | bigint; write: 'auto' | IntegerArgument }
  'video-crop': { read: string; write: string }
  'video-exts': { read: readonly string[]; write: string | readonly string[] }
  'video-latency-hacks': { read: boolean; write: boolean | 'yes' | 'no' }
  'video-margin-ratio-bottom': { read: number; write: RealArgument }
  'video-margin-ratio-left': { read: number; write: RealArgument }
  'video-margin-ratio-right': { read: number; write: RealArgument }
  'video-margin-ratio-top': { read: number; write: RealArgument }
  'video-osd': { read: boolean; write: boolean | 'yes' | 'no' }
  'video-output-levels': { read: 'auto' | 'limited' | 'full'; write: 'auto' | 'limited' | 'full' }
  'video-pan-x': { read: number; write: RealArgument }
  'video-pan-y': { read: number; write: RealArgument }
  'video-recenter': { read: boolean; write: boolean | 'yes' | 'no' }
  'video-reversal-buffer': { read: bigint; write: bigint | string }
  'video-rotate': { read: false | bigint; write: 'no' | false | IntegerArgument }
  'video-scale-x': { read: number; write: RealArgument }
  'video-scale-y': { read: number; write: RealArgument }
  'video-sync': {
    read:
      | 'audio'
      | 'display-resample'
      | 'display-resample-vdrop'
      | 'display-resample-desync'
      | 'display-tempo'
      | 'display-adrop'
      | 'display-vdrop'
      | 'display-desync'
      | 'desync'
    write:
      | 'audio'
      | 'display-resample'
      | 'display-resample-vdrop'
      | 'display-resample-desync'
      | 'display-tempo'
      | 'display-adrop'
      | 'display-vdrop'
      | 'display-desync'
      | 'desync'
  }
  'video-sync-max-audio-change': { read: number; write: RealArgument }
  'video-sync-max-factor': { read: bigint; write: IntegerArgument }
  'video-sync-max-video-change': { read: number; write: RealArgument }
  'video-timing-offset': { read: number; write: RealArgument }
  'video-unscaled': {
    read: 'downscale-big' | true | false
    write: 'no' | 'yes' | 'downscale-big' | true | false
  }
  'video-zoom': { read: number; write: RealArgument }
  vlang: { read: readonly string[]; write: string | readonly string[] }
  vo: { read: readonly ObjectSetting[]; write: string | readonly ObjectSetting[] }
  'vo-image-avif-encoder': { read: string; write: string }
  'vo-image-avif-opts': {
    read: Readonly<Record<string, string>>
    write: string | Readonly<Record<string, string>>
  }
  'vo-image-avif-pixfmt': { read: string; write: string }
  'vo-image-format': {
    read: 'jpg' | 'jpeg' | 'png' | 'webp' | 'jxl' | 'avif'
    write: 'jpg' | 'jpeg' | 'png' | 'webp' | 'jxl' | 'avif'
  }
  'vo-image-high-bit-depth': { read: boolean; write: boolean | 'yes' | 'no' }
  'vo-image-jpeg-quality': { read: bigint; write: IntegerArgument }
  'vo-image-jpeg-source-chroma': { read: boolean; write: boolean | 'yes' | 'no' }
  'vo-image-jxl-distance': { read: number; write: RealArgument }
  'vo-image-jxl-effort': { read: bigint; write: IntegerArgument }
  'vo-image-outdir': { read: string; write: string }
  'vo-image-png-compression': { read: bigint; write: IntegerArgument }
  'vo-image-png-filter': { read: bigint; write: IntegerArgument }
  'vo-image-tag-colorspace': { read: boolean; write: boolean | 'yes' | 'no' }
  'vo-image-webp-compression': { read: bigint; write: IntegerArgument }
  'vo-image-webp-lossless': { read: boolean; write: boolean | 'yes' | 'no' }
  'vo-image-webp-quality': { read: bigint; write: IntegerArgument }
  'vo-kitty-alt-screen': { read: boolean; write: boolean | 'yes' | 'no' }
  'vo-kitty-auto-multiplexer-passthrough': { read: boolean; write: boolean | 'yes' | 'no' }
  'vo-kitty-cols': { read: bigint; write: IntegerArgument }
  'vo-kitty-config-clear': { read: boolean; write: boolean | 'yes' | 'no' }
  'vo-kitty-height': { read: bigint; write: IntegerArgument }
  'vo-kitty-left': { read: bigint; write: IntegerArgument }
  'vo-kitty-rows': { read: bigint; write: IntegerArgument }
  'vo-kitty-top': { read: bigint; write: IntegerArgument }
  'vo-kitty-use-shm': { read: boolean; write: boolean | 'yes' | 'no' }
  'vo-kitty-width': { read: bigint; write: IntegerArgument }
  'vo-mmcss-profile': { read: string; write: string }
  'vo-null-fps': { read: number; write: RealArgument }
  'vo-tct-256': { read: boolean; write: boolean | 'yes' | 'no' }
  'vo-tct-algo': { read: 'plain' | 'half-blocks'; write: 'plain' | 'half-blocks' }
  'vo-tct-buffering': { read: 'pixel' | 'line' | 'frame'; write: 'pixel' | 'line' | 'frame' }
  'vo-tct-height': { read: bigint; write: IntegerArgument }
  'vo-tct-width': { read: bigint; write: IntegerArgument }
  volume: { read: number; write: RealArgument }
  'volume-gain': { read: number; write: RealArgument }
  'volume-gain-max': { read: number; write: RealArgument }
  'volume-gain-min': { read: number; write: RealArgument }
  'volume-max': { read: number; write: RealArgument }
  'vulkan-async-compute': { read: boolean; write: boolean | 'yes' | 'no' }
  'vulkan-async-transfer': { read: boolean; write: boolean | 'yes' | 'no' }
  'vulkan-device': { read: string; write: string }
  'vulkan-display-display': { read: bigint; write: IntegerArgument }
  'vulkan-display-mode': { read: bigint; write: IntegerArgument }
  'vulkan-display-plane': { read: bigint; write: IntegerArgument }
  'vulkan-queue-count': { read: bigint; write: IntegerArgument }
  'vulkan-swap-mode': {
    read: 'auto' | 'fifo' | 'fifo-relaxed' | 'mailbox' | 'immediate'
    write: 'auto' | 'fifo' | 'fifo-relaxed' | 'mailbox' | 'immediate'
  }
  'wasapi-exclusive-buffer': {
    read: 'default' | 'min' | bigint
    write: 'default' | 'min' | IntegerArgument
  }
  'watch-history-path': { read: string; write: string }
  'watch-later-dir': { read: string; write: string }
  'watch-later-directory': { read: string; write: string }
  'watch-later-options': { read: readonly string[]; write: string | readonly string[] }
  'wayland-app-id': { read: string; write: string }
  wid: { read: bigint; write: IntegerArgument }
  'window-affinity': {
    read: 'default' | 'excludefromcapture' | 'monitor'
    write: 'default' | 'excludefromcapture' | 'monitor'
  }
  'window-corners': {
    read: 'default' | 'donotround' | 'round' | 'roundsmall'
    write: 'default' | 'donotround' | 'round' | 'roundsmall'
  }
  'window-dragging': { read: boolean; write: boolean | 'yes' | 'no' }
  'window-maximized': { read: boolean; write: boolean | 'yes' | 'no' }
  'window-minimized': { read: boolean; write: boolean | 'yes' | 'no' }
  'window-scale': { read: number; write: RealArgument }
  'write-filename-in-watch-later-config': { read: boolean; write: boolean | 'yes' | 'no' }
  'x11-name': { read: string; write: string }
  ytdl: { read: boolean; write: boolean | 'yes' | 'no' }
  'ytdl-format': { read: string; write: string }
  'ytdl-raw-options': {
    read: Readonly<Record<string, string>>
    write: string | Readonly<Record<string, string>>
  }
  '{': { read: boolean; write: boolean | 'yes' | 'no' }
  '}': { read: boolean; write: boolean | 'yes' | 'no' }
}
export type PropertyName =
  | 'ab-loop-a'
  | 'ab-loop-b'
  | 'ab-loop-count'
  | 'access-references'
  | 'ad'
  | 'ad-lavc-ac3drc'
  | 'ad-lavc-downmix'
  | 'ad-lavc-o'
  | 'ad-lavc-threads'
  | 'ad-queue-enable'
  | 'ad-queue-max-bytes'
  | 'ad-queue-max-samples'
  | 'ad-queue-max-secs'
  | 'af'
  | 'af-metadata'
  | 'aid'
  | 'alang'
  | 'allow-delayed-peak-detect'
  | 'alsa-buffer-time'
  | 'alsa-ignore-chmap'
  | 'alsa-mixer-device'
  | 'alsa-mixer-index'
  | 'alsa-mixer-name'
  | 'alsa-non-interleaved'
  | 'alsa-periods'
  | 'alsa-resample'
  | 'ambient-light'
  | 'ao'
  | 'ao-mute'
  | 'ao-null-broken-delay'
  | 'ao-null-broken-eof'
  | 'ao-null-buffer'
  | 'ao-null-channel-layouts'
  | 'ao-null-format'
  | 'ao-null-latency'
  | 'ao-null-outburst'
  | 'ao-null-speed'
  | 'ao-null-untimed'
  | 'ao-pcm-append'
  | 'ao-pcm-file'
  | 'ao-pcm-waveheader'
  | 'ao-volume'
  | 'archive-exts'
  | 'audio'
  | 'audio-backward-batch'
  | 'audio-backward-overlap'
  | 'audio-bitrate'
  | 'audio-buffer'
  | 'audio-channels'
  | 'audio-client-name'
  | 'audio-codec'
  | 'audio-codec-name'
  | 'audio-delay'
  | 'audio-demuxer'
  | 'audio-device'
  | 'audio-device-list'
  | 'audio-display'
  | 'audio-exclusive'
  | 'audio-exts'
  | 'audio-fallback-to-null'
  | 'audio-file-auto'
  | 'audio-file-auto-exts'
  | 'audio-file-paths'
  | 'audio-files'
  | 'audio-format'
  | 'audio-normalize-downmix'
  | 'audio-out-params'
  | 'audio-params'
  | 'audio-pitch-correction'
  | 'audio-pts'
  | 'audio-resample-cutoff'
  | 'audio-resample-filter-size'
  | 'audio-resample-linear'
  | 'audio-resample-max-output-size'
  | 'audio-resample-phase-shift'
  | 'audio-reversal-buffer'
  | 'audio-samplerate'
  | 'audio-set-media-role'
  | 'audio-spdif'
  | 'audio-speed-correction'
  | 'audio-stream-silence'
  | 'audio-swresample-o'
  | 'audio-wait-open'
  | 'auto-window-resize'
  | 'autocreate-playlist'
  | 'autofit'
  | 'autofit-larger'
  | 'autofit-smaller'
  | 'autoload-files'
  | 'autosync'
  | 'avsync'
  | 'backdrop-type'
  | 'background'
  | 'background-blur-radius'
  | 'background-color'
  | 'background-tile-color-0'
  | 'background-tile-color-1'
  | 'background-tile-size'
  | 'blend-subtitles'
  | 'border'
  | 'border-background'
  | 'brightness'
  | 'cache'
  | 'cache-buffering-state'
  | 'cache-on-disk'
  | 'cache-pause'
  | 'cache-pause-initial'
  | 'cache-pause-wait'
  | 'cache-secs'
  | 'cache-speed'
  | 'chapter'
  | 'chapter-list'
  | 'chapter-merge-threshold'
  | 'chapter-metadata'
  | 'chapter-seek-threshold'
  | 'chapters'
  | 'chapters-file'
  | 'clipboard'
  | 'clipboard-backends'
  | 'clipboard-monitor'
  | 'clipboard-xwayland'
  | 'clock'
  | 'cocoa-cb-10bit-context'
  | 'cocoa-cb-output-csp'
  | 'cocoa-cb-sw-renderer'
  | 'colormatrix'
  | 'colormatrix-gamma'
  | 'colormatrix-input-range'
  | 'colormatrix-primaries'
  | 'command-list'
  | 'config'
  | 'config-dir'
  | 'container-fps'
  | 'container-fps-override'
  | 'contrast'
  | 'cookies'
  | 'cookies-file'
  | 'core-idle'
  | 'coreaudio-change-physical-format'
  | 'coreaudio-spdif-hack'
  | 'corner-rounding'
  | 'correct-downscaling'
  | 'correct-pts'
  | 'cover-art-auto'
  | 'cover-art-auto-exts'
  | 'cover-art-files'
  | 'cover-art-whitelist'
  | 'cscale'
  | 'cscale-antiring'
  | 'cscale-blur'
  | 'cscale-clamp'
  | 'cscale-param1'
  | 'cscale-param2'
  | 'cscale-radius'
  | 'cscale-taper'
  | 'cscale-window'
  | 'cscale-wparam'
  | 'cscale-wtaper'
  | 'current-ao'
  | 'current-clipboard-backend'
  | 'current-demuxer'
  | 'current-edition'
  | 'current-gpu-context'
  | 'current-tracks'
  | 'current-vo'
  | 'current-watch-later-dir'
  | 'current-window-scale'
  | 'cursor-autohide'
  | 'cursor-autohide-fs-only'
  | 'd3d11-adapter'
  | 'd3d11-composition-size'
  | 'd3d11-exclusive-fs'
  | 'd3d11-feature-level'
  | 'd3d11-flip'
  | 'd3d11-output-csp'
  | 'd3d11-output-format'
  | 'd3d11-output-mode'
  | 'd3d11-sync-interval'
  | 'd3d11-warp'
  | 'd3d11va-zero-copy'
  | 'deband'
  | 'deband-grain'
  | 'deband-iterations'
  | 'deband-range'
  | 'deband-threshold'
  | 'decoder-frame-drop-count'
  | 'decoder-list'
  | 'default-menu'
  | 'deinterlace'
  | 'deinterlace-active'
  | 'deinterlace-field-parity'
  | 'demuxer'
  | 'demuxer-backward-playback-step'
  | 'demuxer-cache-dir'
  | 'demuxer-cache-duration'
  | 'demuxer-cache-idle'
  | 'demuxer-cache-state'
  | 'demuxer-cache-time'
  | 'demuxer-cache-unlink-files'
  | 'demuxer-cache-wait'
  | 'demuxer-donate-buffer'
  | 'demuxer-hysteresis-bytes'
  | 'demuxer-hysteresis-secs'
  | 'demuxer-lavf-allow-mimetype'
  | 'demuxer-lavf-analyzeduration'
  | 'demuxer-lavf-buffersize'
  | 'demuxer-lavf-format'
  | 'demuxer-lavf-hacks'
  | 'demuxer-lavf-linearize-timestamps'
  | 'demuxer-lavf-list'
  | 'demuxer-lavf-o'
  | 'demuxer-lavf-probe-info'
  | 'demuxer-lavf-probescore'
  | 'demuxer-lavf-probesize'
  | 'demuxer-lavf-propagate-opts'
  | 'demuxer-max-back-bytes'
  | 'demuxer-max-bytes'
  | 'demuxer-mkv-crop-compat'
  | 'demuxer-mkv-probe-start-time'
  | 'demuxer-mkv-probe-video-duration'
  | 'demuxer-mkv-subtitle-preroll'
  | 'demuxer-mkv-subtitle-preroll-secs'
  | 'demuxer-mkv-subtitle-preroll-secs-index'
  | 'demuxer-rawaudio-channels'
  | 'demuxer-rawaudio-format'
  | 'demuxer-rawaudio-rate'
  | 'demuxer-rawvideo-codec'
  | 'demuxer-rawvideo-format'
  | 'demuxer-rawvideo-fps'
  | 'demuxer-rawvideo-h'
  | 'demuxer-rawvideo-mp-format'
  | 'demuxer-rawvideo-size'
  | 'demuxer-rawvideo-w'
  | 'demuxer-readahead-secs'
  | 'demuxer-seekable-cache'
  | 'demuxer-start-time'
  | 'demuxer-termination-timeout'
  | 'demuxer-thread'
  | 'demuxer-via-network'
  | 'dheight'
  | 'directory-filter-types'
  | 'directory-mode'
  | 'disc-menu'
  | 'disc-menu-active'
  | 'display-fps'
  | 'display-fps-override'
  | 'display-height'
  | 'display-hidpi-scale'
  | 'display-names'
  | 'display-swapchain'
  | 'display-sync-active'
  | 'display-tags'
  | 'display-width'
  | 'dither'
  | 'dither-depth'
  | 'dither-size-fruit'
  | 'drag-and-drop'
  | 'drm-connector'
  | 'drm-device'
  | 'drm-draw-plane'
  | 'drm-draw-surface-size'
  | 'drm-drmprime-video-plane'
  | 'drm-format'
  | 'drm-mode'
  | 'drm-vrr-enabled'
  | 'dropped-files'
  | 'dscale'
  | 'dscale-antiring'
  | 'dscale-blur'
  | 'dscale-clamp'
  | 'dscale-param1'
  | 'dscale-param2'
  | 'dscale-radius'
  | 'dscale-taper'
  | 'dscale-window'
  | 'dscale-wparam'
  | 'dscale-wtaper'
  | 'dump-stats'
  | 'duration'
  | 'dwidth'
  | 'edition'
  | 'edition-list'
  | 'editions'
  | 'egl-config-id'
  | 'egl-output-format'
  | 'embeddedfonts'
  | 'encoder-list'
  | 'end'
  | 'env'
  | 'eof-reached'
  | 'error-diffusion'
  | 'estimated-display-fps'
  | 'estimated-frame-count'
  | 'estimated-frame-number'
  | 'estimated-vf-fps'
  | 'external-files'
  | 'fbo-format'
  | 'ffmpeg-version'
  | 'file-format'
  | 'file-local-options'
  | 'file-size'
  | 'filename'
  | 'filtered-metadata'
  | 'flatten-editions'
  | 'focus-on'
  | 'focused'
  | 'force-media-title'
  | 'force-render'
  | 'force-rgba-osd-rendering'
  | 'force-seekable'
  | 'force-window'
  | 'force-window-position'
  | 'frame-drop-count'
  | 'framedrop'
  | 'frames'
  | 'fs'
  | 'fs-screen'
  | 'fs-screen-name'
  | 'fullscreen'
  | 'gamma'
  | 'gamma-auto'
  | 'gamma-factor'
  | 'gamut-mapping-mode'
  | 'gapless-audio'
  | 'geometry'
  | 'glsl-shader-opts'
  | 'glsl-shaders'
  | 'gpu-api'
  | 'gpu-context'
  | 'gpu-debug'
  | 'gpu-dumb-mode'
  | 'gpu-hwdec-interop'
  | 'gpu-shader-cache'
  | 'gpu-shader-cache-dir'
  | 'gpu-sw'
  | 'gpu-tex-pad-x'
  | 'gpu-tex-pad-y'
  | 'hdr-compute-peak'
  | 'hdr-contrast-recovery'
  | 'hdr-contrast-smoothness'
  | 'hdr-film-strength'
  | 'hdr-mastering-clip'
  | 'hdr-peak-decay-rate'
  | 'hdr-peak-percentile'
  | 'hdr-reference-white'
  | 'hdr-scene-threshold-high'
  | 'hdr-scene-threshold-low'
  | 'height'
  | 'hidpi-window-scale'
  | 'hls-bitrate'
  | 'hr-seek'
  | 'hr-seek-demuxer-offset'
  | 'hr-seek-framedrop'
  | 'http-header-fields'
  | 'http-proxy'
  | 'hue'
  | 'hwdec'
  | 'hwdec-codecs'
  | 'hwdec-current'
  | 'hwdec-extra-frames'
  | 'hwdec-image-format'
  | 'hwdec-interop'
  | 'hwdec-software-fallback'
  | 'hwdec-threads'
  | 'icc-3dlut-size'
  | 'icc-cache'
  | 'icc-cache-dir'
  | 'icc-force-contrast'
  | 'icc-intent'
  | 'icc-profile'
  | 'icc-profile-auto'
  | 'icc-use-luma'
  | 'idle'
  | 'idle-active'
  | 'ignore-path-in-watch-later-config'
  | 'image-display-duration'
  | 'image-exts'
  | 'image-lut'
  | 'image-lut-type'
  | 'image-subs-hdr-peak'
  | 'image-subs-video-resolution'
  | 'include'
  | 'index'
  | 'initial-audio-sync'
  | 'input-ar-delay'
  | 'input-ar-rate'
  | 'input-bindings'
  | 'input-builtin-bindings'
  | 'input-builtin-drag-and-drop'
  | 'input-builtin-dragging'
  | 'input-commands'
  | 'input-conf'
  | 'input-cursor'
  | 'input-cursor-passthrough'
  | 'input-default-bindings'
  | 'input-doubleclick-time'
  | 'input-dragging-deadzone'
  | 'input-ime'
  | 'input-ipc-client'
  | 'input-ipc-server'
  | 'input-key-fifo-size'
  | 'input-key-list'
  | 'input-media-keys'
  | 'input-preprocess-wheel'
  | 'input-right-alt-gr'
  | 'input-tablet-emulate-mouse'
  | 'input-terminal'
  | 'input-test'
  | 'input-touch-emulate-mouse'
  | 'input-vo-keyboard'
  | 'interpolation'
  | 'interpolation-preserve'
  | 'interpolation-threshold'
  | 'inverse-tone-mapping'
  | 'js-memory-report'
  | 'keep-open'
  | 'keep-open-pause'
  | 'keepaspect'
  | 'keepaspect-window'
  | 'lavfi-complex'
  | 'length'
  | 'libass-version'
  | 'libplacebo-opts'
  | 'libplacebo-version'
  | 'linear-downscaling'
  | 'linear-upscaling'
  | 'load-auto-profiles'
  | 'load-commands'
  | 'load-console'
  | 'load-context-menu'
  | 'load-osd-console'
  | 'load-positioning'
  | 'load-scripts'
  | 'load-select'
  | 'load-stats-overlay'
  | 'load-unsafe-playlists'
  | 'log-file'
  | 'loop'
  | 'loop-file'
  | 'loop-playlist'
  | 'lut'
  | 'lut-type'
  | 'macos-app-activation-policy'
  | 'macos-bundle-path'
  | 'macos-force-dedicated-gpu'
  | 'macos-fs-animation-duration'
  | 'macos-geometry-calculation'
  | 'macos-menu-shortcuts'
  | 'macos-render-timer'
  | 'macos-title-bar-appearance'
  | 'macos-title-bar-color'
  | 'macos-title-bar-material'
  | 'mc'
  | 'media-controls'
  | 'media-title'
  | 'menu-data'
  | 'merge-files'
  | 'metadata'
  | 'metadata-codepage'
  | 'mf-fps'
  | 'mf-type'
  | 'mistimed-frame-count'
  | 'mixer-active'
  | 'monitoraspect'
  | 'monitorpixelaspect'
  | 'mouse-pos'
  | 'mpv-configuration'
  | 'mpv-version'
  | 'msg-color'
  | 'msg-level'
  | 'msg-module'
  | 'msg-time'
  | 'mute'
  | 'native-fs'
  | 'native-keyrepeat'
  | 'native-touch'
  | 'network-timeout'
  | 'o'
  | 'oac'
  | 'oacopts'
  | 'ocopy-metadata'
  | 'of'
  | 'ofopts'
  | 'on-all-workspaces'
  | 'ontop'
  | 'ontop-level'
  | 'opengl-check-pattern-a'
  | 'opengl-check-pattern-b'
  | 'opengl-early-flush'
  | 'opengl-es'
  | 'opengl-glfinish'
  | 'opengl-pbo'
  | 'opengl-rectangle-textures'
  | 'opengl-swapinterval'
  | 'opengl-waitvsync'
  | 'option-info'
  | 'options'
  | 'orawts'
  | 'ordered-chapters'
  | 'ordered-chapters-files'
  | 'oremove-metadata'
  | 'osc'
  | 'osd-align-x'
  | 'osd-align-y'
  | 'osd-ass-cc'
  | 'osd-back-color'
  | 'osd-bar'
  | 'osd-bar-align-x'
  | 'osd-bar-align-y'
  | 'osd-bar-border-size'
  | 'osd-bar-h'
  | 'osd-bar-marker-min-size'
  | 'osd-bar-marker-scale'
  | 'osd-bar-marker-style'
  | 'osd-bar-outline-size'
  | 'osd-bar-w'
  | 'osd-bitmap-max-size'
  | 'osd-blur'
  | 'osd-bold'
  | 'osd-border-color'
  | 'osd-border-size'
  | 'osd-border-style'
  | 'osd-color'
  | 'osd-dimensions'
  | 'osd-duration'
  | 'osd-font'
  | 'osd-font-provider'
  | 'osd-font-size'
  | 'osd-fonts-dir'
  | 'osd-fractions'
  | 'osd-glyph-limit'
  | 'osd-height'
  | 'osd-italic'
  | 'osd-justify'
  | 'osd-level'
  | 'osd-margin-x'
  | 'osd-margin-y'
  | 'osd-margin-y-offset'
  | 'osd-msg1'
  | 'osd-msg2'
  | 'osd-msg3'
  | 'osd-on-seek'
  | 'osd-outline-color'
  | 'osd-outline-size'
  | 'osd-par'
  | 'osd-playing-msg'
  | 'osd-playing-msg-duration'
  | 'osd-playlist-entry'
  | 'osd-prune-delay'
  | 'osd-scale'
  | 'osd-scale-by-window'
  | 'osd-selected-color'
  | 'osd-selected-outline-color'
  | 'osd-shadow-color'
  | 'osd-shadow-offset'
  | 'osd-shaper'
  | 'osd-spacing'
  | 'osd-status-msg'
  | 'osd-sym-cc'
  | 'osd-width'
  | 'oset-metadata'
  | 'ovc'
  | 'ovcopts'
  | 'override-display-fps'
  | 'panscan'
  | 'partially-seekable'
  | 'path'
  | 'pause'
  | 'paused-for-cache'
  | 'percent-pos'
  | 'perf-info'
  | 'pid'
  | 'pitch'
  | 'platform'
  | 'play-dir'
  | 'play-direction'
  | 'playback-abort'
  | 'playback-time'
  | 'player-operation-mode'
  | 'playlist'
  | 'playlist-count'
  | 'playlist-current-pos'
  | 'playlist-exts'
  | 'playlist-inherit-options'
  | 'playlist-path'
  | 'playlist-playing-pos'
  | 'playlist-pos'
  | 'playlist-pos-1'
  | 'playlist-start'
  | 'playtime-remaining'
  | 'prefetch-playlist'
  | 'priority'
  | 'profile'
  | 'profile-list'
  | 'property-list'
  | 'protocol-list'
  | 'pulse-allow-suspended'
  | 'pulse-buffer'
  | 'pulse-host'
  | 'pulse-latency-hacks'
  | 'quiet'
  | 'really-quiet'
  | 'rebase-start-time'
  | 'referrer'
  | 'register'
  | 'register-rpath'
  | 'remaining-ab-loops'
  | 'remaining-file-loops'
  | 'replaygain'
  | 'replaygain-clip'
  | 'replaygain-fallback'
  | 'replaygain-preamp'
  | 'reset-on-next-file'
  | 'resume-playback'
  | 'resume-playback-check-mtime'
  | 'rtsp-transport'
  | 'saturation'
  | 'save-position-on-quit'
  | 'save-watch-history'
  | 'scale'
  | 'scale-antiring'
  | 'scale-blur'
  | 'scale-clamp'
  | 'scale-param1'
  | 'scale-param2'
  | 'scale-radius'
  | 'scale-taper'
  | 'scale-window'
  | 'scale-wparam'
  | 'scale-wtaper'
  | 'scaler-resizes-only'
  | 'screen'
  | 'screen-name'
  | 'screenshot-avif-encoder'
  | 'screenshot-avif-opts'
  | 'screenshot-avif-pixfmt'
  | 'screenshot-dir'
  | 'screenshot-directory'
  | 'screenshot-format'
  | 'screenshot-high-bit-depth'
  | 'screenshot-jpeg-quality'
  | 'screenshot-jpeg-source-chroma'
  | 'screenshot-jxl-distance'
  | 'screenshot-jxl-effort'
  | 'screenshot-png-compression'
  | 'screenshot-png-filter'
  | 'screenshot-sw'
  | 'screenshot-tag-colorspace'
  | 'screenshot-template'
  | 'screenshot-webp-compression'
  | 'screenshot-webp-lossless'
  | 'screenshot-webp-quality'
  | 'script-opts'
  | 'scripts'
  | 'sdr-adjust-gamma'
  | 'secondary-sid'
  | 'secondary-sub-ass-override'
  | 'secondary-sub-delay'
  | 'secondary-sub-end'
  | 'secondary-sub-lines'
  | 'secondary-sub-pos'
  | 'secondary-sub-scale'
  | 'secondary-sub-start'
  | 'secondary-sub-text'
  | 'secondary-sub-visibility'
  | 'seekable'
  | 'seeking'
  | 'sharpen'
  | 'show-dependent-tracks'
  | 'show-in-taskbar'
  | 'shuffle'
  | 'sid'
  | 'sigmoid-center'
  | 'sigmoid-slope'
  | 'sigmoid-upscaling'
  | 'slang'
  | 'snap-window'
  | 'speed'
  | 'spirv-compiler'
  | 'sstep'
  | 'start'
  | 'stop-playback-on-init-failure'
  | 'stop-screensaver'
  | 'stream-buffer-size'
  | 'stream-dump'
  | 'stream-end'
  | 'stream-lavf-o'
  | 'stream-open-filename'
  | 'stream-path'
  | 'stream-pos'
  | 'stream-record'
  | 'stretch-dvd-subs'
  | 'stretch-image-subs-to-screen'
  | 'sub'
  | 'sub-align-x'
  | 'sub-align-y'
  | 'sub-ass'
  | 'sub-ass-extradata'
  | 'sub-ass-force-margins'
  | 'sub-ass-force-style'
  | 'sub-ass-hinting'
  | 'sub-ass-justify'
  | 'sub-ass-line-spacing'
  | 'sub-ass-override'
  | 'sub-ass-prune-delay'
  | 'sub-ass-scale-with-window'
  | 'sub-ass-shaper'
  | 'sub-ass-style-overrides'
  | 'sub-ass-styles'
  | 'sub-ass-use-video-data'
  | 'sub-ass-video-aspect-override'
  | 'sub-ass-vsfilter-color-compat'
  | 'sub-auto'
  | 'sub-auto-exts'
  | 'sub-back-color'
  | 'sub-bitmap-max-size'
  | 'sub-bitrate'
  | 'sub-blur'
  | 'sub-bold'
  | 'sub-border-color'
  | 'sub-border-size'
  | 'sub-border-style'
  | 'sub-clear-on-seek'
  | 'sub-codepage'
  | 'sub-color'
  | 'sub-create-cc-track'
  | 'sub-delay'
  | 'sub-demuxer'
  | 'sub-end'
  | 'sub-file-paths'
  | 'sub-files'
  | 'sub-filter-jsre'
  | 'sub-filter-regex'
  | 'sub-filter-regex-enable'
  | 'sub-filter-regex-plain'
  | 'sub-filter-regex-warn'
  | 'sub-filter-sdh'
  | 'sub-filter-sdh-enclosures'
  | 'sub-filter-sdh-harder'
  | 'sub-fix-timing'
  | 'sub-fix-timing-keep'
  | 'sub-fix-timing-threshold'
  | 'sub-font'
  | 'sub-font-provider'
  | 'sub-font-size'
  | 'sub-fonts-dir'
  | 'sub-forced-events-only'
  | 'sub-forced-only-cur'
  | 'sub-fps'
  | 'sub-gauss'
  | 'sub-glyph-limit'
  | 'sub-gray'
  | 'sub-hdr-peak'
  | 'sub-hinting'
  | 'sub-italic'
  | 'sub-justify'
  | 'sub-lavc-o'
  | 'sub-line-spacing'
  | 'sub-lines'
  | 'sub-margin-x'
  | 'sub-margin-y'
  | 'sub-margin-y-offset'
  | 'sub-outline-color'
  | 'sub-outline-size'
  | 'sub-past-video-end'
  | 'sub-pos'
  | 'sub-scale'
  | 'sub-scale-by-window'
  | 'sub-scale-signs'
  | 'sub-scale-with-window'
  | 'sub-shadow-color'
  | 'sub-shadow-offset'
  | 'sub-shaper'
  | 'sub-spacing'
  | 'sub-speed'
  | 'sub-start'
  | 'sub-stretch-durations'
  | 'sub-text'
  | 'sub-text-ass'
  | 'sub-use-margins'
  | 'sub-visibility'
  | 'sub-vsfilter-bidi-compat'
  | 'subrandr-version'
  | 'subs-fallback'
  | 'subs-fallback-forced'
  | 'subs-match-os-language'
  | 'subs-with-matching-audio'
  | 'swapchain-depth'
  | 'sws-allow-zimg'
  | 'sws-bitexact'
  | 'sws-cgb'
  | 'sws-chs'
  | 'sws-cs'
  | 'sws-cvs'
  | 'sws-fast'
  | 'sws-lgb'
  | 'sws-ls'
  | 'sws-scaler'
  | 'tablet-pos'
  | 'target-colorspace-hint'
  | 'target-colorspace-hint-mode'
  | 'target-colorspace-hint-strict'
  | 'target-contrast'
  | 'target-gamut'
  | 'target-lut'
  | 'target-peak'
  | 'target-prim'
  | 'target-trc'
  | 'taskbar-progress'
  | 'teletext-page'
  | 'temporal-dither'
  | 'temporal-dither-period'
  | 'term-clip-cc'
  | 'term-osd'
  | 'term-osd-bar'
  | 'term-osd-bar-chars'
  | 'term-playing-msg'
  | 'term-size'
  | 'term-status-msg'
  | 'term-title'
  | 'terminal'
  | 'time-pos'
  | 'time-remaining'
  | 'title'
  | 'title-bar'
  | 'tls-ca-file'
  | 'tls-cert-file'
  | 'tls-key-file'
  | 'tls-verify'
  | 'tone-mapping'
  | 'tone-mapping-exposure'
  | 'tone-mapping-knee-adaptation'
  | 'tone-mapping-knee-default'
  | 'tone-mapping-knee-maximum'
  | 'tone-mapping-knee-minimum'
  | 'tone-mapping-knee-offset'
  | 'tone-mapping-linear-knee'
  | 'tone-mapping-max-boost'
  | 'tone-mapping-param'
  | 'tone-mapping-reinhard-contrast'
  | 'tone-mapping-slope-offset'
  | 'tone-mapping-slope-tuning'
  | 'tone-mapping-spline-contrast'
  | 'tone-mapping-visualize'
  | 'total-avsync-change'
  | 'touch-pos'
  | 'track-auto-selection'
  | 'track-list'
  | 'treat-srgb-as-power22'
  | 'tscale'
  | 'tscale-antiring'
  | 'tscale-blur'
  | 'tscale-clamp'
  | 'tscale-param1'
  | 'tscale-param2'
  | 'tscale-radius'
  | 'tscale-taper'
  | 'tscale-window'
  | 'tscale-wparam'
  | 'tscale-wtaper'
  | 'unregister'
  | 'untimed'
  | 'use-embedded-icc-profile'
  | 'use-filedir-conf'
  | 'user-agent'
  | 'user-data'
  | 'vaapi-device'
  | 'vd'
  | 'vd-apply-cropping'
  | 'vd-lavc-assume-old-x264'
  | 'vd-lavc-bitexact'
  | 'vd-lavc-check-hw-profile'
  | 'vd-lavc-dr'
  | 'vd-lavc-fast'
  | 'vd-lavc-film-grain'
  | 'vd-lavc-framedrop'
  | 'vd-lavc-o'
  | 'vd-lavc-show-all'
  | 'vd-lavc-skipframe'
  | 'vd-lavc-skipidct'
  | 'vd-lavc-skiploopfilter'
  | 'vd-lavc-software-fallback'
  | 'vd-lavc-threads'
  | 'vd-queue-enable'
  | 'vd-queue-max-bytes'
  | 'vd-queue-max-samples'
  | 'vd-queue-max-secs'
  | 'vf'
  | 'vf-metadata'
  | 'vid'
  | 'video'
  | 'video-align-x'
  | 'video-align-y'
  | 'video-aspect-method'
  | 'video-aspect-override'
  | 'video-backward-batch'
  | 'video-backward-overlap'
  | 'video-bitrate'
  | 'video-codec'
  | 'video-crop'
  | 'video-dec-params'
  | 'video-exts'
  | 'video-format'
  | 'video-frame-info'
  | 'video-latency-hacks'
  | 'video-margin-ratio-bottom'
  | 'video-margin-ratio-left'
  | 'video-margin-ratio-right'
  | 'video-margin-ratio-top'
  | 'video-osd'
  | 'video-out-params'
  | 'video-output-levels'
  | 'video-pan-x'
  | 'video-pan-y'
  | 'video-params'
  | 'video-recenter'
  | 'video-reversal-buffer'
  | 'video-rotate'
  | 'video-scale-x'
  | 'video-scale-y'
  | 'video-speed-correction'
  | 'video-sync'
  | 'video-sync-max-audio-change'
  | 'video-sync-max-factor'
  | 'video-sync-max-video-change'
  | 'video-target-params'
  | 'video-timing-offset'
  | 'video-unscaled'
  | 'video-zoom'
  | 'vlang'
  | 'vo'
  | 'vo-configured'
  | 'vo-delayed-frame-count'
  | 'vo-image-avif-encoder'
  | 'vo-image-avif-opts'
  | 'vo-image-avif-pixfmt'
  | 'vo-image-format'
  | 'vo-image-high-bit-depth'
  | 'vo-image-jpeg-quality'
  | 'vo-image-jpeg-source-chroma'
  | 'vo-image-jxl-distance'
  | 'vo-image-jxl-effort'
  | 'vo-image-outdir'
  | 'vo-image-png-compression'
  | 'vo-image-png-filter'
  | 'vo-image-tag-colorspace'
  | 'vo-image-webp-compression'
  | 'vo-image-webp-lossless'
  | 'vo-image-webp-quality'
  | 'vo-kitty-alt-screen'
  | 'vo-kitty-auto-multiplexer-passthrough'
  | 'vo-kitty-cols'
  | 'vo-kitty-config-clear'
  | 'vo-kitty-height'
  | 'vo-kitty-left'
  | 'vo-kitty-rows'
  | 'vo-kitty-top'
  | 'vo-kitty-use-shm'
  | 'vo-kitty-width'
  | 'vo-mmcss-profile'
  | 'vo-null-fps'
  | 'vo-passes'
  | 'vo-tct-256'
  | 'vo-tct-algo'
  | 'vo-tct-buffering'
  | 'vo-tct-height'
  | 'vo-tct-width'
  | 'volume'
  | 'volume-gain'
  | 'volume-gain-max'
  | 'volume-gain-min'
  | 'volume-max'
  | 'vsync-jitter'
  | 'vsync-ratio'
  | 'vulkan-async-compute'
  | 'vulkan-async-transfer'
  | 'vulkan-device'
  | 'vulkan-display-display'
  | 'vulkan-display-mode'
  | 'vulkan-display-plane'
  | 'vulkan-queue-count'
  | 'vulkan-swap-mode'
  | 'wasapi-exclusive-buffer'
  | 'watch-history-path'
  | 'watch-later-dir'
  | 'watch-later-directory'
  | 'watch-later-options'
  | 'wayland-app-id'
  | 'wid'
  | 'width'
  | 'window-affinity'
  | 'window-corners'
  | 'window-dragging'
  | 'window-id'
  | 'window-maximized'
  | 'window-minimized'
  | 'window-scale'
  | 'working-directory'
  | 'write-filename-in-watch-later-config'
  | 'x11-name'
  | 'ytdl'
  | 'ytdl-format'
  | 'ytdl-raw-options'
