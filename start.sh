#!/bin/sh

function exit_on_zero {
	if test $? -ne 0
	then
		exit $?
	fi
}

if [ -z "$1" ]
then
    echo "Please pass a list of tracks/URIs"
	exit 1
fi

# Get URIs
cat $1 | node js/modes/uri_fetcher.js -
exit_on_zero

# Get beats
cat data/uris.txt | node js/modes/beat_aggregator.js -
exit_on_zero

# Get tracks
cat data/uris.txt | node js/modes/track_aggregator.js -
exit_on_zero