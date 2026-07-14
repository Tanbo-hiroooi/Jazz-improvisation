// フレーズ編集: 音符ブロック式の編集UI(スマホ優先・タップ+左右ボタン)
// 表示・保存はしない純粋な編集コンポーネント。変更は onChange で親へ返す。

import { useState } from 'react';
import {
  DURATION_BEATS,
  newEventId,
  noteCount,
  OCTAVE_RANGE,
  type AllowedPitch,
  type EventDuration,
  type PhraseEditorRules,
  type PhraseEvent,
} from '../theory/editablePhrase';
import { pcName, mod12 } from '../theory/notes';
import { t as tr, type Lang } from '../i18n';

interface Props {
  lang: Lang;
  events: PhraseEvent[];
  onChange: (events: PhraseEvent[]) => void;
  allowedPitches: AllowedPitch[];
  rules: PhraseEditorRules;
  flats: boolean;
}

const DUR_GLYPH: Record<EventDuration, string> = { half: '𝅗𝅥', quarter: '♩', eighth: '♪' };

export function PhraseEditor({ lang, events, onChange, allowedPitches, rules, flats }: Props) {
  const t = (key: Parameters<typeof tr>[1]) => tr(lang, key);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const selectedIndex = events.findIndex((e) => e.id === selectedId);
  const selected = selectedIndex >= 0 ? events[selectedIndex] : null;
  const atMaxNotes = rules.maxNoteCount !== undefined && noteCount(events) >= rules.maxNoteCount;
  const isLocked = (i: number) => rules.lockedEventIndexes?.includes(i) ?? false;
  const selectedLocked = selectedIndex >= 0 && isLocked(selectedIndex);

  const durLabel = (d: EventDuration) => (d === 'half' ? t('durHalf') : d === 'quarter' ? t('durQuarter') : t('durEighth'));

  const update = (index: number, patch: Partial<PhraseEvent>) => {
    onChange(events.map((e, i) => (i === index ? { ...e, ...patch } : e)));
  };

  const move = (index: number, dir: -1 | 1) => {
    const j = index + dir;
    if (j < 0 || j >= events.length) return;
    const next = [...events];
    [next[index], next[j]] = [next[j], next[index]];
    onChange(next);
  };

  const remove = (index: number) => {
    setSelectedId(null);
    onChange(events.filter((_, i) => i !== index));
  };

  const duplicate = (index: number) => {
    const copy = { ...events[index], id: newEventId() };
    const next = [...events];
    next.splice(index + 1, 0, copy);
    onChange(next);
    setSelectedId(copy.id);
  };

  const add = () => {
    if (atMaxNotes) return;
    const ev: PhraseEvent = {
      id: newEventId(),
      type: 'note',
      midi: allowedPitches[0]?.midi ?? 60,
      duration: rules.allowedDurations.includes('quarter') ? 'quarter' : rules.allowedDurations[0],
    };
    const at = selectedIndex >= 0 ? selectedIndex + 1 : events.length;
    const next = [...events];
    next.splice(at, 0, ev);
    onChange(next);
    setSelectedId(ev.id);
  };

  const octaveShift = (index: number, dir: -1 | 1) => {
    const e = events[index];
    if (e.type !== 'note' || e.midi === undefined) return;
    const next = e.midi + dir * 12;
    if (next < OCTAVE_RANGE.min || next > OCTAVE_RANGE.max) return;
    update(index, { midi: next });
  };

  /** 音の表示ラベル(度数付き) */
  const noteLabel = (midi: number) => {
    const base = allowedPitches.find((p) => mod12(p.midi) === mod12(midi));
    const name = `${pcName(mod12(midi), flats)}${Math.floor(midi / 12) - 1}`;
    return { name, degree: base?.degree ?? '' };
  };

  return (
    <div className="phrase-editor">
      <div className="phrase-blocks" role="list">
        {events.map((e, i) => {
          const isSel = e.id === selectedId;
          const locked = isLocked(i);
          if (e.type === 'rest') {
            return (
              <button
                key={e.id}
                role="listitem"
                className={`phrase-block rest${isSel ? ' selected' : ''}${locked ? ' locked' : ''}`}
                onClick={() => setSelectedId(isSel ? null : e.id)}
                aria-label={`${i + 1}: ${t('restLabel')} ${durLabel(e.duration)}${locked ? ` (${t('lockedNoteHint')})` : ''}`}
              >
                {locked && <span className="phrase-block-lock" aria-hidden="true">🔒</span>}
                <span className="phrase-block-name">𝄽 {t('restLabel')}</span>
                <span className="phrase-block-dur">{DUR_GLYPH[e.duration]} {durLabel(e.duration)}</span>
              </button>
            );
          }
          const { name, degree } = noteLabel(e.midi!);
          return (
            <button
              key={e.id}
              role="listitem"
              className={`phrase-block${isSel ? ' selected' : ''}${locked ? ' locked' : ''}`}
              onClick={() => setSelectedId(isSel ? null : e.id)}
              aria-label={`${i + 1}: ${name} ${degree} ${durLabel(e.duration)}${locked ? ` (${t('lockedNoteHint')})` : ''}`}
            >
              {locked && <span className="phrase-block-lock" aria-hidden="true">🔒</span>}
              <span className="phrase-block-name">{name}</span>
              {degree && <span className="phrase-block-degree">{degree}</span>}
              <span className="phrase-block-dur">{DUR_GLYPH[e.duration]} {durLabel(e.duration)}</span>
            </button>
          );
        })}
        {rules.allowAdd && (
          <button className="phrase-block add" onClick={add} disabled={atMaxNotes} aria-label={t('addNote')}>
            + {t('addNote')}
          </button>
        )}
      </div>
      {rules.maxNoteCount !== undefined && (
        <p className="hint-text">{t('maxNotesHint').replace('{n}', String(rules.maxNoteCount))}</p>
      )}
      {rules.allowAdd && atMaxNotes && <p className="hint-text limit-hint">{t('maxNotesBlockedHint')}</p>}
      {!selected && <p className="hint-text">{t('selectBlockHint')}</p>}

      {selected && (
        <div className="phrase-edit-panel">
          {/* 音の選択(固定位置は変更不可) */}
          {selectedLocked ? (
            <div className="phrase-edit-row">
              <span className="opt-label">{t('pitchLabel2')}:</span>
              <p className="hint-text locked-note-hint">🔒 {t('lockedNoteHint')}</p>
            </div>
          ) : (
            <div className="phrase-edit-row">
              <span className="opt-label">{t('pitchLabel2')}:</span>
              <div className="seg-group wrap">
                {allowedPitches.map((p) => {
                  const active = selected.type === 'note' && selected.midi === p.midi;
                  const blocked = selected.type === 'rest' && atMaxNotes;
                  return (
                    <button
                      key={p.midi}
                      className={`seg${active ? ' on' : ''}`} aria-pressed={active}
                      aria-label={`${p.label} (${p.degree})`}
                      disabled={blocked}
                      // ボタンに表示された音(オクターブ込み)をそのまま設定する。
                      // オクターブを変えたい場合は下のオクターブ操作を使う。
                      onClick={() => update(selectedIndex, { type: 'note', midi: p.midi })}
                    >
                      {p.label}
                      <small className="seg-sub">{p.degree}</small>
                    </button>
                  );
                })}
                {rules.allowRests && (
                  <button
                    className={`seg${selected.type === 'rest' ? ' on' : ''}`} aria-pressed={selected.type === 'rest'}
                    aria-label={t('toRest')}
                    onClick={() => update(selectedIndex, { type: 'rest', midi: undefined })}
                  >
                    𝄽 {t('restLabel')}
                  </button>
                )}
              </div>
              {selected.type === 'rest' && atMaxNotes && <p className="hint-text limit-hint">{t('maxNotesBlockedHint')}</p>}
            </div>
          )}

          {/* 長さ */}
          {rules.allowedDurations.length > 1 && (
            <div className="phrase-edit-row">
              <span className="opt-label">{t('lengthLabel')}:</span>
              <div className="seg-group">
                {rules.allowedDurations.map((d) => (
                  <button
                    key={d}
                    className={`seg${selected.duration === d ? ' on' : ''}`} aria-pressed={selected.duration === d}
                    aria-label={`${durLabel(d)} (${DURATION_BEATS[d]}${t('beatsUnit')})`}
                    onClick={() => update(selectedIndex, { duration: d })}
                  >
                    {DUR_GLYPH[d]} {durLabel(d)}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* オクターブ */}
          {rules.allowOctaveChange && selected.type === 'note' && (
            <div className="phrase-edit-row">
              <span className="opt-label">{t('octaveLabel')}:</span>
              <div className="seg-group">
                <button className="seg" aria-label={t('octDown')} onClick={() => octaveShift(selectedIndex, -1)}>▼ {t('octDown')}</button>
                <button className="seg" aria-label={t('octUp')} onClick={() => octaveShift(selectedIndex, 1)}>▲ {t('octUp')}</button>
              </div>
            </div>
          )}

          {/* 並べ替え・複製・削除 */}
          <div className="phrase-edit-row">
            <div className="seg-group">
              {rules.allowReorder && (
                <>
                  <button className="seg" aria-label={t('moveLeft')} onClick={() => move(selectedIndex, -1)} disabled={selectedIndex === 0}>← {t('moveLeft')}</button>
                  <button className="seg" aria-label={t('moveRight')} onClick={() => move(selectedIndex, 1)} disabled={selectedIndex === events.length - 1}>{t('moveRight')} →</button>
                </>
              )}
              {rules.allowDuplicate && (
                <button className="seg" aria-label={t('duplicateBlock')} onClick={() => duplicate(selectedIndex)}>⧉ {t('duplicateBlock')}</button>
              )}
              {rules.allowDelete && (
                <button className="seg danger-seg" aria-label={t('deleteBlock')} onClick={() => remove(selectedIndex)}>× {t('deleteBlock')}</button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
