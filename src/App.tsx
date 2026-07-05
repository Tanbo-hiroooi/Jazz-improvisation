import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { engine, type CompEvent } from './audio/engine';
import { ChordInfoPanel } from './components/ChordInfoPanel';
import { ChordProgressionView } from './components/ChordProgressionView';
import { CustomProgressionEditor, DEFAULT_CUSTOM, type CustomChord } from './components/CustomProgressionEditor';
import { PracticeLogPanel } from './components/PracticeLogPanel';
import { StaffView, type ChordDisplay, type LabelMode } from './components/StaffView';
import { QUALITIES, chordSymbol } from './theory/chords';
import { INSTRUMENTS, getInstrument, displayShift, type Clef, type PitchMode } from './theory/instruments';
import { getPracticeGuide, type StaffTab } from './theory/modes';
import { KEYS, mod12, useFlatsForKey } from './theory/notes';
import {
  TONE_RHYTHMS,
  chordTonesAsNotes,
  guideTonesAsNotes,
  scaleAsNotes,
  type NoteEvent,
  type ToneRhythmId,
} from './theory/phrases';
import { PROGRESSIONS, chordAt, getProgression, type Progression, type ProgressionId } from './theory/progressions';
import { SWING_OPTIONS } from './theory/rhythms';
import { loadLang, saveLang, pick, t as tr, type Lang } from './i18n';
import './styles.css';

type LoopRange = 'full' | '2' | '1';
type PlayKind = 'backing' | 'example' | 'rhythm';

