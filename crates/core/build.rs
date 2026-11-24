fn main() {
    if std::env::var("CARGO_CFG_TARGET_OS").as_deref() == Ok("macos") {
        let source = "src/video/platform/renderers.m";
        cc::Build::new()
            .file(source)
            .flag("-fobjc-arc")
            .define("GL_SILENCE_DEPRECATION", None)
            .compile("libmpv_renderers");
        println!("cargo:rerun-if-changed={source}");
        for framework in ["Foundation", "OpenGL", "Metal"] {
            println!("cargo:rustc-link-lib=framework={framework}");
        }
    }
}
