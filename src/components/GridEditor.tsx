// 拍グリッドエディタ: 1小節=4拍の固定枠をマスで埋めるリズム/フレーズ編集UI
// - マスをタップ → 音を置く(●)+選択。すでに●のマスはタップで選択のみ
// - 選択中の●: ▲▼で使用可能音セット内を移動 / のばす / 縮める / 休符にする
// - 拍ごとの分割切替(4分/8分/3連/16分)。「のばす」は分割の異なる拍を越えない
// - 合計は構造上つねに4拍×小節数: 拍数計算・超過は起きない

import { useState } from 'react';
import type { Progression } from '../theory/progressions';
import { chordSymbol } from '../theory/chords';
import { mod12 } from '../theory/notes';
import {
  attackPositions,
  chordForBar,
  copyBarMapped,
  defaultPitch,
  emptyBeat,
  palettesForGrid,
  stepPitch,
  type Articulation,
  type Division,
  type GridCell,
  type GridMaterial,
  type GridPhrase,
} from '../theory/grid';
import { pick, t as tr, type Lang } from '../i18n';

export interface GridEditorProps {
  lang: Lang;
  grid: GridPhrase;
  onChange: (next: GridPhrase) => void;
  progression: Progression;
  keyPc: number;
  flats: boolean;
  material: GridMaterial;
  /** 許可する拍分割 */
  divisions: Division[];
  /** リズム固定(セル状態は変更不可、ピッチのみ) */
  fixedRhythm?: boolean;
  /** ピッチ固定(1音課題: ピッチUIを出さない) */
  fixedPitch?: boolean;
  /** アーティキュレーション編集を許可 */
  allowArticulation?: boolean;
  /** 再生中のattack通し番号(-1: なし) */
  currentIndex?: number;
}

interface CellPos { bar: number; beat: number; cell: number }

const DIV_LABEL: Record<Division, { ja: string; en: string }> = {
  1: { ja: '4分', en: '1/4' },
  2: { ja: '8分', en: '1/8' },
  3: { ja: '3連', en: 'trip' },
  4: { ja: '16分', en: '1/16' },
};

const ARTIC_GLYPH: Record<Articulation, string> = { accent: '>', staccato: '·', tenuto: '–' };

function cloneGrid(grid: GridPhrase): GridPhrase {
  return { bars: grid.bars.map((b) => ({ beats: b.beats.map((bt) => ({ division: bt.division, cells: bt.cells.map((c) => ({ ...c })) })) })) };
}

/** グリッド内の全セルを (bar,beat,cell) の順で列挙 */
function* iterateCells(grid: GridPhrase): Generator<CellPos> {
  for (let bar = 0; bar < grid.bars.length; bar++) {
    for (let beat = 0; beat < 4; beat++) {
      for (let cell = 0; cell < grid.bars[bar].beats[beat].cells.length; cell++) {
        yield { bar, beat, cell };
      }
    }
  }
}

function cellAt(grid: GridPhrase, p: CellPos): GridCell {
  return grid.bars[p.bar].beats[p.beat].cells[p.cell];
}

function nextPos(grid: GridPhrase, p: CellPos): CellPos | null {
  const beatObj = grid.bars[p.bar].beats[p.beat];
  if (p.cell + 1 < beatObj.cells.length) return { ...p, cell: p.cell + 1 };
  if (p.beat + 1 < 4) return { bar: p.bar, beat: p.beat + 1, cell: 0 };
  if (p.bar + 1 < grid.bars.length) return { bar: p.bar + 1, beat: 0, cell: 0 };
  return null;
}

/** 選択中attackの音を最後まで(holdの連なり)取得 */
function holdRun(grid: GridPhrase, p: CellPos): CellPos[] {
  const run: CellPos[] = [];
  let cur = nextPos(grid, p);
  while (cur && cellAt(grid, cur).state === 'hold') {
    run.push(cur);
    cur = nextPos(grid, cur);
  }
  return run;
}

