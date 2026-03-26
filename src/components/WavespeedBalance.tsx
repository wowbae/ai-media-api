// Остаток баланса Wavespeed (GET https://api.wavespeed.ai/api/v3/balance)
import React from "react";
import { useSelector } from "react-redux";
import { selectCurrentUser } from "@/redux/auth-slice";
import { useGetWavespeedBalanceQuery } from "@/redux/api/media.endpoints";
import { Sparkles, RefreshCw } from "lucide-react";

export function WavespeedBalance() {
    const user = useSelector(selectCurrentUser);
    const {
        data: balance,
        isLoading,
        isError,
        refetch,
        isFetching,
    } = useGetWavespeedBalanceQuery(undefined, {
        skip: !user,
        pollingInterval: 60_000,
    });

    if (!user) return null;

    return (
        <div
            className='flex items-center gap-2 px-3 py-1 bg-slate-800 rounded-full border border-slate-700'
            title='Баланс Wavespeed (USD, обновляются автоматически)'
        >
            <Sparkles className='w-4 h-4 text-cyan-300' />
            {isLoading ? (
                <span className='text-sm text-slate-400'>—</span>
            ) : isError ? (
                <span className='text-sm text-red-400' title='Ошибка загрузки'>
                    —
                </span>
            ) : (
                <span className='text-sm font-medium text-white'>
                    ${(balance ?? 0).toFixed(2)}
                </span>
            )}
            <button
                type='button'
                onClick={() => refetch()}
                disabled={isFetching}
                className='p-0.5 rounded hover:bg-slate-600 disabled:opacity-50'
                title='Обновить баланс Wavespeed'
                aria-label='Обновить баланс Wavespeed'
            >
                <RefreshCw
                    className={`w-3.5 h-3.5 text-slate-400 ${
                        isFetching ? "animate-spin" : ""
                    }`}
                />
            </button>
        </div>
    );
}
