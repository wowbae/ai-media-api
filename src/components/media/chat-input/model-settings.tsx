// Переиспользуемые компоненты настроек для моделей
import React from 'react';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    type FormatConfig,
    type QualityConfig,
    type DurationConfig,
    type SoundConfig,
    type GenerationTypeConfig,
    getModelSettingsConfig,
} from './model-settings-config';
import type { MediaModel } from '@/redux/api/base';

// Тип для всех поддерживаемых форматов
export type AspectRatioFormat =
    | '1:1'
    | '4:3'
    | '3:4'
    | '9:16'
    | '16:9'
    | '2:3'
    | '3:2'
    | '21:9'
    | undefined;

// Универсальный селект для формата (фото и видео)
interface FormatSelectProps {
    value: AspectRatioFormat;
    config: FormatConfig;
    onValueChange: (value: AspectRatioFormat) => void;
    disabled?: boolean;
    className?: string;
}


export function FormatSelect({
    value,
    config,
    onValueChange,
    disabled,
    className = 'w-[120px]',
}: FormatSelectProps) {
    const handleChange = (newValue: string) => {
        if (newValue === 'default') {
            onValueChange(undefined);
        } else {
            const format = newValue as AspectRatioFormat;
            onValueChange(format);
        }
        // Сохранение настроек происходит в основном компоненте через useEffect
    };

    const displayValue =
        value ||
        config.defaultValue ||
        (config.allowDefault ? 'default' : config.defaultValue || '');
    const placeholder = config.defaultValue || 'Формат';

    return (
        <Select
            value={displayValue || undefined}
            onValueChange={handleChange}
            disabled={disabled}
            modal={false}
        >
            <SelectTrigger
                className={`${className} border-border bg-secondary text-foreground rounded-xl`}
            >
                <SelectValue placeholder={placeholder}>
                    {value || placeholder}
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
                {config.options.map((option) => (
                    <SelectItem
                        key={option.value}
                        value={option.value}
                        className='text-muted-foreground focus:bg-accent focus:text-accent-foreground'
                    >
                        {option.label}
                    </SelectItem>
                ))}
            </SelectContent>
        </Select>
    );
}

// Селект для качества
interface QualitySelectProps {
    value: '1k' | '2k' | '4k' | undefined;
    config: QualityConfig;
    onValueChange: (value: '1k' | '2k' | '4k' | undefined) => void;
    disabled?: boolean;
    className?: string;
}

export function QualitySelect({
    value,
    config,
    onValueChange,
    disabled,
    className = 'w-[100px]',
}: QualitySelectProps) {
    const handleChange = (newValue: string) => {
        if (newValue === 'default') {
            onValueChange(undefined);
        } else {
            const quality = newValue as '1k' | '2k' | '4k';
            onValueChange(quality);
        }
        // Сохранение настроек происходит в основном компоненте через useEffect
    };

    const displayValue =
        value ||
        config.defaultValue ||
        (config.allowDefault ? 'default' : config.defaultValue || '');
    const placeholder = config.defaultValue ? config.defaultValue.toUpperCase() : 'Качество';

    return (
        <Select
            value={displayValue || undefined}
            onValueChange={handleChange}
            disabled={disabled}
            modal={false}
        >
            <SelectTrigger
                className={`${className} border-border bg-secondary text-foreground rounded-xl`}
            >
                <SelectValue placeholder={placeholder}>
                    {value ? value.toUpperCase() : placeholder}
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
                {config.options.map((option) => (
                    <SelectItem
                        key={option.value}
                        value={option.value}
                        className='text-muted-foreground focus:bg-accent focus:text-accent-foreground'
                    >
                        {option.label}
                    </SelectItem>
                ))}
            </SelectContent>
        </Select>
    );
}

// Селект для длительности
interface DurationSelectProps {
    value: 5 | 10 | undefined;
    config: DurationConfig;
    onValueChange: (value: 5 | 10) => void;
    disabled?: boolean;
    className?: string;
}

export function DurationSelect({
    value,
    config,
    onValueChange,
    disabled,
    className = 'w-[100px]',
}: DurationSelectProps) {
    const handleChange = (newValue: string) => {
        const duration = parseInt(newValue) as 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;
        onValueChange(duration);
        // Сохранение настроек происходит в основном компоненте через useEffect
    };

    const displayValue = (value || config.defaultValue).toString();

    return (
        <Select
            value={displayValue}
            onValueChange={handleChange}
            disabled={disabled}
        >
            <SelectTrigger
                className={`${className} border-border bg-secondary text-foreground rounded-xl`}
            >
                <SelectValue placeholder='Длительность'>
                    {value || config.defaultValue} сек
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
                {config.options.map((option) => (
                    <SelectItem
                        key={option.value}
                        value={option.value}
                        className='text-muted-foreground focus:bg-accent focus:text-accent-foreground'
                    >
                        {option.label}
                    </SelectItem>
                ))}
            </SelectContent>
        </Select>
    );
}

// Селект для звука
interface SoundSelectProps {
    value: boolean | undefined;
    config: SoundConfig;
    onValueChange: (value: boolean) => void;
    disabled?: boolean;
    className?: string;
}

