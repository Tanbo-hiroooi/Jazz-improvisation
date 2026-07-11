// 自由練習: 練習したい技術を自分で選び、個別に反復するモード

import { useMemo, useState } from 'react';
import { ChordInfoPanel } from '../components/ChordInfoPanel';
import { ChordProgressionView } from '../components/ChordProgressionView';
import { CustomProgressionEditor, DEFAULT_CUSTOM, type CustomChord } from '../components/CustomProgressionEditor';
import { PracticeLogPanel } from '../components/PracticeLogPanel';
import { StaffView, type ChordDisplay, type LabelMode } from '../components/StaffView';
import { EXERCISES, EXERCISE_CATEGORY_LABELS, type ExerciseCategory } from '../data/exercises';
import { usePracticePlayback, type LoopRange } from '../hooks/usePracticePlayback';
import { chordSymbol } from '../theory/chords';
import { INSTRUMENTS, getInstrument, displayShift, type Clef, type PitchMode } from '../theory/instruments';
import { getPracticeGuide, type StaffTab } from '../theory/modes';
import { KEYS, mod12, useFlatsForKey } from '../theory/notes';
import {
  ARP_PATTERNS,
  TONE_RHYTHMS,
  approachAsNotes,
  chordTonesAsNotes,
  guideTonesAsNotes,
  scaleAsNotes,
  targetAsNotes,
  tensionsAsNotes,
  type ArpPatternId,
  type NoteEvent,
  type ToneRhythmId,
} from '../theory/phrases';
import { PROGRESSIONS, chordAt, getProgression, type Progression, type ProgressionId } from '../theory/progressions';
import { SWING_OPTIONS } from '../theory/rhythms';
import { pick, t as tr, type Lang } from '../i18n';

/** レッスンから復習に来るときに引き継ぐ設定 */
export interface FreePracticeInit {
  progressionId: ProgressionId;
  keyPc: number;
  bpm: number;
  tab: StaffTab;
  toneRhythm?: ToneRhythmId;
  arpPattern?: ArpPatternId;
  scaleView?: 'scale' | 'tension';
}

interface Props {
  lang: Lang;
  instrumentId: string;
  setInstrumentId: (id: string) => void;
  clefOverride: Clef | null;
  setClefOverride: (c: Clef | null) => void;
  pitchMode: PitchMode;
  setPitchMode: (m: PitchMode) => void;
  /** レッスンから引き継いだ初期設定 */
  initial?: FreePracticeInit | null;
  /** 復習元のレッスンへ戻る導線(引き継ぎ時のみ) */
  onReturnToLesson?: () => void;
}

