import React from 'react';
import {asset} from '../assets';

/** The source is 256×192; its visible alpha bounds are 40,42–216,172. */
export default function GemArtwork() {
  return <svg className="adventure-gem-art" viewBox="36 38 184 138" preserveAspectRatio="xMidYMid meet" aria-hidden="true" focusable="false"><image href={asset('icons','icon_gem')} width="256" height="192"/></svg>;
}
