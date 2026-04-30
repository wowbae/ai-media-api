// Конфигурация frontend
export const config = {
    apiUrl: import.meta.env.VITE_API_URL || "http://localhost:4000/api/media",
    disableAuth: import.meta.env.VITE_DISABLE_AUTH !== "false",
} as const;
