// フレーズ作成モード: ブロック編集 → 五線譜/TABへ即時反映 → 音で確認 → 自分の楽器で演奏
// 「音を確認」はユーザー自身が編集した音符の再生であり、見本演奏ではない。

import { useEffect, useMemo, useState } from 'react';
import { usePracticePlayback } from '../hooks/usePracticePlayback';
import type { MyInstrumentSettings } from '../state/storage';
import { chordSymbol, type Quality } from '../theory/chords';
import {
  allowedPitchesFor,
  initialPhrase,
  phraseToNoteEvents,
  restCount,
  rulesForLevel,
  totalBeats,
  type EditorLevel,
  type PhraseEvent,
  type PhraseMaterial,
} from '../theory/editablePhrase';
import { getInstrument, displayShift, type Clef } from '../theory/instruments';
import { mod12, useFlatsForKey } from '../theory/notes';
import type { Progression } from '../theory/progressions';
import { PhraseEditor } from './PhraseEditor';
import { StaffView, type ChordDisplay, type LabelMode } from './StaffView';
import { pick, t as tr, type Lang } from '../i18n';

export interface ComposerChordOption {
  rootOffset: number;
  quality: Quality;
}

interface Props {
  lang: Lang;
  session: MyInstrumentSettings;
  /** 実音キー */
  keyPc: number;
  /** 対象コードの選択肢(進行の各コードなど) */
  chordOptions: ComposerChordOption[];
  material: PhraseMaterial;
  setMaterial?: (m: PhraseMaterial) => void;
  level: EditorLevel;
  setLevel?: (l: EditorLevel) => void;
  /** レッスンからの課題文(あれば表示) */
  taskText?: string;
  initialBpm?: number;
}

