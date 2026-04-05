/** Сколько LoRA одновременно принимают Z-Image Turbo / I2I LoRA и WAN 2.2 I2V LoRA (Wavespeed). */
export const MAX_WAVESPEED_LORA_COUNT = 3 as const;

export type LoraOption = {
    value: string;
    label: string;
    description?: string;
};

export const LORAS: LoraOption[] = [
    {
        value: "https://storage.yandexcloud.net/flexbot/wow_alina_g.safetensors?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Credential=YCAJEkxXIGwURWe3QgSG9GHUp%2F20260405%2Fru-central1%2Fs3%2Faws4_request&X-Amz-Date=20260405T083954Z&X-Amz-Expires=2592000&X-Amz-Signature=8e1c0e5fd687f7c8e1156ba5a74d09b96f76ffa9e99e0b0e188d3c0dfecf3e22&X-Amz-SignedHeaders=host&response-content-disposition=attachment",
        label: "Alina Style v1.0",
        description: "Стиль Alina для портретов",
    },
    {
        value: "https://storage.yandexcloud.net/flexbot/Kodak%20Portra%20400%20zib%20v1.safetensors?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Credential=YCAJEkxXIGwURWe3QgSG9GHUp%2F20260405%2Fru-central1%2Fs3%2Faws4_request&X-Amz-Date=20260405T083638Z&X-Amz-Expires=2592000&X-Amz-Signature=e05acaeb04577d413bb06e0a1cd5a1719bc7f91181f1f223205287026edcdc3f&X-Amz-SignedHeaders=host&response-content-disposition=attachment",
        label: "Kodak Portra 400 zib v1",
        description: "Kodak Portra 400 zib v1",
    },
    {
        value: "https://storage.yandexcloud.net/flexbot/lips-bj_low_noise.safetensors?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Credential=YCAJEkxXIGwURWe3QgSG9GHUp%2F20260405%2Fru-central1%2Fs3%2Faws4_request&X-Amz-Date=20260405T084718Z&X-Amz-Expires=2592000&X-Amz-Signature=70d4f7a69bc87c994090aec11d1cd7a375572ea1a2ef71ee9147dbf0beb3811a&X-Amz-SignedHeaders=host&response-content-disposition=attachment",
        label: "Lips BJ low noise",
        description: "Lips BJ low noise",
    },
    {
        value: "https://civitai.com/api/download/models/67890",
        label: "Realistic Skin v2",
        description: "Реалистичная кожа и текстуры",
    },
];
