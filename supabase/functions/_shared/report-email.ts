export function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character]!));
}
const count = (value: unknown) => typeof value === 'number' && Number.isFinite(value) ? Math.max(0, Math.round(value)) : 0;
type SavedProgress = { product_code: 'matharia' | 'english'; player?: any; updated_at?: string };
export function reportEmail(origin: string, children: { id: string; nickname: string; progress: SavedProgress[] }[]) {
  const sections = children.map(child => {
    const savedGames: SavedProgress[] = child.progress.some(saved => saved.product_code === 'matharia')
      ? child.progress : [{ product_code: 'matharia' }, ...child.progress];
    const games = savedGames.map(saved => {
      const name = saved.product_code === 'english' ? 'Lexcoria' : 'Matharia';
      const link = `${origin}/parent/progress/${encodeURIComponent(child.id)}${saved.product_code === 'english' ? '?game=english' : ''}`;
      const telemetry = saved.player?.telemetry;
      const correct = count(telemetry?.correctAnswers);
      const attempts = correct + count(telemetry?.incorrectAnswers);
      const summary = saved.updated_at
        ? `Level ${Math.max(1, count(saved.player?.level))} · ${count(telemetry?.sessionsPlayed)} sessions · ${attempts ? `${Math.round(correct / attempts * 100)}% answer accuracy` : 'No answers recorded yet'}`
        : 'No progress saved yet. This private page is ready when your child begins.';
      return { name, link, summary };
    });
    return {
      html: `<h2 style="color:#fde161;font-size:21px">${escapeHtml(child.nickname)}’s adventures</h2>${games.map(game => `<p><strong>${game.name}</strong> · ${game.summary}</p><p><a style="display:inline-block;background:#fde161;color:#090842;padding:14px 20px;border-radius:10px;font-weight:bold;text-decoration:none" href="${escapeHtml(game.link)}">View ${game.name} progress</a></p>`).join('')}`,
      text: `${child.nickname}'s adventures\n${games.map(game => `${game.name}: ${game.summary}\nView latest progress: ${game.link}`).join('\n')}`,
    };
  });
  return {
    subject: 'Your SATs Legends progress update',
    html: `<div style="background:#160e40;color:#f0eef7;font:16px/1.7 Arial,sans-serif;padding:32px;max-width:580px;margin:auto;border-radius:16px"><p style="color:#fde161;letter-spacing:2px;font-size:12px">SATS LEGENDS</p><h1 style="font-size:30px">Little steps. Legendary progress.</h1><p>Visit your child’s private progress page for their latest activity.</p>${sections.map(s => s.html).join('')}<p style="font-size:13px;color:#b6afe3">Any figures shown cover all recorded play. The private report updates as progress is saved. Log in with your parent account to view it.</p><p style="font-size:13px"><a style="color:#fde161" href="${origin}/parent">Manage report emails</a> · Sunday at 3 pm and Wednesday at 4 pm, UK time.</p></div>`,
    text: `SATs Legends\nYour child's progress\n\n${sections.map(s => s.text).join('\n\n')}\n\nAny figures shown cover all recorded play. Log in to view the private report at any time.\nManage report emails: ${origin}/parent\nSunday at 3 pm and Wednesday at 4 pm, UK time.`,
  };
}
