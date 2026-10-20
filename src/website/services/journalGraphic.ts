import { articleUrl, Channel, JournalDraft, journalArt } from './journal';

export function socialText(draft: JournalDraft, channel: Channel) {
  return channel === 'instagram' ? draft.captions[channel] : `${draft.captions[channel]}\n\n${articleUrl(draft.slug)}`;
}

export async function downloadJournalGraphic(draft: JournalDraft) {
  await Promise.all([document.fonts.load('600 32px "Fredoka Variable"'), document.fonts.load('800 72px "Baloo 2"')]);
  const image = new Image(); image.src = journalArt[draft.artwork]; await image.decode();
  const canvas = document.createElement('canvas'); canvas.width = 1080; canvas.height = 1350;
  const ctx = canvas.getContext('2d'); if (!ctx) throw new Error('Image export is unavailable in this browser.');
  ctx.fillStyle = '#211044'; ctx.fillRect(0, 0, 1080, 1350);
  const ratio = Math.max(1080 / image.width, 670 / image.height);
  const width = image.width * ratio, height = image.height * ratio;
  ctx.save(); ctx.beginPath(); ctx.rect(0, 0, 1080, 670); ctx.clip();
  ctx.drawImage(image, (1080 - width) / 2, (670 - height) / 2, width, height); ctx.restore();
  ctx.fillStyle = '#ffe34e'; ctx.font = '600 29px "Fredoka Variable", sans-serif'; ctx.fillText('THE LEGENDS JOURNAL', 70, 744);
  const wrap = (font: number) => {
    ctx.font = `800 ${font}px "Baloo 2", sans-serif`;
    const lines: string[] = []; let line = '';
    for (const word of draft.title.split(/\s+/)) {
      // Split long unbroken titles too, so no text can escape the graphic.
      for (const part of word.match(/.{1,19}/gu) || ['']) {
        const candidate = line ? `${line} ${part}` : part;
        if (ctx.measureText(candidate).width > 940 && line) { lines.push(line); line = part; } else line = candidate;
      }
    }
    if (line) lines.push(line); return lines;
  };
  let size = 72, lines = wrap(size);
  while (lines.length * size * 1.15 > 390 && size > 38) { size -= 2; lines = wrap(size); }
  ctx.fillStyle = '#fff8ff'; lines.forEach((line, i) => ctx.fillText(line, 70, 840 + i * size * 1.15));
  ctx.fillStyle = '#ffe34e'; ctx.font = '600 32px "Fredoka Variable", sans-serif'; ctx.fillText('Read the story at satslegends.com/journal', 70, 1248);
  ctx.fillStyle = '#cdbde3'; ctx.font = '400 25px "Fredoka Variable", sans-serif'; ctx.fillText('SATs Legends · Big challenges. Brilliant minds.', 70, 1300);
  const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob(result => result ? resolve(result) : reject(new Error('Unable to export graphic.')), 'image/jpeg', .94));
  const url = URL.createObjectURL(blob); const anchor = document.createElement('a'); anchor.href = url; anchor.download = `${draft.slug || 'legends-journal'}-social.jpg`; anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
