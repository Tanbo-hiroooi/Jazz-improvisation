// 曲で実践: 長いコード進行の中で、ミッションを決めて1コーラスのアドリブに挑戦する

import { useEffect, useMemo, useRef, useState } from 'react';
import { appendLog } from '../components/PracticeLogPanel';
import { ChordProgressionView } from '../components/ChordProgressionView';
import { StaffView, type ChordDisplay, type LabelMode } from '../components/StaffView';
import { PRACTICE_MISSIONS } from '../data/missions';
import { SessionSetupPanel } from '../components/SessionSetupPanel';
import type { MyInstrumentSettings } from '../state/storage';
import { usePracticePlayback } from '../hooks/usePracticePlayback';
import { chordSymbol } from '../theory/chords';
import { getInstrument, displayShift, type Clef } from '../theory/instruments';
import { KEYS, mod12, useFlatsForKey } from '../theory/notes';
import { chordTonesAsNotes, guideTonesAsNotes, scaleAsNotes, type NoteEvent } from '../theory/phrases';
import { getProgression, PROGRESSIONS, type ProgressionId } from '../theory/progressions';
import { pick, t as tr, type Lang } from '../i18n';

const SONG_PROGRESSIONS: ProgressionId[] = ['blues', 'minor-blues', 'autumn-leaves', 'I-vi-ii-V'];

type SongContent = 'guidetones' | 'chordtones' | 'scale';

const SELF_CHECK: { ja: string; en: string }[] = [
  { ja: 'コード進行を見失わなかった', en: 'I never lost the form' },
  { ja: 'コードが変わる位置を意識できた', en: 'I was aware of every chord change' },
  { ja: '3度または7度に着地できた', en: 'I landed on 3rds or 7ths' },
  { ja: '休符を使えた', en: 'I used rests' },
  { ja: 'モチーフを繰り返せた', en: 'I repeated a motif' },
  { ja: '1つのソロとしてまとまりがあった', en: 'It held together as one solo' },
];

interface Props {
  lang: Lang;
  session: MyInstrumentSettings;
  onPatchSession: (patch: Partial<MyInstrumentSettings>) => void;
  onChangeInstrument: (id: string) => void;
  onSaveBase: () => void;
}

