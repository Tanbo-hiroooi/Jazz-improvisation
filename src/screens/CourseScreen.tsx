// 練習コース: 章ごとにレッスンを一覧表示し、進捗を管理

import { useState } from 'react';
import { CHAPTERS, COURSES, courseLessonIds, getLesson, lessonsOfChapter } from '../data/courses';
import { loadCourseProgress, saveCourseProgress, type MyInstrumentSettings } from '../state/storage';
import { pick, t as tr, type Lang } from '../i18n';
import { LessonScreen } from './LessonScreen';
import type { FreePracticeInit } from './FreePracticeScreen';

interface Props {
  lang: Lang;
  session: MyInstrumentSettings;
  onPatchSession: (patch: Partial<MyInstrumentSettings>) => void;
  onChangeInstrument: (id: string) => void;
  onSaveBase: () => void;
  /** 選択中レッスン(自由練習からの復帰に備えてApp側で保持) */
  selectedLessonId: string | null;
  onSelectLesson: (id: string | null) => void;
  onReview: (init: FreePracticeInit) => void;
}

export function CourseScreen({ lang, session, onPatchSession, onChangeInstrument, onSaveBase, selectedLessonId, onSelectLesson, onReview }: Props) {
  const t = (key: Parameters<typeof tr>[1]) => tr(lang, key);
  const [progress, setProgress] = useState(loadCourseProgress);

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
    const chapter = CHAPTERS.find((c) => c.id === lesson?.chapterId);
    if (lesson && course && chapter) {
      const allIds = courseLessonIds(course);
      const idx = allIds.indexOf(lesson.id);
      const nextId = allIds[idx + 1];
      return (
        <LessonScreen
          key={lesson.id}
          lang={lang}
          lesson={lesson}
          courseTitle={pick(lang, course.title.ja, course.title.en)}
          chapterTitle={pick(lang, chapter.title.ja, chapter.title.en)}
          lessonNumber={idx + 1}
          totalLessons={allIds.length}
          alreadyDone={progress.completedLessonIds.includes(lesson.id)}
          hasNext={!!nextId}
          onComplete={markDone}
          onNext={() => onSelectLesson(nextId ?? null)}
          onBack={() => onSelectLesson(null)}
          onReview={onReview}
          session={session}
          onPatchSession={onPatchSession}
          onChangeInstrument={onChangeInstrument}
          onSaveBase={onSaveBase}
        />
      );
    }
  }

  return (
    <main className="course-main">
      {COURSES.map((course) => {
        const allIds = courseLessonIds(course);
        const done = allIds.filter((id) => progress.completedLessonIds.includes(id)).length;
        const nextLessonId = allIds.find((id) => !progress.completedLessonIds.includes(id));
        return (
          <div key={course.id} className="course-wrap">
            <section className="panel">
              <h2>{pick(lang, course.title.ja, course.title.en)} <span className="key-badge">{t('progressLabel')}: {done} / {allIds.length}</span></h2>
              <p className="hint-text">{pick(lang, course.description.ja, course.description.en)}</p>
              <div className="progress-bar">
                <div className="progress-bar-fill" style={{ width: `${(done / allIds.length) * 100}%` }} />
              </div>
            </section>

            {course.chapterIds.map((cid) => {
              const chapter = CHAPTERS.find((c) => c.id === cid);
              if (!chapter) return null;
              const lessons = lessonsOfChapter(cid);
              const chapterDone = lessons.filter((l) => progress.completedLessonIds.includes(l.id)).length;
              return (
                <section key={cid} className="panel chapter-panel">
                  <h2>
                    {pick(lang, chapter.title.ja, chapter.title.en)}
                    <span className="key-badge">{chapterDone} / {lessons.length}</span>
                  </h2>
                  <p className="hint-text chapter-purpose">{pick(lang, chapter.purpose.ja, chapter.purpose.en)}</p>
                  <ul className="lesson-list">
                    {lessons.map((lesson, i) => {
                      const isDone = progress.completedLessonIds.includes(lesson.id);
                      const isNext = lesson.id === nextLessonId;
                      return (
                        <li key={lesson.id}>
                          <button
                            className={`lesson-item${isDone ? ' done' : ''}${isNext ? ' next' : ''}`}
                            onClick={() => onSelectLesson(lesson.id)}
                          >
                            <span className="lesson-item-num">{isDone ? '✓' : i + 1}</span>
                            <span className="lesson-item-body">
                              <span className="lesson-item-title">{pick(lang, lesson.title.ja, lesson.title.en)}</span>
                              <span className="lesson-item-theme">
                                {lesson.technicalName ? `${lesson.technicalName} — ` : ''}
                                {pick(lang, lesson.outcome.ja, lesson.outcome.en)}
                              </span>
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
          </div>
        );
      })}
    </main>
  );
}
