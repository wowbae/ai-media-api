// Константы сервера
// Централизованное хранилище конфигурации для всего приложения
import dotenv from 'dotenv';

dotenv.config();

// Конфигурация сервера
export const serverConfig = {
  // Порт сервера
  port: parseInt(process.env.PORT || '4000', 10),
  
  // URL приложения
  appUrl: process.env.APP_URL || 'http://localhost:3000',
  
  // Окружение
  nodeEnv: process.env.NODE_ENV || 'development',
  
  // Пути
  mediaStoragePath: process.env.MEDIA_STORAGE_PATH || 'ai-media',
  
  // Максимальный размер файла (в байтах)
  maxFileSize: parseInt(process.env.MAX_FILE_SIZE_MB || '50', 10) * 1024 * 1024,
  
  // Лимиты для express body parser
  bodyLimit: `${process.env.MAX_FILE_SIZE_MB || '50'}mb`,
} as const;

// Конфигурация аутентификации
export const authConfig = {
  // JWT настройки
  jwtSecret: process.env.JWT_SECRET || 'change-me-in-production',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  
  // Сброс пароля
  resetTokenExpiresIn: parseInt(process.env.PASSWORD_RESET_TOKEN_EXPIRES_IN || '3600000', 10),
  bcryptRounds: 10,
  
  // Email конфиг (вложенный для совместимости с mail.service)
  smtp: {
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
    from: process.env.EMAIL_FROM || 'AI Media API <noreply@localhost>',
  },
} as const;

// Конфигурация email
export const emailConfig = {
  smtpHost: process.env.SMTP_HOST || 'smtp.gmail.com',
  smtpPort: parseInt(process.env.SMTP_PORT || '587', 10),
  smtpUser: process.env.SMTP_USER || '',
  smtpPass: process.env.SMTP_PASS || '',
  from: process.env.EMAIL_FROM || 'AI Media API <noreply@localhost>',
} as const;
