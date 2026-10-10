#!/usr/bin/env python3
"""
MediaFlow HD — Automatic yt-dlp Startup Check & Self-Update Script
Ensures yt-dlp is always on the latest version upon backend startup using:
  1. `yt-dlp -U` (for standalone binaries in ./bin/yt-dlp or PATH)
  2. `python3 -m pip install --upgrade yt-dlp` (for pip-managed installations)
  3. Atomic GitHub release binary download fallback to ./bin/yt-dlp
Never crashes or blocks user requests if offline or rate-limited.
"""

import argparse
import json
import os
import shutil
import stat
import subprocess
import sys
import tempfile
import time
import urllib.request
from pathlib import Path

STAMP_FILE = Path(tempfile.gettempdir()) / "mediaflow_ytdlp_last_update.txt"
UPDATE_INTERVAL_SECONDS = 12 * 60 * 60  # 12 hours
GITHUB_LATEST_RELEASE_URL = "https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp"


def resolve_paths() -> tuple[Path, Path]:
    project_root = Path(__file__).resolve().parent.parent
    bin_dir = project_root / "bin"
    local_ytdlp = bin_dir / "yt-dlp"
    return bin_dir, local_ytdlp


def find_ytdlp_executable(local_ytdlp: Path) -> str | None:
    if local_ytdlp.is_file():
        try:
            local_ytdlp.chmod(local_ytdlp.stat().st_mode | stat.S_IXUSR | stat.S_IXGRP | stat.S_IXOTH)
        except OSError:
            pass
        return str(local_ytdlp)
    which_bin = shutil.which("yt-dlp")
    if which_bin:
        return which_bin
    return None


def get_ytdlp_version(executable: str | None) -> str:
    commands: list[list[str]] = []
    if executable:
        commands.append([executable, "--version"])
    commands.append([sys.executable, "-m", "yt_dlp", "--version"])

    for cmd in commands:
        try:
            proc = subprocess.run(
                cmd,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True,
                timeout=6,
                check=False,
            )
            if proc.returncode == 0 and proc.stdout.strip():
                return proc.stdout.strip().splitlines()[0].strip()
        except Exception:
            continue
    return "unknown"


def should_skip_recent_check(force: bool, current_version: str) -> bool:
    if force or current_version == "unknown":
        return False
    try:
        if STAMP_FILE.is_file():
            raw_ts = STAMP_FILE.read_text(encoding="utf-8").strip()
            last_ts = float(raw_ts)
            if last_ts > 1_000_000_000_000:
                last_ts = last_ts / 1000.0
            if (time.time() - last_ts) < UPDATE_INTERVAL_SECONDS:
                return True
    except Exception:
        pass
    return False


def write_update_stamp() -> None:
    try:
        STAMP_FILE.write_text(str(int(time.time() * 1000)), encoding="utf-8")
    except Exception:
        pass


def try_self_update_binary(executable: str) -> tuple[bool, str, bool]:
    """
    Runs `yt-dlp -U`.
    Returns (success, output_message, requires_pip_upgrade)
    """
    try:
        proc = subprocess.run(
            [executable, "-U"],
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            text=True,
            timeout=25,
            check=False,
        )
        output = (proc.stdout or "").strip()
        low = output.lower()
        requires_pip = "pip" in low or "pypi" in low or "wheel" in low
        if proc.returncode == 0 and not requires_pip:
            return True, output, False
        return False, output, requires_pip
    except Exception as exc:
        return False, str(exc), False


def try_pip_upgrade() -> tuple[bool, str]:
    """
    Runs `python3 -m pip install --upgrade yt-dlp` with automatic fallback
    for PEP 668 externally-managed environments (`--break-system-packages` or `--user`).
    """
    pip_variants = [
        [sys.executable, "-m", "pip", "install", "--upgrade", "--quiet", "yt-dlp"],
        [sys.executable, "-m", "pip", "install", "--upgrade", "--quiet", "--user", "yt-dlp"],
        [sys.executable, "-m", "pip", "install", "--upgrade", "--quiet", "--break-system-packages", "yt-dlp"],
    ]
    last_err = ""
    for cmd in pip_variants:
        try:
            proc = subprocess.run(
                cmd,
                stdout=subprocess.PIPE,
                stderr=subprocess.STDOUT,
                text=True,
                timeout=45,
                check=False,
            )
            out = (proc.stdout or "").strip()
            if proc.returncode == 0:
                return True, out or "Successfully upgraded yt-dlp via pip."
            last_err = out
        except Exception as exc:
            last_err = str(exc)
    return False, last_err


