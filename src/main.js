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
const HEADER_TOTAL_SAMPLES = TinyVGMHeaderField.Total_Samples * 4
const HEADER_EXTRA_OFFSET = TinyVGMHeaderField.ExtraHeader_Offset * 4

let _print = (msg) => console.log(msg)
export const setPrint = (fn) => {
	_print = fn
}

const parseHeader = function *(view, end) {
	let type = TinyVGMHeaderField.Identity

	while (type < end) {
		const data = view.getUint32(type * 4, true)
		const ret = { type, data }
		yield ret
		type += 1
	}
}

const parseExtraHeader = function (view, startOffset) {
	const size = view.getUint32(startOffset, true)
	const clock = []
	const volume = []

	if (size >= 8) {
		const clockRelOffset = view.getUint32(startOffset + 4, true)
		if (clockRelOffset >= 4) {
			const count = view.getUint8(startOffset + 4 + clockRelOffset)
			if (count) {
				const baseOffset = startOffset + 4 + clockRelOffset + 1
				for (let i = 0; i < count; i++) {
					const itemOffset = baseOffset + i * 5
					const chipID = view.getUint8(itemOffset)
					const clk = view.getUint32(itemOffset + 1, true)
					clock.push({ chipID, clk })
				}
			}
		}

		if (size >= 12 && (clockRelOffset && clockRelOffset >= 8) || !clockRelOffset) {
			const volRelOffset = view.getUint32(startOffset + 8, true)
			if (volRelOffset >= 4) {
				const count = view.getUint8(startOffset + 8 + clockRelOffset)
				if (count) {
					const baseOffset = startOffset + 8 + clockRelOffset + 1
					// eslint-disable-next-line max-depth
					for (let i = 0; i < count; i++) {
						const itemOffset = baseOffset + i * 4
						const chipID = view.getUint8(itemOffset)
						const flags = view.getUint8(itemOffset + 1)
						const volRaw = view.getUint16(itemOffset + 2, true)
						const relative = !!(volRaw & 0x8000)
						const vol = volRaw & 0x7FFF
						volume.push({ chipID, flags, relative, vol })
					}
				}
			}
		}
	}

	return {
		clock,
		volume
	}
}

