import { postReqData, useGetDataQuery, usePostDataMutation } from '@/redux/api';
import { createFileRoute } from '@tanstack/react-router';
import {
    Zap,
    Server,
    Route as RouteIcon,
    Shield,
    Waves,
    Sparkles,
} from 'lucide-react';

export const Route = createFileRoute('/')({ component: App });

function App() {
    const { handlers, constants } = useApp();

    return (
        <div className='min-h-screen bg-linear-to-b from-slate-900 via-slate-800 to-slate-900'>
            <section className='relative py-20 px-6 text-center overflow-hidden'>
                <div className='absolute inset-0 bg-linear-to-r from-cyan-500/10 via-blue-500/10 to-purple-500/10'></div>
                <div className='relative max-w-5xl mx-auto'>
                    {/* logo */}
                    <div className='flex items-center justify-center gap-6 mb-6'>
                        <img
                            src='/tanstack-circle-logo.png'
                            alt='TanStack Logo'
                            className='w-24 h-24 md:w-32 md:h-32'
                        />
                        <h1 className='text-6xl md:text-7xl font-black text-white [tracking-[-0.08em]'>
                            <span className='text-gray-300'>TANSTACK</span>{' '}
                            <span className='bg-linear-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent'>
                                ПРОЕКТ
                            </span>
                        </h1>
                    </div>
                    <p className='text-2xl md:text-3xl text-gray-300 mb-4 font-light'>
                        Новый
                    </p>
                    <p className='text-lg text-gray-400 max-w-3xl mx-auto mb-8'>
                        Описание проекта
                    </p>
                    <div className='flex flex-col items-center gap-4'>
                        <button
                            rel='noopener noreferrer'
                            className='px-8 py-3 bg-primary hover:bg-cyan-600 text-primary-foreground font-semibold rounded-lg transition-colors shadow-lg shadow-cyan-500/50'
                            onClick={handlers.test}
                        >
                            Test button
                        </button>
                    </div>
                </div>
            </section>

            <section className='py-16 px-6 max-w-7xl mx-auto'>
                <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'>
                    {/* функции массив */}
                    {constants.features.map((feature, index) => (
                        <div
                            key={index}
                            className='bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl p-6 hover:border-cyan-500/50 transition-all duration-300 hover:shadow-lg hover:shadow-cyan-500/10'
                        >
                            <div className='mb-4'>{feature.icon}</div>
                            <h3 className='text-xl font-semibold text-white mb-3'>
                                {feature.title}
                            </h3>
                            <p className='text-gray-400 leading-relaxed'>
                                {feature.description}
                            </p>
                        </div>
                    ))}
                </div>
            </section>
        </div>
    );
}

function useApp() {
    const dataForSend: postReqData = {
        path: '/test',
        body: 'any body',
    };
    const [postData, { data, error, isError, isLoading }] =
        usePostDataMutation();

    async function test() {
        try {
            const result = await postData(dataForSend).unwrap();
            console.log(JSON.stringify(result));
        } catch (err) {
            console.error('Ошибка при отправке:', err);
        }
    }

    const features = [
        {
            icon: <Zap className='w-12 h-12 text-cyan-400' />,
            title: 'Powerful Server Functions',
            description:
                'Write server-side code that seamlessly integrates with your client components. Type-safe, secure, and simple.',
        },
        {
            icon: <Server className='w-12 h-12 text-cyan-400' />,
            title: 'Flexible Server Side Rendering',
            description:
                'Full-document SSR, streaming, and progressive enhancement out of the box. Control exactly what renders where.',
        },
    ];

    return {
        states: {},
        handlers: {
            test,
        },
        constants: { features },
    };
}
