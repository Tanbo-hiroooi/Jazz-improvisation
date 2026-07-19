// 自由練習のフレーズ作成モード(拍グリッド版)
// 素材(コードトーン/ガイドトーン/ブルース)を選び、4小節を自由に作って音で確認する。
// 「音を確認」はユーザー自身が編集した楽譜の再生であり、見本演奏ではない。

import { useEffect, useMemo, useState } from 'react';
import { GridEditor } from './GridEditor';
import { StaffView, type ChordDisplay, type LabelMode } from './StaffView';
import { usePracticePlayback, type PlaybackOverrides } from '../hooks/usePracticePlayback';
import type { MyInstrumentSettings } from '../state/storage';
import { chordSymbol } from '../theory/chords';
import { emptyGrid, gridToNoteEvents, gridMatchesPalettes, palettesForGrid, type GridMaterial, type GridPhrase } from '../theory/grid';
import { getInstrument, displayShift, type Clef } from '../theory/instruments';
import { mod12, useFlatsForKey } from '../theory/notes';
import type { Progression } from '../theory/progressions';
import { pick, t as tr, type Lang } from '../i18n';

interface Props {
  lang: Lang;
  session: MyInstrumentSettings;
  /** 実音キー */
  keyPc: number;
  progression: Progression;
  initialBpm?: number;
}

const BARS = 4;

