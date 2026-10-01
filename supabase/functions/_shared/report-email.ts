export function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character]!));
}
const count = (value: unknown) => typeof value === 'number' && Number.isFinite(value) ? Math.max(0, Math.round(value)) : 0;
export function reportEmail(origin: string, children: { id: string; nickname: string; player?: any; updated_at?: string }[]) {
  const sections = children.map(child => {
    const link = `${origin}/parent/progress/${encodeURIComponent(child.id)}`;
    const telemetry = child.player?.telemetry;
    const correct = count(telemetry?.correctAnswers);
    const attempts = correct + count(telemetry?.incorrectAnswers);
    const summary = child.updated_at
      ? `Level ${Math.max(1, count(child.player?.level))} · ${count(telemetry?.sessionsPlayed)} sessions · ${attempts ? `${Math.round(correct / attempts * 100)}% answer accuracy` : 'No answers recorded yet'}`
      : 'Their adventure is ready whenever they are.';
    return {
      html: `<h2 style="color:#fde161;font-size:21px">${escapeHtml(child.nickname)}’s Matharia adventure</h2><p>${summary}</p><p><a style="display:inline-block;background:#fde161;color:#090842;padding:14px 20px;border-radius:10px;font-weight:bold;text-decoration:none" href="${escapeHtml(link)}">View latest progress</a></p>`,
      text: `${child.nickname}'s Matharia adventure\n${summary}\nView latest progress: ${link}`,
    };
  });
  return {
    subject: 'Your SATs Legends progress update',
    html: `<div style="background:#160e40;color:#f0eef7;font:16px/1.7 Arial,sans-serif;padding:32px;max-width:580px;margin:auto;border-radius:16px"><p style="color:#fde161;letter-spacing:2px;font-size:12px">SATS LEGENDS · MATHARIA</p><h1 style="font-size:30px">Little steps. Legendary progress.</h1><p>Here’s the latest saved progress from your family’s adventures.</p>${sections.map(s => s.html).join('')}<p style="font-size:13px;color:#b6afe3">These figures cover all recorded play. The private report updates as progress is saved. Log in with your parent account to view it.</p><p style="font-size:13px"><a style="color:#fde161" href="${origin}/parent">Manage report emails</a> · Sunday at 3 pm and Wednesday at 4 pm, UK time.</p></div>`,
    text: `SATs Legends · Matharia\nLatest saved progress\n\n${sections.map(s => s.text).join('\n\n')}\n\nFigures cover all recorded play. Log in to view the private report at any time.\nManage report emails: ${origin}/parent\nSunday at 3 pm and Wednesday at 4 pm, UK time.`,
  };
}
