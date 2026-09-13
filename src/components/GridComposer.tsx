// 自由練習のフレーズ作成モード(拍グリッド版)
// 素材(コードトーン/ガイドトーン/ブルース)と小節数を選び、自由に作って音で確認する。
// 「音を確認」はユーザー自身が編集した楽譜の再生であり、見本演奏ではない。

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { GridEditor } from './GridEditor';
import { StaffView, type ChordDisplay, type LabelMode } from './StaffView';
import { VolumeControls } from './VolumeControls';
import { FocusStage } from './FocusStage';
import { usePracticePlayback, type PlaybackOverrides } from '../hooks/usePracticePlayback';
import type { MyInstrumentSettings } from '../state/storage';
import { chordSymbol } from '../theory/chords';
import { emptyGrid, gridToNoteEvents, gridMatchesPalettes, palettesForGrid, type GridMaterial, type GridPhrase } from '../theory/grid';
import { getInstrument, displayShift, type Clef } from '../theory/instruments';
import { mod12, useFlatsForKey } from '../theory/notes';
import { fitProgression, type Progression } from '../theory/progressions';
import { pick, t as tr, type Lang } from '../i18n';

interface Props {
  lang: Lang;
  session: MyInstrumentSettings;
  /** 実音キー */
  keyPc: number;
  progression: Progression;
  initialBpm?: number;
  /** 素材・小節数・編集履歴は親が保持する(「やること」タブを切り替えても作りかけが消えないように) */
  material: GridMaterial;
  onMaterialChange: (m: GridMaterial) => void;
  /** 作る小節数(1〜progression.measures) */
  bars: number;
  onBarsChange: (bars: number) => void;
  history: GridPhrase[];
  hIdx: number;
  onHistoryChange: (history: GridPhrase[], hIdx: number) => void;
  /** 素材の選択肢(省略時は自由練習の既定4種) */
  materialOptions?: GridMaterial[];
  /** 小節数の選択肢(渡すとプルダウンではなくボタンで選ぶ) */
  barOptions?: number[];
  /** 達成チェックリスト(章まとめ練習で使う) */
  tasks?: { key: string; label: string; met: boolean }[];
  tasksTitle?: string;
  /** チェックリストの下に出す補足 */
  tasksFooter?: ReactNode;
}

const DEFAULT_MATERIALS: GridMaterial[] = ['chord-tone', 'guide-tone', 'scale', 'blues'];

