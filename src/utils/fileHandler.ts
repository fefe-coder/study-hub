import { save } from '@tauri-apps/plugin-dialog';
import { writeTextFile } from '@tauri-apps/plugin-fs';

export async function exportNoteToMarkdown(title: string, content: string) {
  try {
    const filePath = await save({
      defaultPath: `${title.replace(/[^a-zA-Z0-9]/g, '_')}.md`,
      filters: [{ name: 'Markdown File', extensions: ['md'] }]
    });

    if (filePath) {
      await writeTextFile(filePath, `# ${title}\n\n${content}`);
      alert('Note exported successfully!');
    }
  } catch (err) {
    console.error('Failed to export note:', err);
  }
}