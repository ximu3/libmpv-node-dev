import { copyFileSync, mkdirSync } from "node:fs";
import { execFileSync } from "node:child_process";

execFileSync("cargo", ["build", "--release", "--locked", "-p", "libmpv-binding"], {
  stdio: "inherit",
});
const name = {
  win32: "libmpv_binding.dll",
  linux: "liblibmpv_binding.so",
  darwin: "liblibmpv_binding.dylib",
}[process.platform];
mkdirSync("build/addon", { recursive: true });
copyFileSync("target/release/" + name, "build/addon/libmpv.node");
