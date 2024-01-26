import { TinyVGMHeaderField, TinyVGMMetadataType } from './header'

export interface TinyVGMExtraHeader {
	clock: Array<{ chipID: number; clk: number }>
	volume: Array<{ chipID: number; flags: number; relative: boolean; vol: number }>
}

export interface TinyVGMContext {
	version: number
	loopCount: number
	hasLoop: boolean
	totalSamples: number
	loopSamples: number
	skipUnknownCommand: boolean
	onLoop?: (remainingLoops: number) => void
	header: Generator<{ type: TinyVGMHeaderField; data: number }>
	extraHeader: TinyVGMExtraHeader | null
	metadata: Generator<{ type: TinyVGMMetadataType; data: Uint8Array }> | null
	commands: Generator<{ cmd: number; type?: number; data?: Uint8Array }>
}

export interface ParseOptions {
	loopCount?: number
	skipUnknownCommand?: boolean
	onLoop?: (remainingLoops: number) => void
}

export function parseVGM(buf: ArrayBuffer | DataView, options?: ParseOptions): TinyVGMContext

export * from './header'
