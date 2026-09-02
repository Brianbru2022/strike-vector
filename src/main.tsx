import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { INTERNAL_TOOLS_COMPILED } from './game/ReleaseFeatures';
import { applySaveArchive, createSaveArchive, exportSaveArchiveJson, parseSaveArchiveJson } from './game/SaveArchive';
import { initialisePlatformStorage, registerDesktopSnapshotProvider } from './game/PlatformRuntime';

if (INTERNAL_TOOLS_COMPILED) {
  void import('./game/EncounterHarness').then(({ installDevelopmentEncounterHarness }) => installDevelopmentEncounterHarness());
}

const start = async () => {
  registerDesktopSnapshotProvider(() => exportSaveArchiveJson(createSaveArchive(window.localStorage)));
  await initialisePlatformStorage((json, storage) => {
    const parsed = parseSaveArchiveJson(json);
    return parsed.ok && applySaveArchive(parsed.archive, storage).ok;
  });
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
};

void start().catch((error) => {
  console.error('Platform initialisation failed', error);
  createRoot(document.getElementById('root')!).render(<App />);
});
