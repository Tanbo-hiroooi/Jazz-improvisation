// 練習コース: コース概要とレッスン一覧、進捗管理

import { useState } from 'react';
import { COURSES, LESSONS, getLesson } from '../data/courses';
import { loadCourseProgress, saveCourseProgress } from '../state/storage';
import type { Clef, PitchMode } from '../theory/instruments';
import { pick, t as tr, type Lang } from '../i18n';
import { LessonScreen } from './LessonScreen';

interface Props {
  lang: Lang;
  instrumentId: string;
  clefOverride: Clef | null;
  pitchMode: PitchMode;
}

export function CourseScreen({ lang, instrumentId, clefOverride, pitchMode }: Props) {
  const t = (key: Parameters<typeof tr>[1]) => tr(lang, key);
  const [progress, setProgress] = useState(loadCourseProgress);
  const [selectedLessonId, setSelectedLessonId] = useState<string | null>(null);

  const markDone = (lessonId: string) => {
    if (!progress.completedLessonIds.includes(lessonId)) {
      const next = { completedLessonIds: [...progress.completedLessonIds, lessonId] };
      setProgress(next);
      saveCourseProgress(next);
    }
  };

  if (selectedLessonId) {
    const lesson = getLesson(selectedLessonId);
    const course = COURSES.find((c) => c.id === lesson?.courseId);
    if (lesson && course) {
      const idx = course.lessonIds.indexOf(lesson.id);
      const nextId = course.lessonIds[idx + 1];
      return (
        <LessonScreen
          lang={lang}
          lesson={lesson}
          courseTitle={pick(lang, course.title, course.titleEn)}
          lessonNumber={idx + 1}
          totalLessons={course.lessonIds.length}
          alreadyDone={progress.completedLessonIds.includes(lesson.id)}
          hasNext={!!nextId}
          onComplete={markDone}
          onNext={() => setSelectedLessonId(nextId ?? null)}
          onBack={() => setSelectedLessonId(null)}
          instrumentId={instrumentId}
          clefOverride={clefOverride}
          pitchMode={pitchMode}
        />
      );
    }
  }

  return (
    <main className="course-main">
      {COURSES.map((course) => {
        const done = course.lessonIds.filter((id) => progress.completedLessonIds.includes(id)).length;
        // 次に取り組むレッスン(最初の未完了)
        const nextLessonId = course.lessonIds.find((id) => !progress.completedLessonIds.includes(id));
        return (
          <section key={course.id} className="panel">
            <h2>{pick(lang, course.title, course.titleEn)} <span className="key-badge">{t('progressLabel')}: {done} / {course.lessonIds.length}</span></h2>
            <p className="hint-text">{pick(lang, course.description, course.descriptionEn)}</p>
            <div className="progress-bar">
              <div className="progress-bar-fill" style={{ width: `${(done / course.lessonIds.length) * 100}%` }} />
            </div>
            <ul className="lesson-list">
              {course.lessonIds.map((id, i) => {
                const lesson = LESSONS.find((l) => l.id === id);
                if (!lesson) return null;
                const isDone = progress.completedLessonIds.includes(id);
                const isNext = id === nextLessonId;
                return (
                  <li key={id}>
                    <button
                      className={`lesson-item${isDone ? ' done' : ''}${isNext ? ' next' : ''}`}
                      onClick={() => setSelectedLessonId(id)}
                    >
                      <span className="lesson-item-num">{isDone ? '✓' : i + 1}</span>
                      <span className="lesson-item-body">
                        <span className="lesson-item-title">{pick(lang, lesson.title, lesson.titleEn)}</span>
                        <span className="lesson-item-theme">{pick(lang, lesson.theme, lesson.themeEn)}</span>
                      </span>
                      {isNext && <span className="lesson-item-next">▶</span>}
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}
    </main>
  );
}
