// Компонент скелетона сообщения
import { Skeleton } from '@/components/ui/skeleton';

export function MessageSkeleton() {
    return (
        <div className='mb-6 space-y-3'>
            <div className='flex justify-end'>
                <Skeleton className='h-16 w-64 rounded-2xl' />
            </div>
            <div className='flex justify-start'>
                <Skeleton className='h-48 w-80 rounded-2xl' />
            </div>
        </div>
    );
}