export function SongPracticeScreen({ lang, session, onPatchSession, onChangeInstrument, onSaveBase }: Props) {
  const { instrumentId, pitchMode } = session;
  const t = (key: Parameters<typeof tr>[1]) => tr(lang, key);

  const [progressionId, setProgressionId] = useState<ProgressionId>('blues');
  const [keyPc, setKeyPc] = useState(0);
  const [bpm, setBpm] = useState(100);
  const [missionId, setMissionId] = useState(PRACTICE_MISSIONS[0].id);
  const [content, setContent] = useState<SongContent>('guidetones');
  const [labelMode, setLabelMode] = useState<LabelMode>('none');
  const [countIn, setCountIn] = useState(true);
  const [metronomeOn, setMetronomeOn] = useState(true);
  const [compOn, setCompOn] = useState(true);
  const [chorus, setChorus] = useState(0);
  const [checks, setChecks] = useState<boolean[]>(() => SELF_CHECK.map(() => false));
  const [memo, setMemo] = useState('');
  const [saved, setSaved] = useState(false);
  // 楽器・譜面の確認バー(変更を押すと全設定パネルを展開)
  const [setupConfirmed, setSetupConfirmed] = useState(true);

  const progression = getProgression(progressionId);
  const mission = PRACTICE_MISSIONS.find((m) => m.id === missionId)!;
  const instrument = getInstrument(instrumentId);
  const clef: Clef = session.clefOverride && instrument.clefs.includes(session.clefOverride) ? session.clefOverride : instrument.defaultClef;
  const effNotation = instrumentId === 'guitar' ? session.notationMode : 'staff';
  const shift = displayShift(instrument, pitchMode);
  const flats = useFlatsForKey(mod12(keyPc + shift));

  const displayedNotes: NoteEvent[] = useMemo(() => {
    if (content === 'chordtones') return chordTonesAsNotes(progression, keyPc, 'basic', 'up');
    if (content === 'scale') return scaleAsNotes(progression, keyPc);
    return guideTonesAsNotes(progression, keyPc, 'basic');
  }, [content, progression, keyPc]);

  const chordDisplays: ChordDisplay[] = useMemo(
    () =>
      progression.chords.map((c) => {
        const rootPc = mod12(keyPc + c.rootOffset + shift);
        return { measure: c.measure, beat: c.beat, symbol: chordSymbol(rootPc, c.quality, flats), rootPc, quality: c.quality };
      }),
    [progression, keyPc, shift, flats],
  );

  const { playing, position, currentNoteIndex, startPlayback, stopAll } = usePracticePlayback({
    progression, effKeyPc: keyPc, displayedNotes, bpm, countIn,
    loopEnabled: true, metronomeOn, compOn, swing: 1 / 6, loopRange: 'full', selectedMeasure: 0,
  });

  // コーラス(周回)カウント: 再生位置が先頭に巻き戻った回数を数える
  const prevMeasureRef = useRef(-1);
  useEffect(() => {
    if (!playing || !position || position.measure < 0) return;
    if (prevMeasureRef.current > position.measure) setChorus((c) => c + 1);
    prevMeasureRef.current = position.measure;
  }, [playing, position]);

  const start = () => {
    prevMeasureRef.current = -1;
    setChorus(1);
    startPlayback('backing');
  };

  const save = () => {
    const checked = checks.filter(Boolean).length;
    appendLog({
      menu: `${t('homeSongTitle')}: ${pick(lang, progression.label, progression.labelEn)}`,
      key: KEYS.find((k) => k.pc === keyPc)!.name,
      bpm,
      instrument: instrument.label,
      mode: pick(lang, mission.title, mission.titleEn),
      difficulty: `${t('selfCheckTitle')} ${checked}/${SELF_CHECK.length}`,
      memo: memo.trim(),
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  return (
    <main className="song-main">
      <SessionSetupPanel
        lang={lang}
        practiceTitle={`${pick(lang, progression.label, progression.labelEn)} × ${pick(lang, mission.title, mission.titleEn)}`}
        session={session}
        onPatch={onPatchSession}
        onChangeInstrument={onChangeInstrument}
        onSaveBase={onSaveBase}
        keyPc={keyPc}
        setKeyPc={setKeyPc}
        bpm={bpm}
        setBpm={setBpm}
        confirmed={setupConfirmed}
        onConfirm={() => setSetupConfirmed(true)}
        onEdit={() => { stopAll(); setSetupConfirmed(false); }}
      />

      <section className="panel">
        <h2>{t('homeSongTitle')}</h2>
        <div className="field-row">
          <div className="field">
            <label htmlFor="song-prog">{t('menuLabel')}</label>
            <select id="song-prog" value={progressionId} onChange={(e) => setProgressionId(e.target.value as ProgressionId)}>
              {SONG_PROGRESSIONS.map((id) => {
                const p = PROGRESSIONS.find((x) => x.id === id)!;
                return <option key={id} value={id}>{pick(lang, p.label, p.labelEn)}</option>;
              })}
            </select>
          </div>
          <div className="field">
            <label htmlFor="song-key">{t('keyLabel')}</label>
            <select id="song-key" value={keyPc} onChange={(e) => setKeyPc(Number(e.target.value))}>
              {KEYS.map((k) => (
                <option key={k.pc} value={k.pc}>{k.name}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="field">
          <label htmlFor="song-bpm">{t('tempoLabel')}: <strong>{bpm} BPM</strong></label>
          <input id="song-bpm" type="range" min={40} max={220} value={bpm} onChange={(e) => setBpm(Number(e.target.value))} />
        </div>
        <div className="field">
          <label htmlFor="mission-select">{t('missionLabel')}</label>
          <select id="mission-select" value={missionId} onChange={(e) => setMissionId(e.target.value)}>
            {PRACTICE_MISSIONS.map((m) => (
              <option key={m.id} value={m.id}>{'★'.repeat(m.difficulty)} {pick(lang, m.title, m.titleEn)}</option>
            ))}
          </select>
        </div>
        <div className="exercise-card mission-card">
          <p className="exercise-desc">{pick(lang, mission.description, mission.descriptionEn)}</p>
          <div className="rule-chips">
            {mission.rules.map((r, i) => (
              <span key={i} className="rule-chip">{pick(lang, r.ja, r.en)}</span>
            ))}
          </div>
        </div>
      </section>

      <section className="panel">
        <h2>
          {t('progressionTitle')}
          <span className="key-badge">Key: {KEYS.find((k) => k.pc === keyPc)!.name}</span>
          {chorus > 0 && <span className="key-badge chorus-badge">{t('chorusLabel')} {chorus}</span>}
        </h2>
        <ChordProgressionView
          progression={progression}
          keyPc={keyPc}
          shift={shift}
          flats={flats}
          currentMeasure={position ? position.measure : null}
          currentBeat={position?.beat ?? 0}
          selectedMeasure={0}
          onSelectMeasure={() => {}}
          lang={lang}
        />
        <div className="transport-main">
          {playing ? (
            <button className="btn big stop" onClick={stopAll}>■ Stop</button>
          ) : (
            <button className="btn big start" onClick={start}>▶ Start</button>
          )}
          <button
            className={`btn big example${playing === 'example' ? ' active' : ''}`}
            onClick={() => (playing === 'example' ? stopAll() : startPlayback('example'))}
          >
            ♪ {t('checkNotes')}
          </button>
        </div>
        <div className="transport-opts">
          <label className="toggle"><input type="checkbox" checked={countIn} onChange={(e) => setCountIn(e.target.checked)} /> 4 Count In</label>
          <label className="toggle"><input type="checkbox" checked={metronomeOn} onChange={(e) => setMetronomeOn(e.target.checked)} /> {t('metronome')}</label>
          <label className="toggle"><input type="checkbox" checked={compOn} onChange={(e) => setCompOn(e.target.checked)} /> {t('compSound')}</label>
        </div>
      </section>

      <section className="panel">
        <div className="staff-head">
          <h2>{t('staffTitle')}</h2>
          <div className="seg-group">
            <button className={`seg${content === 'guidetones' ? ' on' : ''}`} onClick={() => setContent('guidetones')}>{t('guideTones')}</button>
            <button className={`seg${content === 'chordtones' ? ' on' : ''}`} onClick={() => setContent('chordtones')}>{t('chordTones')}</button>
            <button className={`seg${content === 'scale' ? ' on' : ''}`} onClick={() => setContent('scale')}>{t('scaleTab')}</button>
          </div>
          <div className="seg-group">
            <button className={`seg${labelMode === 'none' ? ' on' : ''}`} onClick={() => setLabelMode('none')}>{t('labelNone')}</button>
            <button className={`seg${labelMode === 'name' ? ' on' : ''}`} onClick={() => setLabelMode('name')}>C D E</button>
            <button className={`seg${labelMode === 'degree' ? ' on' : ''}`} onClick={() => setLabelMode('degree')}>{t('labelDegree')}</button>
          </div>
        </div>
        <div className="staff-card">
          <StaffView
            notes={displayedNotes}
            measures={progression.measures}
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

      <section className="panel">
        <h2>{t('selfCheckTitle')}</h2>
        <ul className="check-list">
          {SELF_CHECK.map((c, i) => (
            <li key={i}>
              <label className="toggle check-item">
                <input
                  type="checkbox"
                  checked={checks[i]}
                  onChange={(e) => setChecks(checks.map((v, j) => (j === i ? e.target.checked : v)))}
                />
                {pick(lang, c.ja, c.en)}
              </label>
            </li>
          ))}
        </ul>
        <textarea value={memo} onChange={(e) => setMemo(e.target.value)} placeholder={t('memoPlaceholder')} rows={2} />
        <div className="lesson-complete-row">
          <button className="btn big primary" onClick={save}>{t('saveResult')}</button>
          {saved && <span className="saved-note">✓ {t('resultSaved')}</span>}
        </div>
      </section>
    </main>
  );
}
