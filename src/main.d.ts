import { TinyVGMHeaderField, TinyVGMMetadataType } from './header'

export interface TinyVGMContext {
	version: number
	loopCount: number
	hasLoop: boolean
	totalSamples: number
	loopSamples: number
	skipUnknownCommand: boolean
	header: Generator<{ type: TinyVGMHeaderField; data: number }>
	metadata: Generator<{ type: TinyVGMMetadataType; data: Uint8Array }> | null
	commands: Generator<{ cmd: number; type?: number; data?: Uint8Array }>
}

export interface ParseOptions {
	loopCount?: number
	skipUnknownCommand?: boolean
}

export function parseVGM(buf: ArrayBuffer | DataView, options?: ParseOptions): TinyVGMContext

export * from './header'
