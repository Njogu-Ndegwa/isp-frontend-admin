"""Extract still frames from a video for blog-post images.

Usage:
    python extract_frames.py <video> <outdir> [seconds ...]

Without timestamps, extracts 5 evenly spaced frames. Frames are saved as
WebP (quality 80) named frame-<seconds>s.webp — pick the ones that show the
step being written about, move them to public/blog-images/<slug>/ and rename
descriptively. Uses PyAV (bundled with faster-whisper) + Pillow; installs
Pillow on first run if missing.
"""

from __future__ import annotations

import subprocess
import sys
from pathlib import Path


def ensure(package: str, import_name: str | None = None) -> None:
    try:
        __import__(import_name or package)
    except ImportError:
        print(f"[setup] installing {package}...", file=sys.stderr)
        subprocess.check_call([sys.executable, "-m", "pip", "install", "--quiet", package])


def main() -> None:
    if len(sys.argv) < 3:
        print(__doc__, file=sys.stderr)
        sys.exit(2)
    ensure("av")
    ensure("Pillow", "PIL")
    import av

    video_path = Path(sys.argv[1])
    outdir = Path(sys.argv[2])
    outdir.mkdir(parents=True, exist_ok=True)
    wanted = [float(s) for s in sys.argv[3:]]

    with av.open(str(video_path)) as container:
        stream = container.streams.video[0]
        duration = float(stream.duration * stream.time_base) if stream.duration else None
        if not wanted:
            if not duration:
                raise SystemExit("video has no duration metadata; pass explicit timestamps")
            wanted = [duration * i / 6 for i in range(1, 6)]

        for seconds in wanted:
            container.seek(int(seconds / stream.time_base), stream=stream)
            for frame in container.decode(stream):
                image = frame.to_image()
                out = outdir / f"frame-{seconds:.1f}s.webp"
                image.save(out, "WEBP", quality=80)
                print(out)
                break


if __name__ == "__main__":
    main()
