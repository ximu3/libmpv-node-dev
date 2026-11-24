import argparse
import json
import os
import shutil
import subprocess
import sys
import tarfile
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]


def consume(packages, electron):
    with tempfile.TemporaryDirectory(prefix="libmpv consumer ") as temp:
        consumer = Path(temp)
        deps = {}
        for archive in packages.glob("*.tgz"):
            with tarfile.open(archive) as tar:
                manifest = json.load(tar.extractfile("package/package.json"))
            deps[manifest["name"]] = archive.as_uri()
        (consumer / "package.json").write_text(json.dumps({
            "private": True, "type": "module", "dependencies": deps,
        }))
        platform = next(name for name in deps if name.startswith("@ximu3/libmpv-node-"))
        (consumer / "pnpm-workspace.yaml").write_text(
            "overrides:\n  " + json.dumps(platform) + ": " + json.dumps(deps[platform]) + "\n"
        )
        subprocess.run([shutil.which("pnpm"), "install", "--offline"], cwd=consumer, check=True)
        shutil.copyfile(ROOT / "tests/consumers/control.ts", consumer / "control.mjs")
        shutil.copyfile(ROOT / "tests/consumers/worker.ts", consumer / "worker.mjs")
        environment = os.environ.copy()
        for key in ["NODE_PATH", "NODE_OPTIONS", "ELECTRON_RUN_AS_NODE"]:
            environment.pop(key, None)
        if sys.platform == "win32":
            environment["PATH"] = str(Path(os.environ["SYSTEMROOT"]) / "System32")
        subprocess.run([shutil.which("node"), consumer / "control.mjs"], cwd=temp, env=environment, check=True, timeout=60)
        if electron:
            receipt = consumer / "electron-version"
            environment["LIBMPV_TEST_RECEIPT"] = str(receipt)
            shutil.copyfile(ROOT / "tests/consumers/electron/main.cjs", consumer / "main.cjs")
            subprocess.run([electron, f"--user-data-dir={consumer / 'data'}", consumer / "main.cjs"],
                           cwd=temp, env=environment, check=True, timeout=60)
            print(f"Electron {receipt.read_text()} completed the installed-package checks.")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("packages", type=Path)
    parser.add_argument("--electron", type=Path)
    args = parser.parse_args()
    consume(args.packages.resolve(), args.electron)
