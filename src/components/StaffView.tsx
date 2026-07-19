// VexFlow による五線譜/TAB譜表示
// 表示専用: 五線譜は Concert MIDI + 表示シフト(移調楽器/記譜オクターブ)で描画し、
// TABは実音MIDIから弦・フレットを求める(音声・五線譜と音程が一致する)
//
// 拍グリッド対応:
// - 小節線・拍をまたぐ音はタイで分割して描画する(以前は小節境界で切り捨てていた)
// - 3連(1/3拍)の音符・休符を連符記号でまとめる
// - アーティキュレーション(>・スタッカート・テヌート)を表示する

import { useEffect, useMemo, useRef } from 'react';
import {
  Accidental,
  Annotation,
  AnnotationVerticalJustify,
  Articulation as VFArticulation,
  Beam,
  Dot,
  Formatter,
  GhostNote,
  Renderer,
  Stave,
  StaveConnector,
  StaveNote,
  StaveTie,
  TabNote,
  TabStave,
  Tuplet,
  Voice,
} from 'vexflow';
import { degreeLabel, type Quality } from '../theory/chords';
import { midiSeqToTab, type GuitarPosition, type TabPosition } from '../theory/guitar';
import { midiToParts, midiToName, midiToSolfege, mod12 } from '../theory/notes';
import type { NoteEvent } from '../theory/phrases';
import type { Clef, NotationMode } from '../theory/instruments';

export type LabelMode = 'none' | 'name' | 'solfege' | 'degree';

export interface ChordDisplay {
  measure: number;
  beat: number;
  symbol: string;
  rootPc: number; // 表示上のルート(移調適用済み)
  quality: Quality;
}

interface Props {
  notes: NoteEvent[];
  measures: number;
  clef: Clef;
  /** 表示上の半音シフト(移調楽器) */
  shift: number;
  flats: boolean;
  labelMode: LabelMode;
  chords: ChordDisplay[];
  /** 再生中のノートインデックス(-1: なし) */
  currentIndex: number;
  /** 譜面表示(TABはギター用。既定は五線譜のみ) */
  notation?: NotationMode;
  guitarPosition?: GuitarPosition;
  guitarOpenStrings?: boolean;
}

const DUR_MAP: { beats: number; dur: string; dots: number }[] = [
  { beats: 4, dur: 'w', dots: 0 },
  { beats: 3, dur: 'h', dots: 1 },
  { beats: 2, dur: 'h', dots: 0 },
  { beats: 1.5, dur: 'q', dots: 1 },
  { beats: 1, dur: 'q', dots: 0 },
  { beats: 0.75, dur: '8', dots: 1 },
  { beats: 0.5, dur: '8', dots: 0 },
  { beats: 0.25, dur: '16', dots: 0 },
];

function nearestDur(beats: number): { dur: string; dots: number } {
  let best = DUR_MAP[DUR_MAP.length - 1];
  let bestDiff = Infinity;
  for (const d of DUR_MAP) {
    const diff = Math.abs(d.beats - beats);
    if (diff < bestDiff) {
      bestDiff = diff;
      best = d;
    }
  }
  return { dur: best.dur, dots: best.dots };
}

const near = (a: number, b: number) => Math.abs(a - b) < 0.04;

/**
 * 1音を表示可能な音価に分割する(小節線で必ず区切り、表現できない長さはタイでつなぐ)。
 * 3連由来(1/3・2/3拍)は連符フラグを付ける。
 */
function noteSegments(start: number, duration: number): { start: number; dur: number; triplet: boolean }[] {
  const segs: { start: number; dur: number; triplet: boolean }[] = [];
  let pos = start;
  let rem = duration;
  while (rem > 0.04) {
    const inBar = pos - Math.floor(pos / 4 + 1e-4) * 4;
    const room = 4 - inBar;
    let take: number;
    let trip = false;
    if (near(rem, 1 / 3)) {
      take = rem; trip = true;
    } else if (near(rem, 2 / 3)) {
      take = 1 / 3; trip = true;
    } else {
      const limit = Math.min(rem, room) + 0.02;
      const cand = DUR_MAP.find((d) => d.beats <= limit);
      take = cand ? Math.min(cand.beats, rem) : Math.min(rem, room);
    }
    segs.push({ start: pos, dur: take, triplet: trip });
    pos += take;
    rem -= take;
  }
  return segs;
}

