import type { MpvValue } from '../values.js'

type Dictionary = Readonly<Record<string, MpvValue>>

export type Track = {
  readonly id: bigint
  readonly type?: 'video' | 'audio' | 'sub'
  readonly 'src-id'?: bigint
  readonly title?: string
  readonly lang?: string
  readonly 'audio-channels'?: bigint
  readonly image: boolean
  readonly albumart: boolean
  readonly default: boolean
  readonly forced: boolean
  readonly dependent: boolean
  readonly 'visual-impaired': boolean
  readonly 'hearing-impaired': boolean
  readonly original: boolean
  readonly commentary: boolean
  readonly external: boolean
  readonly selected: boolean
  readonly 'main-selection'?: bigint
  readonly 'external-filename'?: string
  readonly 'ff-index'?: bigint
  readonly 'hls-bitrate'?: bigint
  readonly 'program-id'?: bigint
  readonly 'program-ids'?: readonly bigint[]
  readonly decoder?: string
  readonly 'decoder-desc'?: string
  readonly codec?: string
  readonly 'codec-desc'?: string
  readonly 'codec-profile'?: string
  readonly 'demux-w'?: bigint
  readonly 'demux-h'?: bigint
  readonly 'demux-crop-x'?: bigint
  readonly 'demux-crop-y'?: bigint
  readonly 'demux-crop-w'?: bigint
  readonly 'demux-crop-h'?: bigint
  readonly 'demux-channel-count'?: bigint
  readonly 'demux-channels'?: string
  readonly 'demux-samplerate'?: bigint
  readonly 'demux-fps'?: number
  readonly 'demux-bitrate'?: bigint
  readonly 'demux-rotation'?: bigint
  readonly 'demux-par'?: number
  readonly 'demux-duration'?: number
  readonly 'format-name'?: string
  readonly 'replaygain-track-peak'?: number
  readonly 'replaygain-track-gain'?: number
  readonly 'replaygain-album-peak'?: number
  readonly 'replaygain-album-gain'?: number
  readonly 'dolby-vision-profile'?: bigint
  readonly 'dolby-vision-level'?: bigint
  readonly metadata?: Readonly<Record<string, string>>
}

export type ImageParameters = {
  readonly pixelformat: string
  readonly 'hw-pixelformat'?: string
  readonly 'average-bpp'?: bigint
  readonly w: bigint
  readonly h: bigint
  readonly dw: bigint
  readonly dh: bigint
  readonly 'crop-x'?: bigint
  readonly 'crop-y'?: bigint
  readonly 'crop-w'?: bigint
  readonly 'crop-h'?: bigint
  readonly aspect: number
  readonly 'aspect-name'?: string
  readonly par: number
  readonly sar: number
  readonly 'sar-name'?: string
  readonly colormatrix: string
  readonly colorlevels: string
  readonly primaries: string
  readonly gamma: string
  readonly 'sig-peak': number
  readonly light: string
  readonly 'chroma-location': string
  readonly 'stereo-in': string
  readonly rotate: bigint
  readonly alpha?: string
  readonly 'min-luma'?: number
  readonly 'max-luma'?: number
  readonly 'max-cll'?: number
  readonly 'max-fall'?: number
  readonly 'scene-max-r'?: number
  readonly 'scene-max-g'?: number
  readonly 'scene-max-b'?: number
  readonly 'scene-avg'?: number
  readonly 'max-pq-y'?: number
  readonly 'avg-pq-y'?: number
  readonly 'prim-red-x'?: number
  readonly 'prim-red-y'?: number
  readonly 'prim-green-x'?: number
  readonly 'prim-green-y'?: number
  readonly 'prim-blue-x'?: number
  readonly 'prim-blue-y'?: number
  readonly 'prim-white-x'?: number
  readonly 'prim-white-y'?: number
}

export type AudioParameters = {
  readonly samplerate: bigint
  readonly 'channel-count': bigint
  readonly channels: string
  readonly 'hr-channels': string
  readonly format: string
}

export type PlaylistEntry = {
  readonly filename: string
  readonly current?: boolean
  readonly playing?: boolean
  readonly title?: string
  readonly id: bigint
  readonly 'playlist-path'?: string
}

export type Chapter = {
  readonly title: string
}

export type Edition = {
  readonly id: bigint
  readonly title?: string
  readonly default: boolean
  readonly metadata?: Readonly<Record<string, string>>
}

export type Decoder = {
  readonly codec: string
  readonly driver: string
  readonly description: string
}

