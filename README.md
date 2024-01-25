# TinyVGM.js

## Introduction

TinyVGM.js is a JavaScript library for parsing VGM (Video Game Music) files. It provides tools to read and interpret the header, metadata, and commands from VGM files, making it easier to work with this audio file format in JavaScript environments.

See the C implementation of [TinyVGM](https://github.com/SudoMaker/TinyVGM)

## Installation

```bash
npm install tinyvgm
```

## Usage

Here's a basic example of how to use TinyVGM.js to parse a VGM file:

```javascript
import { parseVGM } from 'tinyvgm'

// Assuming you have a VGM file loaded into an ArrayBuffer 'vgmBuffer'
const context = parseVGM(vgmBuffer)

// Accessing header, metadata, and commands
for (const field of context.header) {
	console.log(`Header Field: ${field.type}, Value: ${field.data}`)
}

if (context.metadata) {
	for (const metaField of context.metadata) {
		const text = new TextDecoder('utf-16le').decode(metaField.data)
		console.log(`Metadata Type: ${metaField.type}, Value: ${text}`)
	}
}

for (const command of context.commands) {
	console.log(`Command: ${command.cmd}`)
	if (command.data) {
		console.log(`Data:`, command.data)
	}
}
```

## API Documentation

### `TinyVGMContext`

The context object returned by the `parseVGM` function, containing parsed data from the VGM file.

- **loopCount**: Indicates how many times left to loop the playback. _Change this value to `0` to disable loop while playing._
- **hasLoop**: Indicates whether the VGM file contains loop.
- **totalSamples**: Total sample count of the VGM file. One sample is 1/44100 seconds.
- **loopSamples**: Looped sample count of the VGM file. One sample is 1/44100 seconds.
- **skipUnknownCommand**: Indicates whether to skip unknown commands during parsing.
- **header**: Generator yielding header information.
- **metadata**: Generator yielding metadata, or `null` if not present.
- **commands**: Generator yielding command data.

### `ParseOptions`

Options for parsing the VGM file.

- **loopCount**: Optional. How many times to loop the playback. Set `Infinity` to loop indefinitely.
- **skipUnknownCommand**: Optional. Whether to skip unknown commands during parsing.

#### Note:

- If the VGM file does not contain loop by default, the whole song will be looped if `loopCount` is set.

### `parseVGM(buffer: ArrayBuffer | DataView, options?: ParseOptions): TinyVGMContext`

Parses a VGM file and returns a context object containing the parsed data.

- **buffer**: The VGM file data as an `ArrayBuffer` or `DataView`.
- **options**: Optional. Configuration options for parsing.

### Classes

#### `Enum`

A utility class for creating enumerative types.

#### Methods

- `add(key: string, id?: number)`: Adds a new enumeration key.

### Constants

- `VGM_CMD_LENGTH_TABLE`: Array representing the lengths of various VGM commands.
- `TinyVGMHeaderField`: Enumeration of VGM header fields.
- `TinyVGMMetadataType`: Enumeration of VGM metadata types.

## Detailed Usage

### 1. `header`

The `header` generator yields information about the VGM file header. Each iteration returns an object with `type` and `data` properties.

#### Example:

```javascript
import { parseVGM } from 'tinyvgm'

// Load your VGM file into an ArrayBuffer `vgmBuffer`
const { header } = parseVGM(vgmBuffer)

for (const field of header) {
	console.log(`Header Field: ${field.type}, Value: ${field.data}`)
}
```

### 2. `metadata`

The `metadata` generator yields metadata from the GD3 tag of the VGM file, if present. Each iteration provides an object with `type` and `data` properties, where `data` is a `Uint8Array` representing a string in UTF-16.

#### Example:

```javascript
import { parseVGM } from 'tinyvgm'

const { metadata } = parseVGM(vgmBuffer)

if (metadata) {
	const decoder = new TextDecoder('utf-16le')

	for (const metaField of metadata) {
		// Convert Uint8Array to a UTF-16 encoded string
		const text = decoder.decode(metaField.data)
		console.log(`Metadata Type: ${metaField.type}, Value: ${text}`)
	}
}
```

### 3. `commands`

The `commands` generator yields the commands found within the VGM file. Each command is represented as an object containing `cmd` and optionally `type` and `data` properties.

#### Example:

```javascript
import { parseVGM } from 'tinyvgm'

const { commands } = parseVGM(vgmBuffer)

for (const command of commands) {
	if (command.cmd === 0x67) {
		// Handling a data block
		console.log(`Data Block Detected`)

		// The type of the data block is indicated by the byte following the 0x66 marker
		if (command.type !== undefined) {
			console.log(`Data Block Type: ${command.type}`)
		}

		// The actual data of the data block
		if (command.data) {
			console.log(`Data Block Length: ${command.data.length}`)
			// Process the data as needed
		}
	} else {
		// Handling other commands
		console.log(`Command: ${command.cmd}`)
		if (command.data) {
			console.log(`Data:`, command.data)
		}
	}
}
```

#### Notes:

- The usage of these generators assumes that you have already loaded a VGM file into an `ArrayBuffer` named `vgmBuffer`.
- The generators yield data lazily, meaning they only process parts of the VGM file as you iterate over them. This can be efficient for large files.
- The `metadata` generator is optional and will only be present if the GD3 tag is found in the VGM file.
- The interpretation of the yielded data (especially command data) will depend on your specific requirements and the VGM file format specification.

## Contributing

Contributions are welcome! Please feel free to submit pull requests or create issues for bugs, feature requests, or improvements.

## License

TinyVGM.js is released under the [MIT License](LICENSE).
