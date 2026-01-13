import { HeadContent, Scripts, createRootRoute } from '@tanstack/react-router';
import { TanStackRouterDevtoolsPanel } from '@tanstack/react-router-devtools';
import { TanStackDevtools } from '@tanstack/react-devtools';

import appCss from '../styles.css?url';
import { Provider } from 'react-redux';
import { store } from '@/redux/store';
import { Header } from '@/components/Header';

export const Route = createRootRoute({
    head: () => ({
        meta: [
            {
                charSet: 'utf-8',
            },
            {
                name: 'viewport',
                content: 'width=device-width, initial-scale=1',
            },
            {
                title: 'AI Media Generator',
            },
        ],
        links: [
            {
                rel: 'stylesheet',
                href: appCss,
            },
        ],
        scripts: [
            {
                children: `
                    (function() {
                        try {
                            // Всегда устанавливаем dark тему по умолчанию
                            document.documentElement.classList.add('dark');
                            localStorage.setItem('theme', 'dark');
                        } catch (e) {}
                    })();
                `,
            },
        ],
    }),

    shellComponent: RootDocument,
    notFoundComponent: NotFoundComponent,
});

function NotFoundComponent() {
    return (
        <div className='flex flex-col items-center justify-center min-h-screen bg-slate-900 text-white'>
            <h1 className='text-6xl font-bold mb-4'>404</h1>
            <p className='text-xl text-gray-400 mb-8'>Страница не найдена</p>
            <a
                href='/'
                className='px-6 py-3 bg-cyan-500 hover:bg-cyan-600 text-white font-semibold rounded-lg transition-colors'
            >
                Вернуться на главную
            </a>
        </div>
    );
}

function RootDocument({ children }: { children: React.ReactNode }) {
    return (
        <Provider store={store}>
            <html lang='en' suppressHydrationWarning>
                <head>
                    <HeadContent />
                </head>
                <body suppressHydrationWarning className="pt-14">
                    <Header />
                    {children}
                    {/* <TanStackDevtools
                        config={{
                            position: 'bottom-right',
                        }}
                        plugins={[
                            {
                                name: 'Tanstack Router',
                                render: <TanStackRouterDevtoolsPanel />,
                            },
                        ]}
                    /> */}
                    <Scripts />
                </body>
            </html>
        </Provider>
    );
}