/** 直前のattack(このセルがholdだった場合の親)を探す */
function directPrevAttack(grid: GridPhrase, target: CellPos): CellPos | null {
  let prev: CellPos | null = null;
  for (const p of iterateCells(grid)) {
    if (p.bar === target.bar && p.beat === target.beat && p.cell === target.cell) break;
    const c = cellAt(grid, p);
    if (c.state === 'attack') prev = p;
    else if (c.state === 'rest') prev = null;
  }
  return prev;
}

export function GridEditor({
  lang, grid, onChange, progression, keyPc, flats, material, divisions,
  fixedRhythm, fixedPitch, allowArticulation, currentIndex = -1,
}: GridEditorProps) {
  const t = (key: Parameters<typeof tr>[1]) => tr(lang, key);
  const [selected, setSelected] = useState<CellPos | null>(null);

  const bars = grid.bars.length;
  const palettes = palettesForGrid(progression, keyPc, bars, material, flats);

  const attacks = attackPositions(grid);
  const currentAttack = currentIndex >= 0 && currentIndex < attacks.length ? attacks[currentIndex] : null;

  const sel = selected && cellAt(grid, selected).state === 'attack' ? selected : null;
  const selCell = sel ? cellAt(grid, sel) : null;
  const selPalette = sel ? palettes[sel.bar] : [];

  const commit = (next: GridPhrase) => onChange(next);

  /** タップ: rest/hold → attackにして選択。attack → 選択のみ */
  const tapCell = (p: CellPos) => {
    const c = cellAt(grid, p);
    if (c.state === 'attack') {
      setSelected(sel && sel.bar === p.bar && sel.beat === p.beat && sel.cell === p.cell ? null : p);
      return;
    }
    if (fixedRhythm) return; // リズム固定では新しい音を置けない
    const next = cloneGrid(grid);
    // このセルがhold中だった場合、その親の音はここで切れる(以降のholdはrestへ)
    if (c.state === 'hold') {
      let cur = nextPos(next, p);
      while (cur && cellAt(next, cur).state === 'hold') {
        cellAt(next, cur).state = 'rest';
        cur = nextPos(next, cur);
      }
    }
    // 直前のattackの音を初期値に(なければパレット中央)
    const prev = directPrevAttack(grid, p);
    const midi = prev ? cellAt(grid, prev).midi ?? defaultPitch(palettes[p.bar]) : defaultPitch(palettes[p.bar]);
    const target = cellAt(next, p);
    target.state = 'attack';
    target.midi = fixedPitch ? defaultPitch(palettes[p.bar]) : midi;
    target.articulation = undefined;
    commit(next);
    setSelected(p);
  };

  const changePitch = (dir: 1 | -1) => {
    if (!sel || !selCell || selCell.midi === undefined) return;
    const next = cloneGrid(grid);
    cellAt(next, sel).midi = stepPitch(selPalette, selCell.midi, dir);
    commit(next);
  };

  /** のばす: 次のセルをholdに(次が同じ分割の拍に属し、restのときだけ) */
  const extend = () => {
    if (!sel) return;
    const run = holdRun(grid, sel);
    const last = run.length > 0 ? run[run.length - 1] : sel;
    const np = nextPos(grid, last);
    if (!np) return;
    const curDiv = grid.bars[sel.bar].beats[sel.beat].division;
    const npDiv = grid.bars[np.bar].beats[np.beat].division;
    // 3連の拍の外へは伸ばさない/3連へ入り込まない(表記が崩れるため)
    if ((curDiv === 3 || npDiv === 3) && !(sel.bar === np.bar && sel.beat === np.beat)) return;
    if (cellAt(grid, np).state !== 'rest') return;
    const next = cloneGrid(grid);
    cellAt(next, np).state = 'hold';
    commit(next);
  };

  const canExtend = (() => {
    if (!sel) return false;
    const run = holdRun(grid, sel);
    const last = run.length > 0 ? run[run.length - 1] : sel;
    const np = nextPos(grid, last);
    if (!np || cellAt(grid, np).state !== 'rest') return false;
    const curDiv = grid.bars[sel.bar].beats[sel.beat].division;
    const npDiv = grid.bars[np.bar].beats[np.beat].division;
    if ((curDiv === 3 || npDiv === 3) && !(sel.bar === np.bar && sel.beat === np.beat)) return false;
    return true;
  })();

  /** 縮める: 最後のholdをrestへ */
  const shrink = () => {
    if (!sel) return;
    const run = holdRun(grid, sel);
    if (run.length === 0) return;
    const next = cloneGrid(grid);
    cellAt(next, run[run.length - 1]).state = 'rest';
    commit(next);
  };

  /** 休符にする: attackとそのholdをrestへ */
  const toRest = () => {
    if (!sel) return;
    const next = cloneGrid(grid);
    cellAt(next, sel).state = 'rest';
    cellAt(next, sel).midi = undefined;
    cellAt(next, sel).articulation = undefined;
    for (const p of holdRun(grid, sel)) cellAt(next, p).state = 'rest';
    commit(next);
    setSelected(null);
  };

  const setArticulation = (a: Articulation | undefined) => {
    if (!sel) return;
    const next = cloneGrid(grid);
    cellAt(next, sel).articulation = a;
    commit(next);
  };

  /** 拍の分割を切り替え(先頭セルの状態は保持、他はリセット) */
  const cycleDivision = (bar: number, beat: number) => {
    if (fixedRhythm || divisions.length <= 1) return;
    const cur = grid.bars[bar].beats[beat].division;
    const idx = divisions.indexOf(cur);
    const nextDiv = divisions[(idx + 1) % divisions.length];
    const next = cloneGrid(grid);
    const head = next.bars[bar].beats[beat].cells[0];
    next.bars[bar].beats[beat] = emptyBeat(nextDiv);
    // 先頭セルがattackなら保持(holdは分割が変わると意味が変わるためリセット)
    if (head.state === 'attack') next.bars[bar].beats[beat].cells[0] = { ...head };
    // この拍へ伸びてきていたholdを切る
    commit(next);
    setSelected(null);
  };

  const chordLabelFor = (bar: number) => {
    const ch = chordForBar(progression, bar);
    return chordSymbol(mod12(keyPc + ch.rootOffset), ch.quality, flats);
  };

  const selLabel = selCell && selCell.midi !== undefined
    ? selPalette.find((p) => p.midi === selCell.midi)
    : undefined;

  return (
    <div className="grid-editor">
      {grid.bars.map((bar, b) => (
        <div key={b} className="grid-bar">
          <div className="grid-bar-head">
            <span className="grid-bar-num">{b + 1}</span>
            <span className="grid-bar-chord">{chordLabelFor(b)}</span>
            {b > 0 && !fixedRhythm && (
              <button
                className="btn tiny grid-copy-btn"
                onClick={() => { commit(copyBarMapped(grid, b - 1, b, palettes)); setSelected(null); }}
                aria-label={pick(lang, `${b}小節目をこの小節へコピー`, `Copy bar ${b} into this bar`)}
              >
                ⧉ {t('copyPrevBar')}
              </button>
            )}
          </div>
          <div className="grid-beats">
            {bar.beats.map((beat, bt) => (
              <div key={bt} className={`grid-beat div-${beat.division}`}>
                {divisions.length > 1 && !fixedRhythm && (
                  <button
                    className="grid-div-toggle"
                    onClick={() => cycleDivision(b, bt)}
                    aria-label={pick(lang, `${bt + 1}拍目の分割を変更`, `Change beat ${bt + 1} subdivision`)}
                  >
                    {pick(lang, DIV_LABEL[beat.division].ja, DIV_LABEL[beat.division].en)}
                  </button>
                )}
                <div className="grid-cells" role="group" aria-label={pick(lang, `${b + 1}小節${bt + 1}拍目`, `Bar ${b + 1} beat ${bt + 1}`)}>
                  {beat.cells.map((cell, c) => {
                    const isSel = !!sel && sel.bar === b && sel.beat === bt && sel.cell === c;
                    const isCurrent = !!currentAttack && currentAttack[0] === b && currentAttack[1] === bt && currentAttack[2] === c;
                    const pitch = cell.midi !== undefined ? palettes[b].find((p) => p.midi === cell.midi) : undefined;
                    let body: string;
                    if (cell.state === 'attack') body = fixedPitch ? '●' : (pitch ? pitch.label : '●');
                    else if (cell.state === 'hold') body = '→';
                    else body = '';
                    return (
                      <button
                        key={c}
                        className={`grid-cell ${cell.state}${isSel ? ' selected' : ''}${isCurrent ? ' playing' : ''}`}
                        onClick={() => tapCell({ bar: b, beat: bt, cell: c })}
                        aria-pressed={cell.state === 'attack'}
                        aria-label={pick(
                          lang,
                          `${b + 1}小節${bt + 1}拍${c + 1}: ${cell.state === 'attack' ? (pitch?.label ?? '音') : cell.state === 'hold' ? 'のばす' : '休み'}`,
                          `Bar ${b + 1} beat ${bt + 1}.${c + 1}: ${cell.state}`,
                        )}
                      >
                        <span className="grid-cell-body">{body}</span>
                        {cell.state === 'attack' && cell.articulation && (
                          <span className="grid-cell-artic">{ARTIC_GLYPH[cell.articulation]}</span>
                        )}
                        {cell.state === 'attack' && !fixedPitch && pitch?.degree && (
                          <span className="grid-cell-degree">{pitch.degree}</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}

      {!sel && <p className="hint-text">{t('gridTapHint')}</p>}

      {sel && selCell && (
        <div className="grid-edit-panel">
          {!fixedPitch && (
            <div className="grid-edit-row">
              <span className="opt-label">{t('pitchLabel2')}:</span>
              <div className="grid-pitch-ctrl">
                <button className="btn grid-arrow" onClick={() => changePitch(-1)} aria-label={t('pitchDown')}>▼</button>
                <span className="grid-pitch-label">
                  <strong>{selLabel?.label ?? '—'}</strong>
                  {selLabel?.degree && <small className="seg-sub">{selLabel.degree}</small>}
                </span>
                <button className="btn grid-arrow" onClick={() => changePitch(1)} aria-label={t('pitchUp')}>▲</button>
              </div>
            </div>
          )}

          {allowArticulation && (
            <div className="grid-edit-row">
              <span className="opt-label">{t('articLabel')}:</span>
              <div className="seg-group">
                <button className={`seg${!selCell.articulation ? ' on' : ''}`} aria-pressed={!selCell.articulation} onClick={() => setArticulation(undefined)}>{t('articNormal')}</button>
                <button className={`seg${selCell.articulation === 'accent' ? ' on' : ''}`} aria-pressed={selCell.articulation === 'accent'} onClick={() => setArticulation('accent')}>&gt; {t('articAccent')}</button>
                <button className={`seg${selCell.articulation === 'staccato' ? ' on' : ''}`} aria-pressed={selCell.articulation === 'staccato'} onClick={() => setArticulation('staccato')}>· {t('articStaccato')}</button>
                <button className={`seg${selCell.articulation === 'tenuto' ? ' on' : ''}`} aria-pressed={selCell.articulation === 'tenuto'} onClick={() => setArticulation('tenuto')}>– {t('articTenuto')}</button>
              </div>
            </div>
          )}

          {!fixedRhythm && (
            <div className="grid-edit-row">
              <div className="seg-group">
                <button className="seg" onClick={extend} disabled={!canExtend} aria-label={t('extendNote')}>→ {t('extendNote')}</button>
                <button className="seg" onClick={shrink} disabled={holdRun(grid, sel).length === 0} aria-label={t('shrinkNote')}>← {t('shrinkNote')}</button>
                <button className="seg danger-seg" onClick={toRest} aria-label={t('toRest')}>𝄽 {t('toRest')}</button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