export type AudioDevice = {
  readonly name: string
  readonly description: string
}

export type OsdDimensions = {
  readonly w: bigint
  readonly h: bigint
  readonly par: number
  readonly aspect: number
  readonly mt: bigint
  readonly mb: bigint
  readonly ml: bigint
  readonly mr: bigint
}

export type FrameInfo = {
  readonly 'picture-type'?: string
  readonly interlaced: boolean
  readonly tff: boolean
  readonly repeat: boolean
  readonly 'gop-timecode'?: string
  readonly 'smpte-timecode'?: string
  readonly 'estimated-smpte-timecode'?: string
}

export type DroppedFiles = {
  readonly time: bigint
  readonly action: string
  readonly files: readonly string[]
}

export type MousePosition = {
  readonly x: bigint
  readonly y: bigint
  readonly hover: boolean
}

export type TouchPosition = {
  readonly x: bigint
  readonly y: bigint
  readonly id: bigint
}

export type TerminalSize = {
  readonly w: bigint
  readonly h: bigint
}

export type AssEscape = {
  readonly '0': string
  readonly '1': string
}

export type CommandInfo = {
  readonly name: string
  readonly vararg: boolean
  readonly args: readonly {
    readonly name: string
    readonly type: string
    readonly optional: boolean
    readonly choices?: readonly string[]
    readonly 'default-value'?: MpvValue
  }[]
}
export type OptionInfo = {
  readonly name: string
  readonly type: string
  readonly 'set-from-commandline': boolean
  readonly 'set-locally': boolean
  readonly 'expects-file': boolean
  readonly 'default-value'?: MpvValue
  readonly choices?: readonly string[]
  readonly min?: number
  readonly max?: number
}
export type PropertyValues = {
  readonly 'ambient-light': number
  readonly 'ao-mute': boolean
  readonly 'ao-volume': number
  readonly 'audio-bitrate': bigint
  readonly 'audio-codec': string
  readonly 'audio-codec-name': string
  readonly 'audio-device-list': readonly AudioDevice[]
  readonly 'audio-out-params': AudioParameters
  readonly 'audio-params': AudioParameters
  readonly 'audio-pts': number
  readonly 'audio-speed-correction': number
  readonly avsync: number
  readonly 'cache-buffering-state': bigint
  readonly 'cache-speed': bigint
  readonly chapter: bigint
  readonly 'chapter-list': readonly Chapter[]
  readonly 'chapter-metadata': Readonly<Record<string, string>>
  readonly chapters: bigint
  readonly clipboard: { readonly text?: string; readonly 'text-primary'?: string }
  readonly clock: string
  readonly colormatrix: string
  readonly 'colormatrix-gamma': string
  readonly 'colormatrix-input-range': string
  readonly 'colormatrix-primaries': string
  readonly 'command-list': readonly CommandInfo[]
  readonly 'container-fps': number
  readonly 'core-idle': boolean
  readonly 'current-ao': string
  readonly 'current-clipboard-backend': string
  readonly 'current-demuxer': string
  readonly 'current-edition': bigint
  readonly 'current-gpu-context': string
  readonly 'current-vo': string
  readonly 'current-watch-later-dir': string
  readonly 'current-window-scale': number
  readonly 'decoder-frame-drop-count': bigint
  readonly 'decoder-list': readonly Decoder[]
  readonly 'default-menu': string
  readonly 'deinterlace-active': boolean
  readonly 'demuxer-cache-duration': number
  readonly 'demuxer-cache-idle': boolean
  readonly 'demuxer-cache-state': Dictionary
  readonly 'demuxer-cache-time': number
  readonly 'demuxer-lavf-list': readonly string[]
  readonly 'demuxer-start-time': number
  readonly 'demuxer-via-network': boolean
  readonly dheight: bigint
  readonly 'disc-menu-active': boolean
  readonly 'display-fps': number
  readonly 'display-height': bigint
  readonly 'display-hidpi-scale': number
  readonly 'display-names': readonly string[]
  readonly 'display-swapchain': bigint
  readonly 'display-sync-active': boolean
  readonly 'display-width': bigint
  readonly 'dropped-files': DroppedFiles
  readonly duration: number
  readonly dwidth: bigint
  readonly 'edition-list': readonly Edition[]
  readonly editions: bigint
  readonly 'encoder-list': readonly Decoder[]
  readonly env: Readonly<Record<string, string>>
  readonly 'eof-reached': boolean
  readonly 'estimated-display-fps': number
  readonly 'estimated-frame-count': bigint
  readonly 'estimated-frame-number': bigint
  readonly 'estimated-vf-fps': number
  readonly 'ffmpeg-version': string
  readonly 'file-format': string
  readonly 'file-local-options': readonly string[]
  readonly 'file-size': bigint
  readonly filename: string
  readonly 'filtered-metadata': Readonly<Record<string, string>>
  readonly focused: boolean
  readonly 'frame-drop-count': bigint
  readonly height: bigint
  readonly 'hwdec-current': string
  readonly 'hwdec-interop': string
  readonly 'idle-active': boolean
  readonly 'input-bindings': readonly Dictionary[]
  readonly 'input-key-list': readonly string[]
  readonly 'libass-version': bigint
  readonly 'libplacebo-version': string
  readonly 'media-title': string
  readonly metadata: Readonly<Record<string, string>>
  readonly 'mistimed-frame-count': bigint
  readonly 'mixer-active': boolean
  readonly 'mouse-pos': MousePosition
  readonly 'mpv-configuration': string
  readonly 'mpv-version': string
  readonly options: readonly string[]
  readonly 'osd-ass-cc': AssEscape
  readonly 'osd-dimensions': OsdDimensions
  readonly 'osd-height': bigint
  readonly 'osd-par': number
  readonly 'osd-sym-cc': string
  readonly 'osd-width': bigint
  readonly 'partially-seekable': boolean
  readonly path: string
  readonly 'paused-for-cache': boolean
  readonly 'percent-pos': number
  readonly 'perf-info': readonly Dictionary[]
  readonly pid: bigint
  readonly platform: string
  readonly 'playback-abort': boolean
  readonly 'playback-time': number
  readonly playlist: readonly PlaylistEntry[]
  readonly 'playlist-count': bigint
  readonly 'playlist-current-pos': bigint
  readonly 'playlist-path': string
  readonly 'playlist-playing-pos': bigint
  readonly 'playlist-pos': bigint
  readonly 'playlist-pos-1': bigint
  readonly 'playtime-remaining': number
  readonly 'profile-list': readonly Dictionary[]
  readonly 'property-list': readonly string[]
  readonly 'protocol-list': readonly string[]
  readonly 'remaining-ab-loops': bigint
  readonly 'remaining-file-loops': bigint
  readonly 'secondary-sub-end': number
  readonly 'secondary-sub-lines': readonly {
    readonly text: string
    readonly start: number
    readonly end: number
  }[]
  readonly 'secondary-sub-start': number
  readonly 'secondary-sub-text': string
  readonly seekable: boolean
  readonly seeking: boolean
  readonly 'stream-end': bigint
  readonly 'stream-open-filename': string
  readonly 'stream-path': string
  readonly 'stream-pos': bigint
  readonly 'sub-ass-extradata': string
  readonly 'sub-bitrate': bigint
  readonly 'sub-end': number
  readonly 'sub-forced-only-cur': boolean
  readonly 'sub-lines': readonly {
    readonly text: string
    readonly start: number
    readonly end: number
  }[]
  readonly 'sub-start': number
  readonly 'sub-text': string
  readonly 'sub-text-ass': string
  readonly 'subrandr-version': string
  readonly 'tablet-pos': Dictionary
  readonly 'term-clip-cc': string
  readonly 'term-size': TerminalSize
  readonly 'time-pos': number
  readonly 'time-remaining': number
  readonly 'total-avsync-change': number
  readonly 'touch-pos': readonly TouchPosition[]
  readonly 'track-list': readonly Track[]
  readonly 'user-data': MpvValue
  readonly 'video-bitrate': bigint
  readonly 'video-codec': string
  readonly 'video-dec-params': ImageParameters
  readonly 'video-format': string
  readonly 'video-frame-info': FrameInfo
  readonly 'video-out-params': ImageParameters
  readonly 'video-params': ImageParameters
  readonly 'video-speed-correction': number
  readonly 'video-target-params': ImageParameters
  readonly 'vo-configured': boolean
  readonly 'vo-delayed-frame-count': bigint
  readonly 'vo-passes': {
    readonly fresh: readonly Dictionary[]
    readonly redraw: readonly Dictionary[]
  }
  readonly 'vsync-jitter': number
  readonly 'vsync-ratio': number
  readonly width: bigint
  readonly 'window-id': bigint
  readonly 'working-directory': string
}