const parseMetadata = function *(view, startOffset) {
	let cursor = startOffset

	if (view.getUint32(cursor, true) !== 0x20336447) {
		throw new TypeError(`Invalid GD3 Identity: 0x${view.getUint32(cursor).toString(16)}`)
	}
	cursor += 4

	const version = view.getUint32(cursor, true)
	_print(`GD3 version: 0x${version.toString(16).padStart(8, '0')}`)
	cursor += 4

	const length = view.getUint32(cursor, true)
	if (!length) return
	cursor += 4

	const end = cursor + length

	let type = TinyVGMMetadataType.Title_EN

	while (cursor < end) {
		if (type >= TinyVGMMetadataType.MAX) {
			if (view.getUint16(cursor, true)) throw new TypeError(`Unkonwn VGM GD3 metadata type: 0x${type.toString(16).padStart(2, '0')}`)
			return
		}

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

// eslint-disable-next-line complexity
const parseCommands = function *(view, { commandOffset, eofOffset, totalSamples, loopOffset, loopSamples }, ctx) {
	let cursor = commandOffset

	let samplesPlayed = 0
	let loopSamplesPlayed = 0

	while (cursor < eofOffset && samplesPlayed < totalSamples) {
		const cmd = view.getUint8(cursor)
		if (cmd === 0x66) return

		const cmdLength = VGM_CMD_LENGTH_TABLE[cmd]

		if (cmdLength === -1) {
			_print('play', samplesPlayed, loopSamplesPlayed, loopSamples)
			const errorMsg = `Unknown VGM command 0x${cmd.toString(16).padStart(2, '0')} at 0x${cursor.toString(16)}`
			if (ctx.skipUnknownCommand) {
				cursor += 1
				_print(`${errorMsg}, skipped`)
				// eslint-disable-next-line no-continue
				continue
			} else {
				throw new TypeError(errorMsg)
			}
		}


		const _cursor = cursor

		if (cmd === 0x67) {
			cursor += 7
			if (cursor >= eofOffset) throw new RangeError('Unexpected end of VGM datablock')

			const type = view.getUint8(cursor - 5)
			const dataLength = view.getUint32(cursor - 4, true)

			const cursorNext = cursor + dataLength
			if (cursorNext >= eofOffset) throw new RangeError('Unexpected end of VGM datablock')

			const data = new Uint8Array(view.buffer, _cursor, dataLength + 7)

			const ret = { cmd, type, data }
			yield ret

			cursor = cursorNext
		} else {
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

			let sampleIncrement = 0
			switch (cmd) {
				case 0x61: {
					sampleIncrement = ret.data[0] | (ret.data[1] << 8)
					break
				}
				case 0x62: {
					sampleIncrement = 735
					break
				}
				case 0x63: {
					sampleIncrement = 882
					break
				}
				default: {
					// eslint-disable-next-line max-depth
					if (cmd >= 0x70 && cmd < 0x90) {
						sampleIncrement = (cmd & 0x0F) + 1
					}
				}
			}

			if (sampleIncrement) {
				samplesPlayed += sampleIncrement

				ret.sampleIncrement = sampleIncrement

				if (loopSamples && _cursor >= loopOffset) {
					loopSamplesPlayed += sampleIncrement
					// eslint-disable-next-line max-depth
					if (ctx.loopCount > 0 && loopSamplesPlayed >= loopSamples && loopSamples) {
						samplesPlayed -= loopSamplesPlayed
						loopSamplesPlayed = 0
						cursor = loopOffset
						ctx.loopCount -= 1
						// eslint-disable-next-line max-depth
						if (ctx.onLoop) ctx.onLoop(ctx.loopCount)
					}
				}
			}

			ctx.samplesPlayed = samplesPlayed
			ctx.loopSamplesPlayed = loopSamplesPlayed

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
	const totalSamples = vgmView.getUint32(HEADER_TOTAL_SAMPLES, true)

	let loopOffset = vgmView.getUint32(HEADER_LOOP_OFFSET, true) + HEADER_LOOP_OFFSET
	// Handle malformed loop offset for files from some VGM generators
	if (loopOffset >= eofOffset) loopOffset = 0

	const hasLoop = loopOffset - HEADER_LOOP_OFFSET > 0

	let loopSamples = vgmView.getUint32(HEADER_LOOP_SAMPLES, true)

	let commandOffset = 0x40

	if (version >= 0x0150) {
		commandOffset = vgmView.getUint32(HEADER_DAT_OFFSET, true) + HEADER_DAT_OFFSET
		if (commandOffset < 0x40) throw RangeError('Invalid VGM data offset')
	}

	if (commandOffset < headerSize * 4) {
		headerSize = Math.floor(commandOffset / 4)
	}

	let extraHeaderOffset = 0
	if (version >= 0x00000170 && headerSize > TinyVGMHeaderField.ExtraHeader_Offset) {
		extraHeaderOffset = vgmView.getUint32(HEADER_EXTRA_OFFSET, true) + HEADER_EXTRA_OFFSET
	}

	const ctx = {
		version,
		loopCount: 0,
		hasLoop,
		totalSamples,
		loopSamples,
		samplesPlayed: 0,
		loopSamplesPlayed: 0,
		skipUnknownCommand: false,
		...options
	}

	// Invalid or no loop
	if (loopOffset < commandOffset) {
		if (hasLoop) _print(`Invalid loop offset 0x${loopOffset.toString(16)}! Changing to data offset...`)
		loopOffset = commandOffset
		loopSamples = totalSamples
	}

	if (!loopSamples) {
		loopSamples = totalSamples
	}

	ctx.header = () => parseHeader(vgmView, headerSize)
	ctx.extraHeader = extraHeaderOffset && (() => parseExtraHeader(vgmView, extraHeaderOffset)) || null
	ctx.metadata = gd3Offset && (() => parseMetadata(vgmView, gd3Offset)) || null
	ctx.commands = (loops = ctx.loopCount) => {
		ctx.loopCount = loops
		return parseCommands(vgmView, { commandOffset, eofOffset, totalSamples, loopOffset, loopSamples }, ctx)
	}

	return ctx
}

export * from './header.js'
