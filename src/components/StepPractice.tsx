// STEP統合練習パネル: 「今のSTEPで何をするか」に集中できるよう、
// STEPごとに楽譜・編集ルール・音を確認/演奏を1つにまとめて表示する。
// 音符編集が必要なSTEPでは、ここに直接フレーズ編集(PhraseEditor)を埋め込む。
//
// 状態の責務(§5):
// - drafts: STEPごとの編集内容とUndo履歴(このコンポーネントが唯一のstateとして保持)
// - visitedFixed: 固定STEPの「訪問済み」だけをstateとして保持
// - 編集STEPの達成状態は、drafts と STEPルールから毎レンダー導出する(別stateに
//   コピーしない)。これにより初回マウント順・キー変更・Undo/Redo・再マウントの
//   どの経路でも「通知の取りこぼしで達成状態が失われる」ことが構造的に起きない。

import { useEffect, useMemo, useRef, useState } from 'react';
import { PhraseEditor } from './PhraseEditor';
import { StaffView, type ChordDisplay, type LabelMode } from './StaffView';
import type { Bi, Lesson, PracticeStep, StepContent } from '../data/courses';
import { usePracticePlayback, type PlaybackOverrides } from '../hooks/usePracticePlayback';
import { chordSymbol } from '../theory/chords';
import {
  allowedPitchesFor,
  applyLockedPitches,
  buildStepRules,
  initialPhraseForRules,
  phraseMatchesPalette,
  phraseToNoteEvents,
  restCount,
  STEP_ACTION_LABEL,
  totalBeats,
  validateStepPhrase,
  type AllowedPitch,
  type PhraseEvent,
  type StepRuleConfig,
  type StepValidationResult,
} from '../theory/editablePhrase';
import type { GuitarPosition } from '../theory/guitar';
import type { Clef, NotationMode } from '../theory/instruments';
import { KEYS, mod12 } from '../theory/notes';
import {
  approachAsNotes,
  approachPairAsNotes,
  chordTonesAsNotes,
  degreePathAsNotes,
  enclosureAsNotes,
  guideTonesAsNotes,
  landingWithApproachAsNotes,
  sampleMotifAsNotes,
  scaleAsNotes,
  targetAsNotes,
  tensionsAsNotes,
  type NoteEvent,
} from '../theory/phrases';
import { changeMeasures, type Progression } from '../theory/progressions';
import { pick, t as tr, type Lang } from '../i18n';

/** STEPのcontent設定から、説明と完全に一致する音だけを生成する */
function generateStepNotes(content: StepContent, progression: Progression, keyPc: number): NoteEvent[] {
  let notes: NoteEvent[];
  switch (content.source) {
    case 'root': notes = degreePathAsNotes(progression, keyPc, ['root'], content.rhythm ?? 'basic'); break;
    case 'third': notes = degreePathAsNotes(progression, keyPc, ['third'], content.rhythm ?? 'basic'); break;
    case 'seventh': notes = degreePathAsNotes(progression, keyPc, ['seventh'], content.rhythm ?? 'basic'); break;
    case 'custom-path': notes = degreePathAsNotes(progression, keyPc, content.path?.length ? content.path : ['root'], content.rhythm ?? 'basic'); break;
    case 'guide-tones': notes = guideTonesAsNotes(progression, keyPc, content.rhythm ?? 'basic'); break;
    case 'target': notes = targetAsNotes(progression, keyPc); break;
    case 'approach': notes = approachAsNotes(progression, keyPc); break;
    case 'approach-pair': notes = approachPairAsNotes(progression, keyPc, content.targetDegree ?? 'third', content.approachFrom ?? 'below'); break;
    case 'enclosure': notes = enclosureAsNotes(progression, keyPc, content.targetDegree ?? 'third'); break;
    case 'landing-approach': notes = landingWithApproachAsNotes(progression, keyPc, content.targetDegree ?? 'third'); break;
    case 'sample-motif': notes = sampleMotifAsNotes(progression, keyPc, content.motifVariant ?? 'repeat'); break;
    case 'scale': notes = scaleAsNotes(progression, keyPc); break;
    case 'tension': notes = tensionsAsNotes(progression, keyPc); break;
    case 'chord-tones': default: notes = chordTonesAsNotes(progression, keyPc, content.rhythm ?? 'basic', content.arpPattern ?? 'up'); break;
  }
  let allowed: number[] | null = null;
  if (content.activeOnChordChangesOnly) allowed = changeMeasures(progression);
  else if (content.activeMeasures) allowed = content.activeMeasures;
  if (allowed) {
    const set = new Set(allowed);
    notes = notes.filter((n) => set.has(Math.floor(n.start / 4 + 0.0001)));
  }
  return notes;
}

