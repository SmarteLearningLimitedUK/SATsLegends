import gem from '../assets/fantasy_hero/ui/gem.png';
import coin from '../assets/fantasy_hero/ui/coin.png';
import cookie from '../assets/items/cookie.webp';
import sock from '../assets/items/sock.webp';

export function evidenceArtwork(name: string): string {
  const value = name.toLowerCase();
  return value.includes('cookie') ? cookie : value.includes('sock') ? sock : value.includes('coin') ? coin : gem;
}
