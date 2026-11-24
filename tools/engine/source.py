import hashlib
import json
import subprocess
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
INPUTS = ROOT / "engine/mpv"


def digest(file):
    with file.open("rb") as stream:
        hash = hashlib.sha256()
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            hash.update(chunk)
        return hash.hexdigest()


def verify(file, expected):
    if digest(file) != expected:
        raise ValueError(f"Unexpected SHA-256 for {file.name}")


def prepare(destination, repository=None):
    manifest = json.loads((INPUTS / "source.json").read_bytes())
    destination = destination.resolve()
    if destination.exists():
        raise FileExistsError(f"Source destination already exists: {destination}")
    destination.parent.mkdir(parents=True, exist_ok=True)

    with tempfile.TemporaryDirectory(dir=destination.parent) as temp:
        checkout = Path(temp) / "mpv"

        def git(*args):
            return subprocess.check_output(
                ["git", "-c", "core.autocrlf=false", "-C", str(checkout), *args]
            )

        checkout.mkdir()
        git("init", "--quiet")
        git("fetch", "--quiet", "--no-tags", "--depth=1", repository or manifest["repository"], manifest["commit"])
        git("checkout", "--quiet", "--detach", "FETCH_HEAD")
        if git("rev-parse", "HEAD").decode().strip() != manifest["commit"]:
            raise ValueError("Unexpected upstream commit")

        for patch in manifest["patches"]:
            path = INPUTS / "patches" / patch["file"]
            verify(path, patch["sha256"])
            for change in patch["changedFiles"]:
                verify(checkout / change["path"], change["beforeSha256"])
            git("apply", "--index", str(path))
            for change in patch["changedFiles"]:
                verify(checkout / change["path"], change["afterSha256"])

        checkout.rename(destination)


if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser()
    parser.add_argument("destination", type=Path)
    parser.add_argument("--repository", help="Use a local Git mirror of the pinned upstream source")
    arguments = parser.parse_args()
    prepare(arguments.destination, arguments.repository)
