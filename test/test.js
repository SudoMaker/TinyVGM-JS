import fs from 'fs'
import { parseVGM } from '../src/main.js'

const readVGMFile = (filePath, loopCount) => {
	fs.readFile(filePath, (err, buffer) => {
		if (err) {
			console.error('Error reading file:', err)
			return
		}

		try {
			const context = parseVGM(buffer, {
				loopCount
			})

			console.log('Context:', context)

			// Example: Displaying header information
			for (const field of context.header) {
				console.log(`Header Field: 0x${(field.type * 4).toString(16).padStart(2, '0')}, Value: 0x${field.data.toString(16).padStart(8, '0')}`)
			}

			if (context.metadata) {
				for (const metaField of context.metadata) {
					const text = new TextDecoder('utf-16le').decode(metaField.data)
					console.log(`Metadata Type: 0x${metaField.type.toString(16).padStart(2, '0')}, Value: ${text}`)
				}
			}

			let lastLoopCount = loopCount

			for (const command of context.commands) {
				if (context.loopCount !== lastLoopCount) {
					console.log('Looped! Loops left:', context.loopCount)
					lastLoopCount = context.loopCount
				}
				if (command.cmd === 0x67) {
					console.log(`DataBlock: 0x${command.type.toString(16).padStart(2, '0')}`, command.data)
				} else {
					console.log(`Command: 0x${command.cmd.toString(16).padStart(2, '0')} Data:`, command.data && [...command.data].map(i => `0x${i.toString(16).padStart(2, '0')}`).join(' '))
				}
			}

			// Add more processing as needed
		} catch (parseError) {
			console.error('Error parsing VGM file:', parseError)
		}
	})
}

// Getting the file path from command line arguments
const args = process.argv.slice(2)

if (args.length === 0) {
	console.log('Usage: node testProgram.js <path-to-vgm-file> [loop-count]')
} else {
	const filePath = args[0]
	const loopCount = args[1]
	readVGMFile(filePath, loopCount === 'Infinity' && Infinity || parseInt(loopCount, 10) || 0)
}
