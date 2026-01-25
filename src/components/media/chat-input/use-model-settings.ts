// Хук для управления настройками модели генерации
import { useState, useEffect, useRef } from 'react';
import type { MediaModel } from '@/redux/api/base';
import { loadMediaSettings, saveMediaSettings, type MediaSettings } from '@/lib/media-settings';
import { getModelSettingsConfig } from './model-settings-config';
import { useModelType } from '@/hooks/use-model-type';

export interface ModelSettingsState {
    format: '1:1' | '4:3' | '3:4' | '9:16' | '16:9' | '2:3' | '3:2' | '21:9' | undefined;
    quality: '1k' | '2k' | '4k' | undefined;
    duration: 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | undefined;
    veoGenerationType: 'TEXT_2_VIDEO' | 'FIRST_AND_LAST_FRAMES_2_VIDEO' | 'REFERENCE_2_VIDEO' | 'EXTEND_VIDEO' | undefined;
    sound: boolean | undefined;
    negativePrompt: string;
    seed: string | number | undefined;
    cfgScale: number | undefined;
    // ElevenLabs параметры
    voice: string;
    stability: number;
    similarityBoost: number;
    speed: number;
    languageCode: string;
}

const DEFAULT_SETTINGS: ModelSettingsState = {
    format: undefined,
    quality: undefined,
    duration: undefined,
    veoGenerationType: undefined,
    sound: undefined,
    negativePrompt: '',
    seed: undefined,
    cfgScale: undefined,
    voice: 'Rachel',
    stability: 0.7,
    similarityBoost: 0.75,
    speed: 1,
    languageCode: '',
};

export function useModelSettings(currentModel: MediaModel) {
    const modelType = useModelType(currentModel);
    const config = getModelSettingsConfig(currentModel);

    const [settings, setSettings] = useState<ModelSettingsState>(DEFAULT_SETTINGS);
    const isInitialMount = useRef(true);

    // Загружаем настройки из localStorage при монтировании или смене модели
    useEffect(() => {
        const storedSettings = loadMediaSettings();
        const newSettings: ModelSettingsState = { ...DEFAULT_SETTINGS };

        // Загружаем format (универсальный для всех моделей)
        if (storedSettings.format) {
            newSettings.format = storedSettings.format;
        } else if (modelType.isVeo && storedSettings.videoFormat) {
            // Для Veo используем videoFormat из старых настроек
            newSettings.format = storedSettings.videoFormat;
        } else if (
            (modelType.isKling || modelType.isKling25) &&
            storedSettings.klingAspectRatio
        ) {
            // Для Kling используем klingAspectRatio из старых настроек
            newSettings.format = storedSettings.klingAspectRatio;
        } else if (config.format?.defaultValue) {
            newSettings.format = config.format.defaultValue;
        }

        // Загружаем quality
        if (storedSettings.quality) {
            newSettings.quality = storedSettings.quality;
        } else if (config.quality?.defaultValue) {
            newSettings.quality = config.quality.defaultValue;
        }

        // Загружаем veoGenerationType
        if (modelType.isVeo && storedSettings.veoGenerationType) {
            newSettings.veoGenerationType = storedSettings.veoGenerationType;
        } else if (config.generationType?.defaultValue) {
            newSettings.veoGenerationType = config.generationType.defaultValue;
        }

        // Загружаем duration (только для Kling)
        if (storedSettings.klingDuration) {
            newSettings.duration = storedSettings.klingDuration;
        } else if (config.duration?.defaultValue) {
            newSettings.duration = config.duration.defaultValue;
        }

        // Загружаем sound (только для Kling)
        if (storedSettings.klingSound !== undefined) {
            newSettings.sound = storedSettings.klingSound;
        } else if (config.sound?.defaultValue !== undefined) {
            newSettings.sound = config.sound.defaultValue;
        }

        setSettings(newSettings);
        isInitialMount.current = true;
    }, [currentModel, modelType, config]);

    // Сохраняем настройки при изменении (пропускаем первую загрузку)
    useEffect(() => {
        if (isInitialMount.current) {
            isInitialMount.current = false;
            return;
        }

        // Сохраняем настройки в зависимости от модели
        if (modelType.isVeo) {
            // Для Veo сохраняем в videoFormat
            saveMediaSettings({
                videoFormat:
                    settings.format && settings.format !== '1:1'
                        ? (settings.format as '16:9' | '9:16')
                        : undefined,
                veoGenerationType: settings.veoGenerationType,
            } as MediaSettings);
        } else if (modelType.isKling || modelType.isKling25) {
            // Для Kling сохраняем в klingAspectRatio, klingDuration, klingSound
            saveMediaSettings({
                klingAspectRatio:
                    settings.format && settings.format !== '1:1'
                        ? (settings.format as '16:9' | '9:16')
                        : undefined,
                klingDuration: settings.duration,
                klingSound: modelType.isKling ? settings.sound : undefined,
            });
        } else {
            // Для остальных моделей сохраняем в format и quality
            saveMediaSettings({
                format: settings.format as MediaSettings['format'],
                quality: settings.quality,
            });
        }
    }, [settings, modelType]);

    // Функции для обновления отдельных параметров
    const updateSettings = (updates: Partial<ModelSettingsState>) => {
        setSettings((prev) => ({ ...prev, ...updates }));
    };

    const setFormat = (format: ModelSettingsState['format']) => {
        updateSettings({ format });
    };

    const setQuality = (quality: ModelSettingsState['quality']) => {
        updateSettings({ quality });
    };

    const setDuration = (duration: ModelSettingsState['duration']) => {
        updateSettings({ duration });
    };

    const setSound = (sound: ModelSettingsState['sound']) => {
        updateSettings({ sound });
    };

    const setVeoGenerationType = (veoGenerationType: ModelSettingsState['veoGenerationType']) => {
        updateSettings({ veoGenerationType });
    };

    const setNegativePrompt = (negativePrompt: string) => {
        updateSettings({ negativePrompt });
    };

    const setSeed = (seed: ModelSettingsState['seed']) => {
        updateSettings({ seed });
    };

    const setCfgScale = (cfgScale: ModelSettingsState['cfgScale']) => {
        updateSettings({ cfgScale });
    };

    const setVoice = (voice: string) => {
        updateSettings({ voice });
    };

    const setStability = (stability: number) => {
        updateSettings({ stability });
    };

    const setSimilarityBoost = (similarityBoost: number) => {
        updateSettings({ similarityBoost });
    };

    const setSpeed = (speed: number) => {
        updateSettings({ speed });
    };

    const setLanguageCode = (languageCode: string) => {
        updateSettings({ languageCode });
    };

    // Сброс настроек для определенных моделей
    const resetModelSpecificSettings = () => {
        const updates: Partial<ModelSettingsState> = {};

        if (modelType.isVeo || modelType.isImagen4) {
            updates.seed = undefined;
        }
        if (modelType.isImagen4) {
            updates.negativePrompt = '';
        }
        if (modelType.isKling25) {
            updates.negativePrompt = '';
            updates.cfgScale = undefined;
        }

        if (Object.keys(updates).length > 0) {
            updateSettings(updates);
        }
    };

    return {
        settings,
        setFormat,
        setQuality,
        setDuration,
        setSound,
        setVeoGenerationType,
        setNegativePrompt,
        setSeed,
        setCfgScale,
        setVoice,
        setStability,
        setSimilarityBoost,
        setSpeed,
        setLanguageCode,
        updateSettings,
        resetModelSpecificSettings,
    };
}