/** STEPごとの編集状態(undo履歴込み)。keyPcは生成時のキー(不一致draftの使用を防ぐ) */
export interface StepDraftState {
  keyPc: number;
  chordIdx: number;
  history: PhraseEvent[][];
  hIdx: number;
}

type StepEditableConfig = NonNullable<PracticeStep['editable']>;

interface ComposerChord { rootOffset: number; quality: Progression['chords'][number]['quality'] }

function chordOptionsOf(progression: Progression): ComposerChord[] {
  return progression.chords
    .filter((c, i, arr) => arr.findIndex((x) => x.rootOffset === c.rootOffset && x.quality === c.quality) === i)
    .map((c) => ({ rootOffset: c.rootOffset, quality: c.quality }));
}

function configOf(editable: StepEditableConfig): StepRuleConfig {
  return {
    level: editable.level,
    maxNotes: editable.maxNotes,
    minNotes: editable.minNotes,
    requiredRestCount: editable.requiredRestCount,
    requireExactBeats: editable.requireExactBeats,
    requiredDurations: editable.requiredDurations,
    allowedDurations: editable.allowedDurations,
    lockedEventIndexes: editable.lockedEventIndexes,
    allowPartialPlayback: editable.allowPartialPlayback,
    requiredAction: editable.requiredAction,
  };
}

interface ResolvedEditableStep {
  chordOptions: ComposerChord[];
  chordIdx: number;
  chord: ComposerChord;
  cfg: StepRuleConfig;
  pitches: AllowedPitch[];
  /** このSTEP・キー・コードの初期フレーズ(達成判定の比較基準) */
  initialEvents: PhraseEvent[];
  /** 現在の編集内容(draftが無い/不整合なら初期フレーズ) */
  events: PhraseEvent[];
  /** draftが現在のキー・使用可能音と整合しているか(§6の防御) */
  usable: boolean;
  result: StepValidationResult;
}

/**
 * 編集STEPの現在状態を draft とルールから解決する純関数。
 * 親(達成状態の導出)と子(表示・編集UI)の両方がこれを使うことで、
 * 「親のstateと子のバリデーションが食い違う」ことを構造的に防ぐ(§1・§5)。
 * イベントIDは比較に使わないため、initialEventsを毎回生成しても判定は安定する(§4)。
 */
function resolveEditableStep(
  editable: StepEditableConfig,
  progression: Progression,
  keyPc: number,
  flats: boolean,
  draft: StepDraftState | null,
): ResolvedEditableStep {
  const chordOptions = chordOptionsOf(progression);
  const cfg = configOf(editable);
  const rules = buildStepRules(cfg);
  const keyMatches = !!draft && draft.keyPc === keyPc;
  const chordIdx = keyMatches ? Math.min(draft!.chordIdx, chordOptions.length - 1) : 0;
  const chord = chordOptions[chordIdx];
  const pitches = allowedPitchesFor(keyPc, chord.rootOffset, chord.quality, editable.material, flats);
  const initialEvents = applyLockedPitches(
    initialPhraseForRules(pitches, rules),
    editable.lockedEventIndexes,
    editable.lockedPitchIndexes,
    pitches,
  );
  const usable = keyMatches && phraseMatchesPalette(draft!.history[draft!.hIdx], pitches);
  const events = usable ? draft!.history[draft!.hIdx] : initialEvents;
  const result = validateStepPhrase(events, cfg, initialEvents);
  return { chordOptions, chordIdx, chord, cfg, pitches, initialEvents, events, usable, result };
}

