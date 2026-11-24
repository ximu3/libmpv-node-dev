# Media fixtures

`subtitle-font.mkv` contains a two-second black FFV1 video, an ASS subtitle with a single white A, and the Ahem v3 TrueType font. The attached Ahem glyph forms a rectangle. The consumer compares the subtitle pixels with system fonts and attachments enabled independently.

Ahem was created by Todd Fahrner and Myles C. Maxfield and is dedicated to the public domain, with a CC0 declaration where the public domain dedication does not apply. The original font has SHA-256 `f0a92cd0cc45735591c9b5b1fa8aecd5194e8dc518895ca22af94a46c23550dc`. [W3C font distribution](https://www.w3.org/Style/CSS/Test/Fonts/) · [Ahem notice](https://www.w3.org/Style/CSS/Test/Fonts/Ahem/README)

The 63 × 47 PNG contains six sRGB reference colors. The 224 × 64 lossless HEVC sample contains seven BT.2020 PQ gray steps from 0.1 to 4,000 nits. Its ASS sidecar paints an opaque red vector rectangle. The fixtures and independent Display P3 reference values come from the [SDR integration cases](https://github.com/ximu3/kisaki-dev/tree/main/refactor/verification/evidence/libmpv-sdr-integration).

The hardware-decoding case uses a 12-frame, 896 × 256 HEVC Main 10 encoding of the PQ steps. The lossless source uses the HEVC range extensions profile. Each decoder is checked through the owning player's hwdec-current property.

The two-second FFV1 motion pattern is generated from FFmpeg testsrc2 at 160 × 96 and 24 fps. The presentation consumer samples successive frames in one Electron window.
