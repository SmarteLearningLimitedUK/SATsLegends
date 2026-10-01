import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { MotionConfig } from 'motion/react';
import WebsiteRoot from './website/WebsiteRoot.tsx';
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
