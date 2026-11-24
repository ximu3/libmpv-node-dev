import { execFileSync } from "node:child_process";

execFileSync("cargo", ["fmt", "--all", "--check"], { stdio: "inherit" });
execFileSync(
  "cargo",
  ["clippy", "--workspace", "--all-targets", "--locked", "--", "-D", "warnings"],
  { stdio: "inherit" },
);
execFileSync("cargo", ["test", "--workspace", "--locked"], { stdio: "inherit" });
