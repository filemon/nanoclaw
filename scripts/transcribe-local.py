#!/usr/bin/env python3
"""
Local voice-note transcription fallback (faster-whisper, CPU).

Invoked by src/transcription.ts as a one-shot subprocess so the model is not
resident in memory between voice notes. Prints the transcript to stdout.

Usage: transcribe-local.py <audio-file> [--model small] [--language cs]
"""
import argparse
import sys

from faster_whisper import WhisperModel


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("audio")
    parser.add_argument("--model", default="small")
    parser.add_argument("--language", default=None)
    args = parser.parse_args()

    model = WhisperModel(args.model, device="cpu", compute_type="int8")
    segments, _info = model.transcribe(args.audio, language=args.language or None, vad_filter=True)
    text = " ".join(s.text.strip() for s in segments).strip()
    sys.stdout.write(text)
    return 0


if __name__ == "__main__":
    sys.exit(main())