export function SoundSelect({
    value,
    config,
    onValueChange,
    disabled,
    className = 'w-[100px]',
}: SoundSelectProps) {
    const handleChange = (newValue: string) => {
        const sound = newValue === 'true';
        onValueChange(sound);
        // Сохранение настроек происходит в основном компоненте через useEffect
    };

    const displayValue =
        value === undefined ? config.defaultValue.toString() : value.toString();

    return (
        <Select
            value={displayValue}
            onValueChange={handleChange}
            disabled={disabled}
        >
            <SelectTrigger
                className={`${className} border-border bg-secondary text-foreground rounded-xl`}
            >
                <SelectValue placeholder='Звук'>
                    {value === undefined || value ? 'звук on' : 'звук off'}
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
                {config.options.map((option) => (
                    <SelectItem
                        key={option.value}
                        value={option.value}
                        className='text-muted-foreground focus:bg-accent focus:text-accent-foreground'
                    >
                        {option.label}
                    </SelectItem>
                ))}
            </SelectContent>
        </Select>
    );
}

// Селект для типа генерации (для Veo 3.1)
interface GenerationTypeSelectProps {
    value:
        | 'TEXT_2_VIDEO'
        | 'FIRST_AND_LAST_FRAMES_2_VIDEO'
        | 'REFERENCE_2_VIDEO'
        | 'EXTEND_VIDEO'
        | undefined;
    config: GenerationTypeConfig;
    onValueChange: (
        value:
            | 'TEXT_2_VIDEO'
            | 'FIRST_AND_LAST_FRAMES_2_VIDEO'
            | 'REFERENCE_2_VIDEO'
            | 'EXTEND_VIDEO'
    ) => void;
    disabled?: boolean;
    className?: string;
}

export function GenerationTypeSelect({
    value,
    config,
    onValueChange,
    disabled,
    className = 'w-[160px]',
}: GenerationTypeSelectProps) {
    const handleChange = (newValue: string) => {
        onValueChange(
            newValue as
                | 'TEXT_2_VIDEO'
                | 'FIRST_AND_LAST_FRAMES_2_VIDEO'
                | 'REFERENCE_2_VIDEO'
                | 'EXTEND_VIDEO'
        );
    };

    const displayValue = value || config.defaultValue;
    const selectedOption = config.options.find((o) => o.value === displayValue);
    const placeholder = selectedOption ? selectedOption.label : 'Режим';

    return (
        <Select
            value={displayValue || undefined}
            onValueChange={handleChange}
            disabled={disabled}
            modal={false}
        >
            <SelectTrigger
                className={`${className} border-border bg-secondary text-foreground rounded-xl`}
            >
                <SelectValue placeholder={placeholder}>
                    {selectedOption?.label || placeholder}
                </SelectValue>
            </SelectTrigger>
            <SelectContent
                side='top'
                sideOffset={8}
                position='popper'
                collisionPadding={20}
                avoidCollisions={true}
                className='border-border bg-card focus:bg-accent focus:text-accent-foreground'
            >
                {config.options.map((option) => (
                    <SelectItem
                        key={option.value}
                        value={option.value}
                        className='text-muted-foreground focus:bg-accent focus:text-accent-foreground'
                    >
                        {option.label}
                    </SelectItem>
                ))}
            </SelectContent>
        </Select>
    );
}

// Основной компонент для отображения настроек модели
interface ModelSettingsPanelProps {
    model: string;
    format: AspectRatioFormat;
    quality: '1k' | '2k' | '4k' | undefined;
    duration: 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | undefined;
    sound: boolean | undefined;
    onFormatChange: (value: AspectRatioFormat) => void;
    onQualityChange: (value: '1k' | '2k' | '4k' | undefined) => void;
    onDurationChange: (value: 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10) => void;
    onSoundChange: (value: boolean) => void;
    veoGenerationType?:
        | 'TEXT_2_VIDEO'
        | 'FIRST_AND_LAST_FRAMES_2_VIDEO'
        | 'REFERENCE_2_VIDEO'
        | 'EXTEND_VIDEO'
        | undefined;
    onVeoGenerationTypeChange?: (
        value:
            | 'TEXT_2_VIDEO'
            | 'FIRST_AND_LAST_FRAMES_2_VIDEO'
            | 'REFERENCE_2_VIDEO'
            | 'EXTEND_VIDEO'
    ) => void;
    disabled?: boolean;
}

export function ModelSettingsPanel({
    model,
    format,
    quality,
    duration,
    sound,
    onFormatChange,
    onQualityChange,
    onDurationChange,
    onSoundChange,
    veoGenerationType,
    onVeoGenerationTypeChange,
    disabled,
}: ModelSettingsPanelProps) {
    const config = getModelSettingsConfig(model as MediaModel);

    return (
        <>
            {config.format && (
                <FormatSelect
                    value={format}
                    config={config.format}
                    onValueChange={onFormatChange}
                    disabled={disabled}
                    className={
                        config.format.options.some((o) => o.value === '1:1')
                            ? 'w-[140px]'
                            : 'w-[120px]'
                    }
                />
            )}

            {config.quality && (
                <QualitySelect
                    value={quality}
                    config={config.quality}
                    onValueChange={onQualityChange}
                    disabled={disabled}
                />
            )}

            {config.duration && (
                <DurationSelect
                    value={duration}
                    config={config.duration}
                    onValueChange={onDurationChange}
                    disabled={disabled}
                />
            )}

            {config.sound && (
                <SoundSelect
                    value={sound}
                    config={config.sound}
                    onValueChange={onSoundChange}
                    disabled={disabled}
                />
            )}

            {config.generationType && onVeoGenerationTypeChange && (
                <GenerationTypeSelect
                    value={veoGenerationType}
                    config={config.generationType}
                    onValueChange={onVeoGenerationTypeChange}
                    disabled={disabled}
                />
            )}
        </>
    );
}
