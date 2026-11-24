# Playback control

`getClientApiVersion()` reads the Client API major and minor version from the paired library. It can run before creating a player.

`createMpv({ options, input, signal })` creates an independent core. Pass initialization options as an ordered array of name/value pairs. The factory copies the input before asynchronous initialization. A failed option reports its zero-based index in `error.creation.optionIndex`.

```ts
import { createMpv } from '@ximu3/libmpv-node'

await using player = await createMpv({
  options: [
    ['pause', true],
    ['vo', 'null'],
    ['ao', 'null'],
  ],
})

await player.command(['loadfile', '/media/example.mkv', 'replace'])
```

A command completes when libmpv replies to that command. The reply to `loadfile` can arrive before the file has loaded. The client identity and monotonic nanosecond clock are available through `clientId`, `clientName`, and `getTimeNs()`.

Use `getProperty` and `setProperty` for structured values. A native integer maps to `bigint`. A native double maps to `number`. A value in a returned byte array remains usable after close. `getPropertyText` selects mpv's plain or OSD text format. `loadConfigFile` takes an absolute path. A configuration error can occur after earlier settings have taken effect.

`input: 'native'` accepts a discriminated `MpvNode`. `output: 'native'` preserves string bytes and ordered map entries. A conversion error exposes a fresh copy of its original result through `getNativeValue()`. An unavailable property retains libmpv's error code.

Calls accept an optional `AbortSignal`. A submitted command may have taken effect when its wait ends in cancellation. Errors expose `operation`, `submitted`, and a native or binding error code. Repeated calls to `close()` await the same shutdown. `unref()` lets an idle Node environment exit while the player is open.
