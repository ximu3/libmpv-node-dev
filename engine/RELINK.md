# Media sources and rebuilding

The source kit for each platform includes the binding source revision, the mpv source and patches, the media dependency sources, build recipes and license notices. The platform package records its engine files in `engine.json` and its native ABI in `abi.json`.

Extract the binding source archive and install its locked development dependencies with `pnpm install --frozen-lockfile`. Use the Node and Rust versions recorded for the candidate. Windows builds use `pnpm exec vp run engine:windows <runtime> --cache <archives>`. macOS and glibc Linux use `pnpm exec vp run engine:unix <runtime> --cache <archives>`.

To rebuild with a modified library, update its source and digest in the binding's engine inputs, then rebuild the runtime on the target architecture. Run `pnpm exec vp run build` and `pnpm exec vp run pack:platform <packages> --runtime <runtime>` to create the matching main and platform packages. Install these tarballs together. Linux packages use the private media symbol map in the source kit. Apple packages use package-relative media install names.

The original third-party licenses and the corresponding build inputs accompany the source kit. The binding's MIT license applies to its own code.
