# Windows tone-map regression

Run the diagnostic on a Windows x64 host with D3D11. The 49 scenes exercise subtitles, OSD, dark colors, alpha and the three target primaries. The diagnostic reads RGBA16F before display conversion. Public SDR host checks use the installed package in `test:consumers`.

Prepare the native measurement tool with `pnpm exec vp run test:prepare-tone-probe <tool-directory>`. The input manifest identifies the reference probe and the headers needed to compile it. The D3D11 tests use the matching mpv headers.

Use `pnpm exec vp run test:prepare-tone-engines <comparison> --runtime <runtime> --cache <archives>` to build the baseline and candidate with identical dependencies and settings. The tool removes only `black-tone-map.patch` from the diagnostic baseline. Each directory contains its matching DLLs. Compare the two builds and the delivered engine with the following command.

```sh
pnpm exec vp run test:tone-map <results> --probe <tool-directory>/probe.node --baseline <comparison>/baseline/libmpv-2.dll --candidate <comparison>/candidate/libmpv-2.dll --delivered <runtime>/libmpv-2.dll
```

Each engine runs in a separate process. The output contains frames, the observed scene parameters, binary hashes and a component comparison. The baseline must reproduce nonfinite RGB. The candidate must produce finite RGB, preserve every previously finite component and retain opaque alpha. The delivered engine must match the candidate bit for bit.
