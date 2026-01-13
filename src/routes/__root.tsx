import { HeadContent, Scripts, createRootRoute } from '@tanstack/react-router';
import { TanStackRouterDevtoolsPanel } from '@tanstack/react-router-devtools';
import { TanStackDevtools } from '@tanstack/react-devtools';

import appCss from '../styles.css?url';
import { Provider } from 'react-redux';
import { store } from '@/redux/store';
import { Header } from '@/components/Header';
import { useTheme } from '@/hooks/use-theme';

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
        <div className='flex flex-col items-center justify-center min-h-screen bg-background text-foreground'>
            <h1 className='text-6xl font-bold mb-4'>404</h1>
            <p className='text-xl text-muted-foreground mb-8'>Страница не найдена</p>
            <a
                href='/'
                className='px-6 py-3 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold rounded-lg transition-colors'
            >
                Вернуться на главную
            </a>
        </div>
    );
}

function RootDocument({ children }: { children: React.ReactNode }) {
    // Применяем тему при монтировании
    useTheme();

    return (
        <Provider store={store}>
            <html lang='en' suppressHydrationWarning>
                <head>
                    <HeadContent />
                </head>
                <body suppressHydrationWarning>
                    <Header />
                    <div className="pt-14">
                        {children}
                    </div>
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
