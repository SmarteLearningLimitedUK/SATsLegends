import valley from '../assets/website/adventure-valley-v1.webp';

export function AdventureBackdrop() {
  return <div className="website-world-backdrop" aria-hidden="true"><img src={valley} alt="" decoding="async" /></div>;
}
