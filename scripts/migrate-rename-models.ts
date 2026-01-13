// Скрипт для выполнения миграции переименования моделей
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function migrate() {
    console.log('Начинаем миграцию переименования моделей...');

    try {
        // Сначала добавляем новые значения в enum MediaModel (если их еще нет)
        console.log('Добавляем новые значения в enum MediaModel...');
        const newEnumValues = [
            'KLING_2_6_KIEAI',
            'KLING_2_5_TURBO_PRO_KIEAI',
            'VEO_3_1_KIEAI',
            'VEO_3_1_FAST_KIEAI',
            'SEEDREAM_4_5_KIEAI',
            'SEEDREAM_4_5_EDIT_KIEAI',
            'ELEVENLABS_MULTILINGUAL_V2_KIEAI',
        ];

        for (const enumValue of newEnumValues) {
            try {
                await prisma.$executeRawUnsafe(`
                    DO $$
                    BEGIN
                        IF NOT EXISTS (
                            SELECT 1 FROM pg_enum
                            WHERE enumlabel = '${enumValue}'
                            AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'MediaModel')
                        ) THEN
                            ALTER TYPE "MediaModel" ADD VALUE '${enumValue}';
                        END IF;
                    END $$;
                `);
                console.log(`  ✓ Добавлено значение: ${enumValue}`);
            } catch (error: any) {
                // Игнорируем ошибки, если значение уже существует
                if (!error.message?.includes('already exists')) {
                    console.warn(`  ⚠ Предупреждение для ${enumValue}:`, error.message);
                }
            }
        }

        // Обновляем существующие записи в MediaChat
        console.log('Обновляем MediaChat...');
        await prisma.$executeRawUnsafe(`
            UPDATE "MediaChat" SET "model" = 'KLING_2_6_KIEAI' WHERE "model" = 'KLING_2_6';
        `);
        await prisma.$executeRawUnsafe(`
            UPDATE "MediaChat" SET "model" = 'KLING_2_5_TURBO_PRO_KIEAI' WHERE "model" = 'KLING_2_5_TURBO_PRO';
        `);
        await prisma.$executeRawUnsafe(`
            UPDATE "MediaChat" SET "model" = 'VEO_3_1_KIEAI' WHERE "model" = 'VEO_3_1';
        `);
        await prisma.$executeRawUnsafe(`
            UPDATE "MediaChat" SET "model" = 'VEO_3_1_FAST_KIEAI' WHERE "model" = 'VEO_3_1_FAST';
        `);
        await prisma.$executeRawUnsafe(`
            UPDATE "MediaChat" SET "model" = 'SEEDREAM_4_5_KIEAI' WHERE "model" = 'SEEDREAM_4_5';
        `);
        await prisma.$executeRawUnsafe(`
            UPDATE "MediaChat" SET "model" = 'SEEDREAM_4_5_EDIT_KIEAI' WHERE "model" = 'SEEDREAM_4_5_EDIT';
        `);
        await prisma.$executeRawUnsafe(`
            UPDATE "MediaChat" SET "model" = 'ELEVENLABS_MULTILINGUAL_V2_KIEAI' WHERE "model" = 'ELEVENLABS_MULTILINGUAL_V2';
        `);

        // Обновляем существующие записи в MediaRequest
        console.log('Обновляем MediaRequest...');
        await prisma.$executeRawUnsafe(`
            UPDATE "MediaRequest" SET "model" = 'KLING_2_6_KIEAI' WHERE "model" = 'KLING_2_6';
        `);
        await prisma.$executeRawUnsafe(`
            UPDATE "MediaRequest" SET "model" = 'KLING_2_5_TURBO_PRO_KIEAI' WHERE "model" = 'KLING_2_5_TURBO_PRO';
        `);
        await prisma.$executeRawUnsafe(`
            UPDATE "MediaRequest" SET "model" = 'VEO_3_1_KIEAI' WHERE "model" = 'VEO_3_1';
        `);
        await prisma.$executeRawUnsafe(`
            UPDATE "MediaRequest" SET "model" = 'VEO_3_1_FAST_KIEAI' WHERE "model" = 'VEO_3_1_FAST';
        `);
        await prisma.$executeRawUnsafe(`
            UPDATE "MediaRequest" SET "model" = 'SEEDREAM_4_5_KIEAI' WHERE "model" = 'SEEDREAM_4_5';
        `);
        await prisma.$executeRawUnsafe(`
            UPDATE "MediaRequest" SET "model" = 'SEEDREAM_4_5_EDIT_KIEAI' WHERE "model" = 'SEEDREAM_4_5_EDIT';
        `);
        await prisma.$executeRawUnsafe(`
            UPDATE "MediaRequest" SET "model" = 'ELEVENLABS_MULTILINGUAL_V2_KIEAI' WHERE "model" = 'ELEVENLABS_MULTILINGUAL_V2';
        `);

        console.log('✅ Миграция успешно выполнена!');
    } catch (error) {
        console.error('❌ Ошибка при выполнении миграции:', error);
        throw error;
    } finally {
        await prisma.$disconnect();
        await pool.end();
    }
}

migrate();
