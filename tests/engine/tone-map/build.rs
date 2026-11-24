use std::path::PathBuf;
fn main() {
    napi_build::setup();
    let root = PathBuf::from(std::env::var_os("CARGO_MANIFEST_DIR").unwrap());
    cc::Build::new()
        .cpp(true)
        .std("c++17")
        .flag("/EHsc")
        .define("NOMINMAX", None)
        .include(root.join("include"))
        .include(root.join("mpv/include"))
        .file(root.join("producer.cpp"))
        .compile("gpu_probe");
    println!("cargo:rustc-link-lib=d3d11");
    println!("cargo:rustc-link-lib=dxgi");
}
