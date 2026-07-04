import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { engine, type CompEvent } from './audio/engine';
import { ChordInfoPanel } from './components/ChordInfoPanel';
import { ChordProgressionView } from './components/ChordProgressionView';
import { CustomProgressionEditor, DEFAULT_CUSTOM, type CustomChord } from './components/CustomProgressionEditor';
import { PracticeLogPanel } from './components/PracticeLogPanel';
import { RhythmDojoPanel, rhythmToNotes } from './components/RhythmDojoPanel';
import { StaffView, type ChordDisplay, type LabelMode } from './components/StaffView';
import { QUALITIES, chordSymbol } from './theory/chords';
import { INSTRUMENTS, getInstrument, displayShift, type Clef, type PitchMode } from './theory/instruments';
import { getPracticeGuide, type StaffTab } from './theory/modes';
import { KEYS, mod12, useFlatsForKey } from './theory/notes';
import {
  DIFFICULTIES,
  TONE_RHYTHMS,
  chordTonesAsNotes,
  generatePhrase,
  guideTonesAsNotes,
  scaleAsNotes,
  type Difficulty,
  type NoteEvent,
  type ToneRhythmId,
} from './theory/phrases';
import { PROGRESSIONS, chordAt, getProgression, type Progression, type ProgressionId } from './theory/progressions';
import { JAZZ_RHYTHMS, SWING_OPTIONS } from './theory/rhythms';
import './styles.css';

type LoopRange = 'full' | '2' | '1';
type PlayKind = 'backing' | 'example' | 'rhythm' | 'dojo';

