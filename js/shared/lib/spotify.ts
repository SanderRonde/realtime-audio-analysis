import { REDIRECT_URL, PORT, REDIRECT_PATH, BRABANT } from './constants.js';
import { RequestInit } from 'node-fetch';
import { ProgressBar } from './progress';
import * as express from 'express';
import * as fs from 'fs-extra';
import * as path from 'path';
import * as http from 'http';
import * as open from 'open';
import { Req } from './req';

export namespace Spotify {
	export namespace Types {
		export interface Secrets {
			access_token: string;
			token_type: string;
			scope: string;
			expires_in: number;
			refresh_token: string;
		}

		interface Followers {
			href: string | null;
			total: number;
		}

		interface Image {
			height?: number | null;
			url: string;
			width?: number | null;
		}

		export interface Me {
			country: string;
			display_name: string;
			email: string;
			external_urls: ExternalURLs;
			followers: Followers;
			href: string;
			id: string;
			images: Image[];
			product?: 'premium' | 'free' | 'open';
			type: 'user';
			uri: string;
		}

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

		export interface ExtendedResponse<R> extends Response {
			clone(): ExtendedResponse<R>;
			json(): Promise<R>;
		}

		export interface SearchResult {
			tracks: Paging<SimpleTrack>;
		}

		interface PublicUser {
			display_name: string;
			external_urls: ExternalURLs;
			followers: Followers;
			href: string;
			id: string;
			images: Image[];
			type: 'user';
			uri: string;
		}

		interface ExternalIDs {
			[key: string]: string;
		}

		interface SimpleAlbum {
			album_group?: 'album' | 'single' | 'compilation' | 'appears_on';
			album_type: 'album' | 'single' | 'compilation';
			artists: SimpleArtist[];
			available_markets: string[];
			external_urls: ExternalURLs;
			href: string;
			id: string;
			images: Image[];
			name: string;
			release_date: string;
			release_date_precision: string;
			restrictions?: Restrictions;
			type: 'album';
			uri: string;
		}

		export interface Track {
			album: SimpleAlbum;
			artists: SimpleArtist[];
			available_markets: string[];
			disc_number: number;
			duration_ms: number;
			explicit: boolean;
			external_ids: ExternalIDs;
			external_urls: ExternalURLs;
			href: string;
			id: string;
			is_playable: boolean;
			linked_from: LinkedTrack;
			restrictions: Restrictions;
			name: string;
			popularity: number;
			preview_url: string | null;
			track_number: number;
			type: 'track';
			uri: string;
			is_local: boolean;
		}

		interface PlaylistTrack {
			added_at: number;
			added_by: PublicUser;
			is_local: boolean;
			track: Track;
		}

		export interface Playlist {
			collaborative: boolean;
			description: string;
			external_urls: ExternalURLs;
			followers: Followers;
			href: string;
			id: string;
			images: Image[];
			name: string;
			owner: PublicUser;
			public: boolean | null;
			snapshot_id: string;
			tracks: Paging<PlaylistTrack>;
			type: 'playlist';
			uri: string;
		}

		type DeviceType =
			| 'Computer'
			| 'Tablet'
			| 'Smartphone'
			| 'Speaker'
			| 'TV'
			| 'AVR'
			| 'STB'
			| 'AudioDongle'
			| 'GameConsole'
			| 'CastVideo'
			| 'CastAudio'
			| 'Automobile'
			| 'Unknown';

		export interface Device {
			id: string | null;
			is_active: boolean;
			is_private_session: boolean;
			is_restricted: boolean;
			name: string;
			type: DeviceType;
			volume_percent: number | null;
		}

		export interface Devices {
			devices: Device[];
		}

		export interface Tracks {
			tracks: Track[];
		}
	}

