import { ProgressLogger } from '../shared/lib/log';
import { Spotify } from '../shared/lib/spotify';
import { IO } from '../shared/lib/IO';

async function main() {
	const logger = new ProgressLogger('beat aggregation', 6);

	// Get input
	const input = await IO.Input.getInput();
	logger.increment('input');

	// Get spotify client secret
	const secrets = await Spotify.Connection.createSpotifyConnection();
	logger.increment('spotify connection');

	// Asserting URIs for fetching
	const URIs = Spotify.GetTrackURIs.assertURIs(input);
	logger.increment('URIs');

	// Fetch track details
	const tracks = await Spotify.Playing.getTracks(URIs, secrets);
	const trackNameMap: Map<string, string> = new Map(
		tracks.map((t) => [t.uri, t.name])
	);
	logger.increment('analysis');

	// Fetch audio analysis
	const analyses = await Spotify.Analysis.get(secrets, URIs, trackNameMap);
	logger.increment('analysis');

	// Write to disk
	await IO.Output.exportAnalyses(analyses);
	logger.increment('write to disk');

	logger.done();
}

main();
