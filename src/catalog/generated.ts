import type { At, FlagInput, IntegerArgument, RealArgument } from './types.js'
import type { ShapeValue } from './shape.js'
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
export type OptionDefinitions = {
  [N in 'V' | 'input-cmdlist' | 'input-keylist' | 'list-protocols' | 'version']: {
    read: ShapeValue<'value'>
    write: ShapeValue<'string'>
  }
} & {
  [N in 'ab-loop-a' | 'ab-loop-b']: {
    read: ShapeValue<{ anyOf: ['number', { literals: ['no'] }] }>
    write: ShapeValue<{ anyOf: ['number', 'bigint', 'string'] }>
  }
} & {
  [N in 'ab-loop-count']: {
    read: ShapeValue<{ anyOf: ['bigint', { literals: ['inf'] }] }>
    write: ShapeValue<{ anyOf: ['integerInput', { literals: ['inf'] }] }>
  }
} & {
  [
    N in
      | 'access-references'
      | 'ad-lavc-downmix'
      | 'ad-queue-enable'
      | 'allow-delayed-peak-detect'
      | 'alsa-ignore-chmap'
      | 'alsa-non-interleaved'
      | 'alsa-resample'
      | 'ao-null-broken-delay'
      | 'ao-null-broken-eof'
      | 'ao-null-untimed'
      | 'ao-pcm-append'
      | 'ao-pcm-waveheader'
      | 'audio-exclusive'
      | 'audio-fallback-to-null'
      | 'audio-normalize-downmix'
      | 'audio-pitch-correction'
      | 'audio-resample-linear'
      | 'audio-set-media-role'
      | 'audio-stream-silence'
      | 'auto-window-resize'
      | 'autoload-files'
      | 'border'
      | 'cache-on-disk'
      | 'cache-pause'
      | 'cache-pause-initial'
      | 'clipboard-monitor'
      | 'clipboard-xwayland'
      | 'cocoa-cb-10bit-context'
      | 'config'
      | 'cookies'
      | 'coreaudio-change-physical-format'
      | 'coreaudio-spdif-hack'
      | 'correct-downscaling'
      | 'correct-pts'
      | 'cursor-autohide-fs-only'
      | 'd3d11-exclusive-fs'
      | 'd3d11-flip'
      | 'd3d11va-zero-copy'
      | 'deband'
      | 'demuxer-cache-wait'
      | 'demuxer-donate-buffer'
      | 'demuxer-lavf-allow-mimetype'
      | 'demuxer-lavf-hacks'
      | 'demuxer-lavf-propagate-opts'
      | 'demuxer-mkv-crop-compat'
      | 'demuxer-mkv-probe-start-time'
      | 'demuxer-thread'
      | 'disc-menu'
      | 'embeddedfonts'
      | 'flatten-editions'
      | 'force-render'
      | 'force-rgba-osd-rendering'
      | 'force-seekable'
      | 'force-window-position'
      | 'fs'
      | 'fullscreen'
      | 'gamma-auto'
      | 'gpu-debug'
      | 'gpu-shader-cache'
      | 'gpu-sw'
      | 'hidpi-window-scale'
      | 'hr-seek-framedrop'
      | 'icc-cache'
      | 'icc-profile-auto'
      | 'icc-use-luma'
      | 'ignore-path-in-watch-later-config'
      | 'image-subs-video-resolution'
      | 'initial-audio-sync'
      | 'input-builtin-bindings'
      | 'input-builtin-drag-and-drop'
      | 'input-builtin-dragging'
      | 'input-cursor'
      | 'input-cursor-passthrough'
      | 'input-default-bindings'
      | 'input-ime'
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
      | 'inverse-tone-mapping'
      | 'js-memory-report'
      | 'keep-open-pause'
      | 'keepaspect'
      | 'keepaspect-window'
      | 'linear-downscaling'
      | 'linear-upscaling'
      | 'list-options'
      | 'list-properties'
      | 'load-commands'
      | 'load-console'
      | 'load-context-menu'
      | 'load-osd-console'
      | 'load-positioning'
      | 'load-scripts'
      | 'load-select'
      | 'load-stats-overlay'
      | 'load-unsafe-playlists'
      | 'macos-force-dedicated-gpu'
      | 'macos-menu-shortcuts'
      | 'media-controls'
      | 'merge-files'
      | 'msg-color'
      | 'msg-module'
      | 'msg-time'
      | 'mute'
      | 'native-fs'
      | 'native-keyrepeat'
      | 'native-touch'
      | 'ocopy-metadata'
      | 'on-all-workspaces'
      | 'ontop'
      | 'opengl-glfinish'
      | 'opengl-pbo'
      | 'opengl-rectangle-textures'
      | 'opengl-waitvsync'
      | 'orawts'
      | 'ordered-chapters'
      | 'osc'
      | 'osd-bar'
      | 'osd-bold'
      | 'osd-fractions'
      | 'osd-italic'
      | 'osd-scale-by-window'
      | 'pause'
      | 'prefetch-playlist'
      | 'pulse-allow-suspended'
      | 'pulse-latency-hacks'
      | 'quiet'
      | 'really-quiet'
      | 'rebase-start-time'
      | 'register'
      | 'replaygain-clip'
      | 'resume-playback'
      | 'resume-playback-check-mtime'
      | 'save-position-on-quit'
      | 'save-watch-history'
      | 'scaler-resizes-only'
      | 'screenshot-high-bit-depth'
      | 'screenshot-jpeg-source-chroma'
      | 'screenshot-sw'
      | 'screenshot-tag-colorspace'
      | 'screenshot-webp-lossless'
      | 'secondary-sub-visibility'
      | 'show-dependent-tracks'
      | 'show-in-taskbar'
      | 'shuffle'
      | 'sigmoid-upscaling'
      | 'snap-window'
      | 'stop-playback-on-init-failure'
      | 'stretch-dvd-subs'
      | 'stretch-image-subs-to-screen'
      | 'sub-ass'
      | 'sub-ass-force-margins'
      | 'sub-ass-justify'
      | 'sub-ass-scale-with-window'
      | 'sub-bold'
      | 'sub-clear-on-seek'
      | 'sub-create-cc-track'
      | 'sub-filter-regex-enable'
      | 'sub-filter-regex-plain'
      | 'sub-filter-regex-warn'
      | 'sub-filter-sdh'
      | 'sub-filter-sdh-harder'
      | 'sub-fix-timing'
      | 'sub-forced-events-only'
      | 'sub-gray'
      | 'sub-italic'
      | 'sub-past-video-end'
      | 'sub-scale-by-window'
      | 'sub-scale-signs'
      | 'sub-scale-with-window'
      | 'sub-stretch-durations'
      | 'sub-use-margins'
      | 'sub-visibility'
      | 'sub-vsfilter-bidi-compat'
      | 'subs-match-os-language'
      | 'sws-allow-zimg'
      | 'sws-bitexact'
      | 'sws-fast'
      | 'target-colorspace-hint-strict'
      | 'taskbar-progress'
      | 'temporal-dither'
      | 'term-osd-bar'
      | 'terminal'
      | 'title-bar'
      | 'tls-verify'
      | 'tone-mapping-visualize'
      | 'track-auto-selection'
      | 'unregister'
      | 'untimed'
      | 'use-embedded-icc-profile'
      | 'use-filedir-conf'
      | 'v'
      | 'vd-apply-cropping'
      | 'vd-lavc-assume-old-x264'
      | 'vd-lavc-bitexact'
      | 'vd-lavc-check-hw-profile'
      | 'vd-lavc-fast'
      | 'vd-lavc-show-all'
      | 'vd-queue-enable'
      | 'video-latency-hacks'
      | 'video-osd'
      | 'video-recenter'
      | 'vo-image-high-bit-depth'
      | 'vo-image-jpeg-source-chroma'
      | 'vo-image-tag-colorspace'
      | 'vo-image-webp-lossless'
      | 'vo-kitty-alt-screen'
      | 'vo-kitty-auto-multiplexer-passthrough'
      | 'vo-kitty-config-clear'
      | 'vo-kitty-use-shm'
      | 'vo-tct-256'
      | 'vulkan-async-compute'
      | 'vulkan-async-transfer'
      | 'window-dragging'
      | 'window-maximized'
      | 'window-minimized'
      | 'write-filename-in-watch-later-config'
      | 'ytdl'
      | '{'
      | '}'
  ]: { read: ShapeValue<'boolean'>; write: ShapeValue<'boolean'> }
} & {
  [
    N in
      | 'ad'
      | 'alsa-mixer-device'
      | 'alsa-mixer-name'
      | 'ao-null-channel-layouts'
      | 'ao-null-format'
      | 'ao-pcm-file'
      | 'audio-channels'
      | 'audio-client-name'
      | 'audio-demuxer'
      | 'audio-device'
      | 'audio-format'
      | 'audio-spdif'
      | 'autofit'
      | 'autofit-larger'
      | 'autofit-smaller'
      | 'background-color'
      | 'background-tile-color-0'
      | 'background-tile-color-1'
      | 'chapters-file'
      | 'config-dir'
      | 'cookies-file'
      | 'd3d11-adapter'
      | 'd3d11-composition-size'
      | 'demuxer'
      | 'demuxer-cache-dir'
      | 'demuxer-lavf-format'
      | 'demuxer-rawaudio-channels'
      | 'demuxer-rawvideo-codec'
      | 'demuxer-rawvideo-format'
      | 'demuxer-rawvideo-mp-format'
      | 'drm-connector'
      | 'drm-device'
      | 'drm-draw-surface-size'
      | 'drm-mode'
      | 'dump-stats'
      | 'end'
      | 'error-diffusion'
      | 'fbo-format'
      | 'force-media-title'
      | 'fs-screen-name'
      | 'geometry'
      | 'gpu-hwdec-interop'
      | 'gpu-shader-cache-dir'
      | 'h'
      | 'help'
      | 'http-proxy'
      | 'hwdec-codecs'
      | 'hwdec-image-format'
      | 'icc-3dlut-size'
      | 'icc-cache-dir'
      | 'icc-profile'
      | 'image-lut'
      | 'include'
      | 'input-conf'
      | 'input-ipc-client'
      | 'input-ipc-server'
      | 'lavfi-complex'
      | 'length'
      | 'log-file'
      | 'lut'
      | 'macos-title-bar-color'
      | 'metadata-codepage'
      | 'mf-type'
      | 'o'
      | 'oac'
      | 'of'
      | 'ordered-chapters-files'
      | 'osd-back-color'
      | 'osd-border-color'
      | 'osd-color'
      | 'osd-font'
      | 'osd-fonts-dir'
      | 'osd-msg1'
      | 'osd-msg2'
      | 'osd-msg3'
      | 'osd-outline-color'
      | 'osd-playing-msg'
      | 'osd-selected-color'
      | 'osd-selected-outline-color'
      | 'osd-shadow-color'
      | 'osd-status-msg'
      | 'ovc'
      | 'playlist'
      | 'pulse-host'
      | 'referrer'
      | 'register-rpath'
      | 'screen-name'
      | 'screenshot-avif-encoder'
      | 'screenshot-avif-pixfmt'
      | 'screenshot-dir'
      | 'screenshot-directory'
      | 'screenshot-template'
      | 'show-profile'
      | 'start'
      | 'stream-dump'
      | 'stream-record'
      | 'sub-ass-styles'
      | 'sub-back-color'
      | 'sub-border-color'
      | 'sub-codepage'
      | 'sub-color'
      | 'sub-demuxer'
      | 'sub-font'
      | 'sub-fonts-dir'
      | 'sub-outline-color'
      | 'sub-shadow-color'
      | 'target-gamut'
      | 'target-lut'
      | 'term-osd-bar-chars'
      | 'term-playing-msg'
      | 'term-status-msg'
      | 'term-title'
      | 'title'
      | 'tls-ca-file'
      | 'tls-cert-file'
      | 'tls-key-file'
      | 'user-agent'
      | 'vaapi-device'
      | 'vd'
      | 'video-crop'
      | 'vo-image-avif-encoder'
      | 'vo-image-avif-pixfmt'
      | 'vo-image-outdir'
      | 'vo-mmcss-profile'
      | 'vulkan-device'
      | 'watch-history-path'
      | 'watch-later-dir'
      | 'watch-later-directory'
      | 'wayland-app-id'
      | 'x11-name'
      | 'ytdl-format'
  ]: { read: ShapeValue<'string'>; write: ShapeValue<'string'> }
} & {
  [
    N in
      | 'ad-lavc-ac3drc'
      | 'ad-queue-max-secs'
      | 'ao-null-buffer'
      | 'ao-null-latency'
      | 'ao-null-speed'
      | 'audio-buffer'
      | 'audio-delay'
      | 'audio-resample-cutoff'
      | 'audio-resample-max-output-size'
      | 'audio-wait-open'
      | 'background-blur-radius'
      | 'brightness'
      | 'cache-pause-wait'
      | 'cache-secs'
      | 'chapter-seek-threshold'
      | 'container-fps-override'
      | 'contrast'
      | 'corner-rounding'
      | 'cscale-antiring'
      | 'cscale-blur'
      | 'cscale-clamp'
      | 'cscale-radius'
      | 'cscale-taper'
      | 'cscale-wtaper'
      | 'deband-grain'
      | 'deband-range'
      | 'deband-threshold'
      | 'demuxer-backward-playback-step'
      | 'demuxer-hysteresis-secs'
      | 'demuxer-lavf-analyzeduration'
      | 'demuxer-mkv-subtitle-preroll-secs'
      | 'demuxer-mkv-subtitle-preroll-secs-index'
      | 'demuxer-rawvideo-fps'
      | 'demuxer-readahead-secs'
      | 'demuxer-termination-timeout'
      | 'display-fps-override'
      | 'dscale-antiring'
      | 'dscale-blur'
      | 'dscale-clamp'
      | 'dscale-radius'
      | 'dscale-taper'
      | 'dscale-wtaper'
      | 'gamma'
      | 'gamma-factor'
      | 'hdr-contrast-recovery'
      | 'hdr-contrast-smoothness'
      | 'hdr-film-strength'
      | 'hdr-mastering-clip'
      | 'hdr-peak-decay-rate'
      | 'hdr-peak-percentile'
      | 'hdr-scene-threshold-high'
      | 'hdr-scene-threshold-low'
      | 'hr-seek-demuxer-offset'
      | 'hue'
      | 'interpolation-threshold'
      | 'mc'
      | 'mf-fps'
      | 'monitoraspect'
      | 'monitorpixelaspect'
      | 'network-timeout'
      | 'osd-bar-align-x'
      | 'osd-bar-align-y'
      | 'osd-bar-border-size'
      | 'osd-bar-h'
      | 'osd-bar-marker-min-size'
      | 'osd-bar-marker-scale'
      | 'osd-bar-outline-size'
      | 'osd-bar-w'
      | 'osd-blur'
      | 'osd-border-size'
      | 'osd-font-size'
      | 'osd-outline-size'
      | 'osd-prune-delay'
      | 'osd-scale'
      | 'osd-shadow-offset'
      | 'osd-spacing'
      | 'override-display-fps'
      | 'panscan'
      | 'pitch'
      | 'replaygain-fallback'
      | 'replaygain-preamp'
      | 'saturation'
      | 'scale-antiring'
      | 'scale-blur'
      | 'scale-clamp'
      | 'scale-radius'
      | 'scale-taper'
      | 'scale-wtaper'
      | 'screenshot-jxl-distance'
      | 'secondary-sub-delay'
      | 'secondary-sub-pos'
      | 'secondary-sub-scale'
      | 'sharpen'
      | 'sigmoid-center'
      | 'sigmoid-slope'
      | 'speed'
      | 'sstep'
      | 'sub-ass-line-spacing'
      | 'sub-ass-prune-delay'
      | 'sub-blur'
      | 'sub-border-size'
      | 'sub-delay'
      | 'sub-font-size'
      | 'sub-fps'
      | 'sub-gauss'
      | 'sub-line-spacing'
      | 'sub-outline-size'
      | 'sub-pos'
      | 'sub-scale'
      | 'sub-shadow-offset'
      | 'sub-spacing'
      | 'sub-speed'
      | 'sws-cgb'
      | 'sws-cs'
      | 'sws-lgb'
      | 'sws-ls'
      | 'tone-mapping-exposure'
      | 'tone-mapping-knee-adaptation'
      | 'tone-mapping-knee-default'
      | 'tone-mapping-knee-maximum'
      | 'tone-mapping-knee-minimum'
      | 'tone-mapping-knee-offset'
      | 'tone-mapping-linear-knee'
      | 'tone-mapping-max-boost'
      | 'tone-mapping-reinhard-contrast'
      | 'tone-mapping-slope-offset'
      | 'tone-mapping-slope-tuning'
      | 'tone-mapping-spline-contrast'
      | 'tscale-antiring'
      | 'tscale-blur'
      | 'tscale-clamp'
      | 'tscale-radius'
      | 'tscale-taper'
      | 'tscale-wtaper'
      | 'vd-queue-max-secs'
      | 'video-align-x'
      | 'video-align-y'
      | 'video-margin-ratio-bottom'
      | 'video-margin-ratio-left'
      | 'video-margin-ratio-right'
      | 'video-margin-ratio-top'
      | 'video-pan-x'
      | 'video-pan-y'
      | 'video-scale-x'
      | 'video-scale-y'
      | 'video-sync-max-audio-change'
      | 'video-sync-max-video-change'
      | 'video-timing-offset'
      | 'video-zoom'
      | 'vo-image-jxl-distance'
      | 'vo-null-fps'
      | 'volume'
      | 'volume-gain'
      | 'volume-gain-max'
      | 'volume-gain-min'
      | 'volume-max'
      | 'window-scale'
  ]: { read: ShapeValue<'number'>; write: ShapeValue<'number'> }
} & {
  [
    N in
      | 'ad-lavc-o'
      | 'audio-swresample-o'
      | 'demuxer-lavf-o'
      | 'glsl-shader-opts'
      | 'libplacebo-opts'
      | 'msg-level'
      | 'oacopts'
      | 'ofopts'
      | 'oset-metadata'
      | 'ovcopts'
      | 'screenshot-avif-opts'
      | 'script-opts'
      | 'stream-lavf-o'
      | 'sub-lavc-o'
      | 'vd-lavc-o'
      | 'vo-image-avif-opts'
      | 'ytdl-raw-options'
  ]: {
    read: ShapeValue<{ dictionary: 'string' }>
    write: ShapeValue<{ anyOf: ['string', { dictionary: 'string' }] }>
  }
} & {
  [
    N in
      | 'ad-lavc-threads'
      | 'ad-queue-max-samples'
      | 'alsa-buffer-time'
      | 'alsa-mixer-index'
      | 'alsa-periods'
      | 'ao-null-outburst'
      | 'audio-backward-batch'
      | 'audio-resample-filter-size'
      | 'audio-resample-phase-shift'
      | 'audio-samplerate'
      | 'background-tile-size'
      | 'chapter-merge-threshold'
      | 'd3d11-sync-interval'
      | 'deband-iterations'
      | 'demuxer-lavf-probescore'
      | 'demuxer-rawaudio-rate'
      | 'demuxer-rawvideo-h'
      | 'demuxer-rawvideo-size'
      | 'demuxer-rawvideo-w'
      | 'dither-size-fruit'
      | 'egl-config-id'
      | 'gpu-tex-pad-x'
      | 'gpu-tex-pad-y'
      | 'hwdec-threads'
      | 'icc-intent'
      | 'input-ar-delay'
      | 'input-ar-rate'
      | 'input-doubleclick-time'
      | 'input-dragging-deadzone'
      | 'input-key-fifo-size'
      | 'opengl-check-pattern-a'
      | 'opengl-check-pattern-b'
      | 'opengl-swapinterval'
      | 'osd-bitmap-max-size'
      | 'osd-duration'
      | 'osd-glyph-limit'
      | 'osd-margin-x'
      | 'osd-margin-y'
      | 'osd-margin-y-offset'
      | 'osd-playing-msg-duration'
      | 'screenshot-jpeg-quality'
      | 'screenshot-jxl-effort'
      | 'screenshot-png-compression'
      | 'screenshot-png-filter'
      | 'screenshot-webp-compression'
      | 'screenshot-webp-quality'
      | 'sub-bitmap-max-size'
      | 'sub-fix-timing-keep'
      | 'sub-fix-timing-threshold'
      | 'sub-glyph-limit'
      | 'sub-margin-x'
      | 'sub-margin-y'
      | 'sub-margin-y-offset'
      | 'swapchain-depth'
      | 'sws-chs'
      | 'sws-cvs'
      | 'teletext-page'
      | 'temporal-dither-period'
      | 'vd-lavc-threads'
      | 'vd-queue-max-samples'
      | 'video-backward-batch'
      | 'video-sync-max-factor'
      | 'vo-image-jpeg-quality'
      | 'vo-image-jxl-effort'
      | 'vo-image-png-compression'
      | 'vo-image-png-filter'
      | 'vo-image-webp-compression'
      | 'vo-image-webp-quality'
      | 'vo-kitty-cols'
      | 'vo-kitty-height'
      | 'vo-kitty-left'
      | 'vo-kitty-rows'
      | 'vo-kitty-top'
      | 'vo-kitty-width'
      | 'vo-tct-height'
      | 'vo-tct-width'
      | 'vulkan-display-display'
      | 'vulkan-display-mode'
      | 'vulkan-display-plane'
      | 'vulkan-queue-count'
      | 'wid'
  ]: { read: ShapeValue<'bigint'>; write: ShapeValue<'integerInput'> }
} & {
  [
    N in
      | 'ad-queue-max-bytes'
      | 'audio-reversal-buffer'
      | 'demuxer-hysteresis-bytes'
      | 'demuxer-lavf-buffersize'
      | 'demuxer-lavf-probesize'
      | 'demuxer-max-back-bytes'
      | 'demuxer-max-bytes'
      | 'stream-buffer-size'
      | 'vd-queue-max-bytes'
      | 'video-reversal-buffer'
  ]: { read: ShapeValue<'bigint'>; write: ShapeValue<{ anyOf: ['bigint', 'string'] }> }
} & {
  [N in 'af' | 'ao' | 'clipboard-backends' | 'gpu-api' | 'gpu-context' | 'vf' | 'vo']: {
    read: ShapeValue<{
      list: {
        fields: { name: 'string' }
        optional: { label: 'string'; enabled: 'boolean'; params: { dictionary: 'string' } }
      }
    }>
    write: ShapeValue<{
      anyOf: [
        'string',
        {
          list: {
            fields: { name: 'string' }
            optional: { label: 'string'; enabled: 'boolean'; params: { dictionary: 'string' } }
          }
        },
      ]
    }>
  }
} & {
  [N in 'aid' | 'audio' | 'dither-depth' | 'secondary-sid' | 'sid' | 'sub' | 'vid' | 'video']: {
    read: ShapeValue<{ anyOf: ['bigint', { literals: [false, 'auto'] }] }>
    write: ShapeValue<{ anyOf: ['integerInput', { literals: ['no', false, 'auto'] }] }>
  }
} & {
  [
    N in
      | 'alang'
      | 'archive-exts'
      | 'audio-exts'
      | 'audio-file-auto-exts'
      | 'audio-file-paths'
      | 'audio-files'
      | 'cover-art-auto-exts'
      | 'cover-art-files'
      | 'cover-art-whitelist'
      | 'directory-filter-types'
      | 'display-tags'
      | 'external-files'
      | 'glsl-shaders'
      | 'http-header-fields'
      | 'hwdec'
      | 'image-exts'
      | 'input-commands'
      | 'macos-bundle-path'
      | 'oremove-metadata'
      | 'playlist-exts'
      | 'profile'
      | 'reset-on-next-file'
      | 'scripts'
      | 'slang'
      | 'sub-ass-force-style'
      | 'sub-ass-style-overrides'
      | 'sub-auto-exts'
      | 'sub-file-paths'
      | 'sub-files'
      | 'sub-filter-jsre'
      | 'sub-filter-regex'
      | 'sub-filter-sdh-enclosures'
      | 'video-exts'
      | 'vlang'
      | 'watch-later-options'
  ]: {
    read: ShapeValue<{ list: 'string' }>
    write: ShapeValue<{ anyOf: ['string', { list: 'string' }] }>
  }
} & {
  [
    N in
      | 'audio-backward-overlap'
      | 'edition'
      | 'hdr-reference-white'
      | 'hwdec-extra-frames'
      | 'target-peak'
      | 'video-backward-overlap'
  ]: {
    read: ShapeValue<{ anyOf: ['bigint', { literals: ['auto'] }] }>
    write: ShapeValue<{ anyOf: ['integerInput', { literals: ['auto'] }] }>
  }
} & {
  [N in 'audio-display']: {
    read: ShapeValue<{ literals: [false, 'embedded-first', 'external-first'] }>
    write: ShapeValue<{ literals: ['no', false, 'embedded-first', 'external-first'] }>
  }
} & {
  [
    N in
      | 'audio-file'
      | 'cover-art-file'
      | 'external-file'
      | 'focus-on-open'
      | 'gamut-clipping'
      | 'gamut-warning'
      | 'glsl-shader'
      | 'script'
      | 'script-opt'
      | 'sub-ass-vsfilter-aspect-compat'
      | 'sub-ass-vsfilter-blur-compat'
      | 'sub-file'
      | 'tone-mapping-desaturate'
      | 'tone-mapping-desaturate-exponent'
  ]: { read: ShapeValue<'value'>; write: ShapeValue<'value'> }
} & {
  [N in 'audio-file-auto' | 'cover-art-auto' | 'sub-auto']: {
    read: ShapeValue<{ literals: [false, 'exact', 'fuzzy', 'all'] }>
    write: ShapeValue<{ literals: ['no', false, 'exact', 'fuzzy', 'all'] }>
  }
} & {
  [N in 'autocreate-playlist']: {
    read: ShapeValue<{ literals: [false, 'filter', 'same'] }>
    write: ShapeValue<{ literals: ['no', false, 'filter', 'same'] }>
  }
} & {
  [N in 'autosync' | 'video-rotate']: {
    read: ShapeValue<{ anyOf: ['bigint', { literals: [false] }] }>
    write: ShapeValue<{ anyOf: ['integerInput', { literals: ['no', false] }] }>
  }
} & {
  [N in 'backdrop-type']: {
    read: ShapeValue<{ literals: ['auto', 'none', 'mica', 'acrylic', 'mica-alt'] }>
    write: ShapeValue<{ literals: ['auto', 'none', 'mica', 'acrylic', 'mica-alt'] }>
  }
} & {
  [N in 'background']: {
    read: ShapeValue<{ literals: ['none', 'color', 'tiles'] }>
    write: ShapeValue<{ literals: ['none', 'color', 'tiles'] }>
  }
} & {
  [N in 'blend-subtitles']: {
    read: ShapeValue<{ literals: [false, true, 'video'] }>
    write: ShapeValue<{ literals: ['no', false, 'yes', true, 'video'] }>
  }
} & {
  [N in 'border-background']: {
    read: ShapeValue<{ literals: ['none', 'color', 'tiles', 'blur'] }>
    write: ShapeValue<{ literals: ['none', 'color', 'tiles', 'blur'] }>
  }
} & {
  [N in 'cache' | 'demuxer-lavf-linearize-timestamps']: {
    read: ShapeValue<{ literals: [false, 'auto', true] }>
    write: ShapeValue<{ literals: ['no', false, 'auto', 'yes', true] }>
  }
} & {
  [N in 'cocoa-cb-output-csp']: {
    read: ShapeValue<{
      literals: [
        'auto',
        'display-p3',
        'display-p3-hlg',
        'display-p3-pq',
        'display-p3-linear',
        'dci-p3',
        'bt.2020',
        'bt.2020-linear',
        'bt.2100-hlg',
        'bt.2100-pq',
        'bt.709',
        'srgb',
        'srgb-linear',
        'rgb-linear',
        'adobe',
      ]
    }>
    write: ShapeValue<{
      literals: [
        'auto',
        'display-p3',
        'display-p3-hlg',
        'display-p3-pq',
        'display-p3-linear',
        'dci-p3',
        'bt.2020',
        'bt.2020-linear',
        'bt.2100-hlg',
        'bt.2100-pq',
        'bt.709',
        'srgb',
        'srgb-linear',
        'rgb-linear',
        'adobe',
      ]
    }>
  }
} & {
  [
    N in
      | 'cocoa-cb-sw-renderer'
      | 'd3d11-warp'
      | 'demuxer-seekable-cache'
      | 'target-colorspace-hint'
      | 'vd-lavc-dr'
  ]: {
    read: ShapeValue<{ literals: ['auto', false, true] }>
    write: ShapeValue<{ literals: ['auto', 'no', false, 'yes', true] }>
  }
} & {
  [N in 'cscale' | 'dscale']: {
    read: ShapeValue<{
      anyOf: [
        { integer: '0' },
        {
          literals: [
            'bilinear',
            'bicubic_fast',
            'oversample',
            'spline16',
            'spline36',
            'spline64',
            'sinc',
            'lanczos',
            'ginseng',
            'bicubic',
            'hermite',
            'catmull_rom',
            'mitchell',
            'robidoux',
            'robidouxsharp',
            'box',
            'nearest',
            'triangle',
            'gaussian',
            'jinc',
            'ewa_lanczos',
            'ewa_hanning',
            'ewa_ginseng',
            'ewa_lanczossharp',
            'ewa_lanczos4sharpest',
            'ewa_lanczossoft',
            'haasnsoft',
            'ewa_robidoux',
            'ewa_robidouxsharp',
            'bartlett',
            'cosine',
            'hanning',
            'tukey',
            'hamming',
            'quadric',
            'welch',
            'kaiser',
            'blackman',
            'sphinx',
          ]
        },
      ]
    }>
    write: ShapeValue<{
      literals: [
        '',
        'bilinear',
        'bicubic_fast',
        'oversample',
        'spline16',
        'spline36',
        'spline64',
        'sinc',
        'lanczos',
        'ginseng',
        'bicubic',
        'hermite',
        'catmull_rom',
        'mitchell',
        'robidoux',
        'robidouxsharp',
        'box',
        'nearest',
        'triangle',
        'gaussian',
        'jinc',
        'ewa_lanczos',
        'ewa_hanning',
        'ewa_ginseng',
        'ewa_lanczossharp',
        'ewa_lanczos4sharpest',
        'ewa_lanczossoft',
        'haasnsoft',
        'ewa_robidoux',
        'ewa_robidouxsharp',
        'bartlett',
        'cosine',
        'hanning',
        'tukey',
        'hamming',
        'quadric',
        'welch',
        'kaiser',
        'blackman',
        'sphinx',
      ]
    }>
  }
} & {
  [
    N in
      | 'cscale-param1'
      | 'cscale-param2'
      | 'cscale-wparam'
      | 'dscale-param1'
      | 'dscale-param2'
      | 'dscale-wparam'
      | 'scale-param1'
      | 'scale-param2'
      | 'scale-wparam'
      | 'tone-mapping-param'
      | 'tscale-param1'
      | 'tscale-param2'
      | 'tscale-wparam'
  ]: {
    read: ShapeValue<{ anyOf: ['number', { literals: ['default'] }] }>
    write: ShapeValue<{ anyOf: ['number', { literals: ['default'] }] }>
  }
} & {
  [N in 'cscale-window' | 'dscale-window' | 'scale-window' | 'tscale-window']: {
    read: ShapeValue<{
      anyOf: [
        { integer: '0' },
        {
          literals: [
            'bartlett',
            'cosine',
            'hanning',
            'tukey',
            'hamming',
            'quadric',
            'welch',
            'kaiser',
            'blackman',
            'sphinx',
            'jinc',
          ]
        },
      ]
    }>
    write: ShapeValue<{
      literals: [
        '',
        'bartlett',
        'cosine',
        'hanning',
        'tukey',
        'hamming',
        'quadric',
        'welch',
        'kaiser',
        'blackman',
        'sphinx',
        'jinc',
      ]
    }>
  }
} & {
  [N in 'cursor-autohide']: {
    read: ShapeValue<{ anyOf: ['bigint', { literals: [false, 'always'] }] }>
    write: ShapeValue<{ anyOf: ['integerInput', { literals: ['no', false, 'always'] }] }>
  }
} & {
  [N in 'd3d11-feature-level']: {
    read: ShapeValue<{
      literals: ['12_1', '12_0', '11_1', '11_0', '10_1', '10_0', '9_3', '9_2', '9_1']
    }>
    write: ShapeValue<{
      literals: ['12_1', '12_0', '11_1', '11_0', '10_1', '10_0', '9_3', '9_2', '9_1']
    }>
  }
} & {
  [N in 'd3d11-output-csp']: {
    read: ShapeValue<{ literals: ['auto', 'srgb', 'linear', 'pq', 'bt.2020'] }>
    write: ShapeValue<{ literals: ['auto', 'srgb', 'linear', 'pq', 'bt.2020'] }>
  }
} & {
  [N in 'd3d11-output-format']: {
    read: ShapeValue<{ literals: ['auto', 'rgba8', 'bgra8', 'rgb10_a2', 'rgba16f'] }>
    write: ShapeValue<{ literals: ['auto', 'rgba8', 'bgra8', 'rgb10_a2', 'rgba16f'] }>
  }
} & {
  [N in 'd3d11-output-mode']: {
    read: ShapeValue<{ literals: ['auto', 'window', 'composition'] }>
    write: ShapeValue<{ literals: ['auto', 'window', 'composition'] }>
  }
} & {
  [N in 'deinterlace' | 'drm-vrr-enabled' | 'load-auto-profiles' | 'opengl-early-flush']: {
    read: ShapeValue<{ literals: [false, true, 'auto'] }>
    write: ShapeValue<{ literals: ['no', false, 'yes', true, 'auto'] }>
  }
} & {
  [N in 'deinterlace-field-parity']: {
    read: ShapeValue<{ literals: ['tff', 'bff', 'auto'] }>
    write: ShapeValue<{ literals: ['tff', 'bff', 'auto'] }>
  }
} & {
  [N in 'demuxer-cache-unlink-files']: {
    read: ShapeValue<{ literals: ['immediate', 'whendone', false] }>
    write: ShapeValue<{ literals: ['immediate', 'whendone', 'no', false] }>
  }
} & {
  [N in 'demuxer-lavf-probe-info']: {
    read: ShapeValue<{ literals: [false, true, 'auto', 'nostreams'] }>
    write: ShapeValue<{ literals: ['no', false, 'yes', true, 'auto', 'nostreams'] }>
  }
} & {
  [N in 'demuxer-mkv-probe-video-duration']: {
    read: ShapeValue<{ literals: [false, true, 'full'] }>
    write: ShapeValue<{ literals: ['no', false, 'yes', true, 'full'] }>
  }
} & {
  [N in 'demuxer-mkv-subtitle-preroll']: {
    read: ShapeValue<{ literals: [false, true, 'index'] }>
    write: ShapeValue<{ literals: ['no', false, 'yes', true, 'index'] }>
  }
} & {
  [N in 'demuxer-rawaudio-format']: {
    read: ShapeValue<{
      literals: [
        'u8',
        's8',
        'u16le',
        'u16be',
        's16le',
        's16be',
        'u24le',
        'u24be',
        's24le',
        's24be',
        'u32le',
        'u32be',
        's32le',
        's32be',
        'floatle',
        'floatbe',
        'doublele',
        'doublebe',
        'u16',
        's16',
        'u24',
        's24',
        'u32',
        's32',
        'float',
        'double',
      ]
    }>
    write: ShapeValue<{
      literals: [
        'u8',
        's8',
        'u16le',
        'u16be',
        's16le',
        's16be',
        'u24le',
        'u24be',
        's24le',
        's24be',
        'u32le',
        'u32be',
        's32le',
        's32be',
        'floatle',
        'floatbe',
        'doublele',
        'doublebe',
        'u16',
        's16',
        'u24',
        's24',
        'u32',
        's32',
        'float',
        'double',
      ]
    }>
  }
} & {
  [N in 'directory-mode']: {
    read: ShapeValue<{ literals: ['auto', 'lazy', 'recursive', 'ignore'] }>
    write: ShapeValue<{ literals: ['auto', 'lazy', 'recursive', 'ignore'] }>
  }
} & {
  [N in 'dither']: {
    read: ShapeValue<{ literals: ['fruit', 'ordered', 'error-diffusion', false] }>
    write: ShapeValue<{ literals: ['fruit', 'ordered', 'error-diffusion', 'no', false] }>
  }
} & {
  [N in 'drag-and-drop']: {
    read: ShapeValue<{ literals: [false, 'auto', 'replace', 'append', 'insert-next'] }>
    write: ShapeValue<{ literals: ['no', false, 'auto', 'replace', 'append', 'insert-next'] }>
  }
} & {
  [N in 'drm-draw-plane' | 'drm-drmprime-video-plane']: {
    read: ShapeValue<{ anyOf: ['bigint', { literals: ['primary', 'overlay'] }] }>
    write: ShapeValue<{ anyOf: ['integerInput', { literals: ['primary', 'overlay'] }] }>
  }
} & {
  [N in 'drm-format']: {
    read: ShapeValue<{
      literals: ['xrgb8888', 'xrgb2101010', 'xbgr8888', 'xbgr2101010', 'rgb565', 'yuyv']
    }>
    write: ShapeValue<{
      literals: ['xrgb8888', 'xrgb2101010', 'xbgr8888', 'xbgr2101010', 'rgb565', 'yuyv']
    }>
  }
} & {
  [N in 'egl-output-format']: {
    read: ShapeValue<{
      literals: [
        'auto',
        'rgb8',
        'rgba8',
        'rgb10',
        'rgb10_a2',
        'rgb16',
        'rgba16',
        'rgb16f',
        'rgba16f',
        'rgb32f',
        'rgba32f',
      ]
    }>
    write: ShapeValue<{
      literals: [
        'auto',
        'rgb8',
        'rgba8',
        'rgb10',
        'rgb10_a2',
        'rgb16',
        'rgba16',
        'rgb16f',
        'rgba16f',
        'rgb32f',
        'rgba32f',
      ]
    }>
  }
} & {
  [N in 'focus-on']: {
    read: ShapeValue<{ literals: ['never', 'open', 'all'] }>
    write: ShapeValue<{ literals: ['never', 'open', 'all'] }>
  }
} & {
  [N in 'force-window']: {
    read: ShapeValue<{ literals: [false, true, 'immediate'] }>
    write: ShapeValue<{ literals: ['no', false, 'yes', true, 'immediate'] }>
  }
} & {
  [N in 'framedrop']: {
    read: ShapeValue<{ literals: [false, 'vo', 'decoder', 'decoder+vo'] }>
    write: ShapeValue<{ literals: ['no', false, 'vo', 'decoder', 'decoder+vo'] }>
  }
} & {
  [N in 'frames']: {
    read: ShapeValue<{ anyOf: ['bigint', { literals: ['all'] }] }>
    write: ShapeValue<{ anyOf: ['integerInput', { literals: ['all'] }] }>
  }
} & {
  [N in 'fs-screen']: {
    read: ShapeValue<{ anyOf: ['bigint', { literals: ['all', 'current'] }] }>
    write: ShapeValue<{ anyOf: ['integerInput', { literals: ['all', 'current'] }] }>
  }
} & {
  [N in 'gamut-mapping-mode']: {
    read: ShapeValue<{
      literals: [
        'auto',
        'clip',
        'perceptual',
        'relative',
        'saturation',
        'absolute',
        'desaturate',
        'darken',
        'warn',
        'linear',
      ]
    }>
    write: ShapeValue<{
      literals: [
        'auto',
        'clip',
        'perceptual',
        'relative',
        'saturation',
        'absolute',
        'desaturate',
        'darken',
        'warn',
        'linear',
      ]
    }>
  }
} & {
  [N in 'gapless-audio']: {
    read: ShapeValue<{ literals: [false, true, 'weak'] }>
    write: ShapeValue<{ literals: ['no', false, 'yes', true, 'weak'] }>
  }
} & {
  [N in 'gpu-dumb-mode' | 'hdr-compute-peak' | 'opengl-es' | 'sdr-adjust-gamma']: {
    read: ShapeValue<{ literals: ['auto', true, false] }>
    write: ShapeValue<{ literals: ['auto', 'yes', true, 'no', false] }>
  }
} & {
  [N in 'hls-bitrate']: {
    read: ShapeValue<{ anyOf: ['bigint', { literals: [false, 'min', 'max'] }] }>
    write: ShapeValue<{ anyOf: ['integerInput', { literals: ['no', false, 'min', 'max'] }] }>
  }
} & {
  [N in 'hr-seek']: {
    read: ShapeValue<{ literals: [false, 'absolute', true, 'always', 'default'] }>
    write: ShapeValue<{ literals: ['no', false, 'absolute', 'yes', true, 'always', 'default'] }>
  }
} & {
  [N in 'hwdec-software-fallback' | 'vd-lavc-software-fallback']: {
    read: ShapeValue<{ anyOf: ['bigint', { literals: [false, true] }] }>
    write: ShapeValue<{ anyOf: ['integerInput', { literals: ['no', false, 'yes', true] }] }>
  }
} & {
  [N in 'icc-force-contrast']: {
    read: ShapeValue<{ anyOf: ['bigint', { literals: [false, 'inf'] }] }>
    write: ShapeValue<{ anyOf: ['integerInput', { literals: ['no', false, 'inf'] }] }>
  }
} & {
  [N in 'idle']: {
    read: ShapeValue<{ literals: [false, 'once', true] }>
    write: ShapeValue<{ literals: ['no', false, 'once', 'yes', true] }>
  }
} & {
  [N in 'image-display-duration']: {
    read: ShapeValue<'number'>
    write: ShapeValue<{ anyOf: ['number', { literals: ['inf'] }] }>
  }
} & {
  [N in 'image-lut-type' | 'lut-type']: {
    read: ShapeValue<{ literals: ['auto', 'native', 'normalized', 'conversion'] }>
    write: ShapeValue<{ literals: ['auto', 'native', 'normalized', 'conversion'] }>
  }
} & {
  [N in 'image-subs-hdr-peak']: {
    read: ShapeValue<{
      anyOf: ['bigint', { literals: ['sdr', 'video', 'video-static', 'video-dynamic'] }]
    }>
    write: ShapeValue<{
      anyOf: ['integerInput', { literals: ['sdr', 'video', 'video-static', 'video-dynamic'] }]
    }>
  }
} & {
  [N in 'index']: {
    read: ShapeValue<{ literals: ['default', 'recreate'] }>
    write: ShapeValue<{ literals: ['default', 'recreate'] }>
  }
} & {
  [N in 'keep-open' | 'stop-screensaver' | 'subs-fallback-forced']: {
    read: ShapeValue<{ literals: [false, true, 'always'] }>
    write: ShapeValue<{ literals: ['no', false, 'yes', true, 'always'] }>
  }
} & {
  [N in 'loop' | 'loop-file']: {
    read: ShapeValue<{ anyOf: ['bigint', { literals: [false, 'inf', true] }] }>
    write: ShapeValue<{ anyOf: ['integerInput', { literals: ['no', false, 'inf', 'yes', true] }] }>
  }
} & {
  [N in 'loop-playlist']: {
    read: ShapeValue<{ anyOf: ['bigint', { literals: [false, 'inf', true, 'force'] }] }>
    write: ShapeValue<{
      anyOf: ['integerInput', { literals: ['no', false, 'inf', 'yes', true, 'force'] }]
    }>
  }
} & {
  [N in 'macos-app-activation-policy']: {
    read: ShapeValue<{ literals: ['regular', 'accessory', 'prohibited'] }>
    write: ShapeValue<{ literals: ['regular', 'accessory', 'prohibited'] }>
  }
} & {
  [N in 'macos-fs-animation-duration' | 'screen']: {
    read: ShapeValue<{ anyOf: ['bigint', { literals: ['default'] }] }>
    write: ShapeValue<{ anyOf: ['integerInput', { literals: ['default'] }] }>
  }
} & {
  [N in 'macos-geometry-calculation']: {
    read: ShapeValue<{ literals: ['visible', 'whole'] }>
    write: ShapeValue<{ literals: ['visible', 'whole'] }>
  }
} & {
  [N in 'macos-render-timer']: {
    read: ShapeValue<{ literals: ['callback', 'precise', 'system', 'feedback'] }>
    write: ShapeValue<{ literals: ['callback', 'precise', 'system', 'feedback'] }>
  }
} & {
  [N in 'macos-title-bar-appearance']: {
    read: ShapeValue<{
      literals: [
        'auto',
        'aqua',
        'darkAqua',
        'vibrantLight',
        'vibrantDark',
        'aquaHighContrast',
        'darkAquaHighContrast',
        'vibrantLightHighContrast',
        'vibrantDarkHighContrast',
      ]
    }>
    write: ShapeValue<{
      literals: [
        'auto',
        'aqua',
        'darkAqua',
        'vibrantLight',
        'vibrantDark',
        'aquaHighContrast',
        'darkAquaHighContrast',
        'vibrantLightHighContrast',
        'vibrantDarkHighContrast',
      ]
    }>
  }
} & {
  [N in 'macos-title-bar-material']: {
    read: ShapeValue<{
      literals: [
        'titlebar',
        'selection',
        'menu',
        'popover',
        'sidebar',
        'headerView',
        'sheet',
        'windowBackground',
        'hudWindow',
        'fullScreen',
        'toolTip',
        'contentBackground',
        'underWindowBackground',
        'underPageBackground',
        'dark',
        'light',
        'mediumLight',
        'ultraDark',
      ]
    }>
    write: ShapeValue<{
      literals: [
        'titlebar',
        'selection',
        'menu',
        'popover',
        'sidebar',
        'headerView',
        'sheet',
        'windowBackground',
        'hudWindow',
        'fullScreen',
        'toolTip',
        'contentBackground',
        'underWindowBackground',
        'underPageBackground',
        'dark',
        'light',
        'mediumLight',
        'ultraDark',
      ]
    }>
  }
} & {
  [N in 'ontop-level']: {
    read: ShapeValue<{ anyOf: ['bigint', { literals: ['window', 'system', 'desktop'] }] }>
    write: ShapeValue<{ anyOf: ['integerInput', { literals: ['window', 'system', 'desktop'] }] }>
  }
} & {
  [N in 'osd-align-x' | 'sub-align-x']: {
    read: ShapeValue<{ literals: ['left', 'center', 'right'] }>
    write: ShapeValue<{ literals: ['left', 'center', 'right'] }>
  }
} & {
  [N in 'osd-align-y' | 'sub-align-y']: {
    read: ShapeValue<{ literals: ['top', 'center', 'bottom'] }>
    write: ShapeValue<{ literals: ['top', 'center', 'bottom'] }>
  }
} & {
  [N in 'osd-bar-marker-style']: {
    read: ShapeValue<{ literals: ['none', 'triangle', 'line'] }>
    write: ShapeValue<{ literals: ['none', 'triangle', 'line'] }>
  }
} & {
  [N in 'osd-border-style' | 'sub-border-style']: {
    read: ShapeValue<{ literals: ['outline-and-shadow', 'opaque-box', 'background-box'] }>
    write: ShapeValue<{ literals: ['outline-and-shadow', 'opaque-box', 'background-box'] }>
  }
} & {
  [N in 'osd-font-provider' | 'sub-font-provider']: {
    read: ShapeValue<{ literals: ['auto', 'none', 'fontconfig'] }>
    write: ShapeValue<{ literals: ['auto', 'none', 'fontconfig'] }>
  }
} & {
  [N in 'osd-justify' | 'sub-justify']: {
    read: ShapeValue<{ literals: ['auto', 'left', 'center', 'right'] }>
    write: ShapeValue<{ literals: ['auto', 'left', 'center', 'right'] }>
  }
} & {
  [N in 'osd-level']: {
    read: ShapeValue<{
      anyOf: [{ integer: '0' }, { integer: '1' }, { integer: '2' }, { integer: '3' }]
    }>
    write: ShapeValue<{
      anyOf: [
        { integer: '0' },
        { integer: '1' },
        { integer: '2' },
        { integer: '3' },
        { literals: ['0', '1', '2', '3'] },
      ]
    }>
  }
} & {
  [N in 'osd-on-seek']: {
    read: ShapeValue<{ literals: [false, 'bar', 'msg', 'msg-bar'] }>
    write: ShapeValue<{ literals: ['no', false, 'bar', 'msg', 'msg-bar'] }>
  }
} & {
  [N in 'osd-playlist-entry']: {
    read: ShapeValue<{ literals: ['title', 'filename', 'both'] }>
    write: ShapeValue<{ literals: ['title', 'filename', 'both'] }>
  }
} & {
  [N in 'osd-shaper' | 'sub-ass-shaper' | 'sub-shaper']: {
    read: ShapeValue<{ literals: ['simple', 'complex'] }>
    write: ShapeValue<{ literals: ['simple', 'complex'] }>
  }
} & {
  [N in 'play-dir' | 'play-direction']: {
    read: ShapeValue<{ literals: ['forward', '+', 'backward', '-'] }>
    write: ShapeValue<{ literals: ['forward', '+', 'backward', '-'] }>
  }
} & {
  [N in 'player-operation-mode']: {
    read: ShapeValue<{ literals: ['cplayer', 'pseudo-gui'] }>
    write: ShapeValue<{ literals: ['cplayer', 'pseudo-gui'] }>
  }
} & {
  [N in 'playlist-inherit-options']: {
    read: ShapeValue<{ literals: [false, true, 'current'] }>
    write: ShapeValue<{ literals: ['no', false, 'yes', true, 'current'] }>
  }
} & {
  [N in 'playlist-start']: {
    read: ShapeValue<{ anyOf: ['bigint', { literals: ['auto', false] }] }>
    write: ShapeValue<{ anyOf: ['integerInput', { literals: ['auto', 'no', false] }] }>
  }
} & {
  [N in 'priority']: {
    read: ShapeValue<{
      literals: [false, 'realtime', 'high', 'abovenormal', 'normal', 'belownormal', 'idle']
    }>
    write: ShapeValue<{
      literals: ['no', false, 'realtime', 'high', 'abovenormal', 'normal', 'belownormal', 'idle']
    }>
  }
} & {
  [N in 'pulse-buffer']: {
    read: ShapeValue<{ anyOf: ['bigint', { literals: ['native'] }] }>
    write: ShapeValue<{ anyOf: ['integerInput', { literals: ['native'] }] }>
  }
} & {
  [N in 'replaygain']: {
    read: ShapeValue<{ literals: [false, 'track', 'album'] }>
    write: ShapeValue<{ literals: ['no', false, 'track', 'album'] }>
  }
} & {
  [N in 'rtsp-transport']: {
    read: ShapeValue<{ literals: ['lavf', 'udp', 'tcp', 'http', 'udp_multicast'] }>
    write: ShapeValue<{ literals: ['lavf', 'udp', 'tcp', 'http', 'udp_multicast'] }>
  }
} & {
  [N in 'scale']: {
    read: ShapeValue<{
      literals: [
        'bilinear',
        'bicubic_fast',
        'oversample',
        'spline16',
        'spline36',
        'spline64',
        'sinc',
        'lanczos',
        'ginseng',
        'bicubic',
        'hermite',
        'catmull_rom',
        'mitchell',
        'robidoux',
        'robidouxsharp',
        'box',
        'nearest',
        'triangle',
        'gaussian',
        'jinc',
        'ewa_lanczos',
        'ewa_hanning',
        'ewa_ginseng',
        'ewa_lanczossharp',
        'ewa_lanczos4sharpest',
        'ewa_lanczossoft',
        'haasnsoft',
        'ewa_robidoux',
        'ewa_robidouxsharp',
        'bartlett',
        'cosine',
        'hanning',
        'tukey',
        'hamming',
        'quadric',
        'welch',
        'kaiser',
        'blackman',
        'sphinx',
      ]
    }>
    write: ShapeValue<{
      literals: [
        'bilinear',
        'bicubic_fast',
        'oversample',
        'spline16',
        'spline36',
        'spline64',
        'sinc',
        'lanczos',
        'ginseng',
        'bicubic',
        'hermite',
        'catmull_rom',
        'mitchell',
        'robidoux',
        'robidouxsharp',
        'box',
        'nearest',
        'triangle',
        'gaussian',
        'jinc',
        'ewa_lanczos',
        'ewa_hanning',
        'ewa_ginseng',
        'ewa_lanczossharp',
        'ewa_lanczos4sharpest',
        'ewa_lanczossoft',
        'haasnsoft',
        'ewa_robidoux',
        'ewa_robidouxsharp',
        'bartlett',
        'cosine',
        'hanning',
        'tukey',
        'hamming',
        'quadric',
        'welch',
        'kaiser',
        'blackman',
        'sphinx',
      ]
    }>
  }
} & {
  [N in 'screenshot-format' | 'vo-image-format']: {
    read: ShapeValue<{ literals: ['jpg', 'jpeg', 'png', 'webp', 'jxl', 'avif'] }>
    write: ShapeValue<{ literals: ['jpg', 'jpeg', 'png', 'webp', 'jxl', 'avif'] }>
  }
} & {
  [N in 'secondary-sub-ass-override' | 'sub-ass-override']: {
    read: ShapeValue<{ literals: [false, true, 'scale', 'force', 'strip'] }>
    write: ShapeValue<{ literals: ['no', false, 'yes', true, 'scale', 'force', 'strip'] }>
  }
} & {
  [N in 'spirv-compiler']: {
    read: ShapeValue<{ literals: ['auto', 'shaderc'] }>
    write: ShapeValue<{ literals: ['auto', 'shaderc'] }>
  }
} & {
  [N in 'sub-ass-hinting' | 'sub-hinting']: {
    read: ShapeValue<{ literals: ['none', 'light', 'normal', 'native'] }>
    write: ShapeValue<{ literals: ['none', 'light', 'normal', 'native'] }>
  }
} & {
  [N in 'sub-ass-use-video-data']: {
    read: ShapeValue<{ literals: ['none', 'aspect-ratio', 'all'] }>
    write: ShapeValue<{ literals: ['none', 'aspect-ratio', 'all'] }>
  }
} & {
  [N in 'sub-ass-video-aspect-override' | 'video-aspect-override']: {
    read: ShapeValue<'number'>
    write: ShapeValue<{ anyOf: ['number', 'bigint', 'string'] }>
  }
} & {
  [N in 'sub-ass-vsfilter-color-compat']: {
    read: ShapeValue<{ literals: [false, 'basic', 'full', 'force-601'] }>
    write: ShapeValue<{ literals: ['no', false, 'basic', 'full', 'force-601'] }>
  }
} & {
  [N in 'sub-hdr-peak']: {
    read: ShapeValue<{ anyOf: ['bigint', { literals: ['auto', 'sdr'] }] }>
    write: ShapeValue<{ anyOf: ['integerInput', { literals: ['auto', 'sdr'] }] }>
  }
} & {
  [N in 'subs-fallback']: {
    read: ShapeValue<{ literals: [false, 'default', true] }>
    write: ShapeValue<{ literals: ['no', false, 'default', 'yes', true] }>
  }
} & {
  [N in 'subs-with-matching-audio']: {
    read: ShapeValue<{ literals: [false, 'forced', true] }>
    write: ShapeValue<{ literals: ['no', false, 'forced', 'yes', true] }>
  }
} & {
  [N in 'sws-scaler']: {
    read: ShapeValue<{
      literals: [
        'fast-bilinear',
        'bilinear',
        'bicubic',
        'x',
        'point',
        'area',
        'bicublin',
        'gauss',
        'sinc',
        'lanczos',
        'spline',
      ]
    }>
    write: ShapeValue<{
      literals: [
        'fast-bilinear',
        'bilinear',
        'bicubic',
        'x',
        'point',
        'area',
        'bicublin',
        'gauss',
        'sinc',
        'lanczos',
        'spline',
      ]
    }>
  }
} & {
  [N in 'target-colorspace-hint-mode']: {
    read: ShapeValue<{ literals: ['target', 'source', 'source-dynamic'] }>
    write: ShapeValue<{ literals: ['target', 'source', 'source-dynamic'] }>
  }
} & {
  [N in 'target-contrast']: {
    read: ShapeValue<{ anyOf: ['bigint', { literals: ['auto', 'inf'] }] }>
    write: ShapeValue<{ anyOf: ['integerInput', { literals: ['auto', 'inf'] }] }>
  }
} & {
  [N in 'target-prim']: {
    read: ShapeValue<{
      literals: [
        'auto',
        'bt.601-525',
        'bt.601-625',
        'bt.709',
        'bt.2020',
        'bt.470m',
        'apple',
        'adobe',
        'prophoto',
        'cie1931',
        'dci-p3',
        'display-p3',
        'v-gamut',
        's-gamut',
        'ebu3213',
        'film-c',
        'aces-ap0',
        'aces-ap1',
      ]
    }>
    write: ShapeValue<{
      literals: [
        'auto',
        'bt.601-525',
        'bt.601-625',
        'bt.709',
        'bt.2020',
        'bt.470m',
        'apple',
        'adobe',
        'prophoto',
        'cie1931',
        'dci-p3',
        'display-p3',
        'v-gamut',
        's-gamut',
        'ebu3213',
        'film-c',
        'aces-ap0',
        'aces-ap1',
      ]
    }>
  }
} & {
  [N in 'target-trc']: {
    read: ShapeValue<{
      literals: [
        'auto',
        'bt.1886',
        'srgb',
        'linear',
        'gamma1.8',
        'gamma2.0',
        'gamma2.2',
        'gamma2.4',
        'gamma2.6',
        'gamma2.8',
        'prophoto',
        'pq',
        'hlg',
        'v-log',
        's-log1',
        's-log2',
        'st428',
        'scrgb',
      ]
    }>
    write: ShapeValue<{
      literals: [
        'auto',
        'bt.1886',
        'srgb',
        'linear',
        'gamma1.8',
        'gamma2.0',
        'gamma2.2',
        'gamma2.4',
        'gamma2.6',
        'gamma2.8',
        'prophoto',
        'pq',
        'hlg',
        'v-log',
        's-log1',
        's-log2',
        'st428',
        'scrgb',
      ]
    }>
  }
} & {
  [N in 'term-osd']: {
    read: ShapeValue<{ literals: ['force', 'auto', false] }>
    write: ShapeValue<{ literals: ['force', 'auto', 'no', false] }>
  }
} & {
  [N in 'tone-mapping']: {
    read: ShapeValue<{
      literals: [
        'auto',
        'clip',
        'mobius',
        'reinhard',
        'hable',
        'gamma',
        'linear',
        'spline',
        'bt.2390',
        'bt.2446a',
        'st2094-40',
        'st2094-10',
      ]
    }>
    write: ShapeValue<{
      literals: [
        'auto',
        'clip',
        'mobius',
        'reinhard',
        'hable',
        'gamma',
        'linear',
        'spline',
        'bt.2390',
        'bt.2446a',
        'st2094-40',
        'st2094-10',
      ]
    }>
  }
} & {
  [N in 'treat-srgb-as-power22']: {
    read: ShapeValue<{ literals: [false, 'input', 'output', 'both', 'auto'] }>
    write: ShapeValue<{ literals: ['no', false, 'input', 'output', 'both', 'auto'] }>
  }
} & {
  [N in 'tscale']: {
    read: ShapeValue<{
      literals: [
        'oversample',
        'linear',
        'spline16',
        'spline36',
        'spline64',
        'sinc',
        'lanczos',
        'ginseng',
        'bicubic',
        'hermite',
        'catmull_rom',
        'mitchell',
        'robidoux',
        'robidouxsharp',
        'box',
        'nearest',
        'triangle',
        'gaussian',
        'bartlett',
        'cosine',
        'hanning',
        'tukey',
        'hamming',
        'quadric',
        'welch',
        'kaiser',
        'blackman',
        'sphinx',
        'jinc',
      ]
    }>
    write: ShapeValue<{
      literals: [
        'oversample',
        'linear',
        'spline16',
        'spline36',
        'spline64',
        'sinc',
        'lanczos',
        'ginseng',
        'bicubic',
        'hermite',
        'catmull_rom',
        'mitchell',
        'robidoux',
        'robidouxsharp',
        'box',
        'nearest',
        'triangle',
        'gaussian',
        'bartlett',
        'cosine',
        'hanning',
        'tukey',
        'hamming',
        'quadric',
        'welch',
        'kaiser',
        'blackman',
        'sphinx',
        'jinc',
      ]
    }>
  }
} & {
  [N in 'vd-lavc-film-grain']: {
    read: ShapeValue<{ literals: ['auto', 'cpu', 'gpu'] }>
    write: ShapeValue<{ literals: ['auto', 'cpu', 'gpu'] }>
  }
} & {
  [
    N in 'vd-lavc-framedrop' | 'vd-lavc-skipframe' | 'vd-lavc-skipidct' | 'vd-lavc-skiploopfilter'
  ]: {
    read: ShapeValue<{ literals: ['none', 'default', 'nonref', 'bidir', 'nonkey', 'all'] }>
    write: ShapeValue<{ literals: ['none', 'default', 'nonref', 'bidir', 'nonkey', 'all'] }>
  }
} & {
  [N in 'video-aspect-method']: {
    read: ShapeValue<{ literals: ['bitstream', 'container', 'ignore'] }>
    write: ShapeValue<{ literals: ['bitstream', 'container', 'ignore'] }>
  }
} & {
  [N in 'video-output-levels']: {
    read: ShapeValue<{ literals: ['auto', 'limited', 'full'] }>
    write: ShapeValue<{ literals: ['auto', 'limited', 'full'] }>
  }
} & {
  [N in 'video-sync']: {
    read: ShapeValue<{
      literals: [
        'audio',
        'display-resample',
        'display-resample-vdrop',
        'display-resample-desync',
        'display-tempo',
        'display-adrop',
        'display-vdrop',
        'display-desync',
        'desync',
      ]
    }>
    write: ShapeValue<{
      literals: [
        'audio',
        'display-resample',
        'display-resample-vdrop',
        'display-resample-desync',
        'display-tempo',
        'display-adrop',
        'display-vdrop',
        'display-desync',
        'desync',
      ]
    }>
  }
} & {
  [N in 'video-unscaled']: {
    read: ShapeValue<{ literals: [false, true, 'downscale-big'] }>
    write: ShapeValue<{ literals: ['no', false, 'yes', true, 'downscale-big'] }>
  }
} & {
  [N in 'vo-tct-algo']: {
    read: ShapeValue<{ literals: ['plain', 'half-blocks'] }>
    write: ShapeValue<{ literals: ['plain', 'half-blocks'] }>
  }
} & {
  [N in 'vo-tct-buffering']: {
    read: ShapeValue<{ literals: ['pixel', 'line', 'frame'] }>
    write: ShapeValue<{ literals: ['pixel', 'line', 'frame'] }>
  }
} & {
  [N in 'vulkan-swap-mode']: {
    read: ShapeValue<{ literals: ['auto', 'fifo', 'fifo-relaxed', 'mailbox', 'immediate'] }>
    write: ShapeValue<{ literals: ['auto', 'fifo', 'fifo-relaxed', 'mailbox', 'immediate'] }>
  }
} & {
  [N in 'wasapi-exclusive-buffer']: {
    read: ShapeValue<{ anyOf: ['bigint', { literals: ['default', 'min'] }] }>
    write: ShapeValue<{ anyOf: ['integerInput', { literals: ['default', 'min'] }] }>
  }
} & {
  [N in 'window-affinity']: {
    read: ShapeValue<{ literals: ['default', 'excludefromcapture', 'monitor'] }>
    write: ShapeValue<{ literals: ['default', 'excludefromcapture', 'monitor'] }>
  }
} & {
  [N in 'window-corners']: {
    read: ShapeValue<{ literals: ['default', 'donotround', 'round', 'roundsmall'] }>
    write: ShapeValue<{ literals: ['default', 'donotround', 'round', 'roundsmall'] }>
  }
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