/** 休符を分割して並べる(3連の位置は1/3拍の休符にする) */
function restSegments(gapStart: number, gapEnd: number): { dur: string; dots: number; triplet: boolean }[] {
  const out: { dur: string; dots: number; triplet: boolean }[] = [];
  let pos = gapStart;
  while (gapEnd - pos > 0.04) {
    const beatOff = pos - Math.floor(pos + 1e-3);
    const rem = gapEnd - pos;
    const thirdAligned = near(beatOff, 1 / 3) || near(beatOff, 2 / 3);
    const remFrac = rem - Math.floor(rem + 1e-3);
    const remIsThird = near(remFrac, 1 / 3) || near(remFrac, 2 / 3);
    if (thirdAligned || (near(beatOff, 0) && remIsThird && rem < 0.9)) {
      out.push({ dur: '8', dots: 0, triplet: true });
      pos += 1 / 3;
    } else {
      const units = [4, 2, 1, 0.5, 0.25];
      const u = units.find((x) => x <= rem + 0.01) ?? 0.25;
      const d = nearestDur(u);
      out.push({ dur: d.dur, dots: d.dots, triplet: false });
      pos += u;
    }
  }
  return out;
}

const ARTIC_CODE: Record<string, string> = { accent: 'a>', staccato: 'a.', tenuto: 'a-' };

