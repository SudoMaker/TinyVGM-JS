import {
	VGM_CMD_LENGTH_TABLE,
	TinyVGMHeaderField,
	TinyVGMMetadataType,
} from './header.js'

const HEADER_IDENTITY = TinyVGMHeaderField.Identity * 4
const HEADER_EOF_OFFSET = TinyVGMHeaderField.EoF_Offset * 4
const HEADER_VER_OFFSET = TinyVGMHeaderField.Version * 4
const HEADER_GD3_OFFSET = TinyVGMHeaderField.GD3_Offset * 4
const HEADER_DAT_OFFSET = TinyVGMHeaderField.Data_Offset * 4
const HEADER_LOOP_OFFSET = TinyVGMHeaderField.Loop_Offset * 4
const HEADER_LOOP_SAMPLES = TinyVGMHeaderField.Loop_Samples * 4

const parseHeader = function *(view, end) {
	let type = TinyVGMHeaderField.EoF_Offset

	while (type < end) {
		const data = view.getUint32(type * 4, true)
		const ret = { type, data }
		yield ret
		type += 1
	}
}

const parseMetadata = function *(view, startOffset) {
	let cursor = startOffset

	if (view.getUint32(cursor, true) !== 0x20336447) {
		throw new TypeError(`Invalid GD3 Identity: 0x${view.getUint32(cursor).toString(16)}`)
	}
	cursor += 4

	const version = view.getUint32(cursor, true)
	console.log(`GD3 version: 0x${version.toString(16).padStart(8, '0')}`)
	cursor += 4

	const length = view.getUint32(cursor, true)
	if (!length) return
	cursor += 4

	const end = cursor + length

	let type = TinyVGMMetadataType.Title_EN

	while (cursor < end) {
		if (type >= TinyVGMMetadataType.MAX) throw new TypeError(`Unkonwn VGM GD3 metadata type: 0x${type.toString(16).padStart(2, '0')}`)

		let readLength = 0
		while (view.getUint16(cursor + readLength, true)) {
			readLength += 2
		}

		const ret = { type, data: new Uint8Array(view.buffer, cursor, readLength) }
		yield ret

		cursor += readLength + 2
		type += 1
	}
}

const parseCommands = function *(view, { commandOffset, eofOffset, loopOffset, loopSamples }, ctx) {
	let cursor = commandOffset

	let loopSamplesCount = 0

	while (cursor < eofOffset) {
		const cmd = view.getUint8(cursor)
		if (cmd === 0x66) return

		const cmdLength = VGM_CMD_LENGTH_TABLE[cmd]

		if (cmdLength === -1) {
			const errorMsg = `Unknown VGM command 0x${cmd.toString(16).padStart(2, '0')}`
			if (ctx.skipUnknownCommand) {
				cursor += 1
				console.log(`${errorMsg}, skipped`)
				// eslint-disable-next-line no-continue
				continue
			} else {
				throw new TypeError(errorMsg)
			}
		}

		if (cmdLength === -2) {
			cursor += 6
			if (cursor >= eofOffset) throw new RangeError('Unexpected end of VGM datablock')

			const type = view.getUint8(cursor - 4)
			const dataLength = view.getUint32(cursor - 3, true)

			const cursorNext = cursor + dataLength
			if (cursorNext >= eofOffset) throw new RangeError('Unexpected end of VGM datablock')

			const data = new Uint8Array(view.buffer, cursor, dataLength)

			const ret = { cmd, type, data }
			yield ret

			cursor = cursorNext
		} else {
			const _cursor = cursor
			const ret = { cmd }
			if (cmdLength > 0) {
				const cursorNext = cursor + 1 + cmdLength
				if (cursorNext >= eofOffset) throw new RangeError('Unexpected end of VGM commands')

				const data = new Uint8Array(view.buffer, cursor + 1, cmdLength)
				ret.data = data

				cursor = cursorNext
			} else {
				cursor += 1
			}

			if (_cursor >= loopOffset) {
				switch (cmd) {
					case 0x61: {
						loopSamplesCount += ret.data[0] + ret.data[1] << 8
						break
					}
					case 0x62: {
						loopSamplesCount += 735
						break
					}
					case 0x63: {
						loopSamplesCount += 882
						break
					}
					default: {
						// eslint-disable-next-line max-depth
						if (cmd >= 0x70 && cmd < 0x80) {
							loopSamplesCount += cmd - 0x70
						} else if (cmd >= 0x80 && cmd < 0x90) {
							loopSamplesCount += cmd - 0x80
						}
					}
				}

				if (ctx.loop && loopSamplesCount >= loopSamples) {
					cursor = loopOffset
					loopSamplesCount = 0
				}
			}

			yield ret
		}
	}
}

const toDataView = (buf) => {
	if (buf instanceof DataView) return
	return buf.buffer ? new DataView(buf.buffer, buf.byteOffset, buf.byteOffset + buf.byteLength) : new DataView(buf)
}

export const parseVGM = (buf, options = {}) => {
	const vgmView = toDataView(buf)

	if (vgmView.getUint32(HEADER_IDENTITY, true) !== 0x206d6756) {
			throw new TypeError('Invalid VGM Identity')
	}

	if (buf.byteLength < 0x40) {
		throw new RangeError('Corrupted VGM file')
	}

	const eofOffset = vgmView.getUint32(HEADER_EOF_OFFSET, true) + HEADER_EOF_OFFSET
	const version = vgmView.getUint32(HEADER_VER_OFFSET, true)

	let headerSize = TinyVGMHeaderField.MAX

	if (version < 0x00000101) {
		headerSize = TinyVGMHeaderField.Rate
	} else if (version < 0x00000110) {
		headerSize = TinyVGMHeaderField.YM2612_Clock
	} else if (version < 0x00000150) {
		headerSize = TinyVGMHeaderField.Data_Offset
	} else if (version < 0x00000151) {
		headerSize = TinyVGMHeaderField.SegaPCM_Clock
	}

	const gd3Offset = vgmView.getUint32(HEADER_GD3_OFFSET, true) + HEADER_GD3_OFFSET

	let loopOffset = vgmView.getUint32(HEADER_LOOP_OFFSET, true) + HEADER_LOOP_OFFSET
	// Handle malformed loop offset for files from some VGM generators
	if (loopOffset >= eofOffset) loopOffset = 0

	const loopSamples = vgmView.getUint32(HEADER_LOOP_SAMPLES, true)

	let commandOffset = 0x40

	if (version >= 0x0150) {
		commandOffset = vgmView.getUint32(HEADER_DAT_OFFSET, true) + HEADER_DAT_OFFSET
		if (commandOffset < 0x40) throw RangeError('Invalid VGM data offset')
	}

	if (commandOffset < headerSize * 4) {
		headerSize = Math.floor(commandOffset / 4)
	}

	const ctx = {
		loop: false,
		skipUnknownCommand: false,
		...options
	}

	ctx.header = parseHeader(vgmView, headerSize)
	ctx.metadata = gd3Offset && parseMetadata(vgmView, gd3Offset) || null
	ctx.commands = parseCommands(vgmView, { commandOffset, eofOffset, loopOffset, loopSamples }, ctx)

	return ctx
}

export * from './header.js'