export function FreePracticeScreen({ lang, instrumentId, setInstrumentId, clefOverride, setClefOverride, pitchMode, setPitchMode, initial, onReturnToLesson }: Props) {
  const t = (key: Parameters<typeof tr>[1]) => tr(lang, key);

  // ---- 設定 ----
  const [menuId, setMenuId] = useState<ProgressionId>(initial?.progressionId ?? 'ii-V-I');
  const [customChords, setCustomChords] = useState<CustomChord[]>(DEFAULT_CUSTOM);
  const [keyPc, setKeyPc] = useState(initial?.keyPc ?? 0);
  const [bpm, setBpm] = useState(initial?.bpm ?? 100);
  const [tab, setTab] = useState<StaffTab>(initial?.tab ?? 'chordtones');
  const [toneRhythm, setToneRhythm] = useState<ToneRhythmId>(initial?.toneRhythm ?? 'basic');
  const [arpPattern, setArpPattern] = useState<ArpPatternId>(initial?.arpPattern ?? 'up');
  const [scaleView, setScaleView] = useState<'scale' | 'tension'>(initial?.scaleView ?? 'scale');
  const [exerciseId, setExerciseId] = useState('');
  // BPMの直接入力用テキスト(入力途中の値をクランプしないための分離)
  const [bpmText, setBpmText] = useState(String(initial?.bpm ?? 100));
  const [labelMode, setLabelMode] = useState<LabelMode>('none');

  // ---- 再生オプション ----
  const [loopEnabled, setLoopEnabled] = useState(true);
  const [countIn, setCountIn] = useState(true);
  const [metronomeOn, setMetronomeOn] = useState(true);
  const [compOn, setCompOn] = useState(true);
  const [loopRange, setLoopRange] = useState<LoopRange>('full');
  const [selectedMeasure, setSelectedMeasure] = useState(0);
  const [swingId, setSwingId] = useState('standard');

  const isCustom = menuId === 'custom';
  // 実践モードではコードを直接指定するため、キーは 0(オフセット=実音)として扱う
  const effKeyPc = isCustom ? 0 : keyPc;
  const progression = useMemo<Progression>(() => {
    if (!isCustom) return getProgression(menuId);
    return {
      id: 'custom',
      label: tr('ja', 'customLabel'),
      labelEn: tr('en', 'customLabel'),
      measures: customChords.length,
      description: tr('ja', 'customDescription'),
      descriptionEn: tr('en', 'customDescription'),
      chords: customChords.map((c, i) => ({ measure: i, beat: 0, beats: 4, rootOffset: c.pc, quality: c.q })),
    };
  }, [isCustom, menuId, customChords]);
  const instrument = getInstrument(instrumentId);
  const clef: Clef = clefOverride && instrument.clefs.includes(clefOverride) ? clefOverride : instrument.defaultClef;
  const shift = displayShift(instrument, pitchMode);
  const displayKeyPc = mod12(effKeyPc + shift);
  const flats = useFlatsForKey(displayKeyPc);
  const concertFlats = useFlatsForKey(keyPc);
  const guide = getPracticeGuide(tab, lang);
  const swingOffset = SWING_OPTIONS.find((s) => s.id === swingId)!.offset;
  // 16分パターンはスウィングせずイーブンで再生する
  const rhythmNoSwing = (tab === 'chordtones' || tab === 'guidetones') && !!TONE_RHYTHMS.find((r) => r.id === toneRhythm)?.noSwing;
  const effectiveSwing = rhythmNoSwing ? 0 : swingOffset;
  const exercise = EXERCISES.find((e) => e.id === exerciseId);

  const displayedNotes: NoteEvent[] = useMemo(() => {
    if (tab === 'guidetones') return guideTonesAsNotes(progression, effKeyPc, toneRhythm);
    if (tab === 'approach') return approachAsNotes(progression, effKeyPc);
    if (tab === 'target') return targetAsNotes(progression, effKeyPc);
    if (tab === 'scale') return scaleView === 'tension' ? tensionsAsNotes(progression, effKeyPc) : scaleAsNotes(progression, effKeyPc);
    return chordTonesAsNotes(progression, effKeyPc, toneRhythm, arpPattern);
  }, [tab, progression, effKeyPc, toneRhythm, arpPattern, scaleView]);

  // 譜面上のコード表記(移調適用)
  const chordDisplays: ChordDisplay[] = useMemo(
    () =>
      progression.chords.map((c) => {
        const rootPc = mod12(effKeyPc + c.rootOffset + shift);
        return { measure: c.measure, beat: c.beat, symbol: chordSymbol(rootPc, c.quality, flats), rootPc, quality: c.quality };
      }),
    [progression, effKeyPc, shift, flats],
  );

  const { playing, position, currentNoteIndex, startPlayback, stopAll } = usePracticePlayback({
    progression, effKeyPc, displayedNotes, bpm, countIn, loopEnabled, metronomeOn, compOn,
    swing: effectiveSwing, loopRange, selectedMeasure,
  });

  // ---- 現在のコード(情報パネル用) ----
  const infoMeasure = position && position.measure >= 0 ? position.measure : selectedMeasure;
  const infoBeat = position && position.measure >= 0 ? position.beat : 0;
  const currentChord = chordAt(progression, infoMeasure, infoBeat);
  const currentChordDisplayRoot = mod12(effKeyPc + currentChord.rootOffset + shift);
  const concertChordLabel =
    pitchMode === 'written' && shift % 12 !== 0
      ? chordSymbol(mod12(effKeyPc + currentChord.rootOffset), currentChord.quality, concertFlats)
      : undefined;

  const keyName = KEYS.find((k) => k.pc === keyPc)!.name;

  // 課題セレクタ用: カテゴリーごとにグループ化
  const categories = Object.keys(EXERCISE_CATEGORY_LABELS) as ExerciseCategory[];

  return (
    <main className="layout">
      {onReturnToLesson && (
        <div className="review-banner">
          <span>📖 {t('reviewBanner')}</span>
          <button className="btn" onClick={onReturnToLesson}>← {t('backToLesson')}</button>
        </div>
      )}
      {/* ===== 設定パネル ===== */}
      <section className="panel settings-panel">
        <h2>{t('setupTitle')}</h2>

        <div className="field">
          <label htmlFor="menu-select">{t('menuLabel')}</label>
          <select
            id="menu-select"
            value={menuId}
            onChange={(e) => {
              const id = e.target.value as ProgressionId;
              setMenuId(id);
              setSelectedMeasure(0);
              if (id === 'custom') setTab('scale');
            }}
          >
            {PROGRESSIONS.map((p) => (
              <option key={p.id} value={p.id}>{pick(lang, p.label, p.labelEn)}</option>
            ))}
            <option value="custom">{t('customMenuOption')}</option>
          </select>
          <p className="hint-text">{pick(lang, progression.description, progression.descriptionEn)}</p>
        </div>

        {isCustom && (
          <CustomProgressionEditor
            chords={customChords}
            onChange={setCustomChords}
            shift={shift}
            lang={lang}
            pitchLabel={
              pitchMode === 'written' && shift % 12 !== 0
                ? `${t('written')} — ${instrument.label} / ${pick(lang, instrument.transposeLabel, instrument.transposeLabelEn)}`
                : t('concert')
            }
          />
        )}

        <div className="field-row">
          <div className="field">
            <label htmlFor="key-select">{t('keyLabel')}</label>
            <select id="key-select" value={keyPc} onChange={(e) => setKeyPc(Number(e.target.value))} disabled={isCustom}>
              {KEYS.map((k) => (
                <option key={k.pc} value={k.pc}>{k.name}</option>
              ))}
            </select>
            {isCustom && <p className="hint-text">{t('customKeyHint')}</p>}
          </div>
          <div className="field">
            <label htmlFor="instrument-select">{t('instrumentLabel')}</label>
            <select id="instrument-select" value={instrumentId} onChange={(e) => { setInstrumentId(e.target.value); setClefOverride(null); }}>
              {INSTRUMENTS.map((i) => (
                <option key={i.id} value={i.id}>{i.label}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="field-row">
          <div className="field">
            <label>{t('pitchLabel')}</label>
            <div className="seg-group">
              <button className={`seg${pitchMode === 'concert' ? ' on' : ''}`} onClick={() => setPitchMode('concert')}>{t('concert')}</button>
              <button className={`seg${pitchMode === 'written' ? ' on' : ''}`} onClick={() => setPitchMode('written')}>{t('written')}</button>
            </div>
            <p className="hint-text">{pick(lang, instrument.transposeLabel, instrument.transposeLabelEn)}</p>
          </div>
          {instrument.clefs.length > 1 && (
            <div className="field">
              <label>{t('clefLabel')}</label>
              <div className="seg-group">
                {instrument.clefs.map((c) => (
                  <button key={c} className={`seg${clef === c ? ' on' : ''}`} onClick={() => setClefOverride(c)}>
                    {c === 'grand' ? 'Grand' : c === 'treble' ? 'Treble' : 'Bass'}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="field">
          <label htmlFor="bpm-slider">{t('tempoLabel')}: <strong>{bpm} BPM</strong></label>
          <div className="bpm-row">
            <input
              id="bpm-slider"
              type="range" min={40} max={220} value={bpm}
              onChange={(e) => { setBpm(Number(e.target.value)); setBpmText(e.target.value); }}
            />
            <input
              type="number" min={40} max={220} value={bpmText}
              onChange={(e) => {
                // 入力途中はクランプせず、有効範囲の値だけライブ反映する
                setBpmText(e.target.value);
                const v = Number(e.target.value);
                if (Number.isFinite(v) && v >= 40 && v <= 220) setBpm(v);
              }}
              onBlur={() => {
                const v = Math.max(40, Math.min(220, Number(bpmText) || bpm));
                setBpm(v);
                setBpmText(String(v));
              }}
            />
          </div>
        </div>

        <div className="field">
          <label>{t('contentLabel')}</label>
          <div className="seg-group wrap">
            <button className={`seg${tab === 'chordtones' ? ' on' : ''}`} onClick={() => setTab('chordtones')}>{t('chordTones')}</button>
            <button className={`seg${tab === 'guidetones' ? ' on' : ''}`} onClick={() => setTab('guidetones')}>{t('guideTones')}</button>
            <button className={`seg${tab === 'approach' ? ' on' : ''}`} onClick={() => setTab('approach')}>{t('approachTab')}</button>
            <button className={`seg${tab === 'target' ? ' on' : ''}`} onClick={() => setTab('target')}>{t('targetTab')}</button>
            <button className={`seg${tab === 'scale' ? ' on' : ''}`} onClick={() => setTab('scale')}>{t('scaleTab')}</button>
          </div>
        </div>

        {tab === 'chordtones' && (
          <div className="field">
            <label>{t('arpLabel')}</label>
            <div className="seg-group wrap">
              {ARP_PATTERNS.map((a) => (
                <button key={a.id} className={`seg${arpPattern === a.id ? ' on' : ''}`} onClick={() => setArpPattern(a.id)}>
                  {pick(lang, a.label, a.labelEn)}
                </button>
              ))}
            </div>
          </div>
        )}

        {tab === 'scale' && (
          <div className="field">
            <label>{t('scaleViewLabel')}</label>
            <div className="seg-group">
              <button className={`seg${scaleView === 'scale' ? ' on' : ''}`} onClick={() => setScaleView('scale')}>{t('viewScale')}</button>
              <button className={`seg${scaleView === 'tension' ? ' on' : ''}`} onClick={() => setScaleView('tension')}>{t('viewTension')}</button>
            </div>
          </div>
        )}

        {(tab === 'chordtones' || tab === 'guidetones') && (
          <div className="field">
            <label>{t('rhythmPatternLabel')}</label>
            <div className="seg-group wrap">
              {TONE_RHYTHMS.map((r) => (
                <button key={r.id} className={`seg${toneRhythm === r.id ? ' on' : ''}`} onClick={() => setToneRhythm(r.id)}>
                  {pick(lang, r.label, r.labelEn)}
                </button>
              ))}
            </div>
            <p className="hint-text">{(() => { const r = TONE_RHYTHMS.find((x) => x.id === toneRhythm); return r ? pick(lang, r.hint, r.hintEn) : ''; })()}</p>
            <div className="sub-field">
              <label>{t('swingLabel')}</label>
              <div className="seg-group">
                {SWING_OPTIONS.map((s) => (
                  <button
                    key={s.id}
                    className={`seg${swingId === s.id ? ' on' : ''}`}
                    onClick={() => setSwingId(s.id)}
                    disabled={rhythmNoSwing}
                  >
                    {pick(lang, s.label, s.labelEn)}
                  </button>
                ))}
              </div>
              {rhythmNoSwing && <p className="hint-text">{t('noSwing16')}</p>}
            </div>
          </div>
        )}

        <div className="field">
          <label htmlFor="exercise-select">{t('exerciseLabel')}</label>
          <select id="exercise-select" value={exerciseId} onChange={(e) => setExerciseId(e.target.value)}>
            <option value="">{t('exerciseNone')}</option>
            {categories.map((cat) => (
              <optgroup key={cat} label={pick(lang, EXERCISE_CATEGORY_LABELS[cat].ja, EXERCISE_CATEGORY_LABELS[cat].en)}>
                {EXERCISES.filter((e) => e.category === cat).map((e) => (
                  <option key={e.id} value={e.id}>{pick(lang, e.title, e.titleEn)}</option>
                ))}
              </optgroup>
            ))}
          </select>
        </div>
      </section>

      {/* ===== メイン(進行・譜面・再生) ===== */}
      <div className="main-col">
        <section className="panel">
          <h2>{t('progressionTitle')} <span className="key-badge">{isCustom ? t('customBadge') : `Key: ${keyName}${pitchMode === 'written' && shift % 12 !== 0 ? `(${t('writtenBadge')}: ${KEYS.find((k) => k.pc === displayKeyPc)!.name})` : ''}`}</span></h2>
          <ChordProgressionView
            progression={progression}
            keyPc={effKeyPc}
            shift={shift}
            flats={flats}
            currentMeasure={position ? position.measure : null}
            currentBeat={position?.beat ?? 0}
            selectedMeasure={selectedMeasure}
            onSelectMeasure={setSelectedMeasure}
            lang={lang}
          />

          {/* 再生コントロール */}
          <div className="transport">
            <div className="transport-main">
              {playing ? (
                <button className="btn big stop" onClick={stopAll}>■ Stop</button>
              ) : (
                <button className="btn big start" onClick={() => startPlayback('backing')}>▶ Start</button>
              )}
              <button
                className={`btn big example${playing === 'example' ? ' active' : ''}`}
                onClick={() => (playing === 'example' ? stopAll() : startPlayback('example'))}
              >
                ♪ {t('checkNotes')}
              </button>
              <button
                className={`btn big rhythm${playing === 'rhythm' ? ' active' : ''}`}
                onClick={() => (playing === 'rhythm' ? stopAll() : startPlayback('rhythm'))}
              >
                ♩ Rhythm Only
              </button>
            </div>
            <div className="transport-opts">
              <label className="toggle"><input type="checkbox" checked={loopEnabled} onChange={(e) => setLoopEnabled(e.target.checked)} /> Loop</label>
              <label className="toggle"><input type="checkbox" checked={countIn} onChange={(e) => setCountIn(e.target.checked)} /> 4 Count In</label>
              <label className="toggle"><input type="checkbox" checked={metronomeOn} onChange={(e) => setMetronomeOn(e.target.checked)} /> {t('metronome')}</label>
              <label className="toggle"><input type="checkbox" checked={compOn} onChange={(e) => setCompOn(e.target.checked)} /> {t('compSound')}</label>
            </div>
            <div className="transport-opts">
              <span className="opt-label">{t('loopRangeLabel')}</span>
              <div className="seg-group">
                <button className={`seg${loopRange === 'full' ? ' on' : ''}`} onClick={() => setLoopRange('full')}>{t('loopFull')}</button>
                <button className={`seg${loopRange === '2' ? ' on' : ''}`} onClick={() => setLoopRange('2')}>{t('loop2')}</button>
                <button className={`seg${loopRange === '1' ? ' on' : ''}`} onClick={() => setLoopRange('1')}>{t('loop1')}</button>
              </div>
            </div>
          </div>
        </section>

        <section className="panel">
          <div className="staff-head">
            <h2>{t('staffTitle')}</h2>
            <span className="key-badge">
              {(() => {
                const rhythmLabel = (() => { const r = TONE_RHYTHMS.find((x) => x.id === toneRhythm); return r ? pick(lang, r.label, r.labelEn) : ''; })();
                switch (tab) {
                  case 'chordtones': return `${t('chordTones')} / ${rhythmLabel}`;
                  case 'guidetones': return `${t('guideTones')} / ${rhythmLabel}`;
                  case 'approach': return t('approachBadge');
                  case 'target': return t('targetBadge');
                  case 'scale': return scaleView === 'tension' ? `${t('scaleTab')} / ${t('tensionBadge')}` : t('scaleTab');
                }
              })()}
            </span>
            <div className="seg-group">
              <button className={`seg${labelMode === 'none' ? ' on' : ''}`} onClick={() => setLabelMode('none')}>{t('labelNone')}</button>
              <button className={`seg${labelMode === 'name' ? ' on' : ''}`} onClick={() => setLabelMode('name')}>C D E</button>
              <button className={`seg${labelMode === 'solfege' ? ' on' : ''}`} onClick={() => setLabelMode('solfege')}>{t('labelSolfege')}</button>
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
            />
          </div>
          {pitchMode === 'written' && shift !== 0 && (
            <p className="hint-text">{t('writtenNotice')}</p>
          )}
        </section>

        {exercise && (
          <section className="panel exercise-card">
            <h2>{t('exerciseLabel')} — {pick(lang, exercise.title, exercise.titleEn)}</h2>
            <p className="exercise-desc">{pick(lang, exercise.description, exercise.descriptionEn)}</p>
            <p className="hint-text">{t('objectiveTitle')}: {pick(lang, exercise.objective, exercise.objectiveEn)}</p>
            <div className="rule-chips">
              {exercise.rules.map((r) => (
                <span key={r.id} className="rule-chip">{pick(lang, r.label, r.labelEn)}</span>
              ))}
            </div>
          </section>
        )}

        <section className="panel">
          <h2>{t('nowChordTitle')}</h2>
          <ChordInfoPanel
            rootPc={currentChordDisplayRoot}
            quality={currentChord.quality}
            flats={flats}
            concertLabel={concertChordLabel}
            lang={lang}
          />
        </section>

        <section className="panel">
          <h2>{t('practicePointTitle')} — {guide.title}</h2>
          <ol className="tips-list">
            {guide.tips.map((tip, i) => (
              <li key={i}>{tip}</li>
            ))}
          </ol>
        </section>

        <PracticeLogPanel
          lang={lang}
          currentSettings={{
            menu: pick(lang, progression.label, progression.labelEn),
            key: isCustom ? t('customBadge') : keyName,
            bpm,
            instrument: instrument.label,
            mode: exercise ? pick(lang, exercise.title, exercise.titleEn) : guide.title,
            difficulty: (() => {
              if (tab === 'scale') return scaleView === 'tension' ? t('tensionBadge') : t('scaleLogLabel');
              if (tab === 'approach') return t('approachBadge');
              if (tab === 'target') return t('targetBadge');
              const r = TONE_RHYTHMS.find((x) => x.id === toneRhythm);
              return r ? pick(lang, r.label, r.labelEn) : '';
            })(),
          }}
        />
      </div>
    </main>
  );
}
