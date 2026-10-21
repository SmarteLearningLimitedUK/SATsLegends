import { lazy, StrictMode, Suspense } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { MotionConfig } from 'motion/react';
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

const WebsiteRoot = lazy(() => import('./website/WebsiteRoot'));
const IOSAppRoot = lazy(() => import('./platform/ios/IOSAppRoot'));

void initializeNativeApp().catch(error => console.error('Native app initialization failed', error));

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <MotionConfig reducedMotion="user">
        <Suspense fallback={<p role="status">Opening SATs Legends…</p>}>
          {IS_IOS_APP ? <IOSAppBoundary><IOSAppRoot /></IOSAppBoundary> : <WebsiteRoot />}
        </Suspense>
      </MotionConfig>
    </BrowserRouter>
  </StrictMode>,
);
