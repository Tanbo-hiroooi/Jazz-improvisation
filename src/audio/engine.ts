// Tone.js を使った再生エンジン(Reactに依存しない)
// タイムライン構成: [カウントイン1小節(オプション)] + [再生リージョン]
// リージョンは進行全体・2小節・1小節のいずれか。ループ時はリージョンのみ繰り返す。

import * as Tone from 'tone';
import type { NoteEvent } from '../theory/phrases';

export interface CompEvent {
  /** リージョン先頭からの拍 */
  start: number;
  /** 和音の実音MIDI */
  midis: number[];
  duration: number;
}

export interface StartOptions {
  bpm: number;
  countIn: boolean;
  loop: boolean;
  /** リージョンの小節数 */
  regionBars: number;
  metronome: boolean;
  /** 見本フレーズ(リージョン先頭からの拍で正規化済み) */
  notes?: NoteEvent[];
  /** true なら音程なしでリズムのみ */
  rhythmOnly?: boolean;
  /** 簡易コード音 */
  comp?: CompEvent[];
  /** スウィング: ウラ拍(8分)を何拍ぶん遅らせるか(0=ストレート, 1/6≒三連スウィング) */
  swing?: number;
  /** 再生位置コールバック: bar はリージョン内小節(カウントイン中は -1) */
  onPosition?: (bar: number, beat: number) => void;
  /** 現在鳴っている見本ノートのインデックス(-1はなし) */
  onNoteIndex?: (index: number) => void;
  onEnded?: () => void;
}

function beatsToTime(beats: number): string {
  const bar = Math.floor(beats / 4);
  const quarter = Math.floor(beats % 4);
  const sixteenth = (beats % 1) * 4;
  return `${bar}:${quarter}:${sixteenth}`;
}

export class AudioEngine {
  private melody: Tone.Synth | null = null;
  private clickHi: Tone.Synth | null = null;
  private clickLo: Tone.Synth | null = null;
  private comp: Tone.PolySynth | null = null;
  private parts: Tone.Part[] = [];
  private repeats: number[] = [];
  private started = false;
  private running = false;

  async ensureStarted(): Promise<void> {
    if (!this.started) {
      await Tone.start();
      const master = new Tone.Gain(0.9).toDestination();
      this.melody = new Tone.Synth({
        oscillator: { type: 'triangle8' },
        envelope: { attack: 0.02, decay: 0.15, sustain: 0.5, release: 0.15 },
        volume: -4,
      }).connect(master);
      this.clickHi = new Tone.Synth({
        oscillator: { type: 'sine' },
        envelope: { attack: 0.001, decay: 0.05, sustain: 0, release: 0.02 },
        volume: -8,
      }).connect(master);
      this.clickLo = new Tone.Synth({
        oscillator: { type: 'sine' },
        envelope: { attack: 0.001, decay: 0.05, sustain: 0, release: 0.02 },
        volume: -14,
      }).connect(master);
      this.comp = new Tone.PolySynth(Tone.Synth, {
        oscillator: { type: 'triangle' },
        envelope: { attack: 0.03, decay: 0.5, sustain: 0.35, release: 0.5 },
        volume: -7,
      }).connect(master);
      this.started = true;
    }
  }

  get isRunning(): boolean {
    return this.running;
  }

  setBpm(bpm: number): void {
    Tone.getTransport().bpm.value = bpm;
  }

