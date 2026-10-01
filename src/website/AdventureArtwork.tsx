import { motion } from 'motion/react';
import { Swords } from 'lucide-react';
import barratt from '../assets/characters/mobile/Barratt/barratt_happy.png';
import { COHESIVE_ENEMIES } from '../assets/enemies/cohesive';
import valley from '../assets/website/adventure-valley-v1.webp';

export function AdventureBackdrop() {
  return <div className="website-world-backdrop" aria-hidden="true"><img src={valley} alt="" decoding="async" /></div>;
}

export default function AdventureArtwork() {
  return <motion.div className="website-encounter-scene" initial={{ opacity: 0, x: 18 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.7, delay: 0.15 }} role="img" aria-label="Barratt explores the forest ruins, where a goblin wizard, armoured rhino and cyclops slime await.">
    <div className="website-scene-character website-scene-rhino"><img src={COHESIVE_ENEMIES.rhino} alt="" decoding="async" /></div>
    <div className="website-scene-character website-scene-goblin"><img src={COHESIVE_ENEMIES.goblin} alt="" decoding="async" /></div>
    <div className="website-scene-character website-scene-cyclops"><img src={COHESIVE_ENEMIES.cyclopsSlime} alt="" decoding="async" /></div>
    <div className="website-scene-character website-scene-barratt"><img src={barratt} alt="" fetchPriority="high" /></div>
    <div className="website-encounter-caption" aria-hidden="true"><Swords size={16} /><span>A world of challenges awaits</span></div>
  </motion.div>;
}
