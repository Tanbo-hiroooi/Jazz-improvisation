import assert from 'node:assert/strict';
import { LESSONS } from '../src/data/courses';
import { barBeats, parseBar, parseToken, rhythmNotes } from '../src/theory/rhythmScore';
import { QUALITIES } from '../src/theory/chords';
import { chordAt, fitProgression, getProgression } from '../src/theory/progressions';
let n = 0;
const ok = (c: boolean, m: string) => { assert.ok(c, m); n++; };
// トークンの読み取り
ok(parseToken('8:5/as_').tie && parseToken('8:5/as_').accent && parseToken('8:5/as_').staccato, 'token flags');
ok(Math.abs(parseToken('t4').beats - 2 / 3) < 1e-9, 't4 is 2/3');
assert.throws(() => parseToken('7')); n++;
ok(parseToken('8:3>_').next && parseToken('8:3>_').tie && !parseToken('8:3').next, 'next-chord flag');
ok(parseToken('x4:3').slash && !parseToken('4:3').slash, 'slash flag');
ok(parseToken('2:C/n').degree === 'C' && parseToken('2:C/n').noLabel, 'chord stack without labels');
assert.throws(() => parseToken('2:C_')); n++;
assert.throws(() => parseToken('x2:C')); n++;
let lessons = 0, bars = 0;
const perChapter: Record<string, number> = {};
for (const l of LESSONS) for (const st of l.steps) {
  if (st.content?.source !== 'rhythm') continue;
  lessons++;
  perChapter[l.chapterId] = (perChapter[l.chapterId] ?? 0) + 1;
  const blocks = st.content.rhythmBlocks ?? [];
  // 第2章: 譜面に書いた音は、そのブロックの「3周目の音」の中だけ(説明と譜面を一致させる)
  if (l.chapterId === 'ch2') {
    ok(st.content.rhythmLabel === 'degree', `${l.id}: degree labels`);
    for (const b of blocks) {
      ok(!!b.free && b.free.length > 0, `${l.id} ${b.label.ja}: pass-3 notes`);
      for (const bar of b.bars) for (const t of parseBar(bar)) {
        // 縦に積んだ和音は「見るための」音なので対象外
        if (t.rest || t.degree === 'C') continue;
        const d = t.degree === '8' ? 'R' : t.degree;
        ok(b.free!.includes(d), `${l.id} ${b.label.ja}: ${d} is in its pass-3 notes ${b.free!.join(',')}`);
      }
    }
  }
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
  const labels = st.content.rhythmLabel === 'degree' ? 'degree' : 'scat';
  for (const lang of ['ja', 'en'] as const) {
    const notes = rhythmNotes(all, prog, 0, lang, labels);
    ok(notes.length > 0, `${l.id}: notes`);
    notes.forEach((x, i) => {
      // 和音(同じ時刻の音)どうしは重なってよい。それ以外は前の音と重ならない
      if (i > 0 && Math.abs(notes[i - 1].start - x.start) > 1e-6) ok(notes[i - 1].start + notes[i - 1].duration <= x.start + 1e-6, `${l.id}: no overlap at ${x.start}`);
      if (i > 0 && Math.abs(notes[i - 1].start - x.start) <= 1e-6) ok(Math.abs(notes[i - 1].duration - x.duration) < 1e-6, `${l.id}: chord tones share a length at ${x.start}`);
      ok(x.start + x.duration <= all.length * 4 + 1e-6, `${l.id}: within the form`);
      ok(typeof x.label === 'string', `${l.id}: label`);
      // 開始位置は1/12拍の格子ちょうど(3連の加算誤差を残さない)
      ok(x.start === Math.round(x.start * 12) / 12, `${l.id}: start on the 1/12-beat grid at ${x.start}`);
      // 鳴る音は、その音に付けたコード(chordIndex)の構成音。> の先取りは次の小節のコードになる
      const chord = prog.chords[x.chordIndex];
      ok(QUALITIES[chord.quality].tones.includes(((x.midi % 12) - (chord.rootOffset % 12) + 24) % 12), `${l.id}: chord tone at ${x.start}`);
      if (labels === 'degree' && x.label) ok(/^(1|♭?3|♭?5|♭{0,2}7|6|4)$/.test(x.label), `${l.id}: degree label ${x.label}`);
      if (labels === 'scat') ok(!!x.label, `${l.id}: scat label`);
    });
  }
  // > は次の小節の頭のコードを指す(先取りした音は次の小節の1拍目まで伸びている)
  const notes = rhythmNotes(all, prog, 0, 'ja', labels);
  let pos2 = 0;
  for (const bar of all) for (const tok of bar.trim().split(/\s+/)) {
    const t = parseToken(tok);
    if (t.next && !t.rest) {
      const m = Math.floor(pos2 / 4 + 1e-6);
      const x = notes.find((nn) => Math.abs(nn.start - pos2) < 1e-6)!;
      ok(prog.chords[x.chordIndex] === chordAt(prog, (m + 1) % prog.measures, 0), `${l.id}: anticipation uses the next chord at ${pos2}`);
      ok(x.start + x.duration > (m + 1) * 4 + 1e-6, `${l.id}: anticipation is tied into the next bar at ${pos2}`);
    }
    pos2 = Math.round((pos2 + t.beats) * 12) / 12;
  }
}
ok(perChapter.ch1 === 10, `chapter 1 has 10 rhythm lessons: 3 basics, 6 real-solo, 1 closing (got ${perChapter.ch1})`);
ok(perChapter.ch2 === 9, `chapter 2 has 9 rhythm lessons: 5 basics, 3 choose-and-arrange, 1 blues (got ${perChapter.ch2})`);
// 「コードから3度/7度を探す」: 和音は4音、スラッシュは鳴らさない正解として3度/7度を持つ
for (const [id, deg] of [['c2-find-third', 1], ['c2-find-seventh', 3]] as const) {
  const l = LESSONS.find((x) => x.id === id)!;
  const bars2 = l.steps[0].content!.rhythmBlocks!.flatMap((b) => b.bars);
  const prog = fitProgression(getProgression(l.progressionId), bars2.length);
  const ns = rhythmNotes(bars2, prog, 0, 'ja', 'degree');
  const firstBar = ns.filter((x) => x.start < 2);
  ok(firstBar.length === 4 && new Set(firstBar.map((x) => x.start)).size === 1, `${id}: bar 1 opens with a four-note stack`);
  const slashes = ns.filter((x) => x.slash);
  ok(slashes.length > 0, `${id}: has slash notes`);
  for (const x of slashes) {
    const c = prog.chords[x.chordIndex];
    ok(((x.midi - c.rootOffset) % 12 + 12) % 12 === QUALITIES[c.quality].tones[deg], `${id}: slash answer is the chord's ${deg === 1 ? '3rd' : '7th'} at ${x.start}`);
  }
}
console.log(`${n} rhythm assertions passed; ${lessons} lessons, ${bars} bars checked.`);
