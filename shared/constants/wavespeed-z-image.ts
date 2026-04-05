/**
 * Z-Image Turbo Image-to-Image LoRA (Wavespeed): параметр `strength` 0–1.
 * По документации провайдера, **большее** значение = сильнее отход от входного изображения;
 * для сильной опоры на референс используем **низкое** значение по умолчанию.
 */
export const Z_IMAGE_I2I_LORA_DEFAULT_STRENGTH = 0.1 as const;
