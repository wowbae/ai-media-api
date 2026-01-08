// конфиги бота
export interface IUserbotConfig {
	apiId: number;
	apiHash: string;
	sessionString?: string;
	phoneNumber?: string;
	code?: string;
	password?: string;
}

// моя вторая симка
export const config_tinkoff: IUserbotConfig = {
	apiId: parseInt(process.env.USERBOT_APP_ID_TINKOFF || '0'),
	apiHash: process.env.USERBOT_API_HASH_TINKOFF || '',
	sessionString: process.env.USERBOT_SESSION_STRING_TINKOFF || '',
	phoneNumber: process.env.USERBOT_PHONE_NUMBER_TINKOFF || '',
	code: process.env.USERBOT_CODE_TINKOFF || '',
	password: process.env.USERBOT_PASSWORD_TINKOFF || '',
};