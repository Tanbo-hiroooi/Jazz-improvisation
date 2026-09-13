import { useEffect, useMemo, useRef, useState } from 'react';
import { engine } from '../audio/engine';
import { chordSymbol } from '../theory/chords';
import { mod12, pcName } from '../theory/notes';
import type { Progression } from '../theory/progressions';
import type { Clef, NotationMode } from '../theory/instruments';
import type { GuitarPosition } from '../theory/guitar';
import { chordForBar, copyBarMapped, defaultPitch, gridToNoteEvents, palettesForGrid, stepPitch, type Articulation, type Division, type GridMaterial, type GridPhrase } from '../theory/grid';
import { convertEntryBeat, enterNote, entryNotes, moveNote, type EntryError } from '../theory/gridEntry';
import { pick, t as tr, type Lang } from '../i18n';
import { StaffView, type LabelMode } from './StaffView';

export interface GridEditorProps {
  lang: Lang; grid: GridPhrase; onChange: (next: GridPhrase) => void;
  progression: Progression; keyPc: number; flats: boolean; material: GridMaterial; divisions: Division[];
  fixedRhythm?: boolean; fixedPitch?: boolean; allowArticulation?: boolean;
  currentIndex?: number; onSelectedIndexChange?: (index: number) => void;
  visibleBar?: number; onVisibleBarChange?: (bar: number) => void;
  shift?: number; clef?: Clef; notation?: NotationMode;
  guitarPosition?: GuitarPosition; guitarOpenStrings?: boolean;
  onUndo?: () => void; onRedo?: () => void; canUndo?: boolean; canRedo?: boolean;
  labelMode?: LabelMode; onLabelModeChange?: (mode: LabelMode) => void;
  onFocus?: () => void;
  /** 使う音の素材を切り替えられるとき(自由練習・章まとめ)の選択肢。「音の高さ」の隣に出す */
  materialOptions?: GridMaterial[]; onMaterialChange?: (m: GridMaterial) => void;
}
export const MATERIAL_LABEL: Record<GridMaterial, Parameters<typeof tr>[1]> = {
  'root-only': 'materialRoot',
  'third-only': 'materialThird',
  'chord-tone': 'materialChordTone',
  'guide-tone': 'materialGuideTone',
  scale: 'materialScale',
  blues: 'materialBlues',
  chromatic: 'materialChromatic',
};
const VALUES = [
  { ticks: 48, ja: '全', en: 'Whole' },
  { ticks: 24, ja: '2分', en: 'Half' },
  { ticks: 12, ja: '4分', en: 'Quarter' },
  { ticks: 6, ja: '8分', en: '8th' },
  { ticks: 3, ja: '16分', en: '16th' },
];
const ERRORS: Record<EntryError, [string, string]> = {
  end: ['フレーズの終わりを越えます。短い音価を選んでください。', 'This passes the end of the phrase. Choose a shorter value.'],
  occupied: ['別の音と重なるため変更できません。先にその音を短くするか、休符にしてください。', 'Another note occupies this space. Shorten it or turn it into a rest first.'],
  division: ['この位置では選んだ長さを使えません。拍の頭を選ぶか、別の音価にしてください。', 'This value cannot fit at this position. Select a beat start or another value.'],
  tripletBoundary: ['3連の拍をまたぐ音は作れません。拍内に収まる長さにしてください。', 'A note cannot cross a triplet beat boundary. Keep it within the beat.'],
};

function DurationGlyph({ ticks }: { ticks: number }) {
  return <svg className="entry-glyph" width="20" height="28" viewBox="0 0 20 28" aria-hidden="true">
    <ellipse cx="6" cy="22" rx="5" ry="3" transform="rotate(-20 6 22)" fill={ticks >= 24 ? 'none' : 'currentColor'} stroke="currentColor" strokeWidth="1.8" />
    {ticks < 48 && <path d="M10 21 V3" fill="none" stroke="currentColor" strokeWidth="1.8" />}
    {ticks <= 6 && <path d="M10 3 Q20 8 15 16 Q17 9 10 8Z" fill="currentColor" />}
    {ticks <= 3 && <path d="M10 9 Q20 14 15 22 Q17 15 10 14Z" fill="currentColor" />}
  </svg>;
}

