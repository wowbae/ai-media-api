// Остаток кредитов Kie.ai (api.kie.ai/api/v1/chat/credit)
import React from 'react';
import { useSelector } from 'react-redux';
import { selectCurrentUser } from '@/redux/auth-slice';
import { useGetKieCreditsQuery } from '@/redux/api/media.endpoints';
import { Zap, RefreshCw } from 'lucide-react';

export function KieCredits() {
    const user = useSelector(selectCurrentUser);
    const { data: credits, isLoading, isError, refetch, isFetching } = useGetKieCreditsQuery(undefined, {
        skip: !user,
        pollingInterval: 60_000,
    });

    if (!user) return null;

    return (
        <div
            className='flex items-center gap-2 px-3 py-1 bg-slate-800 rounded-full border border-slate-700'
            title='Кредиты Kie.ai (обновляются автоматически)'
        >
            <Zap className='w-4 h-4 text-amber-400' />
            {isLoading ? (
                <span className='text-sm text-slate-400'>—</span>
            ) : isError ? (
                <span className='text-sm text-red-400' title='Ошибка загрузки'>—</span>
            ) : (
                <span className='text-sm font-medium text-white'>{credits ?? 0}</span>
            )}
            <button
                type='button'
                onClick={() => refetch()}
                disabled={isFetching}
                className='p-0.5 rounded hover:bg-slate-600 disabled:opacity-50'
                title='Обновить кредиты'
                aria-label='Обновить кредиты Kie.ai'
            >
                <RefreshCw className={`w-3.5 h-3.5 text-slate-400 ${isFetching ? 'animate-spin' : ''}`} />
            </button>
        </div>
    );
}
