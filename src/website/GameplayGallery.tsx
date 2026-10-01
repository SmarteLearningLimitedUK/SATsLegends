import { useEffect, useId, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Gamepad2, Maximize2, X } from 'lucide-react';
import { motion } from 'motion/react';
import numberScreenshot from '../assets/website/gameplay/place-value-panic.jpg';
import matchScreenshot from '../assets/website/gameplay/match3-equivalence.jpg';
import angleScreenshot from '../assets/website/gameplay/angle-arena.jpg';
import potionScreenshot from '../assets/website/gameplay/potion-panic.jpg';
import './gameplay-gallery.css';

const games = [
  { title: 'Place Value Panic', topic: 'Number', image: numberScreenshot, guide: 'number', description: 'Put the number stones back in order using tens and units.', alt: 'Place Value Panic gameplay: rebuild a number from digit stones while facing an armoured rhino.' },
  { title: 'Match Mastery', topic: 'Fractions', image: matchScreenshot, guide: 'fractions', description: 'Match equivalent values on a colourful gem board.', alt: 'Match Mastery gameplay: a board of coloured gems labelled with fractions.' },
  { title: 'Angle Arena', topic: 'Geometry', image: angleScreenshot, guide: 'geometry', description: 'Work out the missing angle, then choose an answer to fire the cannon.', alt: 'Angle Arena gameplay: an angle question, four possible answers and a cannon in an icy landscape.' },
  { title: 'Potion Panic', topic: 'Ratio', image: potionScreenshot, guide: 'ratio', description: 'Add the right number of drops to restore a potion’s ratio.', alt: 'Potion Panic gameplay: a ratio recipe, two ingredient bottles and a cauldron in a forest apothecary.' },
] as const;
type GamePhoto = typeof games[number];

function PhotoViewer({ game, onClose }: { game: GamePhoto; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  useEffect(() => {
    if (!dialog.current?.open) dialog.current?.showModal();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = previousOverflow; };
  }, []);
  return <dialog ref={dialog} className="gameplay-photo-dialog" aria-labelledby={titleId} onClose={onClose} onClick={event => {
    if (event.target !== dialog.current) return;
    const bounds = dialog.current.getBoundingClientRect();
    if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) dialog.current.close();
  }}>
    <div className="gameplay-photo-dialog-header"><span>{game.topic} · Inside Matharia</span><button type="button" autoFocus onClick={() => dialog.current?.close()} aria-label="Close screenshot"><X size={22} /></button></div>
    <div className="gameplay-photo-dialog-content"><img src={game.image} alt={game.alt} width="780" height="1688" /><div><p className="website-eyebrow">Actual gameplay</p><h2 id={titleId}>{game.title}</h2><p>{game.description}</p><Link className="website-text-link" to={`/revision?topic=${game.guide}`} onClick={onClose}>Explore this revision topic <ArrowRight size={17} /></Link></div></div>
  </dialog>;
}

export default function GameplayGallery() {
  const titleId = useId();
  const opener = useRef<HTMLButtonElement | null>(null);
  const [selected, setSelected] = useState<GamePhoto | null>(null);
  const closePhoto = () => {
    setSelected(null);
    // Safari does not focus buttons on a pointer click, so restore explicitly.
    if (opener.current?.isConnected) opener.current.focus({ preventScroll: true });
  };
  return <section className="website-container gameplay-gallery" aria-labelledby={titleId}>
    <motion.div className="gameplay-gallery-heading" initial={{ y: 12 }} whileInView={{ y: 0 }} viewport={{ once: true }} transition={{ duration: 0.4 }}>
      <div><p className="website-eyebrow"><Gamepad2 size={16} /> A peek inside Matharia</p><h2 id={titleId}>Real challenges.<br /><span>Brilliant little adventures.</span></h2><p>See what children play, from rebuilding numbers to mixing potions. Tap a screenshot for a closer look.</p></div>
      <Link className="website-text-link" to="/subscriptions">Explore Matharia <ArrowRight size={18} /></Link>
    </motion.div>
    <ul className="gameplay-photo-list" aria-label="Matharia minigame screenshots">{games.map(game => <li key={game.title}>
      <figure><button type="button" className="gameplay-photo-button" onClick={event => { opener.current = event.currentTarget; setSelected(game); }} aria-label={`Enlarge ${game.title} screenshot`} aria-haspopup="dialog"><img src={game.image} alt={game.alt} loading="lazy" decoding="async" width="780" height="1688" /><span><Maximize2 size={17} /><span>Take a closer look</span></span></button><figcaption><p className="website-eyebrow">{game.topic}</p><h3>{game.title}</h3><p>{game.description}</p></figcaption></figure>
    </li>)}</ul>
    <p className="gameplay-gallery-mobile-note">Swipe through the four minigames, then tap to enlarge.</p>
    {selected && <PhotoViewer game={selected} onClose={closePhoto} />}
  </section>;
}
