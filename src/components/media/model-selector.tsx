// Компонент выбора модели для генерации
import { Sparkles, Video, ImageIcon } from 'lucide-react';
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
const PROVIDER_BADGE_CONFIG: Record<MediaProviderType, { label: string; className: string }> = {
    gptunnel: {
        label: 'GPTunnel',
        className: 'bg-emerald-900/50 text-emerald-400 border-emerald-700/50',
    },
    openrouter: {
        label: 'OpenRouter',
        className: 'bg-violet-900/50 text-violet-400 border-violet-700/50',
    },
    midjourney: {
        label: 'GPTunnel',
        className: 'bg-emerald-900/50 text-emerald-400 border-emerald-700/50',
    },
    laozhang: {
        label: 'LaoZhang',
        className: 'bg-orange-900/50 text-orange-400 border-orange-700/50',
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

    // Разделяем модели по типам
    const imageModels = models?.filter((model) =>
        model.types.includes('IMAGE')
    ) || [];
    const videoModels = models?.filter((model) =>
        model.types.includes('VIDEO')
    ) || [];

    // Получаем текущую модель для отображения провайдера в триггере
    const currentModel = models?.find((m) => m.key === value);

    return (
        <Select
            value={value}
            onValueChange={(v) => onChange(v as MediaModel)}
            disabled={disabled || isLoading}
        >
            <SelectTrigger className='w-[280px] border-slate-600 bg-slate-700 text-white'>
                <SelectValue placeholder='Выберите модель'>
                    <div className='flex items-center gap-2 w-full'>
                        <span>{getModelIcon(value)}</span>
                        <span className='truncate'>
                            {currentModel?.name || value}
                        </span>
                        {currentModel?.provider && currentModel.provider in PROVIDER_BADGE_CONFIG && (
                            <ProviderBadge provider={currentModel.provider as MediaProviderType} />
                        )}
                    </div>
                </SelectValue>
            </SelectTrigger>
            <SelectContent className='border-slate-700 bg-slate-800'>
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
                                <SelectLabel className='flex items-center gap-2 text-slate-400'>
                                    <ImageIcon className='h-4 w-4' />
                                    <span>Изображения</span>
                                </SelectLabel>
                                {imageModels.map((model) => (
                                    <SelectItem
                                        key={model.key}
                                        value={model.key}
                                        className='text-slate-300 focus:bg-slate-700 focus:text-white'
                                    >
                                        <div className='flex items-center gap-2 w-full min-w-[200px]'>
                                            <span>{getModelIcon(model.key)}</span>
                                            <span>{model.name}</span>
                                            {model.provider && model.provider in PROVIDER_BADGE_CONFIG && (
                                                <ProviderBadge provider={model.provider as MediaProviderType} />
                                            )}
                                        </div>
                                    </SelectItem>
                                ))}
                            </SelectGroup>
                        )}

                        {/* Блок моделей для видео */}
                        {videoModels.length > 0 && (
                            <SelectGroup>
                                <SelectLabel className='flex items-center gap-2 text-slate-400'>
                                    <Video className='h-4 w-4' />
                                    <span>Видео</span>
                                </SelectLabel>
                                {videoModels.map((model) => (
                                    <SelectItem
                                        key={model.key}
                                        value={model.key}
                                        className='text-slate-300 focus:bg-slate-700 focus:text-white'
                                    >
                                        <div className='flex items-center gap-2 w-full min-w-[200px]'>
                                            <span>{getModelIcon(model.key)}</span>
                                            <span>{model.name}</span>
                                            {model.provider && model.provider in PROVIDER_BADGE_CONFIG && (
                                                <ProviderBadge provider={model.provider as MediaProviderType} />
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
            <Badge variant='secondary' className='bg-slate-700 text-slate-300'>
                <span className='mr-1'>{getModelIcon(model)}</span>
                {modelInfo?.name || model}
            </Badge>
            {showProvider && modelInfo?.provider && modelInfo.provider in PROVIDER_BADGE_CONFIG && (
                <ProviderBadge provider={modelInfo.provider as MediaProviderType} />
            )}
        </div>
    );
}