/** 4分休符の記号(音価ボタンと同じ見た目の小さなSVG) */
function RestGlyph() {
  return <svg className="entry-glyph" width="16" height="28" viewBox="0 0 16 28" aria-hidden="true">
    <path d="M5 2 L11 9 Q7.5 12 8 14 L12 19 Q7 17.5 7.5 21 Q8 24 10.5 26 Q4 24.5 5 20.5 Q6 17.5 9.5 17.5 L4.5 12 Q8 10 7.5 8 Z" fill="currentColor" />
  </svg>;
}

export function GridEditor({ lang, grid, onChange: onGridChange, progression, keyPc, flats, material, divisions,
  fixedRhythm, fixedPitch, allowArticulation, currentIndex = -1, onSelectedIndexChange,
  visibleBar, onVisibleBarChange, shift = 0, clef = 'treble', notation = 'staff', guitarPosition, guitarOpenStrings,
  onUndo, onRedo, canUndo, canRedo, labelMode = 'name', onLabelModeChange, onFocus, materialOptions, onMaterialChange,
}: GridEditorProps) {
  const t = (key: Parameters<typeof tr>[1]) => tr(lang, key);
  const p = (ja: string, en: string) => pick(lang, ja, en);
  const [localBar, setLocalBar] = useState(0);
  const bar = Math.max(0, Math.min(grid.bars.length - 1, visibleBar ?? localBar));
  // 全体譜が編集面。狭い画面では音符が小さくなるので、編集中の小節の拡大を補助として出せる(既定: 狭い画面だけON)
  const [zoomBar, setZoomBar] = useState(() => window.innerWidth < 620);
  // 全体譜の高さ上限は画面の高さから決める(入力パネルが同じ画面に残るように)
  const [viewportHeight, setViewportHeight] = useState(() => window.innerHeight);
  useEffect(() => {
    const onResize = () => setViewportHeight(window.innerHeight);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);
  const fullScoreHeight = Math.max(200, Math.min(440, Math.round(viewportHeight * 0.46)));
  const [cursor, setCursor] = useState(0);
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(12);
  const [dotted, setDotted] = useState(false);
  const [octave, setOctave] = useState(5); // concert MIDI 60–71
  // 次に入力する音に付ける表情(音を選んでいないときの表情ボタンの対象。音価と同じく選んだ状態が続く)
  const [pendingArtic, setPendingArtic] = useState<Articulation | undefined>(undefined);
  const [error, setError] = useState<EntryError | null>(null);
  const [preview, setPreview] = useState<{ base: GridPhrase; next: GridPhrase; beat: number } | null>(null);
  // ドラッグ中の仮の譜面(指を離したときだけ履歴に入れる)
  const [dragGrid, setDragGrid] = useState<GridPhrase | null>(null);
  const dragRef = useRef<{ start: number; cur: number; duration: number; midi: number; articulation?: Articulation; lastMidi: number; grid: GridPhrase } | null>(null);
  const [helpOpen, setHelpOpen] = useState(() => {
    try { return !localStorage.getItem('fc-grid-help-seen-v1'); } catch { return true; }
  });
  const notes = useMemo(() => entryNotes(grid), [grid]);
  // Musical time survives subdivision changes. A final end cursor belongs to the last bar.
  const at = cursor >= bar * 48 && (cursor < (bar + 1) * 48 || cursor === grid.bars.length * 48) ? cursor : bar * 48;
  const endOfPhrase = at >= grid.bars.length * 48;
  const positionLabel = (time: number) => {
    const beat = Math.floor(time % 48 / 12) + 1;
    const off = time % 12;
    if (off === 6) return p(`${beat}拍目の裏`, `Beat ${beat}, and`);
    if (off === 4 || off === 8) return p(`${beat}拍目・3連の${off / 4 + 1}つ目`, `Beat ${beat}, triplet ${off / 4 + 1}`);
    if (off) return p(`${beat}拍目・16分の${off / 3 + 1}つ目`, `Beat ${beat}, sixteenth ${off / 3 + 1}`);
    return p(`${beat}拍目`, `Beat ${beat}`);
  };
  const selected = editing ? notes.find(n => n.start === at) : undefined;
  const selectedIndex = selected ? notes.indexOf(selected) : -1;
  const beatIndex = Math.min(grid.bars.length * 4 - 1, Math.floor(at / 12));
  const triplet = grid.bars[Math.floor(beatIndex / 4)].beats[beatIndex % 4].division === 3;
  const duration = triplet ? 4 : (value === 4 ? 12 : value) * (dotted ? 1.5 : 1);
  const entryPositions = useMemo(() => {
    if (fixedRhythm) return notes.map(n => n.start);
    const times = new Set<number>([grid.bars.length * 48]);
    grid.bars.forEach((b, bi) => b.beats.forEach((bt, beat) => {
      const division = bt.division === 3 ? 3 : Math.max(bt.division, value === 3 ? 4 : value === 6 ? 2 : 1);
      for (let c = 0; c < division; c++) times.add(bi * 48 + beat * 12 + c * 12 / division);
    }));
    notes.forEach(n => { times.add(n.start); times.add(n.start + n.duration); });
    return [...times].filter(time => !notes.some(n => n.start < time && time < n.start + n.duration)).sort((a, b) => a - b);
  }, [grid, notes, fixedRhythm, value]);
  const previousPosition = [...entryPositions].reverse().find(time => time < at);
  const nextPosition = entryPositions.find(time => time > at);
  const palettes = useMemo(() => palettesForGrid(progression, keyPc, grid.bars.length, material, flats), [progression, keyPc, grid.bars.length, material, flats]);
  const pal = palettes[bar];
  const label = (midi: number) => `${pcName(mod12(midi + shift), flats)}${Math.floor((midi + shift) / 12) - 1}`;
  const displayedPitches = pal.filter(n => n.midi >= octave * 12 && n.midi < (octave + 1) * 12);
  const pitches = selected && !displayedPitches.some(n => n.midi === selected.midi)
    ? [...displayedPitches, { midi: selected.midi, label: '', degree: pal.find(n => n.midi === selected.midi)?.degree ?? '' }].sort((a, b) => a.midi - b.midi)
    : displayedPitches;
  const internalBarChange = useRef<number | null>(null);
  const positions = useRef(new WeakMap<GridPhrase, { time: number; editing: boolean }>());
  const emittedGrid = useRef(grid);
  const onChange = (next: GridPhrase, time = at, edit = editing) => {
    positions.current.set(grid, { time: at, editing });
    positions.current.set(next, { time, editing: edit });
    emittedGrid.current = next;
    onGridChange(next);
  };
  useEffect(() => { onSelectedIndexChange?.(selectedIndex); }, [selectedIndex, onSelectedIndexChange]);
  useEffect(() => {
    if (internalBarChange.current === bar) internalBarChange.current = null;
    else { setCursor(bar * 48); setEditing(false); }
    setError(null); setPreview(null);
  }, [bar]);
  useEffect(() => { setCursor(bar * 48); setEditing(false); setError(null); setPreview(null); }, [keyPc, material]); // reset on context changes only
  useEffect(() => {
    if (emittedGrid.current !== grid) {
      const saved = positions.current.get(grid);
      if (saved) move(saved.time, saved.editing);
      else setEditing(false);
    }
    emittedGrid.current = grid;
    setPreview(null); setError(null);
  }, [grid]);
  const move = (time: number, edit = false) => {
    setCursor(time); setEditing(edit); setError(null); setPreview(null);
    const nextBar = Math.min(grid.bars.length - 1, Math.floor(time / 48));
    if (nextBar !== bar) { internalBarChange.current = nextBar; setLocalBar(nextBar); onVisibleBarChange?.(nextBar); }
  };
  const select = (time: number) => {
    const n = notes.find(n => n.start <= time && time < n.start + n.duration);
    if (n) {
      move(n.start, true); setOctave(Math.floor(n.midi / 12));
      const base = VALUES.find(v => v.ticks === n.duration || v.ticks * 1.5 === n.duration);
      if (base) { setValue(base.ticks); setDotted(base.ticks !== n.duration); }
    } else move(time);
  };
  const editCell = (update: (cell: { midi?: number; articulation?: Articulation }) => void) => {
    const next = structuredClone(grid);
    const bt = next.bars[Math.floor(at / 48)].beats[Math.floor(at % 48 / 12)];
    update(bt.cells[Math.round(at % 12 / (12 / bt.division))]);
    onChange(next);
  };
  const submit = (midi: number | null, ticks = selected?.duration ?? duration) => {
    if (fixedRhythm) {
      if (!selected || midi === null) return;
      editCell(c => { c.midi = midi; });
    } else {
      const result = enterNote(grid, at, ticks, midi, divisions, editing ? undefined : pendingArtic);
      if ('error' in result) { setError(result.error); return; }
      onChange(result.grid, editing ? at : result.end, editing && midi !== null);
      if (!editing) move(result.end);
      else if (midi === null) setEditing(false);
    }
    setError(null);
    if (midi !== null) void engine.previewNote(midi);
  };
  const chooseValue = (ticks: number, dot: boolean) => {
    if (selected) {
      const result = enterNote(grid, at, ticks * (dot ? 1.5 : 1), selected.midi, divisions);
      if ('error' in result) { setError(result.error); return; }
      onChange(result.grid);
    }
    setValue(ticks === 4 ? 12 : ticks); setDotted(dot); setError(null);
  };
  const convert = () => {
    const division: Division = triplet ? (divisions.includes(2) ? 2 : divisions.find(d => d !== 3) ?? 1) : 3;
    const result = convertEntryBeat(grid, beatIndex, division, divisions);
    if ('error' in result) setError(result.error);
    else if (notes.some(n => n.start >= beatIndex * 12 && n.start < beatIndex * 12 + 12)) setPreview({ base: grid, next: result.grid, beat: beatIndex });
    else { onChange(result.grid, beatIndex * 12, false); move(beatIndex * 12); }
  };
  const scoreGrid = dragGrid ?? (preview?.base === grid ? preview.next : grid);

  /** 選んだ音の高さをパレット上で1段動かす(▲▼ボタン・↑↓キー) */
  const nudge = (start: number, dir: 1 | -1) => {
    if (fixedPitch) return;
    const n = notes.find(x => x.start === start);
    if (!n) return;
    const next = stepPitch(palettes[Math.floor(start / 48)], n.midi, dir);
    if (next === n.midi) return;
    const result = enterNote(grid, start, n.duration, next, divisions, n.articulation);
    if ('error' in result) { setError(result.error); return; }
    onChange(result.grid, start, true);
    move(start, true);
    setOctave(Math.floor(next / 12));
    void engine.previewNote(next);
  };

  /** 選んだ音を1オクターブ上下へ(同じ音名が使える音域にあるときだけ) */
  const octaveTarget = (start: number, dir: 1 | -1): number | null => {
    const n = notes.find(x => x.start === start);
    if (!n) return null;
    const target = n.midi + 12 * dir;
    return palettes[Math.floor(start / 48)].some(x => x.midi === target) ? target : null;
  };
  const shiftOctave = (start: number, dir: 1 | -1) => {
    if (fixedPitch) return;
    const n = notes.find(x => x.start === start);
    const target = octaveTarget(start, dir);
    if (!n || target === null) return;
    const result = enterNote(grid, start, n.duration, target, divisions, n.articulation);
    if ('error' in result) { setError(result.error); return; }
    onChange(result.grid, start, true);
    move(start, true);
    setOctave(Math.floor(target / 12));
    void engine.previewNote(target);
  };

  /** 位置のドラッグ先を、その音価に合う位置(8分・16分・3連)へ丸める */
  const snapTime = (beats: number, duration: number) => {
    const total = grid.bars.length * 48;
    const ticks = Math.round(beats * 12);
    const beat = Math.max(0, Math.min(grid.bars.length * 4 - 1, Math.floor(ticks / 12)));
    const division = grid.bars[Math.floor(beat / 4)].beats[beat % 4].division;
    const q = division === 3 ? 4 : duration % 6 === 0 ? 6 : 3;
    return Math.max(0, Math.min(total - duration, Math.round(ticks / q) * q));
  };

  const onDragNote = (index: number, d: { steps: number; time: number | null; phase: 'move' | 'end' }) => {
    if (preview) return;
    if (d.phase === 'end') {
      const drag = dragRef.current;
      dragRef.current = null;
      setDragGrid(null);
      if (drag && drag.grid !== grid) { onChange(drag.grid, drag.cur, true); move(drag.cur, true); }
      return;
    }
    if (!dragRef.current) {
      const n = notes[index];
      if (!n) return;
      dragRef.current = { start: n.start, cur: n.start, duration: n.duration, midi: n.midi, articulation: n.articulation, lastMidi: n.midi, grid };
      select(n.start);
    }
    const drag = dragRef.current;
    if (d.time === null) {
      if (fixedPitch) return;
      const pal = palettes[Math.floor(drag.start / 48)];
      let i0 = pal.findIndex(x => x.midi === drag.midi);
      if (i0 < 0) i0 = pal.reduce((b, x, i) => (Math.abs(x.midi - drag.midi) < Math.abs(pal[b].midi - drag.midi) ? i : b), 0);
      const target = pal[Math.max(0, Math.min(pal.length - 1, i0 + d.steps))].midi;
      if (target === drag.lastMidi) return;
      const result = enterNote(grid, drag.start, drag.duration, target, divisions, drag.articulation);
      if ('error' in result) return;
      drag.lastMidi = target; drag.grid = result.grid; drag.cur = drag.start;
      setDragGrid(result.grid);
      void engine.previewNote(target);
    } else {
      if (fixedRhythm) return;
      const to = snapTime(d.time, drag.duration);
      if (to === drag.cur) return;
      const result = moveNote(grid, drag.start, to, divisions);
      if ('error' in result) return;
      drag.cur = to; drag.grid = result.grid;
      setDragGrid(result.grid);
    }
  };
  const overviewChords = useMemo(() => progression.chords.map(c => ({
    measure: c.measure, beat: c.beat, rootPc: mod12(keyPc + c.rootOffset + shift), quality: c.quality,
    symbol: chordSymbol(mod12(keyPc + c.rootOffset + shift), c.quality, flats),
  })), [progression, keyPc, shift, flats]);
  const entryDivisions = useMemo(() => scoreGrid.bars[bar].beats.map(bt => bt.division), [scoreGrid, bar]);
  const scoreNotes = useMemo(() => gridToNoteEvents(scoreGrid).flatMap((n, index) => {
    const start = Math.max(n.start, bar * 4), end = Math.min(n.start + n.duration, (bar + 1) * 4);
    return end > start ? [{ ...n, start: start - bar * 4, duration: end - start, chordIndex: 0, originalIndex: index }] : [];
  }), [scoreGrid, bar]);
  const chords = useMemo(() => progression.chords.filter(c => c.measure === bar % progression.measures).map(c => ({
    measure: 0, beat: c.beat, rootPc: mod12(keyPc + c.rootOffset + shift), quality: c.quality,
    symbol: chordSymbol(mod12(keyPc + c.rootOffset + shift), c.quality, flats),
  })), [progression, bar, keyPc, shift, flats]);
  // 全体譜: ここが編集面。休符タップで入力位置、音符タップで修正、空いている場所のタップで小節移動
  const allDivisions = useMemo(() => scoreGrid.bars.flatMap(b => b.beats.map(bt => bt.division)), [scoreGrid]);
  const fullScoreNotes = useMemo(() => gridToNoteEvents(scoreGrid), [scoreGrid]);
  const fullScore = <div className="entry-full staff-card" aria-label={p('フレーズ全体の譜面', 'Score of the whole phrase')}>
    <StaffView notes={fullScoreNotes} measures={grid.bars.length} clef={clef} shift={shift} flats={flats} labelMode={labelMode} chords={overviewChords}
      currentIndex={preview ? -1 : currentIndex} selectedIndex={preview ? -1 : selectedIndex}
      selectedMeasure={bar} onSelectMeasure={b => { if (!preview && !dragGrid) move(b * 48); }}
      onSelectNote={index => { if (!preview && !dragGrid) select(notes[index].start); }}
      noteSelectLabel={index => p(`音符${index + 1}を編集`, `Edit note ${index + 1}`)}
      onDragNote={onDragNote}
      onNudgeNote={(index, dir) => { if (!preview && !dragGrid && notes[index]) nudge(notes[index].start, dir); }}
      entryDivisions={allDivisions} entryCursor={preview ? undefined : at / 12} entryFocusMeasure={bar}
      onSelectRest={fixedRhythm || preview || dragGrid ? undefined : start => move(Math.round(start * 12))}
      restSelectLabel={start => p(`${Math.floor(start / 4) + 1}小節${positionLabel(Math.round(start * 12))}の休符から入力`, `Enter at the rest: bar ${Math.floor(start / 4) + 1}, ${positionLabel(Math.round(start * 12))}`)}
      notation={notation === 'tab' ? 'staff-tab' : notation} guitarPosition={guitarPosition} guitarOpenStrings={guitarOpenStrings}
      fitHeight={fullScoreHeight} fitMaxZoom={1.3} />
  </div>;
  const detailScore = <div className="entry-detail" aria-label={p('編集中の小節の譜面', 'Score of the current bar')}>
    <StaffView notes={scoreNotes} measures={1} clef={clef} shift={shift} flats={flats} labelMode={labelMode} chords={chords}
      currentIndex={scoreNotes.findIndex(n => n.originalIndex === currentIndex)} selectedIndex={scoreNotes.findIndex(n => n.originalIndex === selectedIndex)}
      onSelectNote={index => { if (!preview) select(notes[scoreNotes[index].originalIndex].start); }}
      noteSelectLabel={index => p(`音符${index + 1}を編集`, `Edit note ${index + 1}`)}
      entryDivisions={entryDivisions} entryCursor={preview ? undefined : (at - bar * 48) / 12}
      onSelectRest={fixedRhythm || preview ? undefined : start => move(bar * 48 + Math.round(start * 12))}
      restSelectLabel={start => p(`${positionLabel(Math.round(start * 12))}の休符から入力`, `Enter at the rest: ${positionLabel(Math.round(start * 12))}`)}
      notation={notation === 'tab' ? 'staff-tab' : notation} guitarPosition={guitarPosition} guitarOpenStrings={guitarOpenStrings} fitHeight={notation !== 'staff' ? 230 : 150} fitMaxZoom={1.4} />
  </div>;

  return <div className="grid-editor step-entry">
    <div className="entry-view-head">
      {onLabelModeChange && <div className="seg-group entry-label-mode" role="group" aria-label={t('staffTitle')}>
        <button className={`seg${labelMode === 'none' ? ' on' : ''}`} aria-pressed={labelMode === 'none'} onClick={() => onLabelModeChange('none')}>{t('labelNone')}</button>
        <button className={`seg${labelMode === 'name' ? ' on' : ''}`} aria-pressed={labelMode === 'name'} onClick={() => onLabelModeChange('name')}>C D E</button>
        <button className={`seg${labelMode === 'degree' ? ' on' : ''}`} aria-pressed={labelMode === 'degree'} onClick={() => onLabelModeChange('degree')}>{t('labelDegree')}</button>
      </div>}
      <div className="entry-head-tools">
        <label className="toggle"><input type="checkbox" checked={zoomBar} onChange={e => setZoomBar(e.target.checked)} /> {t('entryZoomBar')}</label>
        {onFocus && <button className="btn tiny focus-open-btn" onClick={onFocus}>⛶ {t('focusOpen')}</button>}
      </div>
    </div>
    <p className="hint-text">{t('gridTapHint')}</p>
    {fullScore}
    <details className="grid-help" open={helpOpen} onToggle={e => {
      const open = e.currentTarget.open; setHelpOpen(open);
      if (!open) try { localStorage.setItem('fc-grid-help-seen-v1', '1'); } catch { /* optional preference */ }
    }}>
      <summary>{t('gridHelpTitle')}</summary>
      <ol className="grid-help-list">
        <li>{fixedRhythm ? t('gridHelp1Fixed') : t('gridHelp1')}</li>
        {!fixedPitch && <li>{t('gridHelp2')}</li>}
        {!fixedRhythm && <li>{t('gridHelp3')}</li>}
        {!fixedRhythm && divisions.includes(3) && <li>{t('gridHelp4')}</li>}
      </ol>
    </details>
    <div className="grid-bar-nav">
      <button className="btn" disabled={bar === 0} onClick={() => move((bar - 1) * 48)}>← {p('前の小節', 'Prev bar')}</button>
      <label className="entry-bar-picker">
        <span>{t('editorBarLabel')}</span>
        <select aria-label={t('editorBarLabel')} value={bar} onChange={e => move(Number(e.target.value) * 48)}>
          {grid.bars.map((_, b) => {
            const ch = chordForBar(progression, b);
            return <option key={b} value={b}>{b + 1} / {grid.bars.length} · {chordSymbol(mod12(keyPc + ch.rootOffset + shift), ch.quality, flats)}</option>;
          })}
        </select>
      </label>
      <button className="btn" disabled={bar === grid.bars.length - 1} onClick={() => move((bar + 1) * 48)}>{p('次の小節', 'Next bar')} →</button>
    </div>
    {preview && preview.base === grid ? <div className="entry-preview" role="group" aria-label={p('リズム変更の確認', 'Confirm rhythm change')}>
      {zoomBar && detailScore}
      <p>{p('上の譜面は変更後のプレビューです。音の位置と長さを変更します。適用しますか？', 'The score above previews the new timing and lengths. Apply this change?')}</p>
      <button className="btn" onClick={() => { onChange(preview.next, preview.beat * 12, false); move(preview.beat * 12); }}>{p('このリズムを適用', 'Apply rhythm')}</button>
      <button className="btn" onClick={() => setPreview(null)}>{p('キャンセル', 'Cancel')}</button>
    </div> : <>
      <div className="entry-workbench">
      {zoomBar && detailScore}
      <div className="entry-toolbar">
        <div className="entry-position-nav" role="group" aria-label={p('入力場所を移動', 'Move entry position')}>
          <button className="btn" disabled={previousPosition === undefined} onClick={() => previousPosition !== undefined && select(previousPosition)}>← {p('戻る', 'Back')}</button>
          <span className="entry-position-label" aria-live="polite"><i aria-hidden="true" />{endOfPhrase ? p('フレーズの終わり', 'End of phrase') : positionLabel(at)}</span>
          <button className="btn" disabled={nextPosition === undefined} onClick={() => nextPosition !== undefined && select(nextPosition)}>{p('進む', 'Forward')} →</button>
        </div>
        <div className="entry-status">
          <strong>{endOfPhrase ? p('入力完了', 'End of phrase') : p(`${bar + 1}小節 · ${selected ? '選んだ音を修正' : 'オレンジの線から入力'}`, `Bar ${bar + 1} · ${selected ? 'Edit selected note' : 'Enter at the orange line'}`)}</strong>
          <div className="seg-group">
            <button className="seg" onClick={() => { onUndo?.(); setEditing(false); }} disabled={!canUndo} aria-label={t('undoBtn')}>↩ {t('undoBtn')}</button>
            <button className="seg" onClick={() => { onRedo?.(); setEditing(false); }} disabled={!canRedo} aria-label={t('redoBtn')}>↪ {t('redoBtn')}</button>
          </div>
        </div>
        {error && <p className="entry-error" role="alert">{p(...ERRORS[error])}</p>}
        {fixedRhythm ? <p className="hint-text">{t('gridHelp1Fixed')}</p> : <>
          <div className="entry-values" role="group" aria-label={p('音符の長さ', 'Note duration')}>
            {VALUES.filter(v => divisions.length === 1 && divisions[0] === 1 ? v.ticks === 12 : v.ticks >= 12 || (v.ticks === 6 ? divisions.includes(2) || divisions.includes(4) : divisions.includes(4))).map(v =>
              <button className={`seg${!triplet && value === v.ticks ? ' on' : ''}`} aria-pressed={!triplet && value === v.ticks} key={v.ticks} disabled={triplet || endOfPhrase}
                onClick={() => chooseValue(v.ticks, dotted && v.ticks !== 48 && v.ticks !== 3 && (v.ticks !== 6 || divisions.includes(4)))}>
                <DurationGlyph ticks={v.ticks} />{p(v.ja, v.en)}
              </button>)}
            <button className={`seg${dotted && !triplet ? ' on' : ''}`} aria-pressed={dotted && !triplet}
              disabled={triplet || endOfPhrase || value === 48 || value === 3 || (value === 6 && !divisions.includes(4)) || (value === 12 && !divisions.some(d => d === 2 || d === 4))}
              onClick={() => chooseValue(value, !dotted)}>{p('付点', 'Dotted')} ·</button>
            {/* 休符は選んだ長さで入る。修正中の音なら、その音を休符にする */}
            <button className="seg entry-rest" disabled={endOfPhrase} onClick={() => submit(null)}>
              <RestGlyph />{selected ? t('toRest') : p('休符を入力', 'Enter rest')}
            </button>
          </div>
          {divisions.includes(3) && <button className="btn entry-triplet" disabled={endOfPhrase} onClick={convert}>{triplet ? p('この拍を通常に戻す', 'Use straight rhythm in this beat') : p('この拍を3連にする', 'Make this beat a triplet')}</button>}
          {triplet && <button className="btn" onClick={() => chooseValue(4, false)}>{p('3連8分音符（1/3拍）', 'Triplet eighth (1/3 beat)')}</button>}
        </>}
        {!fixedPitch && materialOptions && materialOptions.length > 1 && onMaterialChange && <div className="entry-material" role="group" aria-label={t('materialLabel')}>
          <span>{t('materialLabel')}</span>
          <div className="seg-group">
            {materialOptions.map(m => <button key={m} className={`seg${material === m ? ' on' : ''}`} aria-pressed={material === m} onClick={() => onMaterialChange(m)}>{t(MATERIAL_LABEL[m])}</button>)}
          </div>
        </div>}
        {!fixedPitch && <div className="entry-octave" role="group" aria-label={p('音の高さ', 'Pitch')}>
          <span>{p('音の高さ', 'Pitch')}</span>
          {/* 音を選んでいればその音を1オクターブ動かし、選んでいなければ次に入力する音域を切り替える */}
          <div className="seg-group">
            <button className="seg" onClick={() => (selected ? shiftOctave(selected.start, 1) : setOctave(octave + 1))}
              disabled={selected ? octaveTarget(selected.start, 1) === null : !pal.some(n => n.midi >= (octave + 1) * 12)}>⇧ {p('1オクターブ上へ', 'Octave up')}</button>
            <button className="seg" onClick={() => (selected ? shiftOctave(selected.start, -1) : setOctave(octave - 1))}
              disabled={selected ? octaveTarget(selected.start, -1) === null : !pal.some(n => n.midi < octave * 12)}>⇩ {p('1オクターブ下へ', 'Octave down')}</button>
          </div>
        </div>}
        {allowArticulation && <div className="entry-articulation" role="group" aria-label={t('articLabel')}>
          <span>{t('articLabel')}</span>
          {/* 音を選んでいればその音の表情、選んでいなければ次に入力する音の表情 */}
          <div className="seg-group">
            {([undefined, 'accent', 'staccato', 'tenuto'] as const).map((a, i) => {
              const current = selected ? selected.articulation : pendingArtic;
              return <button className={`seg${current === a ? ' on' : ''}`} key={a ?? 'normal'} aria-pressed={current === a}
                onClick={() => (selected ? editCell(c => { c.articulation = a; }) : setPendingArtic(a))}>{[t('articNormal'), `> ${t('articAccent')}`, `· ${t('articStaccato')}`, `– ${t('articTenuto')}`][i]}</button>;
            })}
          </div>
        </div>}
        <div className="entry-pitches" role="group" aria-label={p('音を入力', 'Enter a pitch')}>
          {fixedPitch ? <button className="btn primary" disabled={endOfPhrase} onClick={() => submit(selected?.midi ?? defaultPitch(pal))}>{p('音符を入力', 'Enter note')}</button>
            : pitches.map(n => <button className={`btn entry-pitch${selected?.midi === n.midi ? ' on' : ''}`} key={n.midi} aria-pressed={selected?.midi === n.midi}
              disabled={endOfPhrase || (fixedRhythm && !selected)} onClick={() => submit(n.midi)}><strong>{label(n.midi)}</strong><small>{n.degree || '　'}</small></button>)}
        </div>
      </div>
      </div>
    </>}
    {bar > 0 && !fixedRhythm && <button className="btn" onClick={() => {
      if (window.confirm(p('この小節を前の小節の形で置き換えますか？ 元に戻すこともできます。', 'Replace this bar with the previous bar’s shape? You can undo this.'))) { onChange(copyBarMapped(grid, bar - 1, bar, palettes)); move(bar * 48); }
    }}>⧉ {t('copyPrevBar')}</button>}
  </div>;
}
