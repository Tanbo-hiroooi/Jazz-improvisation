import assert from 'node:assert/strict';
import { LESSONS } from '../src/data/courses';
import { barBeats, parseToken, rhythmNotes } from '../src/theory/rhythmScore';
import { fitProgression, getProgression } from '../src/theory/progressions';
let n = 0;
const ok = (c: boolean, m: string) => { assert.ok(c, m); n++; };
// トークンの読み取り
ok(parseToken('8:5/as_').tie && parseToken('8:5/as_').accent && parseToken('8:5/as_').staccato, 'token flags');
ok(Math.abs(parseToken('t4').beats - 2 / 3) < 1e-9, 't4 is 2/3');
assert.throws(() => parseToken('7')); n++;
let lessons = 0, bars = 0;
for (const l of LESSONS) for (const st of l.steps) {
  if (st.content?.source !== 'rhythm') continue;
  lessons++;
  const blocks = st.content.rhythmBlocks ?? [];
  ok(blocks.length >= 3, `${l.id}: blocks`);
  const all = blocks.flatMap((b) => b.bars);
  for (const b of blocks) ok(b.bars.length === 4, `${l.id} ${b.label.ja}: 4 bars`);
  all.forEach((bar, i) => { bars++; ok(Math.abs(barBeats(bar) - 4) < 1e-6, `${l.id} bar ${i + 1} = ${barBeats(bar)} beats: ${bar}`); });
  // 3連は拍の中で閉じる(1/3の音は拍の境界をまたがない)。4分3連は2拍単位
  let pos = 0;
  for (const bar of all) for (const tok of bar.trim().split(/\s+/)) {
    const t = parseToken(tok);
    const third = Math.abs(t.beats - 1 / 3) < 1e-9;
    const twoThirds = Math.abs(t.beats - 2 / 3) < 1e-9;
    if (third) ok(Math.floor(pos + 1e-6) === Math.floor(pos + t.beats - 1e-6), `${l.id}: triplet 8th inside one beat at ${pos}`);
    if (twoThirds) ok(Math.floor(pos / 2 + 1e-6) === Math.floor((pos + t.beats) / 2 - 1e-6), `${l.id}: quarter triplet inside two beats at ${pos}`);
    pos += t.beats;
  }
  // 音符に変換でき、重なりがなく、進行の長さに収まる
  const prog = fitProgression(getProgression(l.progressionId), all.length);
  for (const lang of ['ja', 'en'] as const) {
    const notes = rhythmNotes(all, prog, 0, lang);
    ok(notes.length > 0, `${l.id}: notes`);
    notes.forEach((x, i) => {
      if (i > 0) ok(notes[i - 1].start + notes[i - 1].duration <= x.start + 1e-6, `${l.id}: no overlap at ${x.start}`);
      ok(x.start + x.duration <= all.length * 4 + 1e-6, `${l.id}: within the form`);
      ok(!!x.label, `${l.id}: scat label`);
      // 開始位置は1/12拍の格子ちょうど(3連の加算誤差を残さない)
      ok(x.start === Math.round(x.start * 12) / 12, `${l.id}: start on the 1/12-beat grid at ${x.start}`);
    });
  }
}
ok(lessons === 10, `chapter 1 has 10 rhythm lessons: 3 basics, 6 real-solo, 1 closing (got ${lessons})`);
console.log(`${n} rhythm assertions passed; ${lessons} lessons, ${bars} bars checked.`);
