import { ProgressBar } from '../shared/lib/progress';
import { TRACK_DIR } from '../shared/lib/constants';
import { ProgressLogger } from '../shared/lib/log';
import { Spotify } from '../shared/lib/spotify';
import { IO } from '../shared/lib/IO';
import * as fs from 'fs-extra';

async function main() {
	const logger = new ProgressLogger('track aggregation', 7);

	// Get input
	const input = await IO.Input.getInput();
	logger.increment('input');

	// Get spotify client secret
	const secrets = await Spotify.Connection.createSpotifyConnection([
		'playlist-modify-public',
		'playlist-modify-private',
		'user-read-playback-state',
		'user-modify-playback-state',
	]);
	logger.increment('spotify connection');

	// Asserting URIs for creating playlist
	const URIs = Spotify.GetTrackURIs.assertURIs(input);
	logger.increment('URIs');

	// Get current devices
	const devices = await Spotify.Playing.getDevices(secrets);
	logger.increment('get devices');

	// Start playing
	await Spotify.Playing.play(URIs, devices, secrets);
	logger.increment('start playing');

	// Get tracks
	const tracks = await Spotify.Playing.getTracks(URIs, secrets);
	const duration = tracks.reduce((p, t) => p + t.duration_ms, 0);
	logger.increment('get tracks');

	// Wait...
	console.log('Waiting for tracks to play to completion...');
	await ProgressBar.awaitTimeBar(duration + 1000 * 60, tracks.map(t => ({
		name: t.name,
		duration: t.duration_ms
	})));
	logger.increment('waiting');

	// Do a quick check as to whether the files are there
	const files = await fs.readdir(TRACK_DIR);
	if (files.length < URIs.length) {
		console.error('Files were not actually downloaded');
		process.exit(1);
	}

	logger.done();
}

main();
