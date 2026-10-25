from pathlib import Path
import json
from html import escape

root = Path('qa-artifacts/final-audio-qa')
audio = json.loads((root/'checks.json').read_text(encoding='utf-8'))
screens = {p: json.loads(Path(f'qa-artifacts/full-screen-qa/{p}-checks.json').read_text(encoding='utf-8')) for p in ['desktop','phone','iphone-webkit']}
assert len(audio) == 55 and sum(r['passed'] is True for r in audio) == 46 and sum(r.get('status') == 'unavailable' for r in audio) == 9, 'Audio sweep is incomplete or needs repair'
assert all(len(rows) == 71 and all(r['passed'] for r in rows) for rows in screens.values()), 'Screen sweep is incomplete or needs repair'
keys = {r['key'] for r in audio if r['profile']=='desktop'}
assert len(keys) == 37
recordings = next(r['recordings'] for r in audio if r.get('recordings'))
assert len(recordings) == 20
regressions = [r for r in audio if r['passed'] and r['key'] in ['time_keeper_cove','crystal_core','mirror_gate','matrix_match']]
assert len(regressions) == 8 and all(r.get('synthCancellation') for r in regressions)
assert all(r.get('realAnswers') and r.get('helpPractice') and r.get('mutePersistence') for r in regressions if r['key']=='time_keeper_cove')
assert all(r.get('paperReview') for r in regressions if r['key']!='time_keeper_cove')
desktop = {r['key']:r for r in screens['desktop']}
cards = ''.join(f'''<article><a href="../full-screen-qa/{escape(r['file'])}"><img loading="lazy" src="../full-screen-qa/{escape(r['file'])}" alt="{escape(key.replace('_',' '))}"></a><h3>{escape(key.replace('_',' ').title())}</h3><p><a href="../full-screen-qa/{escape(r['file'])}">Desktop</a> · <a href="../full-screen-qa/phone/{escape(r['captureId'])}.png">Landscape phone</a> · <a href="../full-screen-qa/iphone-webkit/{escape(r['captureId'])}.png">WebKit</a></p></article>''' for key,r in desktop.items())
mapping = ''.join(f"<tr><th>{escape(r['key'].replace('_',' '))}</th><td>{escape(', '.join(f'{e['effect']}: {e['clip']}' for e in r['effects']))}</td></tr>" for r in audio if r['profile']=='desktop')
options = ''.join(f'<option value="{escape(key)}">{escape(key.replace("_"," ").title())}</option>' for key in sorted(keys))
result = f'''<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Final screen and sound QA</title>
<style>body{{margin:0;background:#071d27;color:#ecf4ee;font:17px/1.6 system-ui}}main{{max-width:1280px;margin:auto;padding:32px}}h1{{font-size:clamp(30px,5vw,52px);line-height:1.1}}h2{{margin-top:44px}}a{{color:#ffdb8b}}p{{max-width:90ch}}.grid{{display:grid;grid-template-columns:repeat(auto-fit,minmax(330px,1fr));gap:24px}}img{{width:100%;border-radius:12px}}h3{{font-size:19px;margin:8px 0}}article p{{margin:0}}table{{border-collapse:collapse;width:100%;font-size:14px}}td,th{{border-bottom:1px solid #31505b;padding:12px;text-align:left}}th{{min-width:150px}}button,select{{padding:12px;margin:4px;background:#143b48;color:white;border:1px solid #92c3bd;border-radius:8px;font:inherit}}button:focus-visible,select:focus-visible{{outline:3px solid gold}}.pass{{color:#9ee2bd}}code{{font-size:14px}}.scroll{{overflow:auto}}</style>
<main><p>Matharia · SATs Legends · 20 October 2026</p><h1>Final screen and sound QA</h1>
<p class="pass"><strong>213 screen captures passed · 46 audio scenarios passed · 9 WebKit audio checks unavailable · 20 recordings decoded</strong></p>
<p>The fresh screen sweep covers 37 routed games, including all three Core papers, at first/practice and highest available levels: 71 captures on each of desktop, landscape phone and Windows WebKit. No actionable overlap, blocked controls, model overflow, missing assets or runtime errors were detected in these captures. Coordinate-grid labels deliberately sharing transparent hit areas are recorded as accepted annotations.</p>
<h2>Sound findings and repairs</h2><ul><li>Help practice now plays the appropriate success or error cue after checking an answer. Rechecking an unchanged answer does not replay the feedback.</li><li>Mute, pause and navigation cleanup now stop synthesised fallback tones and textures as well as recordings and engines. Hidden tabs cannot start fallback tones or engines.</li><li>Mock-paper review now announces itself once, avoiding an answer-sound burst when the whole paper is marked. Marks and answer events remain intact.</li></ul>
<p>All 37 routed games passed eight effect playback checks on desktop. Nine representative games also passed on landscape Chromium: clock, potion, shop, forge, racing, rocket and the three Core papers. Tests verified gesture-safe startup, actual audio-source playback, active-cue cancellation and silence while muted. All 20 recordings contain finite, non-silent PCM data.</p>
<p>Focused regressions exercised real correct/incorrect clock answers and multi-field Help answers, mute persistence after reload, cancellation of every synthesised source, and one review cue for each Core paper on desktop and landscape Chromium. These checks passed.</p>
<h2>Listen to the cue palette</h2><p>Choose a game, then preview its sounds. These buttons use the current game engine and respect your saved Sound setting. Previewing does not change game progress or sound preferences.</p><label>Game <select id="game">{options}</select></label><div id="audition">{''.join(f'<button type="button" data-cue="{effect}">{label}</button>' for effect,label in [('tap','Input'),('place','Place'),('cast','Action'),('impact','Impact'),('correct','Correct'),('incorrect','Incorrect'),('complete','Complete'),('fail','Try again')])}<button type="button" id="stop">Stop sounds</button></div><p id="sound-status" role="status">Ready for a preview.</p>
<h2>Other verification</h2><ul><li>TypeScript and production build passed. Vite retains its warning about large application chunks.</li><li>38 declared sound profiles, including generated packs, passed palette checks.</li><li>600 complete paper variants passed totals, timing, weighting, arithmetic and marking checks.</li><li>The question-integrity suite passed 70 challenge prompts and 12 independently checked data puzzles.</li><li>The added topic families passed 1,000 generated seeds and reachability checks.</li></ul>
<p>Scope: a final development QA pass, not a claim that every random question or full game run has been exercised. The Windows WebKit runner exposes no Web Audio API, so its nine audio scenarios are explicitly unavailable, not passes. Its 71 layout captures passed. Speaker/headphone balance and Safari sound playback still need a listening check on a physical iPhone before release.</p>
<h2>Newest screen captures</h2><div class="grid">{cards}</div>
<h2>Per-game cue mapping</h2><div class="scroll"><table><thead><tr><th>Game</th><th>Effect → recording or fallback</th></tr></thead><tbody>{mapping}</tbody></table></div>
<h2>Changed files and assumptions</h2><p>Source: <code>src/audio/gameAudio.ts</code>, <code>src/components/game-ui/RevisionWorkshop.tsx</code>, <code>src/App.tsx</code>, <code>src/games/BossEncounterGame.tsx</code>. QA: <code>scripts/verify-final-audio.mjs</code>, <code>scripts/build-final-audio-qa-report.py</code>, this report, its logs and refreshed screen captures.</p><p>Assumption: reinforce meaningful actions and feedback using the existing sound library and shared game architecture. No new artwork or unrelated systems were added. No external legacy assumptions were used.</p><p><a href="checks.json">Audio results</a> · <a href="../full-screen-qa/desktop-checks.json">Desktop geometry</a> · <a href="../full-screen-qa/phone-checks.json">Landscape geometry</a> · <a href="../full-screen-qa/iphone-webkit-checks.json">WebKit geometry</a></p></main>
<script type="module">
import {{configureGameSoundProfile,playGameSound,stopGameSoundEffects,unlockGameAudioFromGesture}} from '/src/audio/gameAudio.ts';
document.querySelector('#audition').addEventListener('click',event=>{{const cue=event.target.closest('[data-cue]')?.dataset.cue;if(!cue)return;configureGameSoundProfile(document.querySelector('#game').value);unlockGameAudioFromGesture();const played=playGameSound(cue);document.querySelector('#sound-status').textContent=played?'Preview: '+cue+'.':'Sound is muted. Enable Sound in the game, then return to this preview.';}});
document.querySelector('#stop').addEventListener('click',()=>{{stopGameSoundEffects();document.querySelector('#sound-status').textContent='Preview stopped.';}});
document.querySelector('#game').addEventListener('change',stopGameSoundEffects);
window.addEventListener('pagehide',stopGameSoundEffects);
</script></html>'''
(root/'index.html').write_text(result,encoding='utf-8')
print('Built final QA report: 213 screens, 46 audio passes, 9 WebKit audio checks unavailable, 37 games')
