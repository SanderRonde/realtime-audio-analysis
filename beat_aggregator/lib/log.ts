import * as chalk from 'chalk';

function getTime() {
	return chalk.bold(`[${new Date().toLocaleString()}]`);
}

export class ProgressLogger {
	private _progress: number = 0;
	private _startTime = Date.now();

	constructor(private _name: string, private _max: number) {}

	private _getProgressBar() {
		if (this._max - this._progress < 0) {
			console.log(
				chalk.red('Increment got called more often than configured')
			);
		}
		return `[${new Array(this._progress).fill('*').join('')}${new Array(
			this._max - this._progress
		)
			.fill(' ')
			.join('')}]`;
	}

	logInitial() {
		console.log(
			chalk.bgBlack(
				getTime(),
				chalk.bgBlack(
					chalk.bold(
						chalk.white(`${this._name}: ${this._getProgressBar()}`)
					)
				)
			)
		);
	}

	increment(name: string) {
		this._progress++;
		console.log(
			chalk.bgBlack(
				getTime(),
				chalk.bgBlack(
					chalk.bold(
						chalk.white(
							`${this._name}: ${this._getProgressBar()} - `
						),
						chalk.green('✔'),
						chalk.white(name)
					)
				)
			)
		);
	}

	done() {
		if (this._progress > this._max) {
			console.log(
				chalk.red('Increment got called more often than configured')
			);
		} else if (this._progress < this._max) {
			console.log(
				chalk.red('Increment got called less times than configured')
			);
		}

		console.log(
			chalk.bgBlack(
				getTime(),
				chalk.bgBlack(
					chalk.bold(
						`Done loading ${this._name} in ${
							Date.now() - this._startTime
						}ms`
					)
				)
			)
		);
	}
}
