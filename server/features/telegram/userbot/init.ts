// инициализируем userbot
import { TelegramClient } from 'telegram';
import { StringSession } from 'telegram/sessions';
import { NewMessage, NewMessageEvent } from 'telegram/events';
import { EntityLike } from 'telegram/define';
import { handleSimpleText } from './handlers/simple.text';
import { config_tinkoff, type IUserbotConfig } from './config';


interface IUserbotClient {
    client: TelegramClient;
    isConnected: boolean;
    isAuthorized: boolean;
}

// вручную загружаем, иначе конфиги пустые остаются
require('dotenv').config();


class UserbotService {
    private static instance: UserbotService | null = null;
    private client: TelegramClient | null = null;
    private isConnected = false;
    private isAuthorized = false;
    private isInitialized = false;
    private newMessageHandlers: {
        handler: (event: NewMessageEvent) => void | Promise<void>;
        builder: NewMessage;
    }[] = [];

    // Статический метод для получения единственного экземпляра
    static async getInstance(config: IUserbotConfig): Promise<UserbotService> {
        if (!this.instance) {
            console.log('Инициализируем новый инстанс');
            this.instance = new UserbotService();
            await this.instance.initializeUserbot(config);
        }
        return this.instance;
    }

    async initializeUserbot(config: IUserbotConfig): Promise<IUserbotClient> {
        if (this.isInitialized) {
            console.log('Юзербот уже инициализирован');
            return {
                client: this.client!,
                isConnected: this.isConnected,
                isAuthorized: this.isAuthorized,
            };
        }

        if (!config.apiId || !config.apiHash) {
            throw new Error(
                'API ID и API Hash обязательны для инициализации юзербота'
            );
        }

        // Создаем сессию
        const session = new StringSession(config.sessionString || '');

        // Инициализируем клиент
        this.client = new TelegramClient(
            session,
            config.apiId,
            config.apiHash,
            {
                connectionRetries: 5,
                timeout: 10000,
                retryDelay: 1000,
                useWSS: false,
                floodSleepThreshold: 60,
                deviceModel: 'Desktop',
                systemVersion: '1.0.0',
                appVersion: '1.0.0',
                langCode: 'ru',
                systemLangCode: 'ru',
            }
        );

        // Подключаемся к Telegram
        await this.client.connect();
        this.isConnected = true;

        // Проверяем авторизацию
        if (!(await this.client.checkAuthorization())) {
            await this.handleAuthorization(config);
        } else {
            this.isAuthorized = true;
        }

        this.isInitialized = true;

        return {
            client: this.client,
            isConnected: this.isConnected,
            isAuthorized: this.isAuthorized,
        };
    }

    private async handleAuthorization(config: IUserbotConfig): Promise<void> {
        if (!this.client) {
            throw new Error('Клиент не инициализирован');
        }

        if (!config.phoneNumber) {
            throw new Error('Номер телефона обязателен для авторизации');
        }

        try {
            // Используем метод start для авторизации
            await this.client.start({
                phoneNumber: async () => config.phoneNumber!,
                phoneCode: async () => {
                    if (!config.code) {
                        const readline = require('readline');
                        const rl = readline.createInterface({
                            input: process.stdin,
                            output: process.stdout,
                        });

                        return new Promise((resolve) => {
                            rl.question('Введите код из Telegram: ', (code) => {
                                rl.close();
                                resolve(code);
                            });
                        });
                    }
                    return config.code;
                },
                password: async () => {
                    if (!config.password) {
                        throw new Error(
                            'Пароль не предоставлен для двухфакторной аутентификации'
                        );
                    }
                    return config.password;
                },
                onError: (err) => {
                    console.error('Ошибка авторизации:', err);
                    throw err;
                },
            });

            this.isAuthorized = true;
        } catch (error) {
            console.error('Ошибка при авторизации:', error);
            throw error;
        }
    }

    async getSessionString(): Promise<string> {
        if (!this.client) {
            throw new Error('Клиент не инициализирован');
        }

        return this.client.session.save() as unknown as string;
    }

    async disconnect(): Promise<void> {
        if (this.client && this.isConnected) {
            await this.client.disconnect();
            this.isConnected = false;
            this.isAuthorized = false;
            this.isInitialized = false;
        }
    }

    async destroy(): Promise<void> {
        if (this.client && this.isConnected) {
            await this.client.disconnect();
            await this.client.destroy();
            this.isConnected = false;
            this.isAuthorized = false;
            this.isInitialized = false;
        }
    }

    getClient(): TelegramClient | null {
        return this.client;
    }

    getConnectionStatus(): {
        isConnected: boolean;
        isAuthorized: boolean;
        isInitialized: boolean;
    } {
        return {
            isConnected: this.isConnected,
            isAuthorized: this.isAuthorized,
            isInitialized: this.isInitialized,
        };
    }

    // Подписка на новые сообщения (userbot)
    public onNewMessage(
        handler: (event: NewMessageEvent) => void | Promise<void>,
        params?: {
            chats?: EntityLike[];
            fromUsers?: EntityLike[];
        }
    ): void {
        if (!this.client) {
            throw new Error('Клиент не инициализирован');
        }

        const builder = new NewMessage({
            chats: params?.chats,
            fromUsers: params?.fromUsers,
        });

        this.client.addEventHandler(handler, builder);
        this.newMessageHandlers.push({ handler, builder });
    }

    // Отписка от новых сообщений
    public offNewMessage(
        handler: (event: NewMessageEvent) => void | Promise<void>
    ): void {
        if (!this.client) {
            throw new Error('Клиент не инициализирован');
        }

        const found = this.newMessageHandlers.find(
            (h) => h.handler === handler
        );
        if (!found) return;

        this.client.removeEventHandler(handler, found.builder);
        this.newMessageHandlers = this.newMessageHandlers.filter(
            (h) => h.handler !== handler
        );
    }
}

// Экспортируем функцию инициализации (Singleton)
async function initializeUserbot(
    config: IUserbotConfig
): Promise<UserbotService> {
    return await UserbotService.getInstance(config);
}

// запуск бота
export async function startUserBot() {
    const telegram = await initializeUserbot(config_tinkoff);
    const userbot = telegram.getClient();
    if (!userbot) {
        throw new Error('Ошибка получения клиента телеграм');
    }

    handleSimpleText(telegram);

    return {
        telegram,
        userbot,
    };
}

// Экспортируем класс для более детального управления
export { UserbotService, IUserbotConfig, IUserbotClient };
