import { REDIRECT_URL, PORT, REDIRECT_PATH } from './constants.js';
import * as express from 'express';
import * as fs from 'fs-extra';
import * as path from 'path';
import * as http from 'http';
import { Req } from './req';

export namespace Spotify {
	export namespace Connection {
		interface Secrets {
			id: string;
			secret: string;
		}

		let secrets: null | Secrets = null;

		async function getSecrets() {
			if (secrets) return secrets;
			try {
				return (secrets = JSON.parse(
					await fs.readFile(
						path.join(__dirname, '../', 'secrets', 'spotify.json'),
						{
							encoding: 'utf8',
						}
					)
				) as Secrets);
			} catch (e) {
				console.log('Failed to read spotify secrets');
				process.exit(1);
			}
		}

		export interface ExtendedResponse<R> extends Response {
			clone(): ExtendedResponse<R>;
			json(): Promise<R>;
		}

		export interface SpotifyAuthTokens {
			access_token: string;
			token_type: string;
			scope: string;
			expires_in: number;
			refresh_token: string;
		}

		async function getSecretFromCode(code: string) {
			const { id, secret } = await getSecrets();
			const response = ((await Req.request(
				'https://accounts.spotify.com/api/token',
				{
					method: 'post',
					headers: {
						'Content-Type': 'application/x-www-form-urlencoded',
						Authorization: `Basic ${Buffer.from(
							`${id}:${secret}`
						).toString('base64')}`,
					},
					body: `grant_type=authorization_code&code=${code}&redirect_uri=${REDIRECT_URL}`,
				}
			)) as unknown) as ExtendedResponse<SpotifyAuthTokens>;
			return await response.json();
		}

		export async function createSpotifyConnection() {
			return new Promise<SpotifyAuthTokens>((resolve) => {
				let server: http.Server | null = null;

				const app = express();
				app.get(REDIRECT_PATH, async (req, res) => {
					if (req.query.error || !req.query.code) {
						console.error('Failed to get code');
						process.exit(1);
					}

					const secrets = await getSecretFromCode(
						req.query.code as string
					);

					if (server) {
						server.close();
					}

					res.write('Nice!');
					res.end();
					resolve(secrets);
				});

				server = app.listen(PORT);

				const url = `https://accounts.spotify.com/authorize?client_id=${'69431226d2264717a11c0f805379c3f6'}&response_type=code&redirect_uri=${REDIRECT_URL}`;
				console.log('click this url', url);
			});
		}
	}

	export namespace GetTrackURIs {
		interface Paging<V> {
			href: string;
			items: V[];
			limit: number;
			next: string | null;
			offset: number;
			previous: string | null;
			total: number;
		}

		interface ExternalURLs {
			[key: string]: string;
		}

		interface SimpleArtist {
			external_urls: ExternalURLs;
			href: string;
			id: string;
			name: string;
			type: 'artist';
			uri: string;
		}

		interface LinkedTrack {
			external_urls: ExternalURLs;
			href: string;
			id: string;
			type: 'track';
			uri: string;
		}

		interface Restrictions {
			reason: string;
		}

		interface SimpleTrack {
			artists: SimpleArtist[];
			available_markets: string[];
			disc_number: number;
			duration_ms: number;
			explicit: boolean;
			external_urls: ExternalURLs;
			href: String;
			id: string;
			is_playable: boolean;
			linked_from: LinkedTrack;
			restrictions: Restrictions;
			name: string;
			preview_url: string;
			track_number: number;
			type: 'track';
			uri: string;
			is_local: boolean;
		}

		interface SearchResult {
			tracks: Paging<SimpleTrack>;
		}

		export async function get(
			secrets: Connection.SpotifyAuthTokens,
			names: string[]
		) {
			const trackURIs: string[] = [];
			for (const name of names) {
				const res = await (((await Req.request(
					`https://api.spotify.com/v1/search?type=track&q=${name}`,
					{
						method: 'GET',
						headers: {
							Accept: 'application/json',
							'Content-Type': 'application/json',
							Authorization: `Bearer ${secrets.access_token}`,
						},
					}
				)) as unknown) as Connection.ExtendedResponse<
					SearchResult
				>).json();

				if (res.tracks.items.length === 0) {
					console.error(`No results found for "${name}"`);
					process.exit(1);
				}
				trackURIs.push(res.tracks.items[0].uri);
			}
			return trackURIs;
		}

		export async function getURIs(
			secrets: Connection.SpotifyAuthTokens,
			tracks: string[]
		) {
			const uris = tracks.filter((t) => t.startsWith('spotify:track:'));
			const nonURIs = tracks.filter(
				(t) => !t.startsWith('spotify:track:')
			);

			return [...uris, ...(await get(secrets, nonURIs))];
		}
	}

	export namespace Analysis {
		interface TimeInterval {
			start: number;
			duration: number;
			confidence: number;
		}

		interface Section {
			start: number;
			duration: number;
			confidence: number;
			loudness: Number;
			tempo: number;
			tempo_confidence: number;
			key: number;
			key_confidence: number;
			mode: number;
			mode_confidence: number;
			time_signature: number;
			time_signature_confidence: number;
		}

		interface Segment {
			start: number;
			duration: number;
			confidence: number;
			loudness_start: number;
			loudness_max_time: number;
			loudness_max: number;
			loudness_end: number;
			pitches: number[];
			timbre: number[];
		}

		export interface AudioAnalysis {
			meta: {
				analyzer_version: string;
				platform: string;
				detailed_status: string;
				status_code: number;
				timestamp: number;
				analysis_time: number;
				input_process: string;
			};
			track: {
				num_samples: number;
				duration: number;
				sample_md5: string;
				offset_seconds: number;
				window_seconds: Number;
				analysis_sample_rate: number;
				analysis_channels: number;
				end_of_fade_in: number;
				start_of_fade_out: number;
				loudness: Number;
				tempo: number;
				tempo_confidence: number;
				time_signature: number;
				time_signature_confidence: number;
				key: number;
				key_confidence: number;
				mode: number;
				mode_confidence: number;
				codestring: string;
				code_version: number;
				echoprintstring: string;
				echorint_vesion: number;
				synchstring: string;
				synch_version: number;
				rhythmstring: string;
				rhythm_version: number;
			};
			bars: TimeInterval[];
			beats: TimeInterval[];
			tatums: TimeInterval[];
			sections: Section[];
			segments: Segment[];
		}

		export async function get(
			secrets: Connection.SpotifyAuthTokens,
			ids: string[]
		) {
			const analyses: AudioAnalysis[] = [];
			for (const id of ids) {
				const res = await (((await Req.request(
					`https://api.spotify.com/v1/audio-analysis/${id.slice(
						'spotify:track:'.length
					)}`,
					{
						method: 'GET',
						headers: {
							Accept: 'application/json',
							'Content-Type': 'application/json',
							Authorization: `Bearer ${secrets.access_token}`,
						},
					}
				)) as unknown) as Connection.ExtendedResponse<
					AudioAnalysis
				>).json();

				analyses.push(res);
			}
			return analyses;
		}
	}
}
