import dotenv from 'dotenv';
import path from 'path';
import { defineConfig } from "prisma/config";
import { fileURLToPath } from 'url';

// Загружаем .env с явным путём
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const result = dotenv.config({ path: path.resolve(__dirname, '.env') });

// Выводим для отладки
if (result.error) {
    console.error('dotenv error:', result.error);
}

const DATABASE_URL = result.parsed?.DATABASE_URL || process.env.DATABASE_URL || '';

export default defineConfig({
    schema: 'prisma/schema.prisma',
    migrations: {
        path: 'prisma/migrations',
    },
    datasource: {
        url: DATABASE_URL,
    },
});