export function GridComposer({
  lang, session, keyPc, progression, initialBpm = 80,
  material, onMaterialChange, bars, onBarsChange, history, hIdx, onHistoryChange,
  materialOptions, barOptions, tasks, tasksTitle, tasksFooter,
}: Props) {
  const t = (key: Parameters<typeof tr>[1]) => tr(lang, key);

  const [bpm, setBpm] = useState(initialBpm);
  const [countIn, setCountIn] = useState(true);
  const [metronomeOn, setMetronomeOn] = useState(true);
  const [clickPattern, setClickPattern] = useState<'all' | 'backbeat'>('backbeat');
  const [labelMode, setLabelMode] = useState<LabelMode>('degree');
  // 集中モード(譜面と再生だけを全画面に出す)
  const [focus, setFocus] = useState(false);
  // 入力対象の小節。譜面をタップして切り替える(小節が多いとき入力欄が伸びすぎるため)
  const [editBar, setEditBar] = useState(0);

  const instrument = getInstrument(session.instrumentId);
  const clef: Clef = session.clefOverride && instrument.clefs.includes(session.clefOverride) ? session.clefOverride : instrument.defaultClef;
  const effNotation = session.instrumentId === 'guitar' ? session.notationMode : 'staff';
  const shift = displayShift(instrument, pitchModeOf(session));
  const flats = useFlatsForKey(mod12(keyPc + shift));

  // 選んだ小節数に合わせた進行(足りなければ進行を繰り返す)
  const prog = useMemo<Progression>(() => fitProgression(progression, bars), [progression, bars]);

  const grid = history[hIdx];
  // 小節数を減らしたときに範囲外の小節を選んだままにしない
  const focusBar = editBar >= 0 && editBar < bars ? editBar : 0;

  // キー・進行・素材・小節数が変わったら、パレット外の音が残らないよう作り直す
  useEffect(() => {
    const palettes = palettesForGrid(prog, keyPc, bars, material, flats);
    const cur = history[hIdx];
    if (cur.bars.length !== bars || !gridMatchesPalettes(cur, palettes)) {
      onHistoryChange([emptyGrid(bars, 2)], 0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [keyPc, prog, material, bars]);

  const changeGrid = (next: GridPhrase) => {
    const trimmed = history.slice(0, hIdx + 1);
    onHistoryChange([...trimmed, next], trimmed.length);
  };
  const undo = () => onHistoryChange(history, Math.max(0, hIdx - 1));
  const redo = () => onHistoryChange(history, Math.min(history.length - 1, hIdx + 1));
  const reset = () => {
    if (window.confirm(t('resetConfirm'))) {
      onHistoryChange([emptyGrid(bars, 2)], 0);
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
    loopEnabled: true, metronomeOn, clickPattern, compOn: true,
    swing: 1 / 6, loopRange: 'full', selectedMeasure: 0,
  });
  const check = (overrides: PlaybackOverrides) => startPlayback('example', overrides);

  const transport = (
    <div className="transport-main">
      {playing ? (
        <button className="btn big stop" onClick={stopAll}>■ Stop</button>
      ) : (
        <>
          <button className="btn big example" onClick={() => check({ compOn: false })}>♪ {t('checkSingle')}</button>
          <button className="btn big example" onClick={() => check({ compOn: true })}>♪ {t('checkWithChord')}</button>
          <button className="btn big start" onClick={() => { setFocus(true); startPlayback('backing'); }}>▶ {t('playBacking')}</button>
        </>
      )}
    </div>
  );
  const transportOpts = (
    <div className="transport-opts">
      <label className="toggle"><input type="checkbox" checked={countIn} onChange={(e) => setCountIn(e.target.checked)} /> 4 Count In</label>
      <label className="toggle"><input type="checkbox" checked={metronomeOn} onChange={(e) => setMetronomeOn(e.target.checked)} /> {t('metronome')}</label>
      <div className="seg-group">
        <button
          className={`seg${clickPattern === 'all' ? ' on' : ''}`} aria-pressed={clickPattern === 'all'}
          disabled={!metronomeOn} onClick={() => setClickPattern('all')}
        >{t('clickAllBeats')}</button>
        <button
          className={`seg${clickPattern === 'backbeat' ? ' on' : ''}`} aria-pressed={clickPattern === 'backbeat'}
          disabled={!metronomeOn} onClick={() => setClickPattern('backbeat')}
        >{t('clickBackbeat')}</button>
      </div>
      <div className="field focus-bpm">
        <label htmlFor="composer-bpm">{t('tempoLabel')}: <strong>{bpm} BPM</strong></label>
        <input id="composer-bpm" type="range" min={40} max={220} value={bpm} onChange={(e) => setBpm(Number(e.target.value))} />
      </div>
    </div>
  );

  if (focus) {
    return (
      <FocusStage lang={lang} title={tasksTitle ?? pick(lang, progression.label, progression.labelEn)} onClose={() => setFocus(false)}>
        <div className="staff-card">
          <StaffView
            notes={displayedNotes} measures={prog.measures} clef={clef} shift={shift} flats={flats}
            labelMode={labelMode} chords={chordDisplays} currentIndex={currentNoteIndex}
            notation={effNotation} guitarPosition={session.guitarPosition} guitarOpenStrings={session.guitarOpenStrings}
          />
        </div>
        {transport}
        <details className="focus-settings"><summary>{t('focusSettings')}</summary>{transportOpts}</details>
      </FocusStage>
    );
  }

  return (
    <div className="composer">
      {barOptions && barOptions.length > 1 && (
        <section className="panel">
          <h2>{t('composerSetupTitle')}</h2>
          <div className="field">
            <label>{t('practiceBarsLabel')}</label>
            <div className="seg-group">
              {barOptions.map((b) => (
                <button key={b} className={`seg${bars === b ? ' on' : ''}`} aria-pressed={bars === b} onClick={() => onBarsChange(b)}>
                  {b}{t('measuresUnit')}
                </button>
              ))}
            </div>
            <p className="hint-text">{t('practiceBarsHint')}</p>
          </div>
        </section>
      )}
      {!barOptions && progression.measures > 1 && (
        <section className="panel">
          <h2>{t('composerSetupTitle')}</h2>
          <div className="field">
            <label htmlFor="composer-bars">{t('composerBarsLabel')}</label>
            <select
              id="composer-bars"
              value={bars}
              onChange={(e) => onBarsChange(Number(e.target.value))}
            >
              {Array.from({ length: progression.measures }, (_, i) => i + 1).map((b) => (
                <option key={b} value={b}>{b}{t('measuresUnit')}</option>
              ))}
            </select>
            <p className="hint-text">
              {pick(lang, progression.label, progression.labelEn)} = {progression.measures}{t('measuresUnit')} / {t('composerBarsHint')}
            </p>
          </div>
        </section>
      )}

      <section className="panel">
        <h2>{t('phraseEditTitle')}</h2>
        <p className="hint-text">{t('gridComposeIntro')}</p>
        <GridEditor
          materialOptions={materialOptions ?? DEFAULT_MATERIALS} onMaterialChange={onMaterialChange}
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
          labelMode={labelMode} onLabelModeChange={setLabelMode} onFocus={() => setFocus(true)}
          visibleBar={focusBar}
          onVisibleBarChange={setEditBar}
          shift={shift} clef={clef} notation={effNotation}
          guitarPosition={session.guitarPosition} guitarOpenStrings={session.guitarOpenStrings}
          onUndo={undo} onRedo={redo} canUndo={hIdx > 0} canRedo={hIdx < history.length - 1}
        />
        {tasks && tasks.length > 0 && (
          <div className="workout-tasks">
            {tasksTitle && <h3>{tasksTitle} <span className="key-badge">{tasks.filter((x) => x.met).length} / {tasks.length}</span></h3>}
            <ul className="req-checklist">
              {tasks.map((x) => (
                <li key={x.key} className={x.met ? 'met' : 'unmet'}>{x.met ? '✓' : '○'} {x.label}</li>
              ))}
            </ul>
            {tasksFooter}
          </div>
        )}

        <div className="transport-opts composer-undo-row">
          <div className="seg-group">
            <button className="seg" onClick={reset} aria-label={t('resetPhrase')}>⟲ {t('resetPhrase')}</button>
          </div>
        </div>
      </section>

      <section className="panel">
        <h2>{t('practiceTitle')}</h2>
        {transport}
        {playing && <p className="hint-text" role="status">▶ {pick(lang, '再生中…', 'Playing…')}</p>}
        {transportOpts}
        <VolumeControls lang={lang} />
        <p className="hint-text">{t('playSelfHint')}</p>
      </section>
    </div>
  );
}

function pitchModeOf(session: MyInstrumentSettings) {
  return session.pitchMode;
}
