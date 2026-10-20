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
import './design/island-game-theme.css';
import { initializeNativeApp, IS_IOS_APP } from './platform/nativeApp';
import IOSAppBoundary from './platform/ios/IOSAppBoundary';
import './platform/native-app.css';
import './games/review-polish.css';
import './games/presentation-quality.css';
import './components/game-ui/viewport-question.css';
import './games/qa-readability-fixes.css';

void initializeNativeApp().catch(error => console.error('Native app initialization failed', error));

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <MotionConfig reducedMotion="user">
        {IS_IOS_APP ? <IOSAppBoundary><WebsiteRoot /></IOSAppBoundary> : <WebsiteRoot />}
      </MotionConfig>
    </BrowserRouter>
  </StrictMode>,
);