export default function App() {
  // ---- 表示言語 ----
  const [lang, setLang] = useState<Lang>(loadLang);
  const t = useCallback((key: Parameters<typeof tr>[1]) => tr(lang, key), [lang]);
  const changeLang = (l: Lang) => {
    setLang(l);
    saveLang(l);
  };

  // ---- 設定 ----
  const [menuId, setMenuId] = useState<ProgressionId>('ii-V-I');
  const [customChords, setCustomChords] = useState<CustomChord[]>(DEFAULT_CUSTOM);
  const [keyPc, setKeyPc] = useState(0);
  const [bpm, setBpm] = useState(100);
  const [instrumentId, setInstrumentId] = useState('piano');
  const [clefOverride, setClefOverride] = useState<Clef | null>(null);
  const [pitchMode, setPitchMode] = useState<PitchMode>('concert');
  const [tab, setTab] = useState<StaffTab>('chordtones');
  const [toneRhythm, setToneRhythm] = useState<ToneRhythmId>('basic');
  // BPMの直接入力用テキスト(入力途中の値をクランプしないための分離)
  const [bpmText, setBpmText] = useState('100');
  const [labelMode, setLabelMode] = useState<LabelMode>('none');

  // ---- 再生オプション ----
  const [loopEnabled, setLoopEnabled] = useState(true);
  const [countIn, setCountIn] = useState(true);
  const [metronomeOn, setMetronomeOn] = useState(true);
  const [compOn, setCompOn] = useState(true);
  const [loopRange, setLoopRange] = useState<LoopRange>('full');
  const [selectedMeasure, setSelectedMeasure] = useState(0);
  const [swingId, setSwingId] = useState('standard');

  // ---- 再生状態 ----
  const [playing, setPlaying] = useState<PlayKind | null>(null);
  const [position, setPosition] = useState<{ measure: number; beat: number } | null>(null);
  const [currentNoteIndex, setCurrentNoteIndex] = useState(-1);
  const regionMapRef = useRef<number[]>([]);
  const regionStartRef = useRef(0);

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

  const displayedNotes: NoteEvent[] = useMemo(() => {
    if (tab === 'guidetones') return guideTonesAsNotes(progression, effKeyPc, toneRhythm);
    if (tab === 'scale') return scaleAsNotes(progression, effKeyPc);
    return chordTonesAsNotes(progression, effKeyPc, toneRhythm);
  }, [tab, progression, effKeyPc, toneRhythm]);

  // 譜面上のコード表記(移調適用)
  const chordDisplays: ChordDisplay[] = useMemo(
    () =>
      progression.chords.map((c) => {
        const rootPc = mod12(effKeyPc + c.rootOffset + shift);
        return { measure: c.measure, beat: c.beat, symbol: chordSymbol(rootPc, c.quality, flats), rootPc, quality: c.quality };
      }),
    [progression, effKeyPc, shift, flats],
  );

  // ---- 再生制御 ----
  const stopAll = useCallback(() => {
    engine.stop();
    setPlaying(null);
    setPosition(null);
    setCurrentNoteIndex(-1);
  }, []);

  const startPlayback = useCallback(
    async (kind: PlayKind) => {
      engine.stop();
      const totalBars = progression.measures;
      let regionStart = 0;
      let regionBars = totalBars;
      if (loopRange !== 'full') {
        const len = loopRange === '1' ? 1 : 2;
        regionStart = Math.min(selectedMeasure, totalBars - len);
        regionBars = len;
      }
      regionStartRef.current = regionStart;
      const startBeat = regionStart * 4;
      const endBeat = (regionStart + regionBars) * 4;

      // リージョン内の見本ノート(開始拍を0に正規化)
      // Rhythm Only も表示中のタブの内容を使う: 譜面のハイライトと音を常に一致させるため
      let regionNotes: NoteEvent[] | undefined;
      regionMapRef.current = [];
      if (kind !== 'backing') {
        const src = displayedNotes;
        regionNotes = [];
        src.forEach((n, gi) => {
          if (n.start >= startBeat - 0.01 && n.start < endBeat - 0.01) {
            regionNotes!.push({ ...n, start: n.start - startBeat });
            regionMapRef.current.push(gi);
          }
        });
      }

      // 簡易コード音(ルート+ガイドトーン)
      let comp: CompEvent[] | undefined;
      if (compOn) {
        comp = [];
        for (const c of progression.chords) {
          const cStart = c.measure * 4 + c.beat;
          if (cStart < startBeat || cStart >= endBeat) continue;
          const rootPc = mod12(effKeyPc + c.rootOffset);
          const rootMidi = 48 + rootPc - (rootPc > 7 ? 12 : 0);
          const def = QUALITIES[c.quality];
          const guideMidis = def.guide.map((g) => {
            let m = 60 + mod12(rootPc + g);
            if (m > 67) m -= 12;
            return m;
          });
          comp.push({ start: cStart - startBeat, midis: [rootMidi, ...guideMidis], duration: Math.min(c.beats, 2.5) });
        }
      }

      await engine.start({
        bpm,
        countIn,
        loop: loopEnabled,
        regionBars,
        metronome: metronomeOn,
        notes: regionNotes,
        rhythmOnly: kind === 'rhythm',
        comp,
        swing: effectiveSwing,
        onPosition: (bar, beat) => {
          if (bar < 0) setPosition({ measure: -1, beat });
          else setPosition({ measure: regionStartRef.current + (bar % regionBars), beat });
        },
        onNoteIndex: (idx) => {
          setCurrentNoteIndex(idx >= 0 ? regionMapRef.current[idx] ?? -1 : -1);
        },
        onEnded: () => {
          setPlaying(null);
          setPosition(null);
          setCurrentNoteIndex(-1);
        },
      });
      setPlaying(kind);
    },
    [progression, loopRange, selectedMeasure, displayedNotes, compOn, effKeyPc, bpm, countIn, loopEnabled, metronomeOn, effectiveSwing],
  );

  // BPMは再生中もライブ反映
  useEffect(() => {
    if (playing) engine.setBpm(bpm);
  }, [bpm, playing]);

  // 設定変更時は停止
  useEffect(() => {
    stopAll();
  }, [progression, keyPc, instrumentId, tab, toneRhythm, stopAll]);

  useEffect(() => () => engine.stop(), []);

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

  return (
    <div className="app">
      <header className="app-header">
        <div className="app-header-row">
          <h1>Jazz Phrase Lab</h1>
          <div className="seg-group lang-toggle">
            <button className={`seg${lang === 'ja' ? ' on' : ''}`} onClick={() => changeLang('ja')}>日本語</button>
            <button className={`seg${lang === 'en' ? ' on' : ''}`} onClick={() => changeLang('en')}>English</button>
          </div>
        </div>
        <p className="tagline">{t('tagline')}</p>
      </header>

      <main className="layout">
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
              <button className={`seg${tab === 'scale' ? ' on' : ''}`} onClick={() => setTab('scale')}>{t('scaleTab')}</button>
            </div>
          </div>

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
                  ♪ Play Example
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
                {tab === 'chordtones' ? t('chordTones') : tab === 'guidetones' ? t('guideTones') : t('scaleTab')}
                {tab !== 'scale' ? ` / ${(() => { const r = TONE_RHYTHMS.find((x) => x.id === toneRhythm); return r ? pick(lang, r.label, r.labelEn) : ''; })()}` : ''}
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
              {guide.tips.map((t, i) => (
                <li key={i}>{t}</li>
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
              mode: guide.title,
              difficulty: tab === 'scale'
                ? t('scaleLogLabel')
                : (() => { const r = TONE_RHYTHMS.find((x) => x.id === toneRhythm); return r ? pick(lang, r.label, r.labelEn) : ''; })(),
            }}
          />
        </div>
      </main>

      <footer className="app-footer">
        <p>{t('footer')}</p>
      </footer>
    </div>
  );
}
