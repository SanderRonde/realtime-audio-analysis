import * as Bar from 'progress';

export namespace ProgressBar {
	export function awaitTimeBar(
		ms: number,
		parts: {
			name: string;
			duration: number;
		}[] = []
	) {
		return new Promise<void>((resolve) => {
			const seconds = Math.ceil(ms / 1000);
			const bar = new Bar('[:bar] (:percent) - ETA :etas', {
				total: seconds,
			});

			let partIndex: number = 0;
			let currentPart: {
				name: string;
				duration: number;
			}|undefined = parts[partIndex];
			if (currentPart) {
				console.log(`Curent part: ${currentPart.name}`);
			}

			let currentTime: number = 0;
			const interval = setInterval(() => {
				bar.tick();
				currentTime++;
				if (currentPart && currentTime >= currentPart.duration / 1000) {
					partIndex++;
					currentPart = parts[partIndex];
					currentTime = 0;

					if (currentPart) {
						console.log(`Curent part: ${currentPart.name}`);
					}
				}

				if (bar.complete) {
					clearInterval(interval);
					resolve();
				}
			}, 1000);
		});
	}
}
