import assert from 'node:assert/strict';
import { LESSONS } from '../src/data/courses';
import { barBeats, ownMeasures, parseBar, parseToken, rhythmNotes } from '../src/theory/rhythmScore';
import { QUALITIES } from '../src/theory/chords';
import { chordAt, fitProgression, getProgression } from '../src/theory/progressions';
let n = 0;
const ok = (c: boolean, m: string) => { assert.ok(c, m); n++; };
// トークンの読み取り
ok(parseToken('8:5/as_').tie && parseToken('8:5/as_').accent && parseToken('8:5/as_').staccato, 'token flags');
ok(Math.abs(parseToken('t4').beats - 2 / 3) < 1e-9, 't4 is 2/3');
assert.throws(() => parseToken('7')); n++;
ok(parseToken('8:3>_').next && parseToken('8:3>_').tie && !parseToken('8:3').next, 'next-chord flag');
ok(parseToken('2:C/n').degree === 'C' && parseToken('2:C/n').noLabel && !parseToken('2:C').target, 'chord stack without labels');
ok(parseToken('1:C3').target === '3' && parseToken('1:C7/n').target === '7', 'chord stack with an answer note');
ok(parseToken('1:3/h').hidden && !parseToken('1:3').hidden, 'hidden answer flag');
assert.throws(() => parseToken('2:C_')); n++;
assert.throws(() => parseToken('1:C3/h')); n++;
assert.throws(() => parseToken('1:53')); n++;
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
    // 音名で書くレッスン(音階でつなぐ)は「3周目の音」を持たない
    for (const b of blocks.filter(() => !blocks.some((x) => x.bars.some((bar) => bar.includes(':='))))) {
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
    // 音名で書く譜面はコードの音以外も使い、キーを移すブロックは進行も移すので、下の「コードの音」の検査は対象外
    const freePitch = all.some((bar) => bar.includes(':=')) || blocks.some((b) => b.keyShift);
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
      if (!freePitch) ok(QUALITIES[chord.quality].tones.includes(((x.midi % 12) - (chord.rootOffset % 12) + 24) % 12), `${l.id}: chord tone at ${x.start}`);
      if (labels === 'degree' && x.label && !freePitch) ok(/^(1|♭?3|♭?5|♭{0,2}7|6|4)$/.test(x.label), `${l.id}: degree label ${x.label}`);
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
ok(perChapter.ch1 === 3 && perChapter.rhythm2 === 7, `rhythm: 3 basics in chapter 1, 7 real-solo lessons in chapter 3 (got ${perChapter.ch1}, ${perChapter.rhythm2})`);
ok(perChapter.ch5 === 4 && perChapter.ch6 === 4 && perChapter.tune === 3, `chapters 6-8 have 4, 4 and 3 lessons (got ${perChapter.ch5}, ${perChapter.ch6}, ${perChapter.tune})`);
ok(LESSONS.every((l) => l.steps.length === 1 && l.steps[0].content?.source === 'rhythm'), 'every lesson is one rhythm score');
// 枯葉: 長調・短調とも、7度から次の3度へ半音(か全音)で下りて着地する
for (const id of ['t8-phrase', 't8-chorus']) {
  const l = LESSONS.find((x) => x.id === id)!;
  const bars2 = l.steps[0].content!.rhythmBlocks!.flatMap((b) => b.bars);
  const prog = fitProgression(getProgression(l.progressionId), bars2.length);
  const ns = rhythmNotes(bars2, prog, 0, 'ja', 'degree');
  for (const beat of [4, 8, 20, 24]) {
    const i = ns.findIndex((x) => Math.abs(x.start - beat) < 1e-6);
    const c = prog.chords[ns[i].chordIndex];
    const is3rd = ((ns[i].midi - c.rootOffset) % 12 + 12) % 12 === QUALITIES[c.quality].tones[1];
    ok(i > 0 && is3rd && ns[i - 1].midi - ns[i].midi >= 1 && ns[i - 1].midi - ns[i].midi <= 2, `${id}: steps down into a 3rd at beat ${beat}`);
  }
}
ok(perChapter.phrases === 8 && perChapter.improv === 4, `chapters 3 and 4 have 8 phrase lessons and 4 improvising lessons (got ${perChapter.phrases}, ${perChapter.improv})`);
// 音名の直接指定と「自分の番」
ok(parseToken('8:=C#4').abs!.midi === 61 && parseToken('8:=C#4').abs!.sharp && parseToken('4:=Eb4').abs!.midi === 63, 'absolute pitch tokens');
ok(parseToken('own').own === true && barBeats('own') === 4 && ownMeasures(['r1', 'own', 'own']).join() === '1,2', 'own bars');
// 第3章のフレーズ: A(キーC)は Cmaj7 の1拍目で3度(E)に着地。B・C は同じ形を F・B♭ へ移したもの。D は出だしだけ書いて続きは自分
for (const l of LESSONS.filter((x) => x.chapterId === 'phrases')) {
  const blocks = l.steps[0].content!.rhythmBlocks!;
  ok(blocks.length === 4 && blocks[1].keyShift === 5 && blocks[2].keyShift === 10 && !blocks[0].keyShift, `${l.id}: C, F, B♭, then your own`);
  ok(blocks[1].bars.join('|') === blocks[0].bars.join('|') && blocks[2].bars.join('|') === blocks[0].bars.join('|'), `${l.id}: same phrase in every key`);
  ok(blocks[3].bars[0] === blocks[0].bars[0] && blocks[3].bars[1] === 'own' && blocks[3].bars[2] === 'own', `${l.id}: block D keeps the opening and leaves the rest to the player`);
  const all = blocks.flatMap((b) => b.bars);
  const shift = blocks.flatMap((b) => b.bars.map(() => b.keyShift ?? 0));
  const base = fitProgression(getProgression(l.progressionId), all.length);
  const prog = { ...base, chords: base.chords.map((c) => ({ ...c, rootOffset: c.rootOffset + shift[c.measure] })) };
  const ns = rhythmNotes(all, prog, 0, 'ja', 'degree', { shift, flats: shift.map((x) => x !== 0) });
  const inBlock = (i: number) => ns.filter((x) => x.start >= i * 16 && x.start < (i + 1) * 16);
  const [a, f, bb] = [inBlock(0), inBlock(1), inBlock(2)];
  ok(a.length === f.length && a.length === bb.length, `${l.id}: same number of notes in every key`);
  a.forEach((x, i) => {
    ok(f[i].midi - x.midi === 5 && bb[i].midi - x.midi === -2, `${l.id}: note ${i + 1} is transposed to F (+5) and B♭ (−2)`);
    ok(Math.abs(f[i].start - x.start - 16) < 1e-6 && Math.abs(f[i].duration - x.duration) < 1e-6, `${l.id}: note ${i + 1} keeps its rhythm`);
  });
  // 着地: 3小節目(Cmaj7)の1拍目が3度
  const land = a.find((x) => Math.abs(x.start - 8) < 1e-6)!;
  ok(!!land && land.midi % 12 === 4 && land.label === '3', `${l.id}: lands on the 3rd of Cmaj7 on beat 1 (got ${land?.midi}, ${land?.label})`);
  // G7の1拍目はコードの音(3度か5度)
  const g7 = a.find((x) => Math.abs(x.start - 4) < 1e-6)!;
  ok(!!g7 && ['3', '5'].includes(g7.label!), `${l.id}: G7 starts on a chord tone (got ${g7?.label})`);
  // 拍の頭(オモテ)に来る音はコードの音か9度(半音のアプローチは裏に置く)
  for (const x of a) if (Math.abs(x.start - Math.round(x.start)) < 1e-6) ok(/^(1|♭?3|5|♭?7|9)$/.test(x.label!), `${l.id}: on-beat note at ${x.start} is ${x.label}`);
}
ok(perChapter.ch2 === 10, `chapter 2 has 10 rhythm lessons: 5 basics, 4 choose-and-arrange, 1 blues (got ${perChapter.ch2})`);
// 「コードから3度/7度を探す」: リズムは使わず、1小節に1つ。
// 和音は4音のうち答えの音だけを鳴らして光らせ、記号だけの小節は答えを隠して鳴らさない
for (const [id, deg] of [['c2-find-third', 1], ['c2-find-seventh', 3]] as const) {
  const l = LESSONS.find((x) => x.id === id)!;
  const bars2 = l.steps[0].content!.rhythmBlocks!.flatMap((b) => b.bars);
  ok(bars2.every((bar) => parseBar(bar).length === 1 && parseBar(bar)[0].beats === 4), `${id}: one whole note per bar (no rhythm)`);
  const prog = fitProgression(getProgression(l.progressionId), bars2.length);
  const ns = rhythmNotes(bars2, prog, 0, 'ja', 'degree');
  const isAnswer = (x: (typeof ns)[number]) => {
    const c = prog.chords[x.chordIndex];
    return ((x.midi - c.rootOffset) % 12 + 12) % 12 === QUALITIES[c.quality].tones[deg];
  };
  for (let m = 0; m < bars2.length; m++) {
    const inBar = ns.filter((x) => Math.floor(x.start / 4 + 1e-6) === m);
    const lit = inBar.filter((x) => !x.silent);
    ok(lit.length === 1 && isAnswer(lit[0]), `${id} bar ${m + 1}: only the ${deg === 1 ? '3rd' : '7th'} is played and lit`);
    if (inBar.length === 4) ok(inBar.filter((x) => x.silent).length === 3, `${id} bar ${m + 1}: the other three stack notes are shown only`);
    else ok(lit[0].hidden === true && lit[0].label === '', `${id} bar ${m + 1}: symbol-only bar hides the answer`);
  }
}
console.log(`${n} rhythm assertions passed; ${lessons} lessons, ${bars} bars checked.`);
