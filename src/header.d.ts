export type Enum = {
	add(key: string, id?: number): Enum;
} & Omit<{ [key: string]: number }, 'add'>;

export const VGM_CMD_LENGTH_TABLE: number[];

export const TinyVGMHeaderField: Enum;

export const TinyVGMMetadataType: Enum;