export function PhraseComposer({ lang, session, keyPc, chordOptions, material, setMaterial, level, setLevel, taskText, initialBpm = 80 }: Props) {
  const t = (key: Parameters<typeof tr>[1]) => tr(lang, key);

  const [chordIdx, setChordIdx] = useState(0);
  const [bpm, setBpm] = useState(initialBpm);
  const [countIn, setCountIn] = useState(true);
  const [loop, setLoop] = useState(false);
  const [metronomeOn, setMetronomeOn] = useState(true);
  const [labelMode, setLabelMode] = useState<LabelMode>('degree');

  const chord = chordOptions[Math.min(chordIdx, chordOptions.length - 1)];
  const rules = useMemo(() => rulesForLevel(level), [level]);

  const instrument = getInstrument(session.instrumentId);
  const clef: Clef = session.clefOverride && instrument.clefs.includes(session.clefOverride) ? session.clefOverride : instrument.defaultClef;
  const effNotation = session.instrumentId === 'guitar' ? session.notationMode : 'staff';
  const shift = displayShift(instrument, session.pitchMode);
  const flats = useFlatsForKey(mod12(keyPc + shift));

  const allowedPitches = useMemo(
    () => allowedPitchesFor(keyPc, chord.rootOffset, chord.quality, material, flats),
    [keyPc, chord, material, flats],
  );

  // 編集履歴(元に戻す/やり直す/初期状態に戻す)
  const [history, setHistory] = useState<PhraseEvent[][]>(() => [initialPhrase(allowedPitches)]);
  const [hIdx, setHIdx] = useState(0);
  const events = history[hIdx];

  // コード・素材・レベルが変わったら初期フレーズから作り直す
  useEffect(() => {
    setHistory([initialPhrase(allowedPitchesFor(keyPc, chord.rootOffset, chord.quality, material, flats))]);
    setHIdx(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [keyPc, chordIdx, material, level]);

  const changeEvents = (next: PhraseEvent[]) => {
    const trimmed = history.slice(0, hIdx + 1);
    setHistory([...trimmed, next]);
    setHIdx(trimmed.length);
  };
  const undo = () => setHIdx((i) => Math.max(0, i - 1));
  const redo = () => setHIdx((i) => Math.min(history.length - 1, i + 1));
  const reset = () => {
    if (window.confirm(t('resetConfirm'))) {
      setHistory([initialPhrase(allowedPitches)]);
      setHIdx(0);
    }
  };

  const beats = totalBeats(events);
  const over = beats > 4.001;
  const under = beats < 3.999;
  const restsNeeded = rules.requiredRestCount !== undefined && restCount(events) < rules.requiredRestCount;

  const displayedNotes = useMemo(() => phraseToNoteEvents(events), [events]);

  // 再生用の1小節進行
  const pseudoProgression = useMemo<Progression>(() => ({
    id: 'custom',
    label: t('composeTitle'),
    labelEn: 'Phrase',
    measures: 1,
    description: '',
    descriptionEn: '',
    chords: [{ measure: 0, beat: 0, beats: 4, rootOffset: chord.rootOffset, quality: chord.quality }],
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [chord]);

  const chordDisplays: ChordDisplay[] = useMemo(() => {
    const rootPc = mod12(keyPc + chord.rootOffset + shift);
    return [{ measure: 0, beat: 0, symbol: chordSymbol(rootPc, chord.quality, flats), rootPc, quality: chord.quality }];
  }, [keyPc, chord, shift, flats]);

  const { playing, currentNoteIndex, startPlayback, stopAll } = usePracticePlayback({
    progression: pseudoProgression,
    effKeyPc: keyPc,
    displayedNotes,
    bpm,
    countIn,
    loopEnabled: loop,
    metronomeOn,
    compOn: true,
    swing: 0,
    loopRange: 'full',
    selectedMeasure: 0,
  });

  const canPlay = !over;

  return (
    <div className="composer">
      <section className="panel">
        <h2>🎼 {t('composeTitle')}</h2>
        <p className="hint-text">{t('composeIntro')}</p>
        {taskText && <div className="outcome-box composer-task"><span className="outcome-label">📝 {pick(lang, '今日の課題', 'Today’s task')}</span><p className="outcome-text">{taskText}</p></div>}

        <div className="field-row">
          {chordOptions.length > 1 && (
            <div className="field">
              <label htmlFor="composer-chord">{t('chordLabel')}</label>
              <select id="composer-chord" value={chordIdx} onChange={(e) => setChordIdx(Number(e.target.value))}>
                {chordOptions.map((c, i) => (
                  <option key={i} value={i}>{chordSymbol(mod12(keyPc + c.rootOffset), c.quality, flats)}</option>
                ))}
              </select>
            </div>
          )}
          {setMaterial && (
            <div className="field">
              <label>{t('materialLabel')}</label>
              <div className="seg-group">
                <button className={`seg${material === 'chord-tone' ? ' on' : ''}`} onClick={() => setMaterial('chord-tone')}>{t('materialChordTone')}</button>
                <button className={`seg${material === 'guide-tone' ? ' on' : ''}`} onClick={() => setMaterial('guide-tone')}>{t('materialGuideTone')}</button>
              </div>
            </div>
          )}
        </div>

        {setLevel && (
          <div className="field">
            <label>{t('editLevelLabel')}</label>
            <div className="seg-group wrap">
              {([1, 2, 3, 4] as EditorLevel[]).map((l) => (
                <button key={l} className={`seg${level === l ? ' on' : ''}`} onClick={() => setLevel(l)}>
                  {t(l === 1 ? 'editLevel1' : l === 2 ? 'editLevel2' : l === 3 ? 'editLevel3' : 'editLevel4')}
                </button>
              ))}
            </div>
          </div>
        )}

        <p className="hint-text">
          {t('allowedPitchesLabel')}: {allowedPitches.map((p) => `${p.label}(${p.degree})`).join('・')}
          {rules.allowRests ? ` ・${t('restLabel')}` : ''}
        </p>
      </section>

      {/* 五線譜(編集内容を即時反映) */}
      <section className="panel">
        <div className="staff-head">
          <h2>{t('staffTitle')}</h2>
          <div className="seg-group">
            <button className={`seg${labelMode === 'none' ? ' on' : ''}`} onClick={() => setLabelMode('none')}>{t('labelNone')}</button>
            <button className={`seg${labelMode === 'name' ? ' on' : ''}`} onClick={() => setLabelMode('name')}>C D E</button>
            <button className={`seg${labelMode === 'degree' ? ' on' : ''}`} onClick={() => setLabelMode('degree')}>{t('labelDegree')}</button>
          </div>
        </div>
        <div className="staff-card">
          <StaffView
            notes={displayedNotes}
            measures={1}
            clef={clef}
            shift={shift}
            flats={flats}
            labelMode={labelMode}
            chords={chordDisplays}
            currentIndex={currentNoteIndex}
            notation={effNotation}
            guitarPosition={session.guitarPosition}
            guitarOpenStrings={session.guitarOpenStrings}
          />
        </div>
      </section>

      {/* ブロック編集 */}
      <section className="panel">
        <h2>{t('phraseEditTitle')}</h2>
        <PhraseEditor
          lang={lang}
          events={events}
          onChange={changeEvents}
          allowedPitches={allowedPitches}
          rules={rules}
          flats={flats}
        />

        {/* 拍数の自動計算 */}
        <div className={`beats-meter${over ? ' over' : ''}`} role="status">
          <span>{t('beatsNow')}: <strong>{beats}</strong>{t('beatsUnit')}</span>
          <span>{t('beatsLeft')}: <strong>{Math.max(0, 4 - beats)}</strong>{t('beatsUnit')}</span>
        </div>
        {over && <p className="beats-warning">⚠ {t('beatsOver')}</p>}
        {under && <p className="hint-text">{t('beatsUnder')}</p>}
        {restsNeeded && <p className="beats-warning">📌 {t('requiredRestHint')}</p>}

        <div className="transport-opts composer-undo-row">
          <div className="seg-group">
            <button className="seg" onClick={undo} disabled={hIdx === 0} aria-label={t('undoBtn')}>↩ {t('undoBtn')}</button>
            <button className="seg" onClick={redo} disabled={hIdx >= history.length - 1} aria-label={t('redoBtn')}>↪ {t('redoBtn')}</button>
            <button className="seg" onClick={reset} aria-label={t('resetPhrase')}>⟲ {t('resetPhrase')}</button>
          </div>
        </div>
      </section>

      {/* 音を確認 / 自分の楽器で演奏 */}
      <section className="panel">
        <h2>{t('practiceTitle')}</h2>
        <div className="field">
          <label htmlFor="composer-bpm">{t('tempoLabel')}: <strong>{bpm} BPM</strong></label>
          <input id="composer-bpm" type="range" min={40} max={220} value={bpm} onChange={(e) => setBpm(Number(e.target.value))} />
        </div>
        <div className="transport-main">
          {playing ? (
            <button className="btn big stop" onClick={stopAll}>■ Stop</button>
          ) : (
            <>
              <button className="btn big example" onClick={() => startPlayback('example', { compOn: false })} disabled={!canPlay}>
                ♪ {t('checkSingle')}
              </button>
              <button className="btn big example" onClick={() => startPlayback('example', { compOn: true })} disabled={!canPlay}>
                ♪ {t('checkWithChord')}
              </button>
              <button className="btn big start" onClick={() => startPlayback('backing')}>▶ Start</button>
            </>
          )}
        </div>
        {playing && <p className="hint-text" role="status">▶ {pick(lang, '再生中…', 'Playing…')}</p>}
        <div className="transport-opts">
          <label className="toggle"><input type="checkbox" checked={countIn} onChange={(e) => setCountIn(e.target.checked)} /> 4 Count In</label>
          <label className="toggle"><input type="checkbox" checked={loop} onChange={(e) => setLoop(e.target.checked)} /> Loop</label>
          <label className="toggle"><input type="checkbox" checked={metronomeOn} onChange={(e) => setMetronomeOn(e.target.checked)} /> {t('metronome')}</label>
        </div>
        <p className="hint-text">{t('playSelfHint')}</p>
      </section>
    </div>
  );
}
