// Компонент для ввода чисел с кнопками увеличения/уменьшения
import * as React from 'react';
import { ChevronUp, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Input } from './input';

export interface NumberInputProps
    extends Omit<React.ComponentProps<'input'>, 'type' | 'onChange'> {
    value?: number | string;
    onValueChange?: (value: number | undefined) => void;
    min?: number;
    max?: number;
    step?: number;
}

export const NumberInput = React.forwardRef<HTMLInputElement, NumberInputProps>(
    (
        {
            className,
            value,
            onValueChange,
            min,
            max,
            step = 1,
            disabled,
            ...props
        },
        ref
    ) => {
        const inputRef = React.useRef<HTMLInputElement>(null);
        React.useImperativeHandle(ref, () => inputRef.current!);

        const numValue =
            value === undefined || value === '' ? undefined : Number(value);

        function handleIncrement() {
            if (disabled) return;
            const current = numValue ?? (min ?? 0);
            const newValue = current + step;
            const finalValue = max !== undefined ? Math.min(newValue, max) : newValue;
            onValueChange?.(finalValue);
        }

        function handleDecrement() {
            if (disabled) return;
            const current = numValue ?? (max ?? 0);
            const newValue = current - step;
            const finalValue = min !== undefined ? Math.max(newValue, min) : newValue;
            onValueChange?.(finalValue);
        }

        function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
            const inputValue = e.target.value;
            // Позволяем вводить пустое значение
            if (inputValue === '') {
                onValueChange?.(undefined);
                return;
            }
            // Разрешаем ввод любых числовых значений
            // Заменяем запятую на точку для парсинга
            const normalizedValue = inputValue.replace(',', '.');
            const num = Number(normalizedValue);
            // Если это валидное число, сохраняем его (включая промежуточные состояния типа "1." которые парсятся как 1)
            if (!isNaN(num) && normalizedValue.trim() !== '') {
                onValueChange?.(num);
            }
        }

        function handleBlur() {
            // При потере фокуса применяем ограничения min/max
            if (numValue !== undefined) {
                let finalValue = numValue;
                if (min !== undefined && finalValue < min) finalValue = min;
                if (max !== undefined && finalValue > max) finalValue = max;
                if (finalValue !== numValue) {
                    onValueChange?.(finalValue);
                }
            }
        }

        return (
            <div className='relative flex items-center'>
                <Input
                    ref={inputRef}
                    type='text'
                    inputMode='numeric'
                    value={value === undefined ? '' : String(value)}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    disabled={disabled}
                    className={cn('pr-7', className)}
                    min={min}
                    max={max}
                    {...props}
                />
                <div className='absolute right-1 flex flex-col'>
                    <button
                        type='button'
                        tabIndex={-1}
                        className='flex h-3 w-4 items-center justify-center text-muted-foreground/50 transition-colors hover:text-foreground disabled:opacity-20'
                        onClick={handleIncrement}
                        disabled={
                            disabled ||
                            (max !== undefined && numValue !== undefined && numValue >= max)
                        }
                    >
                        <ChevronUp className='size-3' />
                    </button>
                    <button
                        type='button'
                        tabIndex={-1}
                        className='flex h-3 w-4 items-center justify-center text-muted-foreground/50 transition-colors hover:text-foreground disabled:opacity-20'
                        onClick={handleDecrement}
                        disabled={
                            disabled ||
                            (min !== undefined && numValue !== undefined && numValue <= min)
                        }
                    >
                        <ChevronDown className='size-3' />
                    </button>
                </div>
            </div>
        );
    }
);

NumberInput.displayName = 'NumberInput';
