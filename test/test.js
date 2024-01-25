import fs from 'fs'
import { parseVGM } from '../src/main.js'

const readVGMFile = (filePath) => {
	fs.readFile(filePath, (err, buffer) => {
		if (err) {
			console.error('Error reading file:', err)
			return
		}

		try {
			const context = parseVGM(buffer)

			// Example: Displaying header information
			for (const field of context.header) {
				console.log(`Header Field: 0x${(field.type * 4).toString(16)}, Value: 0x${field.data.toString(16)}`)
			}

			if (context.metadata) {
				for (const metaField of context.metadata) {
					const text = new TextDecoder('utf-16le').decode(metaField.data)
					console.log(`Metadata Type: 0x${metaField.type.toString(16)}, Value: ${text}`)
				}
			}

			for (const command of context.commands) {
				console.log(`Command: 0x${command.cmd.toString(16).padStart(2, '0')} Data:`, command.data && [...command.data].map(i => `0x${i.toString(16).padStart(2, '0')}`).join(' '))
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
	console.log('Usage: node testProgram.js <path-to-vgm-file>')
} else {
	const filePath = args[0]
	readVGMFile(filePath)
}
