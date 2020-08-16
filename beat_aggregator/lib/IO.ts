import { ANALYSIS_DATA_FILE } from './constants';
import { Spotify } from './spotify';
import * as fs from 'fs-extra';

export namespace IO {
	export namespace Input {
		async function readStdIn() {
			return new Promise<string[]>((resolve) => {
				let data: string = '';
				const stdin = process.openStdin();
				stdin.on('data', (chunk) => {
					data += chunk.toString();
				});
				stdin.on('end', () => {
					resolve(data.split('\n').filter((i) => i.length));
				});
			});
		}

		export async function getInput() {
			const input: string[] = [];
			for (let i = 2; i < process.argv.length; i++) {
				const str = process.argv[i];
				if (str !== '-') {
					input.push(str);
				} else {
					input.push(...(await readStdIn()));
					break;
				}
			}
			return input;
		}
	}

	export namespace Output {
		export async function exportAnalyses(
			analyses: Spotify.Analysis.AudioAnalysis[]
		) {
			await fs.writeFile(ANALYSIS_DATA_FILE, JSON.stringify(analyses), {
				encoding: 'utf8',
			});
		}
	}
}
