import { readTextFile, writeTextFile, exists, BaseDirectory } from '@tauri-apps/plugin-fs';

const FILE_NAME = 'studyhub_data.json';

export async function saveLocalData(data: any): Promise<boolean> {
  try {
    const json = JSON.stringify(data, null, 2);
    await writeTextFile(FILE_NAME, json, { baseDir: BaseDirectory.AppData });
    return true;
  } catch (err) {
    console.error('Failed to write to local filesystem:', err);
    return false;
  }
}

export async function loadLocalData(): Promise<any | null> {
  try {
    const fileExists = await exists(FILE_NAME, { baseDir: BaseDirectory.AppData });
    if (!fileExists) return null;
    
    const content = await readTextFile(FILE_NAME, { baseDir: BaseDirectory.AppData });
    return JSON.parse(content);
  } catch (err) {
    console.error('Failed to read from local filesystem:', err);
    return null;
  }
}