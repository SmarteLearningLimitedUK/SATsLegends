import { useId } from 'react';
import splashPoster from '../assets/casual_ui/splashrep1.png';

/** Display the existing splash badge pixels, excluding the surrounding scene. */
export default function SplashLogo() {
  const clipId = useId();

  return <svg className="website-splash-logo" viewBox="138 198 742 448" aria-hidden="true" focusable="false">
    <defs><clipPath id={clipId} clipPathUnits="userSpaceOnUse">
      <path d="M510 202 L551 240 Q615 243 667 264 Q713 247 746 268 Q779 280 772 309 L758 372 L818 380 L815 389 L866 398 Q874 400 870 408 L835 467 L870 540 Q874 549 862 551 L787 548 Q801 566 776 578 L732 570 L610 566 L509 636 L415 564 L254 574 Q228 584 220 561 L219 548 L159 552 Q144 550 147 539 L181 469 L151 411 Q146 400 158 397 L204 388 L208 380 L254 372 Q244 341 249 312 Q246 292 271 274 Q303 252 354 258 L466 240 Z" />
    </clipPath></defs>
    <image href={splashPoster} width="1024" height="1536" clipPath={`url(#${clipId})`} />
  </svg>;
}
