import { ProgressLogger } from './lib/log';
import { Spotify } from './lib/spotify';
import { IO } from './lib/IO';

async function main() {
	const logger = new ProgressLogger('main', 5);

	// Get input
	const input = await IO.Input.getInput();
	logger.increment('input');

	// Get spotify client secret
	const secrets = await Spotify.Connection.createSpotifyConnection();
	logger.increment('spotify connection');

	// Get URIs for fetching
	const URIs = await Spotify.GetTrackURIs.getURIs(secrets, input);
	logger.increment('URIs');

	// Fetch audio analysis
	const analyses = await Spotify.Analysis.get(secrets, URIs);
	logger.increment('analysis');

	// Write to disk
	await IO.Output.exportAnalyses(analyses);
	logger.increment('write to disk');

	logger.done();
}

main();
