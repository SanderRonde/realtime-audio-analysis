import fetch, { RequestInit, Response } from 'node-fetch';
import { wait } from './util';

export namespace Req {
	export async function request(
		url: string,
		init?: RequestInit
	): Promise<Response> {
		const res = await fetch(url, init);
		if (res.status === 429) {
			const seconds = ~~res.headers.get('Retry-After')!;
			await wait(seconds * 1000);
			return await request(url, init);
		}
		return res;
	}
}
