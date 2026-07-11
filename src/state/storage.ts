// 進捗・設定の保存(現在はlocalStorage。将来クラウド保存へ差し替えやすいよう集約)

export function loadJSON<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export function saveJSON<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // 保存失敗は致命的ではない
  }
}

export const STORAGE_KEYS = {
  courseProgress: 'jpl-course-progress-v1',
  lastScreen: 'jpl-last-screen-v1',
} as const;

/** コース進捗: 完了したレッスンIDの集合 */
export interface CourseProgress {
  completedLessonIds: string[];
}

export function loadCourseProgress(): CourseProgress {
  return loadJSON<CourseProgress>(STORAGE_KEYS.courseProgress, { completedLessonIds: [] });
}

export function saveCourseProgress(progress: CourseProgress): void {
  saveJSON(STORAGE_KEYS.courseProgress, progress);
}
