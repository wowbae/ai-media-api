import { Client } from "wavespeed";

/**
 * Дефолтный wavespeed SDK: connectionTimeout 10s. Метод upload() берёт
 * min(connectionTimeout, timeout) — большие изображения / LoRA обрываются AbortError.
 */
export function createWavespeedSdkClient(apiKey: string): Client {
    return new Client(apiKey, {
        connectionTimeout: 600,
    });
}