def try_atomic_github_binary_download(bin_dir: Path, local_ytdlp: Path) -> tuple[bool, str]:
    """
    Atomically downloads the latest standalone yt-dlp release binary to a temp file
    and replaces ./bin/yt-dlp so active downloads are never interrupted.
    """
    try:
        bin_dir.mkdir(parents=True, exist_ok=True)
        tmp_path = bin_dir / f"yt-dlp.tmp.{os.getpid()}.{int(time.time())}"
        req = urllib.request.Request(
            GITHUB_LATEST_RELEASE_URL,
            headers={"User-Agent": "MediaFlow-HD-Updater/1.0"},
        )
        with urllib.request.urlopen(req, timeout=30) as resp:
            data = resp.read()
        if len(data) < 100 * 1024:
            return False, "Downloaded yt-dlp binary was unexpectedly small."
        tmp_path.write_bytes(data)
        tmp_path.chmod(0o755)
        os.replace(tmp_path, local_ytdlp)
        return True, f"Downloaded latest yt-dlp binary to {local_ytdlp}"
    except Exception as exc:
        return False, str(exc)


def check_and_update_ytdlp(force: bool = False) -> dict:
    bin_dir, local_ytdlp = resolve_paths()
    executable = find_ytdlp_executable(local_ytdlp)
    previous_version = get_ytdlp_version(executable)

    if should_skip_recent_check(force, previous_version):
        return {
            "success": True,
            "updated": False,
            "method": "cached",
            "previousVersion": previous_version,
            "version": previous_version,
            "binaryPath": executable or str(local_ytdlp),
            "message": "yt-dlp was checked recently; skipping update check.",
        }

    # 1. Try `yt-dlp -U` if standalone binary is present
    requires_pip = False
    if executable:
        ok, msg, requires_pip = try_self_update_binary(executable)
        if ok:
            write_update_stamp()
            new_version = get_ytdlp_version(executable)
            return {
                "success": True,
                "updated": new_version != previous_version,
                "method": "yt-dlp -U",
                "previousVersion": previous_version,
                "version": new_version,
                "binaryPath": executable,
                "message": msg or f"yt-dlp verified via -U ({new_version})",
            }

    # 2. Try `pip install --upgrade yt-dlp` if pip-managed or if `yt-dlp -U` was not applicable
    if requires_pip or not executable:
        pip_ok, pip_msg = try_pip_upgrade()
        if pip_ok:
            write_update_stamp()
            executable = find_ytdlp_executable(local_ytdlp)
            new_version = get_ytdlp_version(executable)
            return {
                "success": True,
                "updated": new_version != previous_version,
                "method": "pip install --upgrade yt-dlp",
                "previousVersion": previous_version,
                "version": new_version,
                "binaryPath": executable or f"{sys.executable} -m yt_dlp",
                "message": pip_msg,
            }

    # 3. Try `pip install --upgrade yt-dlp` even if `yt-dlp -U` failed on a read-only binary
    pip_ok, pip_msg = try_pip_upgrade()
    if pip_ok:
        write_update_stamp()
        executable = find_ytdlp_executable(local_ytdlp)
        new_version = get_ytdlp_version(executable)
        if new_version != "unknown":
            return {
                "success": True,
                "updated": new_version != previous_version,
                "method": "pip install --upgrade yt-dlp",
                "previousVersion": previous_version,
                "version": new_version,
                "binaryPath": executable or f"{sys.executable} -m yt_dlp",
                "message": pip_msg,
            }

    # 4. Fallback: Atomic download of standalone binary from official GitHub release
    dl_ok, dl_msg = try_atomic_github_binary_download(bin_dir, local_ytdlp)
    if dl_ok:
        write_update_stamp()
        executable = find_ytdlp_executable(local_ytdlp)
        new_version = get_ytdlp_version(executable)
        return {
            "success": True,
            "updated": True,
            "method": "github-release-binary",
            "previousVersion": previous_version,
            "version": new_version,
            "binaryPath": str(local_ytdlp),
            "message": dl_msg,
        }

    # Graceful non-breaking fallback if offline
    return {
        "success": previous_version != "unknown",
        "updated": False,
        "method": "offline-fallback",
        "previousVersion": previous_version,
        "version": previous_version,
        "binaryPath": executable or str(local_ytdlp),
        "message": "Using existing yt-dlp installation (update check skipped/offline).",
    }


def main() -> int:
    parser = argparse.ArgumentParser(description="Check and update yt-dlp on backend startup.")
    parser.add_argument("--force", action="store_true", help="Force update check regardless of timestamp cache.")
    parser.add_argument("--json", action="store_true", help="Print output as a single JSON line.")
    args = parser.parse_args()

    result = check_and_update_ytdlp(force=args.force)
    if args.json:
        print(json.dumps(result))
    else:
        status_label = "OK" if result.get("success") else "WARN"
        print(
            f"[MediaFlow yt-dlp Updater] [{status_label}] "
            f"version={result.get('version')} method={result.get('method')} "
            f"path={result.get('binaryPath')}"
        )
    return 0


if __name__ == "__main__":
    sys.exit(main())
