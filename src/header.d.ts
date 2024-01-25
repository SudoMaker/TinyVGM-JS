export class Enum {
	constructor();
	add(key: string, id?: number): this;
	[K in keyof Omit<Enum, 'add'>]: number;
}


export const VGM_CMD_LENGTH_TABLE: number[];

export const TinyVGMHeaderField: Enum;

export const TinyVGMMetadataType: Enum;
