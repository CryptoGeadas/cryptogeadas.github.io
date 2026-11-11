#!/usr/bin/env bash
# Joins recorded clips into one hero loop.
#   bash build.sh <name> <clip> [<clip> ...]
# Reads raw/<clip>.webm cut at the marks in raw/<clip>.json, crossfades them, and writes
# out/hero-<name>.mp4 (h264, muted, 1280x720) and out/hero-<name>-poster.jpg.
# The site uses ../../assets/hero-tools.mp4: copy the chosen variant there.
set -euo pipefail
cd "$(dirname "$0")"
NAME=$1; shift
CLIPS=("$@")
SPEED=${SPEED:-1.15}   # plays the recordings a little faster
FADE=0.5               # crossfade between clips, seconds
OUT=out
mkdir -p "$OUT"

inputs=(); filters=""; durs=()
for i in "${!CLIPS[@]}"; do
  c=${CLIPS[$i]}
  s=$(node -p "require('./raw/$c.json').start/1000")
  e=$(node -p "require('./raw/$c.json').end/1000")
  inputs+=(-ss "$s" -to "$e" -i "raw/$c.webm")
  durs+=("$(node -p "(($e)-($s))/$SPEED")")
  filters+="[$i:v]setpts=PTS/$SPEED,fps=30,format=yuv420p,settb=AVTB[v$i];"
done

# Chain crossfades: v0 x v1 -> x1, x1 x v2 -> x2, ...
last="v0"; off=0
for ((i = 1; i < ${#CLIPS[@]}; i++)); do
  off=$(node -p "$off+${durs[$((i-1))]}-$FADE")
  filters+="[$last][v$i]xfade=transition=fade:duration=$FADE:offset=$off[x$i];"
  last="x$i"
done
filters+="[$last]null[out]"

ffmpeg -v error -y "${inputs[@]}" -filter_complex "$filters" -map "[out]" -an \
  -c:v libx264 -preset slow -crf 26 -profile:v high -pix_fmt yuv420p -movflags +faststart "$OUT/hero-$NAME.mp4"

# Poster: a frame one second before the end of the first clip.
ffmpeg -v error -y -ss "$(node -p "${durs[0]}-1")" -i "$OUT/hero-$NAME.mp4" -frames:v 1 -q:v 4 "$OUT/hero-$NAME-poster.jpg"

ffprobe -v error -show_entries format=duration,size -of compact "$OUT/hero-$NAME.mp4"
