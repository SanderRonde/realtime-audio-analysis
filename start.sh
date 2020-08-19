#!/bin/sh

INTERVAL=50
TRACK_FOLDER="./data/tracks"

if [ -z "$1" ]
then
    echo "Please pass a list of tracks/URIs"
	exit 1
fi

# Get URIs
cat $1 | node js/modes/uri_fetcher.js - || exit 1

# Get beats
cat data/uris.txt | node js/modes/beat_aggregator.js - || exit 1

# Get tracks
cat data/uris.txt | node js/modes/track_aggregator.js - || exit 1

# Convert to 16-bit signed PCM
for filename in data/tracks/*.wav; do
	ffmpeg -i "$filename" "$filename.converted.wav" -y
	rm "$filename"
	mv "$filename.converted.wav" "$filename"
done

# Get bins
node js/modes/gen_bins.js --output=data/tracks/ --interval=$INTERVAL data/tracks/*.wav || exit 1

# Preprocess
python py/beat_detector/main.py preprocess -i $TRACK_FOLDER/*.wav -o ./data/preprocessed.pickle -n $INTERVAL -a ./data/analysis.json || exit 1