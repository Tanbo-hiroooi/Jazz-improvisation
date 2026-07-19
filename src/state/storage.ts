// 進捗・設定の保存(現在はlocalStorage。将来クラウド保存へ差し替えやすいよう集約)

import type { GuitarPosition } from '../theory/guitar';
import { defaultNotationOf, getInstrument, type Clef, type NotationMode, type PitchMode } from '../theory/instruments';

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
  myInstrument: 'fc-my-instrument-v1',
} as const;

/**
 * マイ楽器(基本設定)。セッション中の一時変更はここに書き込まず、
 * ユーザーが明示的に保存したときだけ更新する。
 */
export interface MyInstrumentSettings {
  instrumentId: string;
  clefOverride: Clef | null;
  pitchMode: PitchMode;
  notationMode: NotationMode;
  guitarPosition: GuitarPosition;
  guitarOpenStrings: boolean;
}

/** 欠けているフィールドは楽器に応じた初期値で補う(古い保存データとの互換) */
export function loadMyInstrument(): MyInstrumentSettings {
  const raw = loadJSON<Partial<MyInstrumentSettings>>(STORAGE_KEYS.myInstrument, {});
  const instrumentId = raw.instrumentId ?? 'piano';
  const inst = getInstrument(instrumentId);
  return {
    instrumentId,
    clefOverride: raw.clefOverride ?? null,
    pitchMode: raw.pitchMode === 'written' ? 'written' : 'concert',
    notationMode: raw.notationMode ?? defaultNotationOf(inst),
    guitarPosition: raw.guitarPosition ?? 'auto',
    guitarOpenStrings: raw.guitarOpenStrings ?? true,
  };
}

export function saveMyInstrument(settings: MyInstrumentSettings): void {
  saveJSON(STORAGE_KEYS.myInstrument, settings);
}

/** コース進捗: 完了したレッスンIDと、テンポ/キーはしごの達成トークン(例: 'bpm:80', 'key:5') */
export interface CourseProgress {
  completedLessonIds: string[];
  ladders?: Record<string, string[]>;
}

export function loadCourseProgress(): CourseProgress {
  const raw = loadJSON<CourseProgress>(STORAGE_KEYS.courseProgress, { completedLessonIds: [] });
  return { completedLessonIds: raw.completedLessonIds ?? [], ladders: raw.ladders ?? {} };
}

export function saveCourseProgress(progress: CourseProgress): void {
  saveJSON(STORAGE_KEYS.courseProgress, progress);
}
