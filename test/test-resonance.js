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

const sampleConvert = (srcSampleCount) => Math.round((srcSampleCount / 44100) * 49716)

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

const queueSamples = (samples) => new Promise((resolve) => {
	const queue = () => {
		if (audioDevice.getQueuedSize() < (49716 * 4) / 1000 * 100) {
			audioDevice.queue(samples)
			resolve()
		} else {
			setTimeout(queue, 50)
		}
	}

	queue()
})

const playCommands = async (commands) => {
	for (const command of commands) {
		let newSamples = 0
		switch (command.cmd) {
			case 0x5a:
			case 0x5e:
				opl3.writeRegBuffered(command.data[0], command.data[1])
				break
			case 0x5f:
				opl3.writeRegBuffered(command.data[0] | 0x100, command.data[1])
				break
			case 0x61:
				newSamples = command.data[0] | (command.data[1] << 8)
				break
			case 0x62:
				newSamples = 735
				break
			case 0x63:
				newSamples = 882
				break
			default:
				// eslint-disable-next-line max-depth
				if (command.cmd >= 0x70 && command.cmd < 0x80) {
					newSamples = (command.cmd & 0xf) + 1
				}
		}

		if (newSamples) {
			// resampler.write(opl3.generateStream(sampleConvert(newSamples)));
			await queueSamples(opl3.generateStream(sampleConvert(newSamples)))
		}
		// console.log(
		// 	`Command: 0x${command.cmd.toString(16).padStart(2, '0')} Data:`,
		// 	command.data && [...command.data].map((i) => `0x${i.toString(16).padStart(2, '0')}`).join(' ')
		// )
	}

	while (audioDevice.getQueuedSize() > 0) {
		await sleep(20)
	}
}

const readVGMFile = (filePath, _loopCount) => {
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

			for (const field of context.header) {
				console.log(
					`Header Field: 0x${(field.type * 4).toString(16).padStart(2, '0')}, Value: 0x${field.data
						.toString(16)
						.padStart(8, '0')}`
				)
			}

			if (context.extraHeader) {
				console.log('Extra Header:', context.extraHeader)
			}

			if (context.metadata) {
				for (const metaField of context.metadata) {
					console.log(`Metadata Type: 0x${metaField.type.toString(16).padStart(2, '0')}, Value`, metaField.data)
				}
			}

			playCommands(context.commands)
			.then(() => {
				console.log('Done playing.')
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
	console.log(`Usage: resonance ${process.argv[1]} <path-to-opl3-vgm-file> [loop-count]`)
} else {
	const filePath = args[0]
	const loopCount = args[1]
	readVGMFile(filePath, (loopCount === 'Infinity' && Infinity) || parseInt(loopCount, 10) || 0)
}

process.on('SIGINT', () => {
	// eslint-disable-next-line no-process-exit
	process.exit(0)
})

setInterval(_ => _, 1000)
