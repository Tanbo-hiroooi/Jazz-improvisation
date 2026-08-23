// 自分でコードを決める: ユーザーがコード進行と小節数を自由に設定するエディタ
// コードは内部的に実音(Concert)で保持し、表示ピッチが「記譜」のときは
// 楽器の移調(shift)を適用した音名で入力・表示する。

import { QUALITIES, type Quality } from '../theory/chords';
import { KEYS, mod12 } from '../theory/notes';
import { pick, t, type Lang } from '../i18n';

export interface CustomChord {
  pc: number; // ルート(実音)
  q: Quality;
  /** 3拍目から鳴る2つ目のコード。未指定なら1小節1コード */
  pc2?: number;
  q2?: Quality;
}

/** 1小節を2拍ずつ2コードに分けているか */
export function isSplitBar(c: CustomChord): boolean {
  return c.pc2 !== undefined && c.q2 !== undefined;
}

export const DEFAULT_CUSTOM: CustomChord[] = [
  { pc: 2, q: 'm7' },
  { pc: 7, q: '7' },
  { pc: 0, q: 'maj7' },
  { pc: 0, q: 'maj7' },
];

// 系統ごとに並べる(オブジェクトのキー順だと数字始まりが先に来て探しにくいため)
const QUALITY_GROUPS: { labelKey: 'qGroupMajor' | 'qGroupMinor' | 'qGroupDominant' | 'qGroupOther'; items: Quality[] }[] = [
  { labelKey: 'qGroupMajor', items: ['maj7', 'maj9', '6'] },
  { labelKey: 'qGroupMinor', items: ['m7', 'm9', 'm6'] },
  { labelKey: 'qGroupDominant', items: ['7', '9', '7sus4', '7b9'] },
  { labelKey: 'qGroupOther', items: ['m7b5', 'dim7'] },
];

function QualityOptions({ lang }: { lang: Lang }) {
  return (
    <>
      {QUALITY_GROUPS.map((g) => (
        <optgroup key={g.labelKey} label={t(lang, g.labelKey)}>
          {g.items.map((q) => (
            <option key={q} value={q}>{QUALITIES[q].suffix}</option>
          ))}
        </optgroup>
      ))}
    </>
  );
}

interface Props {
  chords: CustomChord[];
  onChange: (chords: CustomChord[]) => void;
  /** 表示上の移調(半音)。記譜表示のときは楽器のwrittenShift、実音表示では0 */
  shift: number;
  /** 入力欄の見出しに表示するピッチ表記(例: 実音 / 記譜(B♭管)) */
  pitchLabel: string;
  lang: Lang;
}

export function CustomProgressionEditor({ chords, onChange, shift, pitchLabel, lang }: Props) {
  const setCount = (count: number) => {
    const next = [...chords];
    while (next.length < count) next.push({ pc: 0, q: 'maj7' });
    onChange(next.slice(0, count));
  };

  const update = (index: number, patch: Partial<CustomChord>) => {
    onChange(chords.map((c, i) => (i === index ? { ...c, ...patch } : c)));
  };

  /** 2拍ずつに分ける/戻す。分けるときは1つ目と同じコードから始める */
  const toggleSplit = (index: number, split: boolean) => {
    onChange(chords.map((c, i) => {
      if (i !== index) return c;
      if (split) return { ...c, pc2: c.pc, q2: c.q };
      const { pc2: _pc2, q2: _q2, ...rest } = c;
      return rest;
    }));
  };

  return (
    <div className="custom-editor">
      <p className="custom-editor-pitch">{t(lang, 'chordInputLabel')}: <strong>{pitchLabel}</strong></p>
      <div className="field">
        <label htmlFor="custom-measures">{t(lang, 'measuresLabel')}</label>
        <select id="custom-measures" value={chords.length} onChange={(e) => setCount(Number(e.target.value))}>
          {Array.from({ length: 16 }, (_, i) => i + 1).map((n) => (
            <option key={n} value={n}>{n}{t(lang, 'measuresUnit')}</option>
          ))}
        </select>
      </div>
      <div className="custom-editor-grid">
        {chords.map((c, i) => (
          <div key={i} className={`custom-chord-row${isSplitBar(c) ? ' split' : ''}`}>
            <span className="custom-chord-num">{i + 1}</span>
            <select
              value={mod12(c.pc + shift)}
              onChange={(e) => update(i, { pc: mod12(Number(e.target.value) - shift) })}
              aria-label={pick(lang, `${i + 1} ${t(lang, 'rootAria')}`, `Bar ${i + 1} root`)}
            >
              {KEYS.map((k) => (
                <option key={k.pc} value={k.pc}>{k.name}</option>
              ))}
            </select>
            <select
              value={c.q}
              onChange={(e) => update(i, { q: e.target.value as Quality })}
              aria-label={pick(lang, `${i + 1} ${t(lang, 'qualityAria')}`, `Bar ${i + 1} chord type`)}
            >
              <QualityOptions lang={lang} />
            </select>
            {isSplitBar(c) && (
              <>
                <select
                  value={mod12(c.pc2! + shift)}
                  onChange={(e) => update(i, { pc2: mod12(Number(e.target.value) - shift) })}
                  aria-label={pick(lang, `${i + 1}小節目 3拍目のルート`, `Bar ${i + 1} beat 3 root`)}
                >
                  {KEYS.map((k) => (
                    <option key={k.pc} value={k.pc}>{k.name}</option>
                  ))}
                </select>
                <select
                  value={c.q2}
                  onChange={(e) => update(i, { q2: e.target.value as Quality })}
                  aria-label={pick(lang, `${i + 1}小節目 3拍目のコードタイプ`, `Bar ${i + 1} beat 3 chord type`)}
                >
              <QualityOptions lang={lang} />
                </select>
              </>
            )}
            <label className="toggle custom-split-toggle">
              <input
                type="checkbox"
                checked={isSplitBar(c)}
                onChange={(e) => toggleSplit(i, e.target.checked)}
              />
              {t(lang, 'splitBarLabel')}
            </label>
          </div>
        ))}
      </div>
      <p className="hint-text">
        {t(lang, 'splitBarHint')} {t(lang, 'customEditorHint')}
        {shift % 12 !== 0 && ` ${t(lang, 'customWrittenHint')}`}
      </p>
    </div>
  );
}
