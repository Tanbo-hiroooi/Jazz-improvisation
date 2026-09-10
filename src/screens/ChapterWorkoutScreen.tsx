// 章まとめ練習: 章のレッスンの課題を「1つの譜面」の上でまとめて練習する
// 各レッスンの条件をそのまま同じフレーズに当て、達成状況をチェックリストで示す。
// レッスンを1つずつ進むのが「学ぶ」段階、この画面が「通して使う」段階。

import { useMemo, useState } from 'react';
import { GridComposer } from '../components/GridComposer';
import type { Chapter, ChapterWorkout } from '../data/courses';
import { KEYS } from '../theory/notes';
import { emptyGrid, scaleConditions, validateGrid, type GridMaterial, type GridPhrase } from '../theory/grid';
import { fitProgression, getProgression } from '../theory/progressions';
import type { MyInstrumentSettings } from '../state/storage';
import { pick, t as tr, type Lang } from '../i18n';

interface Props {
  lang: Lang;
  session: MyInstrumentSettings;
  chapter: Chapter;
  workout: ChapterWorkout;
  onBack: () => void;
}

export function ChapterWorkoutScreen({ lang, session, chapter, workout, onBack }: Props) {
  const t = (key: Parameters<typeof tr>[1]) => tr(lang, key);

  const [keyPc, setKeyPc] = useState(0);
  // 素材は章でいちばん広いもの(章は狭い→広いの順に進む)から始める
  const [material, setMaterial] = useState<GridMaterial>(workout.materials[workout.materials.length - 1]);
  const [bars, setBars] = useState(workout.bars);
  const [history, setHistory] = useState<GridPhrase[]>(() => [emptyGrid(workout.bars, 2)]);
  const [hIdx, setHIdx] = useState(0);

  const baseProgression = getProgression(workout.progressionId);
  const prog = useMemo(() => fitProgression(baseProgression, bars), [baseProgression, bars]);
  const grid = history[hIdx];

  // 章の各レッスンの条件を、同じ1つのフレーズに当てる
  const tasks = useMemo(() => workout.tasks.map((task, index) => {
    const cond = scaleConditions(task.conditions, bars / workout.bars);
    const result = validateGrid(grid, cond, undefined, grid, { progression: prog, keyPc });
    const label = pick(lang, task.label.ja, task.label.en)
      .replace(/\{bars\}/g, String(bars))
      .replace(/\{minNotes\}/g, String(cond?.minNotes ?? ''))
      .replace(/\{maxNotes\}/g, String(cond?.maxNotes ?? ''))
      .replace(/\{minRest\}/g, String(cond?.minRestBeats ?? ''));
    // 同じレッスンにA/Bなど複数の編集STEPがあるため、課題ごとに区別する。
    return { key: `${task.lessonId}-${index}`, label, met: result.stepCompleted };
  }), [workout.tasks, workout.bars, bars, grid, prog, keyPc, lang]);

  const doneCount = tasks.filter((x) => x.met).length;

  return (
    <main className="course-main">
      <div className="lesson-topbar">
        <button className="btn" onClick={onBack}>← {t('backToCourse')}</button>
      </div>

      <section className="panel">
        <h2>{t('workoutTitle')}</h2>
        <p className="step-card-text">{pick(lang, chapter.title.ja, chapter.title.en)}</p>
        <p className="hint-text">{t('workoutLead')}</p>
        <div className="field">
          <label htmlFor="workout-key">{t('keyLabel')}</label>
          <select id="workout-key" value={keyPc} onChange={(e) => setKeyPc(Number(e.target.value))}>
            {KEYS.map((k) => (
              <option key={k.pc} value={k.pc}>{k.name}</option>
            ))}
          </select>
        </div>
      </section>

      <GridComposer
        lang={lang}
        session={session}
        keyPc={keyPc}
        progression={prog}
        material={material}
        onMaterialChange={setMaterial}
        bars={bars}
        onBarsChange={setBars}
        history={history}
        hIdx={hIdx}
        onHistoryChange={(h, i) => { setHistory(h); setHIdx(i); }}
        materialOptions={workout.materials}
        barOptions={workout.barOptions}
        tasks={tasks}
        tasksTitle={t('workoutChecklist')}
        tasksFooter={
          <p className="hint-text">
            {doneCount === tasks.length ? t('workoutAllDone') : t('workoutHint')}
          </p>
        }
      />
    </main>
  );
}