export function GridComposer({ lang, session, keyPc, progression, initialBpm = 80 }: Props) {
  const t = (key: Parameters<typeof tr>[1]) => tr(lang, key);

  const [material, setMaterial] = useState<GridMaterial>('chord-tone');
  const [bpm, setBpm] = useState(initialBpm);
  const [countIn, setCountIn] = useState(true);
  const [metronomeOn, setMetronomeOn] = useState(true);
  const [backbeat, setBackbeat] = useState(true);
  const [labelMode, setLabelMode] = useState<LabelMode>('degree');

  const instrument = getInstrument(session.instrumentId);
  const clef: Clef = session.clefOverride && instrument.clefs.includes(session.clefOverride) ? session.clefOverride : instrument.defaultClef;
  const effNotation = session.instrumentId === 'guitar' ? session.notationMode : 'staff';
  const shift = displayShift(instrument, pitchModeOf(session));
  const flats = useFlatsForKey(mod12(keyPc + shift));

  const prog = useMemo<Progression>(() => ({
    ...progression,
    measures: Math.min(BARS, progression.measures),
    chords: progression.chords.filter((c) => c.measure < Math.min(BARS, progression.measures)),
  }), [progression]);
  const bars = prog.measures;

  const [history, setHistory] = useState<GridPhrase[]>(() => [emptyGrid(bars, 2)]);
  const [hIdx, setHIdx] = useState(0);
  const grid = history[hIdx];

  // キー・進行・素材が変わったら、パレット外の音が残らないよう作り直す
  useEffect(() => {
    const palettes = palettesForGrid(prog, keyPc, bars, material, flats);
    const cur = history[hIdx];
    if (cur.bars.length !== bars || !gridMatchesPalettes(cur, palettes)) {
      setHistory([emptyGrid(bars, 2)]);
      setHIdx(0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [keyPc, prog, material]);

  const changeGrid = (next: GridPhrase) => {
    const trimmed = history.slice(0, hIdx + 1);
    setHistory([...trimmed, next]);
    setHIdx(trimmed.length);
  };
  const undo = () => setHIdx((i) => Math.max(0, i - 1));
  const redo = () => setHIdx((i) => Math.min(history.length - 1, i + 1));
  const reset = () => {
    if (window.confirm(t('resetConfirm'))) {
      setHistory([emptyGrid(bars, 2)]);
      setHIdx(0);
    }
  };

  const displayedNotes = useMemo(() => gridToNoteEvents(grid), [grid]);
  const chordDisplays: ChordDisplay[] = useMemo(
    () => prog.chords.map((c) => {
      const rootPc = mod12(keyPc + c.rootOffset + shift);
      return { measure: c.measure, beat: c.beat, symbol: chordSymbol(rootPc, c.quality, flats), rootPc, quality: c.quality };
    }),
    [prog, keyPc, shift, flats],
  );

  const { playing, currentNoteIndex, startPlayback, stopAll } = usePracticePlayback({
    progression: prog, effKeyPc: keyPc, displayedNotes, bpm, countIn,
    loopEnabled: true, metronomeOn, clickPattern: backbeat ? 'backbeat' : 'all', compOn: true,
    swing: 1 / 6, loopRange: 'full', selectedMeasure: 0,
  });
  const check = (overrides: PlaybackOverrides) => startPlayback('example', overrides);

  return (
    <div className="composer">
      <section className="panel">
        <h2>🎼 {t('composeTitle')}</h2>
        <p className="hint-text">{t('gridComposeIntro')}</p>
        <div className="field">
          <label>{t('materialLabel')}</label>
          <div className="seg-group">
            <button className={`seg${material === 'chord-tone' ? ' on' : ''}`} aria-pressed={material === 'chord-tone'} onClick={() => setMaterial('chord-tone')}>{t('materialChordTone')}</button>
            <button className={`seg${material === 'guide-tone' ? ' on' : ''}`} aria-pressed={material === 'guide-tone'} onClick={() => setMaterial('guide-tone')}>{t('materialGuideTone')}</button>
            <button className={`seg${material === 'blues' ? ' on' : ''}`} aria-pressed={material === 'blues'} onClick={() => setMaterial('blues')}>{t('materialBlues')}</button>
          </div>
        </div>
      </section>

      <section className="panel">
        <div className="staff-head">
          <h2>{t('staffTitle')}</h2>
          <div className="seg-group">
            <button className={`seg${labelMode === 'none' ? ' on' : ''}`} aria-pressed={labelMode === 'none'} onClick={() => setLabelMode('none')}>{t('labelNone')}</button>
            <button className={`seg${labelMode === 'name' ? ' on' : ''}`} aria-pressed={labelMode === 'name'} onClick={() => setLabelMode('name')}>C D E</button>
            <button className={`seg${labelMode === 'degree' ? ' on' : ''}`} aria-pressed={labelMode === 'degree'} onClick={() => setLabelMode('degree')}>{t('labelDegree')}</button>
          </div>
        </div>
        <div className="staff-card">
          <StaffView
            notes={displayedNotes} measures={prog.measures} clef={clef} shift={shift} flats={flats}
            labelMode={labelMode} chords={chordDisplays} currentIndex={currentNoteIndex}
            notation={effNotation} guitarPosition={session.guitarPosition} guitarOpenStrings={session.guitarOpenStrings}
          />
        </div>
      </section>

      <section className="panel">
        <h2>{t('phraseEditTitle')}</h2>
        <GridEditor
          lang={lang}
          grid={grid}
          onChange={changeGrid}
          progression={prog}
          keyPc={keyPc}
          flats={flats}
          material={material}
          divisions={[1, 2, 3, 4]}
          allowArticulation
          currentIndex={currentNoteIndex}
        />
        <div className="transport-opts composer-undo-row">
          <div className="seg-group">
            <button className="seg" onClick={undo} disabled={hIdx === 0} aria-label={t('undoBtn')}>↩ {t('undoBtn')}</button>
            <button className="seg" onClick={redo} disabled={hIdx >= history.length - 1} aria-label={t('redoBtn')}>↪ {t('redoBtn')}</button>
            <button className="seg" onClick={reset} aria-label={t('resetPhrase')}>⟲ {t('resetPhrase')}</button>
          </div>
        </div>
      </section>

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
              <button className="btn big example" onClick={() => check({ compOn: false })}>♪ {t('checkSingle')}</button>
              <button className="btn big example" onClick={() => check({ compOn: true })}>♪ {t('checkWithChord')}</button>
              <button className="btn big start" onClick={() => startPlayback('backing')}>▶ Start</button>
            </>
          )}
        </div>
        {playing && <p className="hint-text" role="status">▶ {pick(lang, '再生中…', 'Playing…')}</p>}
        <div className="transport-opts">
          <label className="toggle"><input type="checkbox" checked={countIn} onChange={(e) => setCountIn(e.target.checked)} /> 4 Count In</label>
          <label className="toggle"><input type="checkbox" checked={metronomeOn} onChange={(e) => setMetronomeOn(e.target.checked)} /> {t('metronome')}</label>
          <label className="toggle"><input type="checkbox" checked={backbeat} onChange={(e) => setBackbeat(e.target.checked)} /> {t('backbeatClick')}</label>
        </div>
        <p className="hint-text">{t('playSelfHint')}</p>
      </section>
    </div>
  );
}

function pitchModeOf(session: MyInstrumentSettings) {
  return session.pitchMode;
}
