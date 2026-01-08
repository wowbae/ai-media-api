// Этот файл использовал модель User, которая удалена из схемы Prisma
// Функционал временно отключен

export interface newUser {
    telegramId: string;
    firstName: string;
    role: string;
}

// Заглушка - функционал отключен после удаления модели User
export async function saveUser(_info: newUser) {
    console.warn('saveUser: функционал отключен - модель User удалена из Prisma');
}