interface SharedProps {
  lang: Lang;
  progression: Progression;
  keyPc: number;
  shift: number;
  flats: boolean;
  clef: Clef;
  notation: NotationMode;
  guitarPosition: GuitarPosition;
  guitarOpenStrings: boolean;
  bpm: number;
  countIn: boolean;
  metronomeOn: boolean;
  compOn: boolean;
  labelMode: LabelMode;
  setLabelMode: (m: LabelMode) => void;
  /** このSTEPの再生停止関数を親(StepPractice)へ登録する */
  registerStop: (fn: (() => void) | null) => void;
}

function LabelModeToggle({ lang, labelMode, setLabelMode }: { lang: Lang; labelMode: LabelMode; setLabelMode: (m: LabelMode) => void }) {
  const t = (key: Parameters<typeof tr>[1]) => tr(lang, key);
  const opts: { id: LabelMode; label: string }[] = [
    { id: 'none', label: t('labelNone') },
    { id: 'name', label: 'C D E' },
    { id: 'degree', label: t('labelDegree') },
  ];
  return (
    <div className="seg-group" role="group" aria-label={t('staffTitle')}>
      {opts.map((o) => (
        <button key={o.id} className={`seg${labelMode === o.id ? ' on' : ''}`} aria-pressed={labelMode === o.id} onClick={() => setLabelMode(o.id)}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

function FixedStepBody({
  lang, content, progression, keyPc, shift, flats, clef, notation, guitarPosition, guitarOpenStrings,
  bpm, countIn, metronomeOn, compOn, labelMode, setLabelMode, registerStop,
}: SharedProps & { content: NonNullable<PracticeStep['content']> }) {
  const t = (key: Parameters<typeof tr>[1]) => tr(lang, key);

  const displayedNotes: NoteEvent[] = useMemo(() => generateStepNotes(content, progression, keyPc), [content, progression, keyPc]);

  const chordDisplays: ChordDisplay[] = useMemo(
    () => progression.chords.map((c) => {
      const rootPc = mod12(keyPc + c.rootOffset + shift);
      return { measure: c.measure, beat: c.beat, symbol: chordSymbol(rootPc, c.quality, flats), rootPc, quality: c.quality };
    }),
    [progression, keyPc, shift, flats],
  );

  const { playing, currentNoteIndex, startPlayback, stopAll } = usePracticePlayback({
    progression, effKeyPc: keyPc, displayedNotes, bpm, countIn,
    loopEnabled: true, metronomeOn, compOn, swing: 1 / 6, loopRange: 'full', selectedMeasure: 0,
  });

  useEffect(() => {
    registerStop(stopAll);
    return () => registerStop(null);
  }, [stopAll, registerStop]);

  return (
    <>
      <div className="staff-head">
        <h4>{t('staffTitle')}</h4>
        <LabelModeToggle lang={lang} labelMode={labelMode} setLabelMode={setLabelMode} />
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
          notation={notation}
          guitarPosition={guitarPosition}
          guitarOpenStrings={guitarOpenStrings}
        />
      </div>
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
          ♪ {t('checkThisNote')}
        </button>
      </div>
    </>
  );
}

interface EditableStepBodyProps extends SharedProps {
  editable: NonNullable<PracticeStep['editable']>;
  draft: StepDraftState | null;
  onDraftChange: (next: StepDraftState) => void;
}

function EditableStepBody({
  lang, editable, progression, keyPc, shift, flats, clef, notation, guitarPosition, guitarOpenStrings,
  bpm, countIn, metronomeOn, compOn, labelMode, setLabelMode, registerStop,
  draft, onDraftChange,
}: EditableStepBodyProps) {
  const t = (key: Parameters<typeof tr>[1]) => tr(lang, key);

  // 表示・編集・検証のすべてを親と同じ resolveEditableStep から導出する(§5)。
  // 達成状態を親へ通知するeffectは存在しない — 親はdraftから自分で導出する。
  const resolved = useMemo(
    () => resolveEditableStep(editable, progression, keyPc, flats, draft),
    [editable, progression, keyPc, flats, draft],
  );
  const { chordOptions, chordIdx, chord, pitches: allowedPitches, initialEvents, events, usable, result: validation } = resolved;
  const rules = useMemo(() => buildStepRules(resolved.cfg), [resolved.cfg]);

  /** 指定コードの初期draft(キー変更・コード変更・リセット・初回マウントで使用) */
  const makeInitialDraft = (idx: number): StepDraftState => {
    const c = chordOptions[Math.min(idx, chordOptions.length - 1)];
    const p = allowedPitchesFor(keyPc, c.rootOffset, c.quality, editable.material, flats);
    const base = applyLockedPitches(initialPhraseForRules(p, rules), editable.lockedEventIndexes, editable.lockedPitchIndexes, p);
    return { keyPc, chordIdx: idx, history: [base], hIdx: 0 };
  };

  // draftが無い/不整合な場合(初回マウント、キー変更直後)は、描画にはresolvedの
  // initialEventsが既に使われている。親へ正規のdraftを1回だけ保存する。
  useEffect(() => {
    if (!usable) onDraftChange({ keyPc, chordIdx, history: [initialEvents], hIdx: 0 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [usable, keyPc]);

  const hIdx = usable ? draft!.hIdx : 0;
  const history = usable ? draft!.history : [initialEvents];

  const changeChord = (idx: number) => {
    if (hIdx > 0 && !window.confirm(t('unsavedNavConfirm'))) return;
    onDraftChange(makeInitialDraft(idx));
  };

  const changeEvents = (next: PhraseEvent[]) => {
    const trimmed = history.slice(0, hIdx + 1);
    onDraftChange({ keyPc, chordIdx, history: [...trimmed, next], hIdx: trimmed.length });
  };
  const undo = () => onDraftChange({ keyPc, chordIdx, history, hIdx: Math.max(0, hIdx - 1) });
  const redo = () => onDraftChange({ keyPc, chordIdx, history, hIdx: Math.min(history.length - 1, hIdx + 1) });
  const reset = () => {
    if (window.confirm(t('resetConfirm'))) onDraftChange(makeInitialDraft(chordIdx));
  };

  const beats = totalBeats(events);
  const displayedNotes = useMemo(() => phraseToNoteEvents(events), [events]);

  const pseudoProgression = useMemo<Progression>(() => ({
    id: 'custom', label: '', labelEn: '', measures: 1, description: '', descriptionEn: '',
    chords: [{ measure: 0, beat: 0, beats: 4, rootOffset: chord.rootOffset, quality: chord.quality }],
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [chord]);

  const chordDisplays: ChordDisplay[] = useMemo(() => {
    const rootPc = mod12(keyPc + chord.rootOffset + shift);
    return [{ measure: 0, beat: 0, symbol: chordSymbol(rootPc, chord.quality, flats), rootPc, quality: chord.quality }];
  }, [keyPc, chord, shift, flats]);

  const { playing, currentNoteIndex, startPlayback, stopAll } = usePracticePlayback({
    progression: pseudoProgression, effKeyPc: keyPc, displayedNotes, bpm, countIn,
    loopEnabled: true, metronomeOn, compOn, swing: 0, loopRange: 'full', selectedMeasure: 0,
  });

  useEffect(() => {
    registerStop(stopAll);
    return () => registerStop(null);
  }, [stopAll, registerStop]);

  // 「再生できるか」と「STEPの条件を達成したか」は別の判定(§2)
  const canPlay = validation.playbackAllowed;
  const check = (overrides: PlaybackOverrides) => startPlayback('example', overrides);

  // 表示用の要件チェックリスト(満たした項目もチェック表示)。操作課題も1項目として表示する
  const reqItems: { key: string; label: string; met: boolean }[] = [];
  if (editable.requiredAction) {
    reqItems.push({
      key: 'action',
      label: pick(lang, STEP_ACTION_LABEL[editable.requiredAction].ja, STEP_ACTION_LABEL[editable.requiredAction].en),
      met: validation.actionCompleted,
    });
  }
  if (editable.requireExactBeats) {
    reqItems.push({ key: 'beats', label: pick(lang, `合計4拍(現在${beats}拍)`, `Total 4 beats (currently ${beats})`), met: Math.abs(beats - 4) < 0.001 });
  }
  if (editable.minNotes !== undefined) {
    reqItems.push({ key: 'minNotes', label: pick(lang, `音符を${editable.minNotes}個使う`, `Use ${editable.minNotes} notes`), met: events.filter((e) => e.type === 'note').length >= editable.minNotes });
  }
  if (editable.requiredRestCount !== undefined) {
    reqItems.push({ key: 'rest', label: pick(lang, `休符を${editable.requiredRestCount}つ以上`, `At least ${editable.requiredRestCount} rest(s)`), met: restCount(events) >= editable.requiredRestCount });
  }
  for (const d of editable.requiredDurations ?? []) {
    const label = d === 'eighth' ? pick(lang, '8分音符', '8th note') : d === 'half' ? pick(lang, '2分音符', 'half note') : pick(lang, '4分音符', 'quarter note');
    reqItems.push({ key: `dur-${d}`, label: pick(lang, `${label}を1つ以上`, `At least one ${label}`), met: events.some((e) => e.duration === d) });
  }

  return (
    <>
      {chordOptions.length > 1 && (
        <div className="field">
          <label htmlFor="step-chord">{t('chordLabel')}</label>
          <select id="step-chord" value={chordIdx} onChange={(e) => changeChord(Number(e.target.value))}>
            {chordOptions.map((c, i) => (
              <option key={i} value={i}>{chordSymbol(mod12(keyPc + c.rootOffset), c.quality, flats)}</option>
            ))}
          </select>
        </div>
      )}
      <p className="hint-text">
        {t('allowedPitchesLabel')}: {allowedPitches.map((p2) => `${p2.label}(${p2.degree})`).join('・')}
      </p>

      <div className="staff-head">
        <h4>{t('staffTitle')}</h4>
        <LabelModeToggle lang={lang} labelMode={labelMode} setLabelMode={setLabelMode} />
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
          notation={notation}
          guitarPosition={guitarPosition}
          guitarOpenStrings={guitarOpenStrings}
        />
      </div>

      <PhraseEditor lang={lang} events={events} onChange={changeEvents} allowedPitches={allowedPitches} rules={rules} flats={flats} />

      {reqItems.length > 0 && (
        <ul className="req-checklist">
          {reqItems.map((r) => (
            <li key={r.key} className={r.met ? 'met' : 'unmet'}>{r.met ? '✓' : '○'} {r.label}</li>
          ))}
        </ul>
      )}
      <div className={`beats-meter${beats > 4.001 ? ' over' : ''}`} role="status">
        <span>{t('beatsNow')}: <strong>{beats}</strong>{t('beatsUnit')}</span>
        <span>{t('beatsLeft')}: <strong>{Math.max(0, 4 - beats)}</strong>{t('beatsUnit')}</span>
      </div>
      {validation.errors.length > 0 && (
        <div className="step-validation-warning">
          {validation.errors.map((e) => (
            <p key={e.code} className="beats-warning">⚠ {pick(lang, e.message.ja, e.message.en)}</p>
          ))}
          {validation.playbackAllowed && !validation.stepCompleted && (
            <p className="hint-text">{t('partialPlaybackHint')}</p>
          )}
        </div>
      )}

      <div className="transport-opts composer-undo-row">
        <div className="seg-group">
          <button className="seg" onClick={undo} disabled={hIdx === 0} aria-label={t('undoBtn')}>↩ {t('undoBtn')}</button>
          <button className="seg" onClick={redo} disabled={hIdx >= history.length - 1} aria-label={t('redoBtn')}>↪ {t('redoBtn')}</button>
          <button className="seg" onClick={reset} aria-label={t('resetPhrase')}>⟲ {t('resetPhrase')}</button>
        </div>
      </div>

      <div className="transport-main">
        {playing ? (
          <button className="btn big stop" onClick={stopAll}>■ Stop</button>
        ) : (
          <>
            <button className="btn big example" onClick={() => check({ compOn: false })} disabled={!canPlay}>♪ {t('checkSingle')}</button>
            <button className="btn big example" onClick={() => check({ compOn: true })} disabled={!canPlay}>♪ {t('checkWithChord')}</button>
            <button className="btn big start" onClick={() => startPlayback('backing')} disabled={!canPlay}>▶ Start</button>
          </>
        )}
      </div>
      <p className="hint-text">{t('playSelfHint')}</p>
    </>
  );
}

interface Props {
  lang: Lang;
  lesson: Lesson;
  progression: Progression;
  keyPc: number;
  setKeyPc: (pc: number) => void;
  shift: number;
  flats: boolean;
  clef: Clef;
  notation: NotationMode;
  guitarPosition: GuitarPosition;
  guitarOpenStrings: boolean;
  bpm: number;
  setBpm: (bpm: number) => void;
  countIn: boolean;
  setCountIn: (v: boolean) => void;
  metronomeOn: boolean;
  setMetronomeOn: (v: boolean) => void;
  compOn: boolean;
  setCompOn: (v: boolean) => void;
  labelMode: LabelMode;
  setLabelMode: (m: LabelMode) => void;
  onDirtyChange?: (dirty: boolean) => void;
  /** レッスン完了ゲート用: 全STEPの訪問・達成状況を親へ通知する */
  onProgressChange?: (progress: { allStepsDone: boolean; pendingCount: number }) => void;
  /** LessonScreenから、現在アクティブなSTEPの再生を止めるための登録口 */
  registerStop: (fn: (() => void) | null) => void;
}

export function StepPractice({
  lang, lesson, progression, keyPc, setKeyPc, shift, flats, clef, notation, guitarPosition, guitarOpenStrings,
  bpm, setBpm, countIn, setCountIn, metronomeOn, setMetronomeOn, compOn, setCompOn, labelMode, setLabelMode,
  onDirtyChange, onProgressChange, registerStop,
}: Props) {
  const t = (key: Parameters<typeof tr>[1]) => tr(lang, key);
  const p = (x: Bi) => pick(lang, x.ja, x.en);
  const [currentStep, setCurrentStep] = useState(0);
  const [drafts, setDrafts] = useState<Record<number, StepDraftState>>({});
  // stateとして持つのは固定STEPの「訪問済み」だけ(§5)。編集STEPの達成は下で導出する。
  const initialVisited = (): Record<number, boolean> => (lesson.steps[0]?.editable ? {} : { 0: true });
  const [visitedFixed, setVisitedFixed] = useState<Record<number, boolean>>(initialVisited);
  const step = lesson.steps[currentStep];
  const total = lesson.steps.length;
  const activeDraft = drafts[currentStep] ?? null;

  // レッスンが変わったらSTEP・下書き・訪問記録を先頭に戻す
  useEffect(() => {
    setCurrentStep(0);
    setDrafts({});
    setVisitedFixed(initialVisited());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lesson.id]);

  // キーが「実際に変わったとき」だけ全STEPの下書きを破棄する(§1)。
  // useRefで直前のキーを保持し、初回マウント(および「もう一度練習する」での再マウント)
  // ではリセットを行わない。編集STEPの達成状態はdraftから導出されるため、
  // draftの破棄がそのまま「未達成へ戻る」ことを意味し、別途のリセット処理は不要。
  // 固定STEPの訪問記録はキー変更後も維持する(聴く練習はキーに依存しないため)。
  const prevKeyRef = useRef(keyPc);
  useEffect(() => {
    if (prevKeyRef.current !== keyPc) {
      prevKeyRef.current = keyPc;
      setDrafts({});
    }
  }, [keyPc]);

  useEffect(() => {
    onDirtyChange?.(Object.values(drafts).some((d) => d.hIdx > 0));
  }, [drafts, onDirtyChange]);

  // STEPごとの達成状態を毎レンダー導出する(§5)。編集STEPはdraft+ルールから
  // resolveEditableStep(子と同じ判定)で計算するため、親子の食い違いが起きない。
  const stepCompletion = useMemo(
    () => lesson.steps.map((s, i) => {
      if (!s.editable) return !!visitedFixed[i];
      return resolveEditableStep(s.editable, progression, keyPc, flats, drafts[i] ?? null).result.stepCompleted;
    }),
    [lesson.steps, visitedFixed, drafts, progression, keyPc, flats],
  );
  const currentDone = stepCompletion[currentStep];
  const pendingCount = stepCompletion.filter((done) => !done).length;

  useEffect(() => {
    onProgressChange?.({ allStepsDone: pendingCount === 0, pendingCount });
  }, [pendingCount, onProgressChange]);

  const goToStep = (i: number) => {
    if (i === currentStep) return;
    setCurrentStep(i);
    if (!lesson.steps[i].editable) setVisitedFixed((d) => ({ ...d, [i]: true }));
  };

  const fallbackContent: NonNullable<PracticeStep['content']> = {
    source: 'chord-tones', rhythm: lesson.toneRhythm, arpPattern: lesson.arpPattern,
  };

  return (
    <section className="panel step-practice">
      <h2>{t('practiceTitle')}</h2>

      <div className="step-tablist" role="tablist" aria-label={t('stepsTitle')}>
        {lesson.steps.map((s, i) => (
          <button
            key={i}
            role="tab"
            aria-selected={currentStep === i}
            className={`step-dot${currentStep === i ? ' on' : ''}${i < currentStep ? ' past' : ''}`}
            onClick={() => goToStep(i)}
          >
            <span className="step-dot-num">{i + 1}</span>
            <span className="step-dot-title">{p(s.title)}</span>
          </button>
        ))}
      </div>
      <p className="step-progress-label">{t('stepLabel')} {currentStep + 1} / {total}</p>

      <div className="step-head">
        <h3>{p(step.title)}</h3>
        <span className="lesson-step-label">🎯 {t('stepGoalLabel')}</span>
        <p className="step-card-text">{p(step.instruction)}</p>
        {step.rules && step.rules.length > 0 && (
          <div className="step-rules">
            <span className="lesson-step-label">📌 {t('stepRulesTitle')}</span>
            <div className="rule-chips">
              {step.rules.map((r, i) => (
                <span key={i} className="rule-chip">{p(r)}</span>
              ))}
            </div>
          </div>
        )}
        {step.editable ? (
          <p className="hint-text editable-task">📝 {p(step.editable.task)}</p>
        ) : (
          <p className="hint-text">{t('fixedStepHint')}</p>
        )}
      </div>

      <div className="field-row">
        <div className="field">
          <label htmlFor="step-key">{t('keyLabel')}</label>
          <select id="step-key" value={keyPc} onChange={(e) => setKeyPc(Number(e.target.value))}>
            {KEYS.map((k) => (
              <option key={k.pc} value={k.pc}>{k.name}</option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="step-bpm">{t('tempoLabel')}: <strong>{bpm} BPM</strong></label>
          <input id="step-bpm" type="range" min={40} max={220} value={bpm} onChange={(e) => setBpm(Number(e.target.value))} />
        </div>
      </div>

      {step.editable ? (
        <EditableStepBody
          key={currentStep}
          lang={lang} editable={step.editable} progression={progression} keyPc={keyPc} shift={shift} flats={flats}
          clef={clef} notation={notation} guitarPosition={guitarPosition} guitarOpenStrings={guitarOpenStrings}
          bpm={bpm} countIn={countIn} metronomeOn={metronomeOn} compOn={compOn} labelMode={labelMode} setLabelMode={setLabelMode}
          registerStop={registerStop}
          draft={activeDraft}
          onDraftChange={(next) => setDrafts((d) => ({ ...d, [currentStep]: next }))}
        />
      ) : (
        <FixedStepBody
          key={currentStep}
          lang={lang} content={step.content ?? fallbackContent} progression={progression} keyPc={keyPc} shift={shift} flats={flats}
          clef={clef} notation={notation} guitarPosition={guitarPosition} guitarOpenStrings={guitarOpenStrings}
          bpm={bpm} countIn={countIn} metronomeOn={metronomeOn} compOn={compOn} labelMode={labelMode} setLabelMode={setLabelMode}
          registerStop={registerStop}
        />
      )}

      <div className="transport-opts">
        <label className="toggle"><input type="checkbox" checked={countIn} onChange={(e) => setCountIn(e.target.checked)} /> 4 Count In</label>
        <label className="toggle"><input type="checkbox" checked={metronomeOn} onChange={(e) => setMetronomeOn(e.target.checked)} /> {t('metronome')}</label>
        <label className="toggle"><input type="checkbox" checked={compOn} onChange={(e) => setCompOn(e.target.checked)} /> {t('compSound')}</label>
      </div>

      <div className="step-footer-nav">
        <button className="btn" onClick={() => goToStep(Math.max(0, currentStep - 1))} disabled={currentStep === 0}>
          ← {t('prevStep')}
        </button>
        <span className="hint-text">{step.editable && !currentDone ? t('stepBlockedHint') : t('stepDoneHint')}</span>
        <button
          className="btn"
          onClick={() => goToStep(Math.min(total - 1, currentStep + 1))}
          disabled={currentStep === total - 1 || (!!step.editable && !currentDone)}
        >
          {t('nextStep')} →
        </button>
      </div>
    </section>
  );
}
