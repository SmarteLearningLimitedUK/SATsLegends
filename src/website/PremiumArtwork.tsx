import barrattSmall from '../assets/website/premium/barratt-480.webp';
import barrattLarge from '../assets/website/premium/barratt-1024.webp';
import mochiSmall from '../assets/website/premium/mochi-480.webp';
import mochiLarge from '../assets/website/premium/mochi-1024.webp';
import branSmall from '../assets/website/premium/bran-480.webp';
import branLarge from '../assets/website/premium/bran-1024.webp';
import vexSmall from '../assets/website/premium/vex-480.webp';
import vexLarge from '../assets/website/premium/vex-1024.webp';

const heroes = {
  barratt: { small: barrattSmall, large: barrattLarge, alt: 'Barratt, the deer archer, in his embroidered green cloak' },
  mochi: { small: mochiSmall, large: mochiLarge, alt: 'Mochi, the panda adventurer, in his red and gold outfit' },
  bran: { small: branSmall, large: branLarge, alt: 'Bran, the red dragon adventurer, in his leather armour' },
  vex: { small: vexSmall, large: vexLarge, alt: 'Vex, the green fox mage, in his purple cloak' },
};

/** The upgraded game's original artwork, exported at two sizes for the web. */
export default function PremiumArtwork({ hero, className, eager = false, sizes = '(max-width: 580px) 70vw, 340px' }: {
  hero: keyof typeof heroes; className?: string; eager?: boolean; sizes?: string;
}) {
  const art = heroes[hero];
  return <img className={className} src={art.large} srcSet={`${art.small} 480w, ${art.large} 1024w`}
    sizes={sizes} width={1024} height={1536} alt={art.alt} loading={eager ? 'eager' : 'lazy'} decoding="async" />;
}
