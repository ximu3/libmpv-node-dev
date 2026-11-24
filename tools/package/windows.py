import argparse
import hashlib
import json
import shutil
import subprocess
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]


def digest(file):
    with file.open("rb") as stream:
        return hashlib.file_digest(stream, "sha256").hexdigest()


def write_json(file, value):
    file.write_text(json.dumps(value, indent=2) + "\n", encoding="utf-8", newline="\n")


def pack(destination, engine, dependencies):
    lock = json.loads((ROOT / "engine/windows-x64.json").read_bytes())
    root_package = json.loads((ROOT / "package.json").read_bytes())
    target = "win32-x64"
    platform_name = root_package["name"] + "-" + target
    destination.parent.mkdir(parents=True, exist_ok=True)
    if destination.exists():
        raise FileExistsError(f"Package destination already exists: {destination}")

    with tempfile.TemporaryDirectory(dir=destination.parent) as temp:
        work = Path(temp)
        platform = work / "platform"
        platform.mkdir()
        files = {}
        for name, expected in lock["dependencies"].items():
            file = platform / name
            shutil.copyfile(dependencies / name, file)
            if digest(file) != expected:
                raise ValueError(f"Unexpected Windows runtime dependency: {name}")
            files[name] = expected
        for source, name in [(engine, "libmpv-2.dll"), (ROOT / "build/addon/libmpv.node", "libmpv.node")]:
            shutil.copyfile(source, platform / name)
            files[name] = digest(platform / name)
        write_json(platform / "runtime.json", {"files": files})
        write_json(platform / "package.json", {
            "name": platform_name, "version": root_package["version"], "private": True,
            "os": ["win32"], "cpu": ["x64"],
        })

        main = work / "main"
        shutil.copytree(ROOT / "dist", main / "dist")
        shutil.copyfile(ROOT / "LICENSE", main / "LICENSE")
        write_json(main / "dist/build.json", {
            "version": root_package["version"], "targets": {target: digest(platform / "runtime.json")},
        })
        root_package.pop("devDependencies")
        root_package.pop("packageManager")
        root_package.update(private=True, optionalDependencies={platform_name: root_package["version"]})
        write_json(main / "package.json", root_package)

        output = work / "packages"
        output.mkdir()
        pnpm = shutil.which("pnpm")
        for package in [platform, main]:
            subprocess.run([pnpm, "pack", "--pack-destination", str(output)], cwd=package, check=True)
        output.rename(destination)


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("destination", type=Path)
    parser.add_argument("--engine", type=Path, required=True)
    parser.add_argument("--dependencies", type=Path, required=True)
    args = parser.parse_args()
    pack(args.destination.resolve(), args.engine, args.dependencies)
