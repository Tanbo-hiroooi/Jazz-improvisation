// 現在のコードの情報: コードトーン・ガイドトーン・おすすめスケール・度数

import { QUALITIES, chordSymbol, type Quality } from '../theory/chords';
import { mod12, pcName, pcSolfege } from '../theory/notes';

interface Props {
  rootPc: number; // 表示上のルート(移調適用済み)
  quality: Quality;
  flats: boolean;
  concertLabel?: string; // Written表示時に実音を併記
}

export function ChordInfoPanel({ rootPc, quality, flats, concertLabel }: Props) {
  const def = QUALITIES[quality];
  const symbol = chordSymbol(rootPc, quality, flats);

  return (
    <div className="chord-info">
      <div className="chord-info-head">
        <span className="chord-info-symbol">{symbol}</span>
        {concertLabel && <span className="chord-info-concert">実音: {concertLabel}</span>}
      </div>

      <div className="chord-info-row">
        <span className="chord-info-label">コードトーン</span>
        <span className="tone-chips">
          {def.tones.map((t, i) => {
            const pc = mod12(rootPc + t);
            const isGuide = def.guide.includes(t);
            return (
              <span key={i} className={`tone-chip${isGuide ? ' guide' : ''}`}>
                <strong>{pcName(pc, flats)}</strong>
                <small>{def.toneDegrees[i]}</small>
              </span>
            );
          })}
        </span>
      </div>

      <div className="chord-info-row">
        <span className="chord-info-label">ガイドトーン</span>
        <span className="tone-chips">
          {def.guide.map((g, i) => {
            const pc = mod12(rootPc + g);
            const idx = def.tones.indexOf(g);
            return (
              <span key={i} className="tone-chip guide big">
                <strong>{pcName(pc, flats)}</strong>
                <small>{def.toneDegrees[idx]}</small>
              </span>
            );
          })}
          <span className="guide-note-hint">3度と7度がコードの性格を決めます</span>
        </span>
      </div>

      <div className="chord-info-row">
        <span className="chord-info-label">おすすめスケール</span>
        <span>
          <span className="scale-name">{pcName(rootPc, flats)} {def.scaleLabel}</span>
          <span className="scale-notes">
            {def.scale.map((s, i) => {
              const pc = mod12(rootPc + s);
              const isTone = def.tones.includes(s);
              return (
                <span key={i} className={`scale-note${isTone ? ' chord-tone' : ''}`}>
                  {pcName(pc, flats)}
                  <small>{pcSolfege(pc, flats)}</small>
                </span>
              );
            })}
          </span>
        </span>
      </div>
    </div>
  );
}
