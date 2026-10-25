import React, { useId, type CSSProperties } from 'react';
import seatedGuests from '../assets/share-splitter/party-guests-v2.webp';
import table from '../assets/share-splitter/banquet-table-v1.webp';
import { useTrimmedImageSource } from '../utils/trimTransparentImage';
import { getVisionObject } from './visionScene';

interface Props {
  rect: { left: number; top: number; width: number; height: number };
  positions: Array<{ x: number; y: number }>;
  counts: number[];
  celebrating: boolean;
  guestHeight: number;
}

// The existing banquet atlas contains five distinct seated monsters, not the player cast.
// Atlas silhouettes have unequal widths; explicit cells prevent neighbours leaking in.
const GUEST_CELLS = [[0, 212], [212, 400], [400, 594], [594, 775], [775, 1000]] as const;
const PARTY_ENEMIES = ['goblin', 'crystal-jelly', 'horned-slime', 'purple-monster', 'rhino'] as const;

/** Artwork layers share the interactive plates' coordinates at every viewport. */
export default function SharePartyTable({ rect, positions, counts, celebrating, guestHeight }: Props) {
  const clipPrefix = useId().replace(/:/g, '');
  const tableSource = useTrimmedImageSource(getVisionObject('banquet-table')??table);
  return <div className="share-party-scene" aria-hidden="true">
    {positions.map((point, index) => {
      const [cropLeft, cropRight] = GUEST_CELLS[index];
      const x = rect.width < 600 ? .1 + index * .2 : point.x;
      return <div key={index} className="share-party-guest" data-party-enemy={PARTY_ENEMIES[index]} data-party-posture="seated" data-served={counts[index] > 0}
        style={{ left: rect.left + x * rect.width, top: rect.top - guestHeight * .85 + rect.height * .035, width: guestHeight * .66, height: guestHeight, '--guest-delay': `${index * -.65}s` } as CSSProperties}>
        <svg className="share-party-chair" viewBox="0 0 100 150">
          <path d="M16 8Q50 -4 84 8V93H16Z" fill="#63412b" stroke="#d3a05d" strokeWidth="4" />
          <path d="M25 17V85M50 14V85M75 17V85" stroke="#a57340" strokeWidth="5" />
          <path d="M12 90H88V104H12ZM23 104V148M77 104V148" fill="#946031" stroke="#452e24" strokeWidth="5" />
        </svg>
        <div className="share-party-guest-idle">
          <div key={`${counts[index]}-${celebrating}`} className="share-party-guest-reaction" data-celebrating={celebrating} data-has-cake={counts[index] > 0}>
            <svg className="share-party-portrait" viewBox={`${cropLeft} 45 ${cropRight - cropLeft} 265`}>
              <defs><clipPath id={`${clipPrefix}-${index}`}><rect x={cropLeft} y="45" width={cropRight - cropLeft} height="265" /></clipPath></defs>
              <image href={seatedGuests} width="1000" height="333.333" clipPath={`url(#${clipPrefix}-${index})`} />
            </svg>
          </div>
        </div>
      </div>;
    })}
    <img src={tableSource} alt="" draggable={false} data-share-table data-share-tabletop className="share-party-table" style={rect} />
    <div className="share-party-sparks">{[6, 18, 82, 94].map((x, index) => <i key={x} style={{ left: `${x}%`, animationDelay: `${index * 1.7}s` }} />)}</div>
  </div>;
}
