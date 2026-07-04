// コード進行のグリッド表示。再生中の小節をハイライトし、タップでループ開始小節を選択できる。

import { chordSymbol } from '../theory/chords';
import { mod12 } from '../theory/notes';
import type { Progression } from '../theory/progressions';

interface Props {
  progression: Progression;
  keyPc: number;
  /** 表示上の移調(半音) */
  shift: number;
  flats: boolean;
  /** 再生中の小節(-1: カウントイン, null: 停止中) */
  currentMeasure: number | null;
  currentBeat: number;
  selectedMeasure: number;
  onSelectMeasure: (m: number) => void;
}

export function ChordProgressionView({
  progression, keyPc, shift, flats, currentMeasure, currentBeat, selectedMeasure, onSelectMeasure,
}: Props) {
  const cells = [];
  for (let m = 0; m < progression.measures; m++) {
    const chords = progression.chords.filter((c) => c.measure === m);
    const isCurrent = currentMeasure === m;
    const isSelected = selectedMeasure === m && currentMeasure === null;
    cells.push(
      <button
        key={m}
        className={`chord-cell${isCurrent ? ' current' : ''}${isSelected ? ' selected' : ''}`}
        onClick={() => onSelectMeasure(m)}
        aria-label={`${m + 1}小節目`}
      >
        <span className="chord-cell-num">{m + 1}</span>
        <span className="chord-cell-symbols">
          {chords.map((c, i) => {
            const active = isCurrent && currentBeat >= c.beat && currentBeat < c.beat + c.beats;
            return (
              <span key={i} className={`chord-symbol${active ? ' active' : ''}`}>
                {chordSymbol(mod12(keyPc + c.rootOffset + shift), c.quality, flats)}
              </span>
            );
          })}
        </span>
        <span className="chord-cell-beats">
          {[0, 1, 2, 3].map((b) => (
            <span key={b} className={`beat-dot${isCurrent && Math.floor(currentBeat) === b ? ' on' : ''}`} />
          ))}
        </span>
      </button>,
    );
  }

  return (
    <div className="chord-grid-wrap">
      {currentMeasure === -1 && <div className="count-in-banner">カウントイン中… 1 2 3 4</div>}
      <div className={`chord-grid measures-${progression.measures}`}>{cells}</div>
      <p className="hint-text">小節をタップするとループ開始位置を選べます(1小節/2小節ループ時)</p>
    </div>
  );
}