export default function App() {
  // ---- 設定 ----
  const [menuId, setMenuId] = useState<ProgressionId>('ii-V-I');
  const [customChords, setCustomChords] = useState<CustomChord[]>(DEFAULT_CUSTOM);
  const [keyPc, setKeyPc] = useState(0);
  const [bpm, setBpm] = useState(100);
  const [instrumentId, setInstrumentId] = useState('piano');
  const [clefOverride, setClefOverride] = useState<Clef | null>(null);
  const [pitchMode, setPitchMode] = useState<PitchMode>('concert');
  const [difficulty, setDifficulty] = useState<Difficulty>('beginner');
  const [tab, setTab] = useState<StaffTab>('phrase');
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
  const [rhythmVariant, setRhythmVariant] = useState(0);
  const [melodyVariant, setMelodyVariant] = useState(0);
  const [swingId, setSwingId] = useState('standard');

  // ---- ジャズリズム練習 ----
  const [dojoPatternId, setDojoPatternId] = useState('charleston');
  const [dojoNoteIndex, setDojoNoteIndex] = useState(-1);

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
      label: '実践モード(自由進行)',
      measures: customChords.length,
      description: 'コード進行と小節数を自由に決めて、コード音をバックに練習できます。',
      chords: customChords.map((c, i) => ({ measure: i, beat: 0, beats: 4, rootOffset: c.pc, quality: c.q })),
    };
  }, [isCustom, menuId, customChords]);
  const instrument = getInstrument(instrumentId);
  const clef: Clef = clefOverride && instrument.clefs.includes(clefOverride) ? clefOverride : instrument.defaultClef;
  const shift = displayShift(instrument, pitchMode);
  const displayKeyPc = mod12(effKeyPc + shift);
  const flats = useFlatsForKey(displayKeyPc);
  const concertFlats = useFlatsForKey(keyPc);
  const guide = getPracticeGuide(tab, difficulty);
  const swingOffset = SWING_OPTIONS.find((s) => s.id === swingId)!.offset;

  // 見本フレーズ(Concert)
  const phrase = useMemo(
    () => generatePhrase(progression, effKeyPc, difficulty, { rhythmVariant, melodyVariant }),
    [progression, effKeyPc, difficulty, rhythmVariant, melodyVariant],
  );

  const displayedNotes: NoteEvent[] = useMemo(() => {
    if (tab === 'chordtones') return chordTonesAsNotes(progression, effKeyPc, toneRhythm);
    if (tab === 'guidetones') return guideTonesAsNotes(progression, effKeyPc, toneRhythm);
    if (tab === 'scale') return scaleAsNotes(progression, effKeyPc);
    return phrase;
  }, [tab, progression, effKeyPc, phrase, toneRhythm]);

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
    setDojoNoteIndex(-1);
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
        swing: swingOffset,
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
    [progression, loopRange, selectedMeasure, displayedNotes, compOn, effKeyPc, bpm, countIn, loopEnabled, metronomeOn, swingOffset],
  );

  // ジャズリズム練習の再生
  const startDojo = useCallback(
    async (patternId: string) => {
      engine.stop();
      const pattern = JAZZ_RHYTHMS.find((r) => r.id === patternId) ?? JAZZ_RHYTHMS[0];
      await engine.start({
        bpm,
        countIn,
        loop: true,
        regionBars: pattern.bars,
        metronome: metronomeOn,
        notes: rhythmToNotes(pattern),
        rhythmOnly: true,
        swing: swingOffset,
        onNoteIndex: (idx) => setDojoNoteIndex(idx),
        onEnded: () => {
          setPlaying(null);
          setDojoNoteIndex(-1);
        },
      });
      setPlaying('dojo');
    },
    [bpm, countIn, metronomeOn, swingOffset],
  );

  // BPMは再生中もライブ反映
  useEffect(() => {
    if (playing) engine.setBpm(bpm);
  }, [bpm, playing]);

  // 設定変更時は停止
  useEffect(() => {
    stopAll();
  }, [progression, keyPc, instrumentId, difficulty, tab, toneRhythm, stopAll]);

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
        <h1>Jazz Phrase Lab</h1>
        <p className="tagline">楽譜は読める。次はアドリブ。— コード進行×ガイドトーン×見本フレーズで練習</p>
      </header>

      <main className="layout">
        {/* ===== 設定パネル ===== */}
        <section className="panel settings-panel">
          <h2>練習セットアップ</h2>

          <div className="field">
            <label htmlFor="menu-select">練習メニュー</label>
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
                <option key={p.id} value={p.id}>{p.label}</option>
              ))}
              <option value="custom">実践モード(自由進行)</option>
            </select>
            <p className="hint-text">{progression.description}</p>
          </div>

          {isCustom && (
            <CustomProgressionEditor
              chords={customChords}
              onChange={setCustomChords}
              shift={shift}
              pitchLabel={
                pitchMode === 'written' && shift % 12 !== 0
                  ? `記譜(Written)— ${instrument.label} / ${instrument.transposeLabel}`
                  : '実音(Concert)'
              }
            />
          )}

          <div className="field-row">
            <div className="field">
              <label htmlFor="key-select">キー(実音)</label>
              <select id="key-select" value={keyPc} onChange={(e) => setKeyPc(Number(e.target.value))} disabled={isCustom}>
                {KEYS.map((k) => (
                  <option key={k.pc} value={k.pc}>{k.name}</option>
                ))}
              </select>
              {isCustom && <p className="hint-text">実践モードではコードを直接指定します</p>}
            </div>
            <div className="field">
              <label htmlFor="instrument-select">楽器</label>
              <select id="instrument-select" value={instrumentId} onChange={(e) => { setInstrumentId(e.target.value); setClefOverride(null); }}>
                {INSTRUMENTS.map((i) => (
                  <option key={i.id} value={i.id}>{i.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="field-row">
            <div className="field">
              <label>表示ピッチ</label>
              <div className="seg-group">
                <button className={`seg${pitchMode === 'concert' ? ' on' : ''}`} onClick={() => setPitchMode('concert')}>実音(Concert)</button>
                <button className={`seg${pitchMode === 'written' ? ' on' : ''}`} onClick={() => setPitchMode('written')}>記譜(Written)</button>
              </div>
              <p className="hint-text">{instrument.transposeLabel}</p>
            </div>
            {instrument.clefs.length > 1 && (
              <div className="field">
                <label>譜表</label>
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
            <label htmlFor="bpm-slider">テンポ: <strong>{bpm} BPM</strong></label>
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
            <label>練習する内容(五線譜に表示)</label>
            <div className="seg-group wrap">
              <button className={`seg${tab === 'phrase' ? ' on' : ''}`} onClick={() => setTab('phrase')}>見本フレーズ</button>
              <button className={`seg${tab === 'chordtones' ? ' on' : ''}`} onClick={() => setTab('chordtones')}>コードトーン</button>
              <button className={`seg${tab === 'guidetones' ? ' on' : ''}`} onClick={() => setTab('guidetones')}>ガイドトーン</button>
              <button className={`seg${tab === 'scale' ? ' on' : ''}`} onClick={() => setTab('scale')}>使える音</button>
            </div>
          </div>

          {tab === 'phrase' && (
            <div className="field">
              <label>見本フレーズの種類</label>
              <div className="seg-group wrap">
                {DIFFICULTIES.map((d) => (
                  <button key={d.id} className={`seg${difficulty === d.id ? ' on' : ''}`} onClick={() => setDifficulty(d.id)}>
                    {d.label}
                  </button>
                ))}
              </div>
              <p className="hint-text">{DIFFICULTIES.find((d) => d.id === difficulty)?.hint}</p>
            </div>
          )}

          {(tab === 'chordtones' || tab === 'guidetones') && (
            <div className="field">
              <label>リズムパターン</label>
              <div className="seg-group wrap">
                {TONE_RHYTHMS.map((r) => (
                  <button key={r.id} className={`seg${toneRhythm === r.id ? ' on' : ''}`} onClick={() => setToneRhythm(r.id)}>
                    {r.label}
                  </button>
                ))}
              </div>
              <p className="hint-text">{TONE_RHYTHMS.find((r) => r.id === toneRhythm)?.hint}</p>
            </div>
          )}
        </section>

        {/* ===== メイン(進行・譜面・再生) ===== */}
        <div className="main-col">
          <section className="panel">
            <h2>コード進行 <span className="key-badge">{isCustom ? '自由進行' : `Key: ${keyName}${pitchMode === 'written' && shift % 12 !== 0 ? `(記譜: ${KEYS.find((k) => k.pc === displayKeyPc)!.name})` : ''}`}</span></h2>
            <ChordProgressionView
              progression={progression}
              keyPc={effKeyPc}
              shift={shift}
              flats={flats}
              currentMeasure={position ? position.measure : null}
              currentBeat={position?.beat ?? 0}
              selectedMeasure={selectedMeasure}
              onSelectMeasure={setSelectedMeasure}
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
                <label className="toggle"><input type="checkbox" checked={metronomeOn} onChange={(e) => setMetronomeOn(e.target.checked)} /> メトロノーム</label>
                <label className="toggle"><input type="checkbox" checked={compOn} onChange={(e) => setCompOn(e.target.checked)} /> コード音</label>
              </div>
              <div className="transport-opts">
                <span className="opt-label">スウィング:</span>
                <div className="seg-group">
                  {SWING_OPTIONS.map((s) => (
                    <button key={s.id} className={`seg${swingId === s.id ? ' on' : ''}`} onClick={() => setSwingId(s.id)}>
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="transport-opts">
                <span className="opt-label">ループ範囲:</span>
                <div className="seg-group">
                  <button className={`seg${loopRange === 'full' ? ' on' : ''}`} onClick={() => setLoopRange('full')}>進行全体</button>
                  <button className={`seg${loopRange === '2' ? ' on' : ''}`} onClick={() => setLoopRange('2')}>2小節</button>
                  <button className={`seg${loopRange === '1' ? ' on' : ''}`} onClick={() => setLoopRange('1')}>1小節</button>
                </div>
                <span className="opt-label">バリエーション:</span>
                <div className="seg-group">
                  <button className="seg" onClick={() => { setRhythmVariant((v) => v + 1); setTab('phrase'); }}>リズム違い</button>
                  <button className="seg" onClick={() => { setMelodyVariant((v) => v + 1); setTab('phrase'); }}>別メロディー</button>
                  {(rhythmVariant > 0 || melodyVariant > 0) && (
                    <button className="seg" onClick={() => { setRhythmVariant(0); setMelodyVariant(0); }}>リセット</button>
                  )}
                </div>
              </div>
            </div>
          </section>

          <section className="panel">
            <div className="staff-head">
              <h2>五線譜</h2>
              <span className="key-badge">{tab === 'phrase' ? `見本フレーズ(${DIFFICULTIES.find((d) => d.id === difficulty)?.label ?? ''})` : tab === 'chordtones' ? 'コードトーン' : tab === 'guidetones' ? 'ガイドトーン' : '使える音'}</span>
              <div className="seg-group">
                <button className={`seg${labelMode === 'none' ? ' on' : ''}`} onClick={() => setLabelMode('none')}>音名なし</button>
                <button className={`seg${labelMode === 'name' ? ' on' : ''}`} onClick={() => setLabelMode('name')}>C D E</button>
                <button className={`seg${labelMode === 'solfege' ? ' on' : ''}`} onClick={() => setLabelMode('solfege')}>ドレミ</button>
                <button className={`seg${labelMode === 'degree' ? ' on' : ''}`} onClick={() => setLabelMode('degree')}>度数</button>
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
              <p className="hint-text">Written Pitch 表示中: あなたの楽器で読む譜面です。鳴る音(実音)とは異なります。</p>
            )}
          </section>

          <RhythmDojoPanel
            patternId={dojoPatternId}
            onSelect={(id) => {
              setDojoPatternId(id);
              if (playing === 'dojo') startDojo(id);
            }}
            playing={playing === 'dojo'}
            onPlay={() => startDojo(dojoPatternId)}
            onStop={stopAll}
            clef={clef}
            currentIndex={playing === 'dojo' ? dojoNoteIndex : -1}
          />

          <section className="panel">
            <h2>いまのコード</h2>
            <ChordInfoPanel
              rootPc={currentChordDisplayRoot}
              quality={currentChord.quality}
              flats={flats}
              concertLabel={concertChordLabel}
            />
          </section>

          <section className="panel">
            <h2>練習ポイント — {guide.title}</h2>
            <ol className="tips-list">
              {guide.tips.map((t, i) => (
                <li key={i}>{t}</li>
              ))}
            </ol>
          </section>

          <PracticeLogPanel
            currentSettings={{
              menu: progression.label,
              key: isCustom ? '自由進行' : keyName,
              bpm,
              instrument: instrument.label,
              mode: guide.title,
              difficulty: DIFFICULTIES.find((d) => d.id === difficulty)!.label,
            }}
          />
        </div>
      </main>

      <footer className="app-footer">
        <p>Jazz Phrase Lab — 譜面演奏からアドリブへの橋渡し。ヘッドホン推奨。iPhoneはマナーモード解除で音が出ます。</p>
      </footer>
    </div>
  );
}
