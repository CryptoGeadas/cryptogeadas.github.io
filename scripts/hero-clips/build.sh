#!/usr/bin/env bash
# Joins raw/<clip>.webm (cut at the marks in raw/<clip>.json) into the hero loop:
# ../../assets/hero-tools.mp4 (h264, muted, 1280x720) and ../../assets/hero-tools-poster.jpg.
set -euo pipefail
cd "$(dirname "$0")"
CLIPS=(scanner rwa fundamentals)
SPEED=1.15   # plays the recordings a little faster
FADE=0.5     # crossfade between clips, seconds
OUT=../../assets

inputs=(); filters=""; durs=()
for i in "${!CLIPS[@]}"; do
  c=${CLIPS[$i]}
  s=$(node -p "require('./raw/$c.json').start/1000")
  e=$(node -p "require('./raw/$c.json').end/1000")
  inputs+=(-ss "$s" -to "$e" -i "raw/$c.webm")
  durs+=("$(node -p "(($e)-($s))/$SPEED")")
  filters+="[$i:v]setpts=PTS/$SPEED,fps=30,format=yuv420p,settb=AVTB[v$i];"
done

# Chain crossfades: v0 x v1 -> x01, x01 x v2 -> out.
off=$(node -p "${durs[0]}-$FADE")
filters+="[v0][v1]xfade=transition=fade:duration=$FADE:offset=$off[x1];"
off=$(node -p "$off+${durs[1]}-$FADE")
filters+="[x1][v2]xfade=transition=fade:duration=$FADE:offset=$off[out]"

ffmpeg -v error -y "${inputs[@]}" -filter_complex "$filters" -map "[out]" -an \
  -c:v libx264 -preset slow -crf 26 -profile:v high -pix_fmt yuv420p -movflags +faststart "$OUT/hero-tools.mp4"

# Poster: a frame from the scanner clip with its panel open.
ffmpeg -v error -y -ss "$(node -p "${durs[0]}-1")" -i "$OUT/hero-tools.mp4" -frames:v 1 -q:v 4 "$OUT/hero-tools-poster.jpg"

ffprobe -v error -show_entries format=duration,size -of compact "$OUT/hero-tools.mp4"
ls -la "$OUT/hero-tools-poster.jpg"
