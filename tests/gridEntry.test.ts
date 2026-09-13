import assert from 'node:assert/strict';
import { emptyGrid, initialGrid, gridToNoteEvents, type GridPhrase } from '../src/theory/grid';
import { enterNote, entryNotes, convertEntryBeat, moveNote, type EntryResult } from '../src/theory/gridEntry';
import { LESSONS } from '../src/data/courses';
import { PROGRESSIONS } from '../src/theory/progressions';
const divs = [1, 2, 3, 4] as const;
let assertions = 0;
const ok = (result: EntryResult) => { assert.ok('grid' in result, JSON.stringify(result)); assertions++; return result.grid; };
const eq = (a: unknown, b: unknown) => { assert.deepEqual(a, b); assertions++; };
const enter = (g: GridPhrase, at: number, duration: number, midi: number | null = 62) => ok(enterNote(g, at, duration, midi, [...divs]));
let g = emptyGrid(4);
g = enter(g, 0, 12); g = enter(g, 12, 6, 65); g = enter(g, 18, 6, 69); g = enter(g, 24, 12, null);
eq(entryNotes(g).map(n => [n.start, n.duration, n.midi]), [[0, 12, 62], [12, 6, 65], [18, 6, 69]]);
const original = JSON.stringify(g);
eq(enterNote(g, 0, 24, 62, [...divs]), { error: 'occupied' });
eq(JSON.stringify(g), original);
g = enter(g, 0, 6); eq(entryNotes(g)[0].duration, 6); eq(entryNotes(g)[1].start, 12);
g = enter(g, 0, 6, null); eq(entryNotes(g).length, 2);
g = enter(g, 42, 18); eq(entryNotes(g).at(-1)?.duration, 18); // cross-bar tie
eq(enterNote(g, 190, 12, 62, [...divs]), { error: 'end' });
eq(enterNote(g, 48, 6, 65, [...divs]), { error: 'occupied' }); // cannot split a hold accidentally
g = enter(emptyGrid(1), 0, 3, null); eq(g.bars[0].beats[0].division, 4);
g = enter(g, 3, 9); eq(entryNotes(g)[0].duration, 9);
g = ok(convertEntryBeat(emptyGrid(1), 0, 3, [...divs]));
for (const at of [0, 4, 8]) g = enter(g, at, 4);
eq(entryNotes(g).map(n => n.start), [0, 4, 8]);
eq(enterNote(g, 8, 12, 62, [...divs]), { error: 'tripletBoundary' });
eq(convertEntryBeat(g, 0, 2, [...divs]), { error: 'occupied' });
g = enter(emptyGrid(1), 0, 6); g = enter(g, 6, 6, 65);
g = ok(convertEntryBeat(g, 0, 3, [...divs]));
eq(entryNotes(g).map(n => [n.start, n.duration, n.midi]), [[0, 8, 62], [8, 4, 65]]);
// Every binary start/value combination must preserve exact timing and fixed bar structure.
for (let at = 0; at < 192; at += 3) for (const dur of [3, 6, 9, 12, 18, 24, 36]) {
  if (at + dur > 192) continue;
  const x = enter(emptyGrid(4), at, dur);
  eq(entryNotes(x).map(n => [n.start, n.duration]), [[at, dur]]);
  eq(x.bars.every(b => b.beats.length === 4 && b.beats.every(bt => bt.cells.length === bt.division)), true);
}
// Moving a note keeps its length, pitch and articulation, and refuses to land on another note.
g = enter(emptyGrid(2), 0, 12, 60); g = enter(g, 24, 12, 67);
g = ok(moveNote(g, 0, 6, [...divs]));
eq(entryNotes(g).map(n => [n.start, n.duration, n.midi]), [[6, 12, 60], [24, 12, 67]]); // slid onto the offbeat
eq(moveNote(g, 6, 20, [...divs]), { error: 'occupied' }); // would overlap the note at 24
eq(moveNote(g, 6, 6, [...divs]).hasOwnProperty('grid'), true); // no-op stays valid
g = ok(moveNote(g, 24, 84, [...divs])); eq(entryNotes(g).at(-1)?.start, 84); // into the next bar
eq(moveNote(g, 84, 90, [...divs]), { error: 'end' }); // past the phrase end
const acc = ok(enterNote(emptyGrid(1), 0, 12, 62, [...divs], 'accent'));
eq(entryNotes(ok(moveNote(acc, 0, 12, [...divs])))[0].articulation, 'accent');

// All curriculum initial phrases: changing one pitch must preserve other notes and timing.
let steps = 0;
for (const lesson of LESSONS) for (const step of lesson.steps) {
  if (!step.editable) continue;
  steps++;
  const e = step.editable, prog = PROGRESSIONS.find(p => p.id === lesson.progressionId)!;
  const initial = initialGrid(e.initial, e.bars, prog, 0, e.material, false, e.initialDivision ?? 2);
  const ns = entryNotes(initial);
  if (ns.length) {
    const n = ns[0];
    const result = ok(enterNote(initial, n.start, n.duration, n.midi + 12, e.divisions));
    eq(entryNotes(result).slice(1), ns.slice(1));
    eq(gridToNoteEvents(result).map(n => [n.start, n.duration]), gridToNoteEvents(initial).map(n => [n.start, n.duration]));
  }
}
console.log(`${assertions} assertions passed; ${steps} editable curriculum steps covered.`);
