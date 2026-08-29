// 「フレーズを作る」で作った譜面の保存(localStorage)。
//
// フレーズの音は「そのコード進行の上で」意味を持つので、音符だけを保存しても復元できない。
// 進行・キー・素材・小節数をひとまとめにして保存し、読み込み時に全部を戻す。

import { loadJSON, saveJSON } from './storage';
import type { CustomChord } from '../components/CustomProgressionEditor';
import type { GridMaterial, GridPhrase } from '../theory/grid';
import type { ProgressionId } from '../theory/progressions';

const KEY = 'fc-saved-phrases-v1';
/** 保存できる上限。超えたら古いものから落とす */
const MAX = 50;

export interface SavedPhrase {
  id: string;
  name: string;
  /** ISO文字列 */
  savedAt: string;
  menuId: ProgressionId;
  /** menuId === 'custom' のときだけ使う */
  customChords?: CustomChord[];
  keyPc: number;
  material: GridMaterial;
  bars: number;
  phrase: GridPhrase;
}

export function loadSavedPhrases(): SavedPhrase[] {
  const list = loadJSON<SavedPhrase[]>(KEY, []);
  return Array.isArray(list) ? list : [];
}

/** 新しいものを先頭に足して保存する */
export function addSavedPhrase(entry: Omit<SavedPhrase, 'id' | 'savedAt'>): SavedPhrase[] {
  const item: SavedPhrase = {
    ...entry,
    id: `p-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    savedAt: new Date().toISOString(),
  };
  const next = [item, ...loadSavedPhrases()].slice(0, MAX);
  saveJSON(KEY, next);
  return next;
}

export function removeSavedPhrase(id: string): SavedPhrase[] {
  const next = loadSavedPhrases().filter((p) => p.id !== id);
  saveJSON(KEY, next);
  return next;
}
