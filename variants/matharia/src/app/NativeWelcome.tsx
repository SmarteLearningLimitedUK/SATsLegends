import { motion, useReducedMotion } from 'motion/react';
import { ArrowRight, UserRound } from 'lucide-react';
import { asset } from '../assets';
import { AdventureControlFrame } from '../shared/AdventureArtwork';

export default function NativeWelcome({ onStart, onAccount }: { onStart: () => void; onAccount: () => void }) {
  const reduced = useReducedMotion();
  return <main className="native-welcome" data-native-splash>
    <img className="native-welcome-scenery" src={asset('backgrounds', 'bg_acropolis_landscape')} alt="" draggable={false}/>
    <button className="native-welcome-account" type="button" onClick={onAccount}><UserRound size={18}/><span>Parent account</span></button>
    <motion.div className="native-welcome-brand" initial={reduced ? false : { opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .5 }}>
      <p>SATs Legends presents</p><img src={asset('branding', 'logo_matharia')} alt="Matharia" fetchPriority="high" draggable={false}/>
    </motion.div>
    <motion.img className="native-welcome-hero" src={asset('heroes', 'hero_barratt_host_v3')} alt="Barratt, your adventure guide" draggable={false}
      initial={reduced ? false : { opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .5, delay: .12 }}/>
    <motion.div className="native-welcome-actions" initial={reduced ? false : { opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .3, delay: .24 }}>
      <p>Your next adventure starts here.</p>
      <button className="adventure-button adventure-button--primary native-start" type="button" onClick={onStart}><AdventureControlFrame primary/><span>Start adventure</span><ArrowRight size={22}/></button>
      <small>Three practice games. Free to explore.</small>
    </motion.div>
  </main>;
}
