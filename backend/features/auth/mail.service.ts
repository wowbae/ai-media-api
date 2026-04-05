import nodemailer from 'nodemailer';
import { authConfig, serverConfig } from '../../config';

// Create generic transporter
const transporter = nodemailer.createTransport({
    host: authConfig.smtp.host,
    port: authConfig.smtp.port,
    secure: authConfig.smtp.port === 465,
    auth: {
        user: authConfig.smtp.user,
        pass: authConfig.smtp.pass,
    },
});

export async function sendPasswordResetEmail(email: string, token: string): Promise<boolean> {
    const resetLink = `${serverConfig.appUrl}/reset-password?token=${token}`;

    // Simple HTML template
    const html = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Сброс пароля AI Media</h2>
        <p>Вы (или кто-то другой) запросили сброс пароля для вашего аккаунта.</p>
        <p>Нажмите на кнопку ниже, чтобы задать новый пароль:</p>
        <p>
            <a href="${resetLink}" style="display: inline-block; background-color: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Сбросить пароль</a>
        </p>
        <p style="font-size: 12px; color: #666;">Ссылка действительна в течение 1 часа.</p>
        <p style="font-size: 12px; color: #666;">Если вы не запрашивали сброс, просто проигнорируйте это письмо.</p>
    </div>
    `;

    try {
        await transporter.sendMail({
            from: authConfig.smtp.from,
            to: email,
            subject: 'AI Media: Сброс пароля',
            html,
        });
        console.log(`[Mail] Password reset email sent to ${email}`);
        return true;
    } catch (error) {
        console.error(`[Mail] Error sending email to ${email}:`, error);
        return false;
    }
}
