// ジャズリズム練習: 定番リズムパターンを選んで、リズム音+メトロノームでループ練習する

import { JAZZ_RHYTHMS, type JazzRhythm } from '../theory/rhythms';
import type { NoteEvent } from '../theory/phrases';
import type { Clef } from '../theory/instruments';
import { StaffView } from './StaffView';

/** パターンを譜面・再生用の NoteEvent に変換(音程は1音に固定) */
export function rhythmToNotes(pattern: JazzRhythm): NoteEvent[] {
  return pattern.hits.map((h) => ({
    midi: 71, // B4: リズム譜でよく使う第3線
    start: h.s,
    duration: h.d,
    velocity: h.v ?? 0.85,
    chordIndex: 0,
  }));
}

interface Props {
  patternId: string;
  onSelect: (id: string) => void;
  playing: boolean;
  onPlay: () => void;
  onStop: () => void;
  clef: Clef;
  currentIndex: number;
}

export function RhythmDojoPanel({ patternId, onSelect, playing, onPlay, onStop, clef, currentIndex }: Props) {
  const pattern = JAZZ_RHYTHMS.find((r) => r.id === patternId) ?? JAZZ_RHYTHMS[0];
  const notes = rhythmToNotes(pattern);

  return (
    <section className="panel">
      <h2>ジャズリズム練習 <span className="key-badge">スウィング設定が反映されます</span></h2>
      <div className="seg-group wrap" style={{ marginBottom: 10 }}>
        {JAZZ_RHYTHMS.map((r) => (
          <button
            key={r.id}
            className={`seg${patternId === r.id ? ' on' : ''}`}
            onClick={() => onSelect(r.id)}
          >
            {r.label}
          </button>
        ))}
      </div>
      <p className="hint-text" style={{ margin: '0 0 10px' }}>{pattern.hint}</p>
      <div className="staff-card">
        <StaffView
          notes={notes}
          measures={pattern.bars}
          clef={clef === 'grand' ? 'treble' : clef}
          shift={0}
          flats={true}
          labelMode="none"
          chords={[]}
          currentIndex={currentIndex}
        />
      </div>
      <div className="transport-main" style={{ marginTop: 10 }}>
        {playing ? (
          <button className="btn big stop" onClick={onStop}>■ Stop</button>
        ) : (
          <button className="btn big rhythm" onClick={onPlay}>♩ このリズムをループ再生</button>
        )}
      </div>
      <p className="hint-text">
        聴いて→手拍子で真似→楽器の1音で真似→コードトーンに当てはめる、の順で。メトロノームのオモテに対して、リズムがどこに乗っているかを感じましょう。
      </p>
    </section>
  );
}