	export namespace API {
		export async function req<T>(
			method: string,
			url: string,
			secrets: Types.Secrets,
			init?: RequestInit
		): Promise<Types.ExtendedResponse<T>> {
			return ((await Req.request(`https://api.spotify.com/v1/${url}`, {
				method: method.toUpperCase(),
				headers: {
					Accept: 'application/json',
					'Content-Type': 'application/json',
					Authorization: `Bearer ${secrets.access_token}`,
				},
				...init,
			})) as unknown) as Types.ExtendedResponse<T>;
		}
	}

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
						path.join(
							__dirname,
							'../../../',
							'secrets',
							'spotify.json'
						),
						{
							encoding: 'utf8',
						}
					)
				) as Secrets);
			} catch (e) {
				console.error('Failed to read spotify secrets');
				process.exit(1);
			}
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
			)) as unknown) as Types.ExtendedResponse<Types.Secrets>;
			return await response.json();
		}

		export async function createSpotifyConnection(scopes: string[] = []) {
			return new Promise<Types.Secrets>((resolve) => {
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

					res.write(
						'<html><head><title>Nice!</title></head><body>Nice!<script>window.close();</script></body></html>'
					);
					res.end();
					resolve(secrets);
				});

				server = app.listen(PORT);

				const url = `https://accounts.spotify.com/authorize?client_id=${'69431226d2264717a11c0f805379c3f6'}&response_type=code${
					scopes.length > 0 ? `&scope=${scopes.join('%20')}` : ''
				}&redirect_uri=${REDIRECT_URL}`;
				open(url, {
					url: true,
				});
			});
		}
	}

	export namespace GetTrackURIs {
		export async function get(secrets: Types.Secrets, names: string[]) {
			const trackURIs: string[] = [];
			for (const name of names) {
				const res = await (
					await API.req<Types.SearchResult>(
						'GET',
						`search?type=track&q=${name}`,
						secrets
					)
				).json();

				if (res.tracks.items.length === 0) {
					console.error(`No results found for "${name}"`);
					process.exit(1);
				}
				trackURIs.push(res.tracks.items[0].uri);
			}
			return trackURIs;
		}

		export async function getURIs(
			secrets: Types.Secrets,
			tracks: string[]
		) {
			const uris = tracks.filter((t) => t.startsWith('spotify:track:'));
			const nonURIs = tracks.filter(
				(t) => !t.startsWith('spotify:track:')
			);

			return [...uris, ...(await get(secrets, nonURIs))];
		}

		export function assertURIs(uris: string[]) {
			if (uris.find((i) => !i.startsWith('spotify:track:'))) {
				console.error('Found non-URI input');
				process.exit(1);
			}
			return uris;
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

		export interface TrackAnalysis {
			uri: string;
			name: string;
			analysis: AudioAnalysis;
		}

		export async function get(
			secrets: Types.Secrets,
			ids: string[],
			trackMap: Map<string, string>
		) {
			const analyses: TrackAnalysis[] = [];
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
				)) as unknown) as Types.ExtendedResponse<AudioAnalysis>).json();

				analyses.push({
					uri: id,
					name: trackMap.get(id)!,
					analysis: res,
				});
			}
			return analyses;
		}
	}

	export namespace Playing {
		export async function getDevices(
			secrets: Types.Secrets
		): Promise<Types.Device[]> {
			const devices = await (
				await API.req<Types.Devices>(
					'get',
					'me/player/devices',
					secrets
				)
			).json();
			const validDevices = devices.devices.filter(
				(d) => d.id && !d.is_restricted && d.type === 'Computer'
			);
			if (validDevices.length === 0) {
				console.warn(
					'No valid devices found, retrying in 15 seconds...'
				);
				await ProgressBar.awaitTimeBar(15 * 1000);
				return await getDevices(secrets);
			}
			return validDevices;
		}

		export async function play(
			URIs: string[],
			devices: Types.Device[],
			secrets: Types.Secrets
		): Promise<void> {
			await API.req<Types.Playlist>(
				'PUT',
				`me/player/play?device_id=${devices[0].id}`,
				secrets,
				{
					body: JSON.stringify({
						uris: [BRABANT, ...URIs],
					}),
				}
			);
		}

		export async function getTracks(
			URIs: string[],
			secrets: Types.Secrets
		): Promise<Types.Track[]> {
			const tracks = await (
				await API.req<Types.Tracks>(
					'GET',
					`tracks?ids=${[BRABANT, ...URIs]
						.map((t) => t.slice('spotify:track:'.length))
						.join(',')}`,
					secrets
				)
			).json();

			return tracks.tracks;
		}
	}
}
