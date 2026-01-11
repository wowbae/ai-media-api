// Компонент бейджа статуса запроса
import { Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import type { RequestStatus } from '@/redux/api/base';

interface StatusBadgeProps {
    status: RequestStatus;
}

export function StatusBadge({ status }: StatusBadgeProps) {
    const config = {
        PENDING: {
            icon: Loader2,
            label: 'Подготовка',
            className: 'bg-blue-900/30 text-blue-400',
        },
        PROCESSING: {
            icon: Loader2,
            label: 'Генерация',
            className: 'bg-blue-900/30 text-blue-400',
        },
        COMPLETED: {
            icon: CheckCircle2,
            label: 'Готово',
            className: 'bg-green-900/30 text-green-400',
        },
        FAILED: {
            icon: AlertCircle,
            label: 'Ошибка',
            className: 'bg-red-900/30 text-red-400',
        },
    };

    const { icon: Icon, label, className } = config[status];
    const shouldSpin = status === 'PROCESSING' || status === 'PENDING';

    return (
        <Badge variant='secondary' className={className}>
            <Icon
                className={`mr-1 h-3 w-3 ${shouldSpin ? 'animate-spin' : ''}`}
            />
            {label}
        </Badge>
    );
}
