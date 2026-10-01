// Rebuild the local, silent visual lessons. No remote media or external account is used.
import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const output = path.resolve('public/lessons');
const format = process.env.LEGENDS_LESSON_FORMAT || 'mp4';
const lessons = [
  { id: 'place-value', title: 'Place value, unlocked', slides: [
    ['Every digit has a place.', 'Read the columns from thousands down to ones.'],
    ['In 3,472, the 4 is worth 400.', 'The digit 4 sits in the hundreds column.'],
    ['The same digit. A different value.', 'In 4,372, the 4 is worth 4,000. Position matters.'],
    ['Your turn: what is the 7 worth in 3,472?', 'It is in the tens column. So 7 × 10 = 70.'],
  ] },
  { id: 'fractions', title: 'One fraction. Three ways.', slides: [
    ['Three out of four equal parts.', 'The denominator is 4. The numerator is 3.'],
    ['Turn the fraction into a decimal.', '3 ÷ 4 = 0.75'],
    ['Turn the decimal into a percentage.', '0.75 × 100 = 75%'],
    ['One amount, three ways to write it.', 'Remember: 3/4 = 0.75 = 75%'],
  ] },
  { id: 'angles', title: 'Find the missing angle', slides: [
    ['A straight line is 180°.', 'The angles above this line must add up to 180°.'],
    ['One angle is 125°.', 'What is left for the missing angle?'],
    ['Subtract the angle you know.', '180° − 125° = 55°'],
    ['Check that the angles add up.', '125° + 55° = 180°. Puzzle solved!'],
  ] },
];

await mkdir(output, { recursive: true });
const browser = await chromium.launch({ headless: true });
try {
  await Promise.all(lessons.map(async lesson => {
    const page = await browser.newPage();
    const recording = await page.evaluate(async lesson => {
      const canvas = document.createElement('canvas');
      canvas.width = 960; canvas.height = 540;
      document.body.append(canvas);
      const ctx = canvas.getContext('2d');
      const chunks = [];
      const stream = canvas.captureStream(24);
      const mimeType = lesson.format === 'mp4' ? 'video/mp4;codecs=avc1.42E01E' : 'video/webm;codecs=vp8';
      const recorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 650000 });
      const finished = new Promise(resolve => { recorder.onstop = async () => {
        const blob = new Blob(chunks, { type: mimeType });
        const reader = new FileReader(); reader.onload = () => resolve(String(reader.result).split(',')[1]); reader.readAsDataURL(blob);
      }; });
      recorder.ondataavailable = event => { if (event.data.size) chunks.push(event.data); };
      let start;
      function text(content, x, y, size = 28, color = '#f6f4e9', align = 'left', bold = false) {
        ctx.fillStyle = color; ctx.font = `${bold ? '700' : '400'} ${size}px sans-serif`; ctx.textAlign = align; ctx.fillText(content, x, y);
      }
      function draw(now) {
        if (!start) start = now;
        const elapsed = Math.min((now - start) / 1000, 32);
        const index = Math.min(Math.floor(elapsed / 8), 3);
        const progress = (elapsed % 8) / 8;
        const [heading, caption] = lesson.slides[index];
        const background = ctx.createLinearGradient(0, 0, 960, 540); background.addColorStop(0, '#123955'); background.addColorStop(1, '#081b30');
        ctx.fillStyle = background; ctx.fillRect(0, 0, 960, 540);
        text('SATs LEGENDS', 48, 51, 22, '#ffd56b', 'left', true);
        text('VISUAL LESSON', 912, 51, 13, '#79e0ee', 'right');
        text(lesson.title, 48, 109, 38, '#f6f4e9', 'left', true);
        text(heading, 48, 159, 25, '#b7d3e7');
        if (lesson.id === 'place-value') {
          const digits = index === 2 ? ['4', '3', '7', '2'] : ['3', '4', '7', '2'];
          const labels = ['THOUSANDS', 'HUNDREDS', 'TENS', 'ONES'];
          const highlight = index === 2 ? 0 : index === 3 ? 2 : 1;
          for (let i = 0; i < 4; i++) {
            const x = 135 + i * 180;
            ctx.fillStyle = i === highlight ? '#ffd56b' : '#204967'; ctx.beginPath(); ctx.roundRect(x, 219, 150, 132, 12); ctx.fill();
            text(labels[i], x + 75, 203, 14, '#98bed8', 'center');
            text(digits[i], x + 75, 313, 82, i === highlight ? '#122f48' : '#d3e8f5', 'center', true);
          }
          text(index === 2 ? '4 × 1,000 = 4,000' : index === 3 ? '7 × 10 = 70' : '4 × 100 = 400', 480, 411, 37, '#79e0ee', 'center', true);
        } else if (lesson.id === 'fractions') {
          for (let i = 0; i < 4; i++) {
            ctx.fillStyle = i < 3 ? '#ffd56b' : '#254c68'; ctx.beginPath(); ctx.roundRect(155 + i * 164, 229, 151, 87, 8); ctx.fill();
          }
          text(index === 0 ? '3/4' : index === 1 ? '3/4 = 0.75' : '3/4 = 0.75 = 75%', 480, 403, 48, '#79e0ee', 'center', true);
        } else {
          ctx.strokeStyle = '#79e0ee'; ctx.lineWidth = 7; ctx.lineCap = 'round';
          ctx.beginPath(); ctx.moveTo(180, 351); ctx.lineTo(780, 351); ctx.stroke();
          if (index > 0) { ctx.beginPath(); ctx.moveTo(480, 351); ctx.lineTo(606, 171); ctx.stroke(); }
          ctx.strokeStyle = '#ffd56b'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(480,351,83,Math.PI,Math.PI*2); ctx.stroke();
          if (index === 0) text('180°',480,275,48,'#ffd56b','center',true);
          else { text('125°',352,277,41,'#ffd56b','center',true); text(index < 2 ? '?' : '55°',620,310,41,'#ffd56b','center',true); }
          text(index < 2 ? 'Known angle + missing angle = 180°' : '180° − 125° = 55°',480,419,30,'#c4dcea','center');
        }
        text(caption, 480, 482, 21, '#edf5fa', 'center');
        for (let i = 0; i < 4; i++) { ctx.fillStyle = i <= index ? '#ffd56b' : '#31516a'; ctx.fillRect(48 + i * 216, 518, 195 * (i === index ? .15 + .85 * progress : 1), 4); }
        if (elapsed < 32) requestAnimationFrame(draw); else recorder.stop();
      }
      recorder.start(); requestAnimationFrame(draw);
      const result = await finished;
      stream.getTracks().forEach(track => track.stop());
      return result;
    }, { ...lesson, format });
    await writeFile(path.join(output, lesson.id + '.' + format), Buffer.from(recording, 'base64'));
    const captions = lesson.slides.map(([heading, caption], index) => {
      const format = seconds => `00:00:${String(seconds).padStart(2, '0')}.000`;
      return `${index + 1}\n${format(index * 8)} --> ${format((index + 1) * 8)} line:90% align:center\n${heading}\n${caption}\n`;
    }).join('\n');
    await writeFile(path.join(output, lesson.id + '.vtt'), 'WEBVTT\n\n' + captions);
    await page.close();
    console.log(`Created ${lesson.id}.${format} and English captions`);
  }));
} finally { await browser.close(); }
