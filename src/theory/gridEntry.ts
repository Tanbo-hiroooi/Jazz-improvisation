// Step entry uses integer ticks (12 per beat) while keeping the saved GridPhrase format.
import { gridToNoteEvents, type Division, type GridPhrase, type Articulation } from './grid';

export const TICKS = 12;
export type EntryError = 'end' | 'occupied' | 'division' | 'tripletBoundary';
export type EntryResult = { grid: GridPhrase; end: number } | { error: EntryError };
export interface EntryNote { start: number; duration: number; midi: number; articulation?: Articulation }
export function entryNotes(grid: GridPhrase): EntryNote[] {
  return gridToNoteEvents(grid).map(n => ({ ...n, start: Math.round(n.start * TICKS), duration: Math.round(n.duration * TICKS) }));
}

/** Re-grid without moving a single attack or note ending. Refuse unrepresentable edits. */
function encode(grid: GridPhrase, notes: EntryNote[], divisions: Division[], forcedBeat?: { beat: number; division: Division }, entryBoundaries: number[] = []): GridPhrase | null {
  const bars = grid.bars.map((bar, b) => ({ beats: bar.beats.map((old, bt) => {
    const start = (b * 4 + bt) * TICKS;
    const boundaries = [...entryBoundaries, ...notes.flatMap(n => [n.start, n.start + n.duration])].filter(t => t > start && t < start + TICKS);
    const candidates = forcedBeat?.beat === b * 4 + bt ? [forcedBeat.division] : [old.division, ...divisions];
    const division = candidates.find(d => boundaries.every(t => (t - start) % (TICKS / d) === 0));
    if (!division) return null;
    return { division, cells: Array.from({ length: division }, (_, c) => {
      const at = start + c * TICKS / division;
      const n = notes.find(n => n.start <= at && at < n.start + n.duration);
      return !n ? { state: 'rest' as const } : at === n.start
        ? { state: 'attack' as const, midi: n.midi, articulation: n.articulation }
        : { state: 'hold' as const };
    }) };
  }) }));
  if (bars.some(b => b.beats.some(bt => !bt))) return null;
  return { bars: bars as GridPhrase['bars'] };
}

/** Replace only the note starting at `start`; never truncate or shift another note. */
export function enterNote(grid: GridPhrase, start: number, duration: number, midi: number | null, divisions: Division[], articulation?: Articulation): EntryResult {
  const end = start + duration;
  if (start < 0 || duration <= 0 || end > grid.bars.length * 48) return { error: 'end' };
  const notes = entryNotes(grid);
  const original = notes.find(n => n.start === start);
  const others = notes.filter(n => n !== original);
  if (others.some(n => n.start < end && n.start + n.duration > start)) return { error: 'occupied' };
  if (midi !== null) {
    const first = Math.floor(start / TICKS), last = Math.floor((end - 1) / TICKS);
    if (last > first && grid.bars.some((b, bi) => b.beats.some((bt, i) => {
      const beat = bi * 4 + i;
      return beat >= first && beat <= last && bt.division === 3;
    }))) return { error: 'tripletBoundary' };
    others.push({ start, duration, midi, articulation: articulation ?? original?.articulation });
  }
  const encoded = encode(grid, others, divisions, undefined, [start, end]);
  return encoded ? { grid: encoded, end } : { error: 'division' };
}

/** Convert one beat with a preview. Keep all pitches; reject collisions and crossing ties. */
export function convertEntryBeat(grid: GridPhrase, beat: number, division: Division, divisions: Division[]): EntryResult {
  const start = beat * TICKS, end = start + TICKS;
  if (!divisions.includes(division)) return { error: 'division' };
  const notes = entryNotes(grid);
  if (notes.some(n => (n.start < start && n.start + n.duration > start) || (n.start < end && n.start + n.duration > end))) return { error: 'tripletBoundary' };
  const step = TICKS / division;
  const converted = notes.map(n => {
    if (n.start < start || n.start >= end) return n;
    const s = start + Math.min(division - 1, Math.round((n.start - start) / step)) * step;
    const e = start + Math.min(division, Math.max((s - start) / step + 1, Math.round((n.start + n.duration - start) / step))) * step;
    return { ...n, start: s, duration: e - s };
  }).sort((a, b) => a.start - b.start);
  if (converted.some((n, i) => i > 0 && converted[i - 1].start + converted[i - 1].duration > n.start)) return { error: 'occupied' };
  const encoded = encode(grid, converted, divisions, { beat, division });
  return encoded ? { grid: encoded, end: start } : { error: 'division' };
}

/** Move the note starting at `start` to `to`, keeping its length, pitch and articulation. */
export function moveNote(grid: GridPhrase, start: number, to: number, divisions: Division[]): EntryResult {
  const note = entryNotes(grid).find(n => n.start === start);
  if (!note) return { error: 'occupied' };
  if (to === start) return { grid, end: start + note.duration };
  const removed = enterNote(grid, start, note.duration, null, divisions);
  if ('error' in removed) return removed;
  return enterNote(removed.grid, to, note.duration, note.midi, divisions, note.articulation);
}
