/*
	This fils needs to be compiled before loading with Resonance
	e.g. `esbuild --bundle test-resonance.js --format=iife > test-compiled.js`
	Then `resonance test-compiled.js`
*/

/* global loadModule */
import { parseVGM } from '../src/main.js'

const fs = loadModule('fs')
const { gunzipSync } = loadModule('zlib')
const { NukedOPL3 } = loadModule('nuked-opl3')
// const { ReSampler } = loadModule('soxr')
const SDL = loadModule('sdl2')

SDL.init(SDL.constants.INIT_VIDEO | SDL.constants.INIT_AUDIO | SDL.constants.INIT_EVENTS)
SDL.enableScreenSaver()

const audioDevice = new SDL.AudioDevice(null, false, { freq: 49716, format: 0x8010 }, true)
audioDevice.pause(false)

const opl3 = new NukedOPL3()
// const resampler = new ReSampler(49716, 96000, 2);

// resampler.on("data", (buf) => {
//   audioDevice.queue(buf);
// });

const codePointAt = (bytes, idx) => {
	const codeUnit = bytes[idx] + (bytes[idx + 1] << 8)
	if (0xd800 <= codeUnit && codeUnit <= 0xdbff && idx + 3 < bytes.length) {
		const secondCodeUnit = bytes[idx + 2] + (bytes[idx + 3] << 8)
		if (0xdc00 <= secondCodeUnit && secondCodeUnit <= 0xdfff) {
			return ((codeUnit - 0xd800) << 10) + secondCodeUnit - 0xdc00 + 0x10000
		}
	}
	return codeUnit
}

const encodeCodePoint = (codePoint) => {
	if (codePoint < 0x80) {
		return String.fromCharCode(codePoint)
	} else if (codePoint < 0x800) {
		return String.fromCharCode(0xc0 | (codePoint >> 6), 0x80 | (codePoint & 0x3f))
	} else if (codePoint < 0x10000) {
		return String.fromCharCode(0xe0 | (codePoint >> 12), 0x80 | ((codePoint >> 6) & 0x3f), 0x80 | (codePoint & 0x3f))
	} else {
		return String.fromCharCode(
			0xf0 | (codePoint >> 18),
			0x80 | ((codePoint >> 12) & 0x3f),
			0x80 | ((codePoint >> 6) & 0x3f),
			0x80 | (codePoint & 0x3f)
		)
	}
}

const utf16leToUtf8 = (uint8Array) => {
	let result = ''
	for (let i = 0; i < uint8Array.length; i += 2) {
		const codePoint = codePointAt(uint8Array, i)
		result += encodeCodePoint(codePoint)
		if (codePoint >= 0x10000) {
			i += 2
		}
	}

	return result
}

const createSampleConvert = (source, target) => {
	let sourceSamplesPlayed = 0
	let targetSamplesPlayed = 0
	return (srcSampleCount) => {
		sourceSamplesPlayed += srcSampleCount
		const newTrgetSamples = Math.round((sourceSamplesPlayed * target) / source)
		const diff = newTrgetSamples - targetSamplesPlayed
		targetSamplesPlayed = newTrgetSamples
		return diff
	}
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

const queueSamples = (samples, bufferTime) =>
	new Promise((resolve) => {
		const queue = () => {
			if (audioDevice.getQueuedSize() < ((49716 * 4) / 1000) * bufferTime) {
				audioDevice.queue(samples)
				resolve()
			} else {
				setTimeout(queue, bufferTime / 3)
				gc()
			}
		}

		queue()
	})

const playCommands = async (commands, bufferTime) => {
	const sampleConvert = createSampleConvert(44100, 49716)
	for (const command of commands()) {
		switch (command.cmd) {
			case 0x5a:
			case 0x5e:
				opl3.writeRegBuffered(command.data[0], command.data[1])
				break
			case 0x5f:
				opl3.writeRegBuffered(command.data[0] | 0x100, command.data[1])
				break
			default:
		}

		if (command.sampleIncrement) {
			// console.log('Increase samples:', command.sampleIncrement)
			// resampler.write(opl3.generateStream(sampleConvert(newSamples)));
			await queueSamples(opl3.generateStream(sampleConvert(command.sampleIncrement)), bufferTime)
		}
		// console.log(
		// 	`Command: 0x${command.cmd.toString(16).padStart(2, '0')} Data:`,
		// 	command.data && [...command.data].map((i) => `0x${i.toString(16).padStart(2, '0')}`).join(' ')
		// )
		//
	}

	while (audioDevice.getQueuedSize() > 0) {
		await sleep(20)
	}
}

const readVGMFile = (filePath, _loopCount, bufferTime) => {
	// eslint-disable-next-line complexity
	fs.readFile(filePath, (err, buffer) => {
		if (err) {
			console.error('Error reading file:', err)
			return
		}

		if (buffer[0] === 0x1f && buffer[1] === 0x8b) {
			buffer = gunzipSync(buffer)
		}

		try {
			const context = parseVGM(buffer, {
				loopCount: _loopCount,
				skipUnknownCommand: true,
				onLoop(count) {
					console.log('Looped! Loops left:', count)
				}
			})

			const { version, loopCount, hasLoop, totalSamples, loopSamples } = context
			console.log('Context:', {
				version: version.toString(16).padStart(8, '0'),
				loopCount,
				hasLoop,
				totalSamples,
				loopSamples
			})

			for (const field of context.header()) {
				console.log(
					`Header Field: 0x${(field.type * 4).toString(16).padStart(2, '0')}, Value: 0x${field.data
						.toString(16)
						.padStart(8, '0')}`
				)
			}

			if (context.extraHeader) {
				console.log('Extra Header:', context.extraHeader())
			}

			if (context.metadata) {
				for (const metaField of context.metadata()) {
					console.log(
						`Metadata Type: 0x${metaField.type.toString(16).padStart(2, '0')}, Value: ${utf16leToUtf8(metaField.data)}`
					)
				}
			}

			playCommands(context.commands, bufferTime)
				.then(() => {
					console.log('Done playing.')
				})
				.then(sleep(bufferTime * 2))
				.finally(() => {
					// eslint-disable-next-line no-process-exit
					process.exit(0)
				})
		} catch (parseError) {
			console.error('Error parsing VGM file:', parseError)
		}
	})
}

// Getting the file path from command line arguments
const args = process.argv.slice(2)

if (args.length === 0) {
	console.log(`Usage: resonance ${process.argv[1]} <path-to-opl3-vgm-file> [loop-count] [buffer-ms]`)
} else {
	const filePath = args[0]
	const loopCount = args[1]
	const bufferTime = args[2]
	readVGMFile(filePath, (loopCount < 0 && Infinity) || parseInt(loopCount, 10) || 0, parseInt(bufferTime, 10) || 100)
}

process.on('SIGINT', () => {
	// eslint-disable-next-line no-process-exit
	process.exit(0)
})

setInterval((_) => _, 1000)