  async start(opts: StartOptions): Promise<void> {
    await this.ensureStarted();
    this.stop();

    const transport = Tone.getTransport();
    transport.bpm.value = opts.bpm;
    transport.timeSignature = 4;

    const offsetBars = opts.countIn ? 1 : 0;
    const regionEnd = offsetBars + opts.regionBars;

    // メトロノーム(カウントイン中は常に鳴らす)
    const clickId = transport.scheduleRepeat((time) => {
      const ticks = transport.getTicksAtTime(time);
      const beatIndex = Math.round(ticks / Tone.getTransport().PPQ);
      const bar = Math.floor(beatIndex / 4);
      const beat = beatIndex % 4;
      const inCountIn = opts.countIn && bar < offsetBars;
      if (opts.metronome || inCountIn) {
        const synth = beat === 0 ? this.clickHi! : this.clickLo!;
        synth.triggerAttackRelease(beat === 0 ? 1400 : 1000, 0.03, time, inCountIn ? 1 : 0.8);
      }
    }, '4n', 0);
    this.repeats.push(clickId);

    // スウィング: ウラ拍(x.5拍)の音を遅らせ、その分ウラ拍の音価を詰める。
    // オモテ拍の8分はウラ拍まで伸ばして「タータ」のシャッフル感を出す。
    // 実際に鳴らすタイミング(スウィング適用後)を先に計算し、
    // 再生スケジュールとハイライト判定の両方で同じものを使う。
    const sw = opts.swing ?? 0;
    const isOffbeat = (b: number) => Math.abs((b % 1) - 0.5) < 0.02;
    const isOnbeat = (b: number) => b % 1 < 0.02 || b % 1 > 0.98;
    const timedNotes = (opts.notes ?? []).map((nt) => {
      let start = nt.start;
      let duration = nt.duration;
      if (sw > 0) {
        if (isOffbeat(start)) {
          start += sw;
          if (Math.abs(duration - 0.5) < 0.02) duration = Math.max(0.2, duration - sw);
        } else if (isOnbeat(start) && Math.abs(duration - 0.5) < 0.02) {
          duration += sw;
        }
      }
      return { midi: nt.midi, velocity: nt.velocity, start, duration };
    });

    // 再生位置の通知(16分音符ごと)
    const posId = transport.scheduleRepeat((time) => {
      const ticks = transport.getTicksAtTime(time);
      const beats = ticks / transport.PPQ;
      const bar = Math.floor(beats / 4) - offsetBars;
      const beat = beats % 4;
      const regionBeats = beats - offsetBars * 4;
      Tone.getDraw().schedule(() => {
        opts.onPosition?.(bar, beat);
        if (timedNotes.length > 0 && bar >= 0) {
          let idx = -1;
          for (let i = 0; i < timedNotes.length; i++) {
            const nt = timedNotes[i];
            if (nt.start <= regionBeats + 0.01 && regionBeats < nt.start + nt.duration) idx = i;
          }
          opts.onNoteIndex?.(idx);
        }
      }, time);
    }, '16n', 0);
    this.repeats.push(posId);

    // お手本の音。Rhythm Only では音を鳴らさず、譜面上の赤いガイド(onNoteIndex)だけを
    // リズムに合わせて動かす(打音は鳴らさない)。
    if (timedNotes.length > 0 && !opts.rhythmOnly) {
      const events = timedNotes.map((nt) => ({
        time: beatsToTime(nt.start + offsetBars * 4),
        midi: nt.midi,
        duration: nt.duration,
        velocity: nt.velocity,
      }));
      // 注意: Part.loop はPart開始時点からループ領域を鳴らすため、カウントイン中に
      // フレーズが鳴ってしまう。繰り返しは Transport.loop に任せる。
      const part = new Tone.Part((time, ev) => {
        const durSec = (ev.duration * 60) / transport.bpm.value * 0.9;
        this.melody!.triggerAttackRelease(Tone.Frequency(ev.midi, 'midi').toFrequency(), durSec, time, ev.velocity);
      }, events);
      part.start(0);
      this.parts.push(part);
    }

    // 簡易コード音
    if (opts.comp && opts.comp.length > 0) {
      const compEvents = opts.comp.map((c) => ({
        time: beatsToTime(c.start + offsetBars * 4),
        midis: c.midis,
        duration: c.duration,
      }));
      const compPart = new Tone.Part((time, ev) => {
        const durSec = (ev.duration * 60) / transport.bpm.value * 0.85;
        const freqs = ev.midis.map((m) => Tone.Frequency(m, 'midi').toFrequency());
        this.comp!.triggerAttackRelease(freqs, durSec, time, 0.75);
      }, compEvents);
      compPart.start(0);
      this.parts.push(compPart);
    }

    if (opts.loop) {
      transport.loop = true;
      transport.loopStart = `${offsetBars}:0:0`;
      transport.loopEnd = `${regionEnd}:0:0`;
    } else {
      transport.loop = false;
      transport.scheduleOnce(() => {
        Tone.getDraw().schedule(() => {
          this.stop();
          opts.onEnded?.();
        }, Tone.now());
      }, `${regionEnd}:0:0`);
    }

    transport.start('+0.05', 0);
    this.running = true;
  }

  stop(): void {
    const transport = Tone.getTransport();
    transport.stop();
    transport.cancel();
    transport.loop = false;
    transport.position = 0;
    for (const p of this.parts) {
      p.dispose();
    }
    this.parts = [];
    this.repeats = [];
    this.running = false;
  }
}

export const engine = new AudioEngine();

// 開発時のみ: 動作検証用にグローバル公開
if (import.meta.env.DEV) {
  (globalThis as { __engine?: AudioEngine }).__engine = engine;
}
