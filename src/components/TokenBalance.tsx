import React from 'react';
import { useSelector } from 'react-redux';
import { selectCurrentUser, type User } from '@/redux/auth-slice';
import { Coins } from 'lucide-react';
import { useGetMeQuery } from '@/redux/api/auth.endpoints';

export const TokenBalance = () => {
    const user: User | null = useSelector(selectCurrentUser);
    // Poll for balance updates occasionally or rely on manual invalidation?
    // useGetMeQuery can run in background.
    const { data: me } = useGetMeQuery(undefined, {
        pollingInterval: 30000,
        skip: !user,
    });

    // Use latest balance from API user object if available, else from slice
    const balance: number = me?.balance ?? user?.balance ?? 0;

    if (!user) return null;

    return (
        <div className='flex items-center gap-2 px-3 py-1 bg-slate-800 rounded-full border border-slate-700'>
            <Coins className='w-4 h-4 text-yellow-500' />
            <span className='text-sm font-medium text-white'>{balance}</span>
        </div>
    );
};
