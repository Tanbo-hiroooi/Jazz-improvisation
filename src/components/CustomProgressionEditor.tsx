// 実践モード: ユーザーがコード進行と小節数を自由に設定するエディタ
// コードは内部的に実音(Concert)で保持し、表示ピッチが「記譜」のときは
// 楽器の移調(shift)を適用した音名で入力・表示する。

import { QUALITIES, type Quality } from '../theory/chords';
import { KEYS, mod12 } from '../theory/notes';

export interface CustomChord {
  pc: number; // ルート(実音)
  q: Quality;
}

export const DEFAULT_CUSTOM: CustomChord[] = [
  { pc: 2, q: 'm7' },
  { pc: 7, q: '7' },
  { pc: 0, q: 'maj7' },
  { pc: 0, q: 'maj7' },
];

const QUALITY_OPTIONS: { value: Quality; label: string }[] = (
  Object.keys(QUALITIES) as Quality[]
).map((q) => ({ value: q, label: QUALITIES[q].suffix }));

interface Props {
  chords: CustomChord[];
  onChange: (chords: CustomChord[]) => void;
  /** 表示上の移調(半音)。記譜表示のときは楽器のwrittenShift、実音表示では0 */
  shift: number;
  /** 入力欄の見出しに表示するピッチ表記(例: 実音 / 記譜(B♭管)) */
  pitchLabel: string;
}

export function CustomProgressionEditor({ chords, onChange, shift, pitchLabel }: Props) {
  const setCount = (count: number) => {
    const next = [...chords];
    while (next.length < count) next.push({ pc: 0, q: 'maj7' });
    onChange(next.slice(0, count));
  };

  const update = (index: number, patch: Partial<CustomChord>) => {
    onChange(chords.map((c, i) => (i === index ? { ...c, ...patch } : c)));
  };

  return (
    <div className="custom-editor">
      <p className="custom-editor-pitch">コード入力: <strong>{pitchLabel}</strong></p>
      <div className="field">
        <label htmlFor="custom-measures">小節数(1〜16)</label>
        <select id="custom-measures" value={chords.length} onChange={(e) => setCount(Number(e.target.value))}>
          {Array.from({ length: 16 }, (_, i) => i + 1).map((n) => (
            <option key={n} value={n}>{n}小節</option>
          ))}
        </select>
      </div>
      <div className="custom-editor-grid">
        {chords.map((c, i) => (
          <div key={i} className="custom-chord-row">
            <span className="custom-chord-num">{i + 1}</span>
            <select
              value={mod12(c.pc + shift)}
              onChange={(e) => update(i, { pc: mod12(Number(e.target.value) - shift) })}
              aria-label={`${i + 1}小節目のルート`}
            >
              {KEYS.map((k) => (
                <option key={k.pc} value={k.pc}>{k.name}</option>
              ))}
            </select>
            <select
              value={c.q}
              onChange={(e) => update(i, { q: e.target.value as Quality })}
              aria-label={`${i + 1}小節目のコードタイプ`}
            >
              {QUALITY_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
        ))}
      </div>
      <p className="hint-text">
        1小節につき1コード。「使える音」タブで各コードのおすすめスケールが五線譜に表示されます。Startでコード音とメトロノームを鳴らして練習しましょう。
        {shift % 12 !== 0 && ' 記譜表示中は、あなたの楽器の譜面に書いてあるコード名のまま入力できます(鳴る音は実音に自動変換)。'}
      </p>
    </div>
  );
}
