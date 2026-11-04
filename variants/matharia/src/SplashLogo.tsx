import React from 'react';
import {asset} from './assets';

/** The supplied wordmark is an independent transparent asset. */
export default function SplashLogo() {
  return <img className="website-splash-logo" src={asset('branding','logo_matharia')} alt="Matharia" draggable={false}/>;
}
