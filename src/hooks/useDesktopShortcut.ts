import { useEffect } from 'react';
import { register, unregister } from '@tauri-apps/plugin-global-shortcut';

export const useDesktopShortcut = (onToggleRecording: () => void) => {
  useEffect(() => {
    const setupShortcut = async () => {
      try {
        await register('CommandOrControl+Alt+R', (event) => {
          if (event.state === 'Pressed') {
            onToggleRecording();
          }
        });
      } catch (err) {
        console.error('Shortcut registration failed:', err);
      }
    };

    setupShortcut();

    return () => {
      unregister('CommandOrControl+Alt+R');
    };
  }, [onToggleRecording]);
};