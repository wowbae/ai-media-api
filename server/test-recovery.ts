// Тестовый скрипт для проверки восстановления незавершенных задач
import { recoverUnfinishedTasks } from './features/media/generation.service';
import { prisma } from '../prisma/client';
import dotenv from 'dotenv';

dotenv.config();

async function testRecovery() {
  try {
    console.log('🧪 Тест восстановления незавершенных задач\n');

    // Проверяем подключение к БД
    console.log('📊 Проверка структуры БД...');
    const requests = await prisma.mediaRequest.findMany({
      where: {
        status: 'PROCESSING',
      },
      select: {
        id: true,
        status: true,
        model: true,
        taskId: true,
        prompt: true,
        createdAt: true,
      },
      take: 5,
    });

    console.log(`✅ Найдено PROCESSING задач: ${requests.length}\n`);

    if (requests.length > 0) {
      console.log('📋 Список незавершенных задач:');
      requests.forEach((req) => {
        console.log(`  - Request #${req.id}:`);
        console.log(`    Model: ${req.model}`);
        console.log(`    TaskId: ${req.taskId || 'НЕТ'}`);
        console.log(`    Prompt: ${req.prompt.substring(0, 50)}...`);
        console.log(`    Created: ${req.createdAt.toISOString()}`);
        console.log('');
      });
    }

    console.log('🔄 Запуск функции восстановления...\n');
    await recoverUnfinishedTasks();

    console.log('\n✅ Тест завершен успешно!');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Ошибка при тестировании:', error);
    process.exit(1);
  }
}

testRecovery();
