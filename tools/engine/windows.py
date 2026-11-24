import argparse
import json
import os
import shlex
import subprocess
from pathlib import Path

from source import ROOT, prepare


def msys(path):
    return "/" + path.drive[0].lower() + path.as_posix()[2:]


def build(destination, msys_root, prefix, repository):
    settings = json.loads((ROOT / "engine/windows-x64.json").read_bytes())
    prepare(destination / "source", repository)
    pkg_config = f"{msys(prefix)}/lib/pkgconfig:/ucrt64/lib/pkgconfig:/ucrt64/share/pkgconfig"
    setup = ["meson", "setup", "obj", "source", *settings["mpvOptions"]]
    script = "\n".join([
        "set -eu",
        f"export PATH={shlex.quote(msys(prefix))}/bin:/ucrt64/bin:/usr/bin",
        f"export PKG_CONFIG_LIBDIR={shlex.quote(pkg_config)}",
        "unset PKG_CONFIG_PATH",
        shlex.join(setup),
        "meson compile -C obj",
    ])
    subprocess.run(
        [msys_root / "usr/bin/bash.exe", "--login", "-c", script],
        cwd=destination, env=dict(os.environ, MSYSTEM="UCRT64", CHERE_INVOKING="1"), check=True,
    )


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("destination", type=Path)
    parser.add_argument("--msys", required=True, type=Path)
    parser.add_argument("--prefix", required=True, type=Path, help="Prefix with shared FFmpeg and MuJS")
    parser.add_argument("--repository")
    args = parser.parse_args()
    build(args.destination.resolve(), args.msys.resolve(), args.prefix.resolve(), args.repository)
