import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { MotionConfig } from 'motion/react';
import WebsiteRoot from './website/WebsiteRoot.tsx';
import '@fontsource-variable/fredoka';
import '@fontsource/baloo-2/latin-600.css';
import '@fontsource/baloo-2/latin-700.css';
import '@fontsource/baloo-2/latin-800.css';
import './index.css';
import './design/legend-theme.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <MotionConfig reducedMotion="user">
        <WebsiteRoot />
      </MotionConfig>
    </BrowserRouter>
  </StrictMode>,
);
