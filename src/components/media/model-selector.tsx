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
import { useGetModelsQuery, type MediaModel } from '@/redux/media-api';
import { getModelIcon } from '@/lib/model-utils';

interface ModelSelectorProps {
    value: MediaModel;
    onChange: (value: MediaModel) => void;
    disabled?: boolean;
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

    return (
        <Select
            value={value}
            onValueChange={(v) => onChange(v as MediaModel)}
            disabled={disabled || isLoading}
        >
            <SelectTrigger className='w-[200px] border-slate-600 bg-slate-700 text-white'>
                <SelectValue placeholder='Выберите модель'>
                    <div className='flex items-center gap-2'>
                        <span>{getModelIcon(value)}</span>
                        <span>
                            {models?.find((m) => m.key === value)?.name ||
                                value}
                        </span>
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
                                        <div className='flex items-center gap-2'>
                                            <span>{getModelIcon(model.key)}</span>
                                            <span>{model.name}</span>
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
                                        <div className='flex items-center gap-2'>
                                            <span>{getModelIcon(model.key)}</span>
                                            <span>{model.name}</span>
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
}

export function ModelBadge({ model }: ModelBadgeProps) {
    const { data: models } = useGetModelsQuery();
    const modelInfo = models?.find((m) => m.key === model);

    return (
        <Badge variant='secondary' className='bg-slate-700 text-slate-300'>
            <span className='mr-1'>{getModelIcon(model)}</span>
            {modelInfo?.name || model}
        </Badge>
    );
}
