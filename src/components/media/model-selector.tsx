// Компонент выбора модели для генерации
import React from 'react';
import { Sparkles, Video, ImageIcon, Music } from 'lucide-react';
import {
    Select,
    SelectContent,
    SelectGroup,
    SelectItem,
    SelectLabel,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import {
    useGetModelsQuery,
    type MediaModel,
    type MediaProviderType,
} from '@/redux/media-api';
import { getModelIcon } from '@/lib/model-utils';

interface ModelSelectorProps {
    value: MediaModel;
    onChange: (value: MediaModel) => void;
    disabled?: boolean;
}

// Конфиг для бейджей провайдеров
const PROVIDER_BADGE_CONFIG: Record<
    MediaProviderType,
    { label: string; className: string }
> = {
    gptunnel: {
        label: 'GPTunnel',
        className: 'bg-emerald-900/50 text-emerald-400 border-emerald-700/50',
    },
    openrouter: {
        label: 'OpenRouter',
        className: 'bg-violet-900/50 text-violet-400 border-violet-700/50',
    },
    laozhang: {
        label: 'LaoZhang',
        className: 'bg-orange-900/50 text-orange-400 border-orange-700/50',
    },
    kieai: {
        label: 'Kie.ai',
        className: 'bg-blue-900/50 text-blue-400 border-blue-700/50',
    },
};

// Бейдж провайдера
interface ProviderBadgeProps {
    provider: MediaProviderType;
    className?: string;
}

export function ProviderBadge({ provider, className }: ProviderBadgeProps) {
    const config = PROVIDER_BADGE_CONFIG[provider];

    // Если конфиг не найден, не рендерим бейдж
    if (!config) {
        return null;
    }

    return (
        <Badge
            variant='outline'
            className={`ml-auto text-[10px] px-1.5 py-0 h-4 font-normal ${config.className} ${className || ''}`}
        >
            {config.label}
        </Badge>
    );
}

export function ModelSelector({
    value,
    onChange,
    disabled,
}: ModelSelectorProps) {
    const { data: models, isLoading } = useGetModelsQuery();

    // Мемоизируем разделение моделей по типам, чтобы не пересчитывать при каждом рендере
    // Сортируем модели: kieai наверх, затем остальные по имени
    const imageModels = React.useMemo(() => {
        let filtered =
            models?.filter((model) => model.types.includes('IMAGE')) || [];

        return filtered.sort((a, b) => {
            // Сначала модели от kieai
            if (a.provider === 'kieai' && b.provider !== 'kieai') return -1;
            if (a.provider !== 'kieai' && b.provider === 'kieai') return 1;
            // Затем сортируем по имени
            return a.name.localeCompare(b.name);
        });
    }, [models]);

    const videoModels = React.useMemo(() => {
        let filtered =
            models?.filter((model) => model.types.includes('VIDEO')) || [];

        return filtered.sort((a, b) => {
            // Сначала модели от kieai
            if (a.provider === 'kieai' && b.provider !== 'kieai') return -1;
            if (a.provider !== 'kieai' && b.provider === 'kieai') return 1;
            // Затем сортируем по имени
            return a.name.localeCompare(b.name);
        });
    }, [models]);

    const audioModels = React.useMemo(() => {
        let filtered =
            models?.filter((model) => model.types.includes('AUDIO')) || [];

        return filtered.sort((a, b) => {
            // Сначала модели от kieai
            if (a.provider === 'kieai' && b.provider !== 'kieai') return -1;
            if (a.provider !== 'kieai' && b.provider === 'kieai') return 1;
            // Затем сортируем по имени
            return a.name.localeCompare(b.name);
        });
    }, [models]);

    // Получаем текущую модель для отображения провайдера в триггере
    const currentModel = React.useMemo(
        () => models?.find((m) => m.key === value),
        [models, value]
    );

    // Мемоизируем обработчик изменения, чтобы предотвратить лишние перерендеры
    const handleValueChange = React.useCallback(
        (v: string) => {
            // Вызываем onChange только если значение действительно изменилось
            if (v !== value) {
                onChange(v as MediaModel);
            }
        },
        [value, onChange]
    );

    return (
        <Select
            value={value}
            onValueChange={handleValueChange}
            disabled={disabled || isLoading}
        >
            <SelectTrigger className='w-[280px] border-border bg-secondary text-foreground rounded-xl'>
                <SelectValue placeholder='Выберите модель'>
                    <div className='flex items-center gap-2 w-full'>
                        <span>{getModelIcon(value)}</span>
                        <span className='truncate'>
                            {currentModel?.name || value}
                        </span>
                        {currentModel?.provider &&
                            currentModel.provider in PROVIDER_BADGE_CONFIG && (
                                <ProviderBadge
                                    provider={
                                        currentModel.provider as MediaProviderType
                                    }
                                />
                            )}
                    </div>
                </SelectValue>
            </SelectTrigger>
            <SelectContent
                side='top'
                sideOffset={8}
                position='popper'
                collisionPadding={20}
                avoidCollisions={true}
                className='border-border bg-card data-[side=top]:animate-none!'
            >
                {/* Если модели еще загружаются */}
                {isLoading ? (
                    <div className='flex items-center gap-2 p-2 text-slate-400'>
                        <Sparkles className='h-4 w-4 animate-pulse' />
                        <span>Загрузка моделей...</span>
                    </div>
                ) : (
                    <>
                        {/* Блок моделей для изображений */}
                        {imageModels.length > 0 && (
                            <SelectGroup>
                                <SelectLabel className='flex items-center gap-2 text-muted-foreground'>
                                    <ImageIcon className='h-4 w-4' />
                                    <span>Изображения</span>
                                </SelectLabel>
                                {imageModels.map((model) => (
                                    <SelectItem
                                        key={model.key}
                                        value={model.key}
                                        className='text-muted-foreground focus:bg-secondary focus:text-foreground'
                                    >
                                        <div className='flex items-center gap-2 w-full min-w-[200px]'>
                                            <span>
                                                {getModelIcon(model.key)}
                                            </span>
                                            <span>{model.name}</span>
                                            {model.provider &&
                                                model.provider in
                                                    PROVIDER_BADGE_CONFIG && (
                                                    <ProviderBadge
                                                        provider={
                                                            model.provider as MediaProviderType
                                                        }
                                                    />
                                                )}
                                        </div>
                                    </SelectItem>
                                ))}
                            </SelectGroup>
                        )}

                        {/* Блок моделей для видео */}
                        {videoModels.length > 0 && (
                            <SelectGroup>
                                <SelectLabel className='flex items-center gap-2 text-muted-foreground'>
                                    <Video className='h-4 w-4' />
                                    <span>Видео</span>
                                </SelectLabel>
                                {videoModels.map((model) => (
                                    <SelectItem
                                        key={model.key}
                                        value={model.key}
                                        className='text-muted-foreground focus:bg-secondary focus:text-foreground'
                                    >
                                        <div className='flex items-center gap-2 w-full min-w-[200px]'>
                                            <span>
                                                {getModelIcon(model.key)}
                                            </span>
                                            <span>{model.name}</span>
                                            {model.provider &&
                                                model.provider in
                                                    PROVIDER_BADGE_CONFIG && (
                                                    <ProviderBadge
                                                        provider={
                                                            model.provider as MediaProviderType
                                                        }
                                                    />
                                                )}
                                        </div>
                                    </SelectItem>
                                ))}
                            </SelectGroup>
                        )}

                        {/* Блок моделей для аудио */}
                        {audioModels.length > 0 && (
                            <SelectGroup>
                                <SelectLabel className='flex items-center gap-2 text-muted-foreground'>
                                    <Music className='h-4 w-4' />
                                    <span>Аудио</span>
                                </SelectLabel>
                                {audioModels.map((model) => (
                                    <SelectItem
                                        key={model.key}
                                        value={model.key}
                                        className='text-muted-foreground focus:bg-secondary focus:text-foreground'
                                    >
                                        <div className='flex items-center gap-2 w-full min-w-[200px]'>
                                            <span>
                                                {getModelIcon(model.key)}
                                            </span>
                                            <span>{model.name}</span>
                                            {model.provider &&
                                                model.provider in
                                                    PROVIDER_BADGE_CONFIG && (
                                                    <ProviderBadge
                                                        provider={
                                                            model.provider as MediaProviderType
                                                        }
                                                    />
                                                )}
                                        </div>
                                    </SelectItem>
                                ))}
                            </SelectGroup>
                        )}
                    </>
                )}
            </SelectContent>
        </Select>
    );
}

// Компактная версия для отображения выбранной модели
interface ModelBadgeProps {
    model: MediaModel;
    showProvider?: boolean;
}

export function ModelBadge({ model, showProvider = false }: ModelBadgeProps) {
    const { data: models } = useGetModelsQuery();
    const modelInfo = models?.find((m) => m.key === model);

    return (
        <div className='flex items-center gap-1.5'>
            <Badge variant='secondary' className='bg-secondary text-muted-foreground'>
                <span className='mr-1'>{getModelIcon(model)}</span>
                {modelInfo?.name || model}
            </Badge>
            {showProvider &&
                modelInfo?.provider &&
                modelInfo.provider in PROVIDER_BADGE_CONFIG && (
                    <ProviderBadge
                        provider={modelInfo.provider as MediaProviderType}
                    />
                )}
        </div>
    );
}
