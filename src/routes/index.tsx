import { createFileRoute, Link } from '@tanstack/react-router';
import { Zap, Image, Video, Music, Shield, Sparkles } from 'lucide-react';

export const Route = createFileRoute('/')({ component: HomePage });

function HomePage() {
    return (
        <div className='min-h-screen bg-linear-to-b from-slate-900 via-slate-800 to-slate-900'>
            {/* Hero Section */}
            <section className='relative py-20 px-6 text-center overflow-hidden'>
                <div className='absolute inset-0 bg-linear-to-r from-cyan-500/10 via-blue-500/10 to-purple-500/10'></div>
                <div className='relative max-w-5xl mx-auto'>
                    <div className='flex items-center justify-center gap-6 mb-6'>
                        <img
                            src='/logo.png'
                            alt='AI Media Generator'
                            className='w-24 h-24 md:w-32 md:h-32 rounded-lg'
                        />
                    </div>
                    <h1 className='text-5xl md:text-7xl font-black text-white mb-6'>
                        <span className='bg-linear-to-r from-cyan-400 via-blue-400 to-purple-400 bg-clip-text text-transparent'>
                            AI Media Generator
                        </span>
                    </h1>
                    <p className='text-xl md:text-2xl text-gray-300 mb-8 max-w-3xl mx-auto'>
                        Генерируйте изображения, видео и аудио с помощью современных AI моделей
                    </p>
                    <div className='flex flex-col sm:flex-row gap-4 justify-center'>
                        <Link
                            to='/media'
                            className='px-8 py-4 bg-linear-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white font-semibold rounded-lg transition-all shadow-lg shadow-cyan-500/30 hover:shadow-cyan-500/50'
                        >
                            Начать генерацию
                        </Link>
                        <Link
                            to='/login'
                            className='px-8 py-4 bg-slate-800 hover:bg-slate-700 text-white font-semibold rounded-lg transition-all border border-slate-700'
                        >
                            Войти
                        </Link>
                    </div>
                </div>
            </section>

            {/* Features Section */}
            <section className='py-16 px-6 max-w-7xl mx-auto'>
                <h2 className='text-3xl font-bold text-white text-center mb-12'>
                    Возможности
                </h2>
                <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'>
                    <FeatureCard
                        icon={<Image className='w-12 h-12 text-cyan-400' />}
                        title='Генерация изображений'
                        description='Создавайте уникальные изображения с помощью Nano Banana Pro, Imagen4, Midjourney и других моделей'
                    />
                    <FeatureCard
                        icon={<Video className='w-12 h-12 text-purple-400' />}
                        title='Генерация видео'
                        description='Генерируйте видео с Kling, Veo, Sora и Seedance с поддержкой image-to-video'
                    />
                    <FeatureCard
                        icon={<Music className='w-12 h-12 text-pink-400' />}
                        title='Генерация аудио'
                        description='Синтез речи с ElevenLabs с поддержкой множественных языков'
                    />
                    <FeatureCard
                        icon={<Sparkles className='w-12 h-12 text-yellow-400' />}
                        title='Множество моделей'
                        description='Доступ к современным AI моделям через единую платформу'
                    />
                    <FeatureCard
                        icon={<Shield className='w-12 h-12 text-green-400' />}
                        title='Безопасность'
                        description='JWT аутентификация и защита данных пользователей'
                    />
                    <FeatureCard
                        icon={<Zap className='w-12 h-12 text-orange-400' />}
                        title='Быстрая обработка'
                        description='Асинхронная генерация с polling статусом и уведомлениями'
                    />
                </div>
            </section>

            {/* Models Section */}
            <section className='py-16 px-6 bg-slate-800/30'>
                <div className='max-w-7xl mx-auto'>
                    <h2 className='text-3xl font-bold text-white text-center mb-12'>
                        Поддерживаемые модели
                    </h2>
                    <div className='grid grid-cols-2 md:grid-cols-4 gap-4'>
                        <ModelBadge name='Nano Banana Pro' />
                        <ModelBadge name='Kling 2.6' />
                        <ModelBadge name='Veo 3.1' />
                        <ModelBadge name='Sora 2' />
                        <ModelBadge name='Imagen4' />
                        <ModelBadge name='Midjourney' />
                        <ModelBadge name='ElevenLabs' />
                        <ModelBadge name='Seedance' />
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className='py-8 px-6 border-t border-slate-800'>
                <div className='max-w-7xl mx-auto text-center text-gray-500'>
                    <p>AI Media Generator &copy; {new Date().getFullYear()}</p>
                </div>
            </footer>
        </div>
    );
}

function FeatureCard({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
    return (
        <div className='bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl p-6 hover:border-cyan-500/50 transition-all duration-300 hover:shadow-lg hover:shadow-cyan-500/10'>
            <div className='mb-4'>{icon}</div>
            <h3 className='text-xl font-semibold text-white mb-3'>{title}</h3>
            <p className='text-gray-400 leading-relaxed'>{description}</p>
        </div>
    );
}

function ModelBadge({ name }: { name: string }) {
    return (
        <div className='bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-center hover:border-cyan-500/50 transition-colors'>
            <span className='text-sm font-medium text-gray-300'>{name}</span>
        </div>
    );
}
