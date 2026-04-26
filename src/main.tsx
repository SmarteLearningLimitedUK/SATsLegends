import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.tsx';
import './index.css';
import { installNativeGameGuards } from './utils/nativeGameGuards';
import { installNativeSyncDrain } from './storage/syncQueue';
import { installPressScale } from './utils/pressScale';

installNativeGameGuards();
installNativeSyncDrain();
installPressScale();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
);
