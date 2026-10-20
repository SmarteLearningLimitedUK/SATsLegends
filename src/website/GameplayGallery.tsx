import { useEffect, useId, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Gamepad2, Maximize2, X } from 'lucide-react';
import { motion } from 'motion/react';
import numberScreenshot from '../assets/website/gameplay/place-value-panic-desktop.jpg';
import matchScreenshot from '../assets/website/gameplay/match3-equivalence-desktop.jpg';
import angleScreenshot from '../assets/website/gameplay/angle-arena-desktop.jpg';
import potionScreenshot from '../assets/website/gameplay/potion-panic-desktop.jpg';
import numberPreview from '../assets/website/gameplay/place-value-panic-desktop-preview.jpg';
import matchPreview from '../assets/website/gameplay/match3-equivalence-desktop-preview.jpg';
import anglePreview from '../assets/website/gameplay/angle-arena-desktop-preview.jpg';
import potionPreview from '../assets/website/gameplay/potion-panic-desktop-preview.jpg';
import './gameplay-gallery.css';

const games = [
  { title: 'Place Value Panic', topic: 'Number', image: numberScreenshot, preview: numberPreview, guide: 'number', description: 'Place digit stones into tens and units to rebuild a number.', alt: 'Place Value Panic gameplay: rebuild a number from digit stones while facing an armoured rhino.' },
  { title: 'Match Mastery', topic: 'Fractions', image: matchScreenshot, preview: matchPreview, guide: 'fractions', description: 'Match equivalent fractions on a colourful tile board.', alt: 'Match Mastery gameplay: coloured fraction tiles beside an adventurer in a sunlit forest courtyard.' },
  { title: 'Angle Arena', topic: 'Geometry', image: angleScreenshot, preview: anglePreview, guide: 'geometry', description: 'Work out the missing angle, then choose an answer to fire the cannon.', alt: 'Angle Arena gameplay: an angle question, four possible answers and a crystal cannon and a wizard on raised platforms in a frozen courtyard.' },
  { title: 'Potion Panic', topic: 'Ratio', image: potionScreenshot, preview: potionPreview, guide: 'ratio', description: 'Add the right number of drops to restore a potion’s ratio.', alt: 'Potion Panic gameplay: a ratio recipe, ingredient controls and a copper cauldron in a woodland workshop.' },
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
    <div className="gameplay-photo-dialog-content"><img src={game.image} alt={game.alt} width="2880" height="1800" /><div><p className="website-eyebrow">Actual gameplay</p><h2 id={titleId}>{game.title}</h2><p>{game.description}</p><Link className="website-text-link" to={`/revision?topic=${game.guide}`} onClick={onClose}>Explore this revision topic <ArrowRight size={17} /></Link></div></div>
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
      <div><p className="website-eyebrow"><Gamepad2 size={16} /> Actual Matharia gameplay</p><h2 id={titleId}>See the challenge.<br /><span>See the maths behind it.</span></h2><p>Number, fractions, geometry and ratio take different forms in Matharia. Open a screenshot to see the questions and controls your child will use.</p></div>
      <Link className="website-text-link" to="/subscriptions">Explore Matharia <ArrowRight size={18} /></Link>
    </motion.div>
    <ul className="gameplay-photo-list" aria-label="Matharia minigame screenshots">{games.map(game => <li key={game.title}>
      <figure><button type="button" className="gameplay-photo-button" onClick={event => { opener.current = event.currentTarget; setSelected(game); }} aria-label={`Enlarge ${game.title} screenshot`} aria-haspopup="dialog"><img src={game.preview} srcSet={`${game.preview} 1440w, ${game.image} 2880w`} sizes="(max-width: 760px) calc(100vw - 40px), (max-width: 1280px) calc((100vw - 96px) / 2), 578px" alt={game.alt} loading="lazy" decoding="async" width="1440" height="900" /><span><Maximize2 size={17} /><span>Take a closer look</span></span></button><figcaption><p className="website-eyebrow">{game.topic}</p><h3>{game.title}</h3><p>{game.description}</p></figcaption></figure>
    </li>)}</ul>
    <p className="gameplay-gallery-mobile-note">Tap a preview to open the full-size gameplay screenshot.</p>
    {selected && <PhotoViewer game={selected} onClose={closePhoto} />}
  </section>;
}
