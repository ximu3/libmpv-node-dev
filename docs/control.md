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

A command completes when libmpv replies to that command. The reply to `loadfile` can arrive before the file has loaded. A single `screenshot` returns the saved filename in `result.filename`. Turning off per-frame screenshots returns `null`. The client identity and monotonic nanosecond clock are available through `clientId`, `clientName`, and `getTimeNs()`.

Use `getProperty` and `setProperty` for structured values. A native integer maps to `bigint`. A native double maps to `number`. A value in a returned byte array remains usable after close. `getPropertyText` selects mpv's plain or OSD text format. `loadConfigFile` takes an absolute path. A configuration error can occur after earlier settings have taken effect.

`input: 'native'` accepts a discriminated `MpvNode`. `output: 'native'` preserves string bytes and ordered map entries. A conversion error exposes a fresh copy of its original result through `getNativeValue()`. An unavailable property retains libmpv's error code.

Ordinary initialization options and property writes use the declared value shapes. For example, `mute` accepts a boolean and `scale-param1` accepts a number or `'default'`. Unset A–B loop endpoints read back as `'no'`.

`getProperty` and `observeProperty` accept the same `PropertyOptions` for reading values. If a caller forwards an optional `format`, the value type includes the property's default node-format result. An optional `output` can select the JavaScript or native representation.

Calls accept an optional `AbortSignal`. A submitted command may have taken effect when its wait ends in cancellation. Errors expose `operation`, `submitted`, and a native or binding error code. Repeated calls to `close()` await the same shutdown. `unref()` lets an idle Node environment exit while the player is open.

Use `createClient({ name, signal })` for a separate control channel on the same player. It has its own client identity and directed messages. `dispose()` releases that channel. Closing the player also ends its channels.

`observeEvents`, `observeProperty` and `observePropertyText` return an independently disposable subscription. Await registration before sending a directed message. The first callback runs after the subscription is delivered. Property notifications distinguish available values and unavailable state. Native event output preserves message arguments as byte arrays. A subscription can be cancelled with its signal, including from a callback.

Use `observeLogs(observer, { level, output })` to receive diagnostics on an independent log channel. The default level is info. The `terminal-default` selection uses mpv's per-module settings. A gap precedes the next retained message after overflow. Its dropped count is exact for binding-only loss and null when mpv also reports an overflow.

Pass `initializationLogs: { observer, level, output }` to the factory to receive startup diagnostics. Completion ends the logging interval. The factory separately reports initialization errors after cleanup. Native output returns the original prefix and message bytes.

`addHook(name, handler, { priority, signal })` registers an asynchronous hook on a dedicated client. The hook resumes once the value returned by `handler.run({ signal })` settles. Disposing the registration aborts the active signal and releases the native wait. A late handler rejection remains consumed. A handler failure is delivered to `handler.error` after registration cleanup, preserving the original reason.

Use `getVideoDevices({ signal })` to enumerate device names and platform selection values before creating a player. Windows returns DXGI adapter LUIDs, macOS returns accelerated CGL renderer IDs, and Linux returns DRM render node paths. The device list reflects the current host environment.

`registerProtocol(name, provider, { output })` registers a read-only protocol until the owning core is destroyed. Each open receives the original URI and an abort signal. The source supplies `read(maxBytes)` and `close()`, with optional absolute `seek(offset)` and `getSize()`. A nonempty byte array represents a short or full read, null is EOF, and null size means unknown.

Await provider work before returning it to the binding. Work on a stream cannot control its own core, including via another client. Other cores remain available. Normal player close aborts outstanding work, releases native waits and waits for late opens and source cleanup. Per-operation failures go to `onError`; cleanup failures during player shutdown are also returned in an `AggregateError`.

For software rendering, pass `videoOutput: { renderer: 'software', width, height }` to `createMpv`. The default format is bgr0. The output accepts rgb0, bgr0, 0rgb, 0bgr and rgb24. `configure()` takes a complete width, height and pixel format. `observeFrames()` returns a disposable subscription to independent CPU byte arrays. Stride includes row padding, and the zero channel is unused. Delivered pixels remain valid after configuring or closing the player.

The output owns its libmpv VO. A direct conflicting write fails with `renderConflict`. A conflict detected after applying a configuration file ends the output and leaves the core available for other operations. Use `reportSwap()` only when the host actually presents a frame.

## Engine inventory

The installed platform package contains `catalog.json`. It records the actual mpv, FFmpeg, libplacebo and libass versions, decoder and encoder entries, demuxers, protocols, commands, properties and option metadata. The `vo`, `ao`, `vf` and `af` option entries expose the choices compiled into that platform. Hardware availability is measured on the target device.
