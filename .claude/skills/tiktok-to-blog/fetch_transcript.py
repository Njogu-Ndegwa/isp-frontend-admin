"""Fetch a TikTok video's transcript for the tiktok-to-blog skill.

Usage:
    python fetch_transcript.py <tiktok-url-or-local-file>

Prints JSON: {"title", "description", "hashtags", "transcript", "source"}.

Strategy: TikTok captions via yt-dlp when available, otherwise download the
audio and transcribe locally with faster-whisper (bundles PyAV, so no system
ffmpeg is required). Installs its own Python deps on first run.
"""

from __future__ import annotations

import json
import re
import subprocess
import sys
import tempfile
from pathlib import Path


def ensure(package: str, import_name: str | None = None) -> None:
    try:
        __import__(import_name or package)
    except ImportError:
        print(f"[setup] installing {package}...", file=sys.stderr)
        subprocess.check_call([sys.executable, "-m", "pip", "install", "--quiet", package])


def vtt_to_text(vtt: str) -> str:
    lines = []
    for line in vtt.splitlines():
        line = line.strip()
        if not line or line == "WEBVTT" or "-->" in line or line.isdigit():
            continue
        line = re.sub(r"<[^>]+>", "", line)
        if line and (not lines or lines[-1] != line):
            lines.append(line)
    return " ".join(lines)


def transcribe(audio_path: Path) -> str:
    ensure("faster-whisper", "faster_whisper")
    from faster_whisper import WhisperModel

    print("[whisper] transcribing (small model, CPU)...", file=sys.stderr)
    model = WhisperModel("small", device="cpu", compute_type="int8")
    segments, _info = model.transcribe(str(audio_path))
    return " ".join(seg.text.strip() for seg in segments)


def from_tiktok(url: str) -> dict:
    ensure("yt-dlp", "yt_dlp")
    import yt_dlp

    with tempfile.TemporaryDirectory() as tmp:
        opts = {
            "outtmpl": f"{tmp}/%(id)s.%(ext)s",
            "format": "bestaudio/best",
            "writesubtitles": True,
            "writeautomaticsub": True,
            "subtitleslangs": ["en", "en-US", "eng"],
            "quiet": True,
            "no_warnings": True,
        }
        with yt_dlp.YoutubeDL(opts) as ydl:
            info = ydl.extract_info(url, download=True)

        meta = {
            "title": info.get("title") or "",
            "description": info.get("description") or "",
            "hashtags": re.findall(r"#(\w+)", info.get("description") or ""),
            "source": url,
        }

        subs = sorted(Path(tmp).glob("*.vtt")) + sorted(Path(tmp).glob("*.srt"))
        if subs:
            meta["transcript"] = vtt_to_text(subs[0].read_text(encoding="utf-8", errors="replace"))
            if meta["transcript"].strip():
                return meta

        media = [p for p in Path(tmp).iterdir() if p.suffix not in (".vtt", ".srt", ".json")]
        if not media:
            raise RuntimeError("yt-dlp produced no media file")
        meta["transcript"] = transcribe(media[0])
        return meta


def from_file(path: Path) -> dict:
    return {
        "title": path.stem,
        "description": "",
        "hashtags": [],
        "source": str(path),
        "transcript": transcribe(path),
    }


def main() -> None:
    if len(sys.argv) != 2:
        print(__doc__, file=sys.stderr)
        sys.exit(2)
    target = sys.argv[1]
    if Path(target).exists():
        result = from_file(Path(target))
    else:
        result = from_tiktok(target)
    print(json.dumps(result, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
