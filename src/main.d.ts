import { TinyVGMHeaderField, TinyVGMMetadataType } from './header'

export interface TinyVGMContext {
	loop: boolean
	skipUnknownCommand: boolean
	header: Generator<{ type: TinyVGMHeaderField; data: number }>
	metadata: Generator<{ type: TinyVGMMetadataType; data: Uint8Array }> | null
	commands: Generator<{ cmd: number; type?: number; data?: Uint8Array }>
}

export interface ParseOptions {
	loop?: boolean
	skipUnknownCommand?: boolean
}

export function parseVGM(buf: ArrayBuffer | DataView, options?: ParseOptions): TinyVGMContext

export * from './header'
