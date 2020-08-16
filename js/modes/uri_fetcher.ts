import { ProgressLogger } from '../shared/lib/log';
import { Spotify } from '../shared/lib/spotify';
import { IO } from '../shared/lib/IO';

export async function getURIs(logger?: ProgressLogger) {
	// Get input
	const input = await IO.Input.getInput();
	logger?.increment('input');

	// Get spotify client secret
	const secrets = await Spotify.Connection.createSpotifyConnection();
	logger?.increment('spotify connection');

	// Get URIs for fetching
	const URIs = await Spotify.GetTrackURIs.getURIs(secrets, input);
	logger?.increment('URIs');

	return URIs;
}

async function main() {
	const logger = new ProgressLogger('URI fetching', 4);
	const URIs = await getURIs(logger);

	// Write to disk
	await IO.Output.exportURIs(URIs);
	logger.increment('write to disk');

	logger.done();
}

main();
