fn main() {
    if std::env::var("CARGO_CFG_TARGET_OS").as_deref() == Ok("macos") {
        let source = "src/video/platform/renderers.m";
        cc::Build::new()
            .file(source)
            .file("src/video/platform/macos/surface.m")
            .flag("-fobjc-arc")
            .define("GL_SILENCE_DEPRECATION", None)
            .compile("libmpv_renderers");
        println!("cargo:rerun-if-changed={source}");
        println!("cargo:rerun-if-changed=src/video/platform/macos/surface.m");
        for framework in ["Foundation", "OpenGL", "Metal", "IOSurface"] {
            println!("cargo:rustc-link-lib=framework={framework}");
        }
    }
}
