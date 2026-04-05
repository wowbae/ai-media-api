import { mkdir, readdir, stat, writeFile, unlink } from "fs/promises";
import { existsSync } from "fs";
import path from "path";
import { mediaStorageConfig } from "./config";

const LORA_DIR_NAME = "loras";
const LORA_FILE_EXT = ".safetensors";
const MAX_LORA_FILE_SIZE_BYTES = 500 * 1024 * 1024;

function buildLoraPublicPath(filename: string): string {
    return `/media-files/${LORA_DIR_NAME}/${encodeURIComponent(filename)}`;
}

function getLoraDirectoryAbsolutePath(): string {
    return path.join(process.cwd(), mediaStorageConfig.basePath, LORA_DIR_NAME);
}

function sanitizeFilename(filename: string): string {
    const base = path.basename(filename).replace(/[^\w.-]/g, "_");
    if (!base.toLowerCase().endsWith(LORA_FILE_EXT)) {
        return `${base}${LORA_FILE_EXT}`;
    }
    return base;
}

export interface StoredLoraFile {
    filename: string;
    size: number;
    createdAt: string;
    url: string;
}

export async function ensureLoraStorage(): Promise<void> {
    const dir = getLoraDirectoryAbsolutePath();
    if (!existsSync(dir)) {
        await mkdir(dir, { recursive: true });
    }
}

export async function saveLoraBase64File(params: {
    filename: string;
    fileBase64: string;
}): Promise<StoredLoraFile> {
    await ensureLoraStorage();

    const safeFilename = sanitizeFilename(params.filename);
    if (!safeFilename.toLowerCase().endsWith(LORA_FILE_EXT)) {
        throw new Error("Поддерживаются только файлы .safetensors");
    }

    const cleanBase64 = params.fileBase64.replace(/^data:.*?;base64,/, "");
    const buffer = Buffer.from(cleanBase64, "base64");

    if (buffer.byteLength > MAX_LORA_FILE_SIZE_BYTES) {
        throw new Error("Файл слишком большой. Максимум 500MB");
    }

    const fullPath = path.join(getLoraDirectoryAbsolutePath(), safeFilename);
    await writeFile(fullPath, buffer);

    const fileStat = await stat(fullPath);
    const url = buildLoraPublicPath(safeFilename);

    return {
        filename: safeFilename,
        size: fileStat.size,
        createdAt: fileStat.birthtime.toISOString(),
        url,
    };
}

export async function listStoredLoraFiles(): Promise<StoredLoraFile[]> {
    await ensureLoraStorage();

    const dir = getLoraDirectoryAbsolutePath();
    const entries = await readdir(dir);
    const loraFiles = entries.filter((entry) =>
        entry.toLowerCase().endsWith(LORA_FILE_EXT),
    );

    const withStats = await Promise.all(
        loraFiles.map(async (filename) => {
            const fullPath = path.join(dir, filename);
            const fileStat = await stat(fullPath);
            return {
                filename,
                size: fileStat.size,
                createdAt: fileStat.birthtime.toISOString(),
                url: buildLoraPublicPath(filename),
            };
        }),
    );

    return withStats.sort(
        (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
}

export async function deleteStoredLoraFile(filename: string): Promise<void> {
    await ensureLoraStorage();
    const safeFilename = sanitizeFilename(filename);
    const fullPath = path.join(getLoraDirectoryAbsolutePath(), safeFilename);
    await unlink(fullPath);
}
