import "dotenv/config";

export const authConfig = {
    jwtSecret: process.env.JWT_SECRET || "default-secret-do-not-use-in-prod",
    jwtExpiresIn: "7d",
    bcryptRounds: 10,
    resetTokenExpiresIn: 3600000, // 1 hour ms
    smtp: {
        host: process.env.SMTP_HOST || "smtp.example.com",
        port: parseInt(process.env.SMTP_PORT || "587"),
        user: process.env.SMTP_USER || "user",
        pass: process.env.SMTP_PASS || "pass",
        from: process.env.SMTP_FROM || "AI Media <noreply@ai-media.app>",
    },
    appUrl: process.env.APP_URL || "http://localhost:3000",
};
