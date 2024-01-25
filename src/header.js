export const Enum = class Enum {
	constructor() {
		this._id = 0
	}

	add(key, id = this._id) {
		if (!key) return this

		this._id = id + 1

		this[key] = id

		return this
	}
}

// prettier-ignore
export const VGM_CMD_LENGTH_TABLE = [
// 0   1   2   3   4   5   6   7   8   9   A   B   C   D   E   F
	-1,	-1,	-1,	-1,	-1,	-1,	-1,	-1,	-1,	-1,	-1,	-1,	-1,	-1,	-1,	-1,	// 00 - 0F
	-1,	-1,	-1,	-1,	-1,	-1,	-1,	-1,	-1,	-1,	-1,	-1,	-1,	-1,	-1,	-1,	// 10 - 1F
	-1,	-1,	-1,	-1,	-1,	-1,	-1,	-1,	-1,	-1,	-1,	-1,	-1,	-1,	-1,	-1,	// 20 - 2F
	-1,	1,	-1,	-1,	-1,	-1,	-1,	-1,	-1,	-1,	-1,	-1,	-1,	-1,	-1,	-1,	// 30 - 3F
	2,	-1,	-1,	-1,	-1,	-1,	-1,	-1,	-1,	-1,	-1,	-1,	-1,	-1,	-1,	1,	// 40 - 4F
	1,	2,	2,	2,	2,	2,	2,	2,	2,	2,	2,	2,	2,	2,	2,	2,	// 50 - 5F
	-1,	2,	0,	0,	-1,	-1,	0,	-2,	11,	-1,	-1,	-1,	-1,	-1,	-1,	-1,	// 60 - 6F
	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	// 70 - 7F
	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	// 80 - 8F
	4,	4,	5,	10,	1,	4,	-1,	-1,	-1,	-1,	-1,	-1,	-1,	-1,	-1,	-1,	// 90 - 9F
	2,	2,	2,	2,	2,	2,	2,	2,	2,	2,	2,	2,	2,	2,	2,	2,	// A0 - AF
	2,	2,	2,	2,	2,	2,	2,	2,	2,	2,	2,	2,	2,	2,	2,	2,	// B0 - BF
	3,	3,	3,	3,	3,	3,	3,	3,	3,	-1,	-1,	-1,	-1,	-1,	-1,	-1,	// C0 - CF
	3,	3,	3,	3,	3,	3,	3,	-1,	-1,	-1,	-1,	-1,	-1,	-1,	-1,	-1,	// D0 - DF
	4,	4,	-1,	-1,	-1,	-1,	-1,	-1,	-1,	-1,	-1,	-1,	-1,	-1,	-1,	-1,	// E0 - EF
	-1,	-1,	-1,	-1,	-1,	-1,	-1,	-1,	-1,	-1,	-1,	-1,	-1,	-1,	-1,	-1,	// F0 - FF
]

export const TinyVGMHeaderField = new Enum()
	// 0x00
	.add('Identity')
	.add('EoF_Offset')
	.add('Version')
	.add('SN76489_Clock')
	// 0x10
	.add('YM2413_Clock')
	.add('GD3_Offset')
	.add('Total_Samples')
	.add('Loop_Offset')
	// 0x20
	.add('Loop_Samples')
	.add('Rate')
	.add('SN_Config')
	.add('YM2612_Clock')
	// 0x30
	.add('YM2151_Clock')
	.add('Data_Offset')
	.add('SegaPCM_Clock')
	.add('SPCM_Interface')
	// 0x40
	.add('RF5C68_Clock')
	.add('YM2203_Clock')
	.add('YM2608_Clock')
	.add('YM2610_Clock')
	// 0x50
	.add('YM3812_Clock')
	.add('YM3526_Clock')
	.add('Y8950_Clock')
	.add('YMF262_Clock')
	// 0x60
	.add('YMF278B_Clock')
	.add('YMF271_Clock')
	.add('YMZ280B_Clock')
	.add('RF5C164_Clock')
	// 0x70
	.add('PWM_Clock')
	.add('AY8910_Clock')
	.add('AY_Config')
	.add('Playback_Config')
	// 0x80
	.add('GBDMG_Clock')
	.add('NESAPU_Clock')
	.add('MultiPCM_Clock')
	.add('uPD7759_Clock')
	// 0x90
	.add('OKIM6258_Clock')
	.add('ArcadeChips_Config')
	.add('OKIM6295_Clock')
	.add('K051649_Clock')
	// 0xa0
	.add('K054539_Clock')
	.add('HuC6280_Clock')
	.add('C140_Clock')
	.add('K053260_Clock')
	// 0xb0
	.add('Pokey_Clock')
	.add('QSound_Clock')
	.add('SCSP_Clock')
	.add('ExtraHeader_Offset')
	// 0xc0
	.add('WonderSwan_Clock')
	.add('VSU_Clock')
	.add('SAA1099_Clock')
	.add('ES5503_Clock')
	// 0xd0
	.add('ES5506_Clock')
	.add('ES_Config')
	.add('X1010_Clock')
	.add('C352_Clock')
	// 0xe0
	.add('GA20_Clock')
	.add('Mikey_Clock')
	.add('MAX')

export const TinyVGMMetadataType = new Enum()
	.add('Title_EN')
	.add('Title')
	.add('Album_EN')
	.add('Album')
	.add('SystemName_EN')
	.add('SystemName')
	.add('Composer_EN')
	.add('Composer')
	.add('ReleaseDate')
	.add('Converter')
	.add('Notes')
	.add('MAX')
