// 再生制御の共有フック: 自由練習・レッスン・曲で実践から共通で使う
// (メトロノーム/カウントイン/コード伴奏/リージョンループ/位置・ノートハイライト)

import { useCallback, useEffect, useRef, useState } from 'react';
import { engine, type CompEvent } from '../audio/engine';
import { QUALITIES } from '../theory/chords';
import { mod12 } from '../theory/notes';
import type { NoteEvent } from '../theory/phrases';
import type { Progression } from '../theory/progressions';

export type PlayKind = 'backing' | 'example' | 'rhythm';
export type LoopRange = 'full' | '2' | '1';

export interface PlaybackParams {
  progression: Progression;
  /** 実音キー(自由進行では0) */
  effKeyPc: number;
  /** 譜面に表示中のノート(音を確認/リズムガイドの対象) */
  displayedNotes: NoteEvent[];
  bpm: number;
  countIn: boolean;
  loopEnabled: boolean;
  metronomeOn: boolean;
  compOn: boolean;
  /** スウィングのウラ拍オフセット(拍) */
  swing: number;
  loopRange: LoopRange;
  selectedMeasure: number;
}

export interface PlaybackState {
  playing: PlayKind | null;
  /** 再生位置(measure=-1はカウントイン中、nullは停止中) */
  position: { measure: number; beat: number } | null;
  currentNoteIndex: number;
  startPlayback: (kind: PlayKind) => Promise<void>;
  stopAll: () => void;
}

export function usePracticePlayback(p: PlaybackParams): PlaybackState {
  const [playing, setPlaying] = useState<PlayKind | null>(null);
  const [position, setPosition] = useState<{ measure: number; beat: number } | null>(null);
  const [currentNoteIndex, setCurrentNoteIndex] = useState(-1);
  const regionMapRef = useRef<number[]>([]);
  const regionStartRef = useRef(0);

  const stopAll = useCallback(() => {
    engine.stop();
    setPlaying(null);
    setPosition(null);
    setCurrentNoteIndex(-1);
  }, []);

  const startPlayback = useCallback(
    async (kind: PlayKind) => {
      engine.stop();
      const totalBars = p.progression.measures;
      let regionStart = 0;
      let regionBars = totalBars;
      if (p.loopRange !== 'full') {
        const len = p.loopRange === '1' ? 1 : 2;
        regionStart = Math.min(p.selectedMeasure, totalBars - len);
        regionBars = len;
      }
      regionStartRef.current = regionStart;
      const startBeat = regionStart * 4;
      const endBeat = (regionStart + regionBars) * 4;

      // リージョン内の表示ノート(開始拍を0に正規化)。
      // Rhythm Only も表示中の内容を使い、譜面のハイライトと音を常に一致させる
      let regionNotes: NoteEvent[] | undefined;
      regionMapRef.current = [];
      if (kind !== 'backing') {
        regionNotes = [];
        p.displayedNotes.forEach((n, gi) => {
          if (n.start >= startBeat - 0.01 && n.start < endBeat - 0.01) {
            regionNotes!.push({ ...n, start: n.start - startBeat });
            regionMapRef.current.push(gi);
          }
        });
      }

      // 簡易コード音(ルート+ガイドトーン)
      let comp: CompEvent[] | undefined;
      if (p.compOn) {
        comp = [];
        for (const c of p.progression.chords) {
          const cStart = c.measure * 4 + c.beat;
          if (cStart < startBeat || cStart >= endBeat) continue;
          const rootPc = mod12(p.effKeyPc + c.rootOffset);
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
        bpm: p.bpm,
        countIn: p.countIn,
        loop: p.loopEnabled,
        regionBars,
        metronome: p.metronomeOn,
        notes: regionNotes,
        rhythmOnly: kind === 'rhythm',
        comp,
        swing: p.swing,
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [p.progression, p.loopRange, p.selectedMeasure, p.displayedNotes, p.compOn, p.effKeyPc, p.bpm, p.countIn, p.loopEnabled, p.metronomeOn, p.swing],
  );

  // BPMは再生中もライブ反映
  useEffect(() => {
    if (playing) engine.setBpm(p.bpm);
  }, [p.bpm, playing]);

  // 表示内容や進行が変わったら停止(音と譜面の不一致を防ぐ)
  useEffect(() => {
    stopAll();
  }, [p.progression, p.displayedNotes, stopAll]);

  // 画面を離れるときに停止
  useEffect(() => () => engine.stop(), []);

  return { playing, position, currentNoteIndex, startPlayback, stopAll };
}
