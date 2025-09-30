import { promises as fs } from "fs";
import { dirname } from "path";

export async function readJsonFile<T>(path: string): Promise<T | undefined> {
  try {
    const raw = await fs.readFile(path, "utf8");
    return JSON.parse(raw) as T;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return undefined;
    }
    throw error;
  }
}

export async function writeJsonFile(path: string, data: unknown): Promise<void> {
  await fs.mkdir(dirname(path), { recursive: true });
  const serialized = `${JSON.stringify(data, null, 2)}\n`;
  await fs.writeFile(path, serialized, "utf8");
}