export function StaffView({
  notes, measures, clef, shift, flats, labelMode, chords, currentIndex,
  notation = 'staff', guitarPosition = 'auto', guitarOpenStrings = true,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  // 1つのノートに複数のセグメント(タイ)×五線譜/TABの要素が対応する
  const noteElsRef = useRef<SVGElement[][]>([]);
  const prevHighlight = useRef<SVGElement[]>([]);
  // 再描画でSVGが作り直されてもハイライトを復元できるよう、現在位置をrefにも保持
  const currentIndexRef = useRef(currentIndex);
  currentIndexRef.current = currentIndex;

  // 表示用MIDI: 原則「鳴っている音 + 記譜シフト」をそのまま描画し、
  // 譜表から大きく外れる場合のみオクターブ単位で寄せる。
  const displayNotes = useMemo(() => {
    if (notes.length === 0) return [] as (NoteEvent & { displayMidi: number })[];
    const noteClef = clef === 'bass' ? 'bass' : 'treble';
    const shifted = notes.map((n) => n.midi + shift);
    const sorted = [...shifted].sort((a, b) => a - b);
    const median = sorted[Math.floor(sorted.length / 2)];
    const lo = noteClef === 'bass' ? 43 : 60;
    const hi = noteClef === 'bass' ? 62 : 81;
    let k = 0;
    while (median + k < lo) k += 12;
    while (median + k > hi) k -= 12;
    return notes.map((n, i) => ({ ...n, displayMidi: shifted[i] + k }));
  }, [notes, shift, clef]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const render = () => {
      container.innerHTML = '';
      noteElsRef.current = [];
      prevHighlight.current = [];

      const width = container.clientWidth || 600;
      const noteClef = clef === 'bass' ? 'bass' : 'treble';
      const showStaff = notation !== 'tab';
      const showTab = notation === 'tab' || notation === 'staff-tab';

      // TAB: 実音MIDIを時系列で弦・フレットへ変換(globalIndexで引けるようにする)
      const tabByGi: (TabPosition | undefined)[] = [];
      if (showTab) {
        const order = displayNotes
          .map((n, gi) => ({ gi, midi: n.midi, start: n.start }))
          .sort((a, b) => a.start - b.start);
        const tabs = midiSeqToTab(order.map((o) => o.midi), guitarPosition, guitarOpenStrings);
        order.forEach((o, i) => { tabByGi[o.gi] = tabs[i]; });
      }

      // 各ノートをタイ用セグメントへ分割
      interface Seg { gi: number; segIdx: number; start: number; dur: number; triplet: boolean }
      const allSegs: Seg[] = [];
      displayNotes.forEach((n, gi) => {
        noteSegments(n.start, n.duration).forEach((s, segIdx) => {
          allSegs.push({ gi, segIdx, start: s.start, dur: s.dur, triplet: s.triplet });
        });
      });

      // 小節ごとの表示アイテム(休符詰め)
      interface Item {
        keys: string[];
        dur: string;
        dots: number;
        isRest: boolean;
        acc: '' | '#' | 'b';
        globalIndex: number; // notes配列のインデックス(-1: 休符)
        segIdx: number;
        label: string;
        triplet: boolean;
        articulation?: string; // VexFlowコード(先頭セグメントのみ)
      }
      const restKeys = [noteClef === 'bass' ? 'd/3' : 'b/4'];
      const measureItems: Item[][] = [];
      for (let m = 0; m < measures; m++) {
        const inMeasure = allSegs
          .filter((s) => Math.floor(s.start / 4 + 1e-4) === m)
          .sort((a, b) => a.start - b.start || a.segIdx - b.segIdx);
        const items: Item[] = [];
        let t = m * 4;
        const pushRests = (from: number, to: number) => {
          for (const r of restSegments(from, to)) {
            items.push({ keys: restKeys, dur: r.dur + 'r', dots: r.dots, isRest: true, acc: '', globalIndex: -1, segIdx: 0, label: '', triplet: r.triplet });
          }
        };
        for (const s of inMeasure) {
          if (s.start > t + 0.04) pushRests(t, s.start);
          const n = displayNotes[s.gi];
          const p = midiToParts(n.displayMidi, flats);
          const chord = chords[Math.min(n.chordIndex, Math.max(0, chords.length - 1))];
          let label = '';
          if (s.segIdx === 0) {
            if (labelMode === 'name') label = midiToName(n.displayMidi, flats).replace(/-?\d+$/, '');
            else if (labelMode === 'solfege') label = midiToSolfege(n.displayMidi, flats);
            else if (labelMode === 'degree' && chord) label = degreeLabel(mod12(n.displayMidi), chord.rootPc, chord.quality);
          }
          const { dur, dots } = s.triplet ? { dur: '8', dots: 0 } : nearestDur(s.dur);
          items.push({
            keys: [`${p.letter.toLowerCase()}${p.accidental}/${p.octave}`],
            dur,
            dots,
            isRest: false,
            acc: p.accidental,
            globalIndex: s.gi,
            segIdx: s.segIdx,
            label,
            triplet: s.triplet,
            articulation: s.segIdx === 0 && n.articulation ? ARTIC_CODE[n.articulation] : undefined,
          });
          t = s.start + s.dur;
        }
        if (items.length === 0) {
          items.push({ keys: restKeys, dur: 'wr', dots: 0, isRest: true, acc: '', globalIndex: -1, segIdx: 0, label: '', triplet: false });
        } else if (t < m * 4 + 3.95) {
          pushRests(t, m * 4 + 4);
        }
        measureItems.push(items);
      }

      // 内容の密度から1小節に必要な幅を見積もり、1行あたりの小節数を決める
      let maxRequired = 120;
      for (const items of measureItems) {
        const accCount = items.filter((i) => i.acc && !i.isRest).length;
        const required = 50 + items.length * 32 + accCount * 12;
        if (required > maxRequired) maxRequired = required;
      }
      const hardCap = width < 620 ? 2 : 4;
      const perLine = Math.max(1, Math.min(measures, hardCap, Math.floor(width / maxRequired)));
      const lines = Math.ceil(measures / perLine);
      const isGrand = clef === 'grand' && showStaff;
      const lineHeight = isGrand ? 210 : showStaff && showTab ? 235 : showTab ? 120 : 130;
      const tabOffsetY = showStaff ? 95 : 0;
      const topPad = 24;
      const height = lines * lineHeight + topPad;

      const renderer = new Renderer(container, Renderer.Backends.SVG);
      renderer.resize(width, height);
      const ctx = renderer.getContext();

      // タイ描画用: ノートごとの五線譜セグメント(小節をまたいで収集)
      const tieNotes: Map<number, { segIdx: number; line: number; sn: StaveNote }[]> = new Map();

      for (let m = 0; m < measures; m++) {
        const line = Math.floor(m / perLine);
        const col = m % perLine;
        const isLineStart = col === 0;
        const baseW = width / perLine;
        const x = col * baseW;
        const y = topPad + line * lineHeight;

        let stave: Stave | null = null;
        if (showStaff) {
          stave = new Stave(x, y, baseW - 1);
          if (isLineStart) stave.addClef(noteClef);
          if (m === measures - 1) stave.setEndBarType(3); // BarlineType.END
          stave.setContext(ctx);
          stave.draw();
        }

        let tabStave: TabStave | null = null;
        if (showTab) {
          tabStave = new TabStave(x, y + tabOffsetY, baseW - 1);
          if (isLineStart) tabStave.addTabGlyph();
          if (m === measures - 1) tabStave.setEndBarType(3);
          tabStave.setContext(ctx);
          tabStave.draw();
        }

        let bassStave: Stave | null = null;
        if (isGrand && stave) {
          bassStave = new Stave(x, y + 85, baseW - 1);
          if (isLineStart) bassStave.addClef('bass');
          if (m === measures - 1) bassStave.setEndBarType(3);
          bassStave.setContext(ctx);
          bassStave.draw();
          if (isLineStart) {
            new StaveConnector(stave, bassStave).setType('brace').setContext(ctx).draw();
            new StaveConnector(stave, bassStave).setType('singleLeft').setContext(ctx).draw();
          }
        }

        const anchor = (stave ?? tabStave)!;

        // コードネーム
        const chordsInMeasure = chords.filter((c) => c.measure === m);
        ctx.save();
        ctx.setFont('Helvetica', 13, 'bold');
        ctx.setFillStyle('#1a1a2e');
        for (const c of chordsInMeasure) {
          const nx = anchor.getNoteStartX() + (c.beat / 4) * (anchor.getNoteEndX() - anchor.getNoteStartX());
          ctx.fillText(c.symbol, nx, y - 2);
        }
        ctx.restore();

        const items = measureItems[m];

        // 五線譜ノート
        let staveNotes: StaveNote[] = [];
        if (showStaff) {
          staveNotes = items.map((item) => {
            const sn = new StaveNote({ keys: item.keys, duration: item.dur + (item.isRest ? '' : ''), clef: noteClef, auto_stem: true });
            if (item.acc && !item.isRest) sn.addModifier(new Accidental(item.acc), 0);
            if (item.dots > 0) Dot.buildAndAttach([sn], { all: true });
            if (item.articulation) sn.addModifier(new VFArticulation(item.articulation), 0);
            if (item.label) {
              const ann = new Annotation(item.label);
              ann.setFont('Helvetica', 9);
              ann.setVerticalJustification(AnnotationVerticalJustify.BOTTOM);
              sn.addModifier(ann, 0);
            }
            return sn;
          });
          items.forEach((item, i) => {
            if (item.globalIndex >= 0) {
              const arr = tieNotes.get(item.globalIndex) ?? [];
              arr.push({ segIdx: item.segIdx, line, sn: staveNotes[i] });
              tieNotes.set(item.globalIndex, arr);
            }
          });
        }

        // TABノート(休符とタイの継続セグメントは透明なスペーサーで揃える)
        let tabTickables: (TabNote | GhostNote)[] = [];
        if (showTab) {
          tabTickables = items.map((item) => {
            const baseDur = item.dur.replace('r', '');
            if (item.isRest || item.segIdx > 0) return new GhostNote(baseDur);
            const pos = tabByGi[item.globalIndex] ?? { str: 1, fret: 0 };
            const tn = new TabNote({ positions: [pos], duration: baseDur });
            if (!showStaff && item.label) {
              const ann = new Annotation(item.label);
              ann.setFont('Helvetica', 9);
              ann.setVerticalJustification(AnnotationVerticalJustify.BOTTOM);
              tn.addModifier(ann, 0);
            }
            return tn;
          });
        }

        // 3連符: 連続する3つの1/3拍アイテム(音符・休符混在可)を連符にまとめる
        const tuplets: Tuplet[] = [];
        if (showStaff) {
          let run: StaveNote[] = [];
          items.forEach((item, i) => {
            if (item.triplet) {
              run.push(staveNotes[i]);
              if (run.length === 3) {
                tuplets.push(new Tuplet(run, { num_notes: 3, notes_occupied: 2 }));
                run = [];
              }
            } else {
              run = [];
            }
          });
        }

        if (showStaff && !showTab && stave) {
          const beams = Beam.generateBeams(staveNotes);
          Formatter.FormatAndDraw(ctx, stave, staveNotes);
          beams.forEach((b) => b.setContext(ctx).draw());
          tuplets.forEach((tp) => tp.setContext(ctx).draw());
        } else if (showStaff && showTab && stave && tabStave) {
          const beams = Beam.generateBeams(staveNotes);
          const voice = new Voice({ num_beats: 4, beat_value: 4 }).setMode(Voice.Mode.SOFT).addTickables(staveNotes);
          const tabVoice = new Voice({ num_beats: 4, beat_value: 4 }).setMode(Voice.Mode.SOFT).addTickables(tabTickables);
          new Formatter().joinVoices([voice]).joinVoices([tabVoice]).formatToStave([voice, tabVoice], stave);
          voice.draw(ctx, stave);
          beams.forEach((b) => b.setContext(ctx).draw());
          tuplets.forEach((tp) => tp.setContext(ctx).draw());
          tabVoice.draw(ctx, tabStave);
        } else if (showTab && tabStave) {
          const tabVoice = new Voice({ num_beats: 4, beat_value: 4 }).setMode(Voice.Mode.SOFT).addTickables(tabTickables);
          new Formatter().joinVoices([tabVoice]).formatToStave([tabVoice], tabStave);
          tabVoice.draw(ctx, tabStave);
        }

        // ハイライト用に SVG 要素を記録
        const collectEl = (note: unknown): SVGElement | null => {
          const id = (note as { getAttribute(name: string): string | undefined }).getAttribute('id');
          return id ? (container.querySelector(`#vf-${id}`) as SVGElement | null) : null;
        };
        items.forEach((item, i) => {
          if (item.globalIndex < 0) return;
          const els: SVGElement[] = noteElsRef.current[item.globalIndex] ?? [];
          if (showStaff) {
            const el = collectEl(staveNotes[i]);
            if (el) els.push(el);
          }
          if (showTab) {
            const el = collectEl(tabTickables[i]);
            if (el) els.push(el);
          }
          noteElsRef.current[item.globalIndex] = els;
        });
      }

      // タイの描画(同じ行内のセグメント間のみ。行またぎは省略)
      tieNotes.forEach((segs2) => {
        segs2.sort((a, b) => a.segIdx - b.segIdx);
        for (let i = 0; i + 1 < segs2.length; i++) {
          if (segs2[i].line !== segs2[i + 1].line) continue;
          new StaveTie({ first_note: segs2[i].sn, last_note: segs2[i + 1].sn, first_indices: [0], last_indices: [0] })
            .setContext(ctx)
            .draw();
        }
      });

      // 再描画後にハイライトを復元
      const ci = currentIndexRef.current;
      if (ci >= 0) {
        const els = noteElsRef.current[ci] ?? [];
        els.forEach((el) => el.classList.add('vf-current'));
        prevHighlight.current = els;
      }
    };

    render();
    const ro = new ResizeObserver(() => render());
    ro.observe(container);
    return () => ro.disconnect();
  }, [displayNotes, measures, clef, flats, labelMode, chords, notation, guitarPosition, guitarOpenStrings]);

  // 再生中ノートのハイライト(再描画せずクラス切替)
  useEffect(() => {
    prevHighlight.current.forEach((el) => el.classList.remove('vf-current'));
    prevHighlight.current = [];
    if (currentIndex >= 0) {
      const els = noteElsRef.current[currentIndex] ?? [];
      els.forEach((el) => el.classList.add('vf-current'));
      prevHighlight.current = els;
    }
  }, [currentIndex]);

  return <div ref={containerRef} className="staff-container" />;
}
