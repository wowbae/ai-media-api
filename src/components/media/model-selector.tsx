// Компонент выбора модели для генерации
import { Sparkles, Video, ImageIcon, AudioLines } from 'lucide-react';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useGetModelsQuery, type MediaModel } from '@/redux/media-api';

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

    function getTypeIcon(type: string) {
        switch (type) {
            case 'IMAGE':
                return <ImageIcon className='h-3 w-3' />;
            case 'VIDEO':
                return <Video className='h-3 w-3' />;
            case 'AUDIO':
                return <AudioLines className='h-3 w-3' />;
            default:
                return null;
        }
    }

    function getModelIcon(key: string) {
        switch (key) {
            case 'NANO_BANANA':
                return '🍌';
            case 'KLING':
                return '🎬';
            case 'MIDJOURNEY':
                return '🎨';
            default:
                return '✨';
        }
    }

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
                {models?.map((model) => (
                    <SelectItem
                        key={model.key}
                        value={model.key}
                        className='text-slate-300 focus:bg-slate-700 focus:text-white'
                    >
                        <div className='flex flex-col gap-1'>
                            <div className='flex items-center gap-2'>
                                <span>{getModelIcon(model.key)}</span>
                                <span>{model.name}</span>
                            </div>
                            <div className='flex gap-1'>
                                {model.types.map((type) => (
                                    <Badge
                                        key={type}
                                        variant='secondary'
                                        className='h-5 gap-1 bg-slate-600 text-[10px]'
                                    >
                                        {getTypeIcon(type)}
                                        {type}
                                    </Badge>
                                ))}
                            </div>
                        </div>
                    </SelectItem>
                ))}

                {/* Если модели еще загружаются */}
                {isLoading && (
                    <div className='flex items-center gap-2 p-2 text-slate-400'>
                        <Sparkles className='h-4 w-4 animate-pulse' />
                        <span>Загрузка моделей...</span>
                    </div>
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

    function getModelIcon(key: string) {
        switch (key) {
            case 'NANO_BANANA':
                return '🍌';
            case 'KLING':
                return '🎬';
            case 'MIDJOURNEY':
                return '🎨';
            default:
                return '✨';
        }
    }

    return (
        <Badge variant='secondary' className='bg-slate-700 text-slate-300'>
            <span className='mr-1'>{getModelIcon(model)}</span>
            {modelInfo?.name || model}
        </Badge>
    );
}
