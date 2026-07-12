// VexFlow による五線譜/TAB譜表示
// 表示専用: 五線譜は Concert MIDI + 表示シフト(移調楽器/記譜オクターブ)で描画し、
// TABは実音MIDIから弦・フレットを求める(音声・五線譜と音程が一致する)

import { useEffect, useMemo, useRef } from 'react';
import {
  Accidental,
  Annotation,
  AnnotationVerticalJustify,
  Beam,
  Dot,
  Formatter,
  GhostNote,
  Renderer,
  Stave,
  StaveConnector,
  StaveNote,
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

/** 休符を大きい順に分割 */
function restDurations(beats: number): { dur: string; dots: number }[] {
  const out: { dur: string; dots: number }[] = [];
  let rest = beats;
  const units = [4, 2, 1, 0.5, 0.25];
  while (rest > 0.12) {
    const u = units.find((x) => x <= rest + 0.01) ?? 0.25;
    out.push(nearestDur(u));
    rest -= u;
  }
  return out;
}

export function StaffView({
  notes, measures, clef, shift, flats, labelMode, chords, currentIndex,
  notation = 'staff', guitarPosition = 'auto', guitarOpenStrings = true,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  // 1つのノートに五線譜とTABの両方の要素が対応することがある
  const noteElsRef = useRef<SVGElement[][]>([]);
  const prevHighlight = useRef<SVGElement[]>([]);
  // 再描画でSVGが作り直されてもハイライトを復元できるよう、現在位置をrefにも保持
  const currentIndexRef = useRef(currentIndex);
  currentIndexRef.current = currentIndex;

  // 表示用MIDI: 原則「鳴っている音 + 記譜シフト」をそのまま描画し、
  // 譜表から大きく外れる場合のみオクターブ単位で寄せる。
  // (常に譜表中央へスナップすると、実際の音より1オクターブ高く/低く見えてしまうため)
  const displayNotes = useMemo(() => {
    if (notes.length === 0) return [] as (NoteEvent & { displayMidi: number })[];
    const noteClef = clef === 'bass' ? 'bass' : 'treble';
    const shifted = notes.map((n) => n.midi + shift);
    const sorted = [...shifted].sort((a, b) => a - b);
    const median = sorted[Math.floor(sorted.length / 2)];
    // 中央値がこの範囲に収まっていればそのまま表示(treble: C4〜A5 / bass: G2〜D4)
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

      // 小節ごとの表示ノート(休符詰め)を構築
      interface Item {
        keys: string[];
        dur: string;
        dots: number;
        isRest: boolean;
        acc: '' | '#' | 'b';
        globalIndex: number; // notes配列のインデックス(-1: 休符)
        label: string;
        triplet?: boolean; // 1拍3連の一員
      }
      const measureItems: Item[][] = [];
      for (let m = 0; m < measures; m++) {
        const inMeasure = displayNotes
          .map((n, gi) => ({ n, gi }))
          .filter(({ n }) => Math.floor(n.start / 4) === m)
          .sort((a, b) => a.n.start - b.n.start);
        const items: Item[] = [];
        let t = 0;
        for (const { n, gi } of inMeasure) {
          const pos = n.start - m * 4;
          if (pos > t + 0.05) {
            for (const r of restDurations(pos - t)) {
              items.push({ keys: [noteClef === 'bass' ? 'd/3' : 'b/4'], dur: r.dur + 'r', dots: r.dots, isRest: true, acc: '', globalIndex: -1, label: '' });
            }
          }
          const dur = Math.min(n.duration, 4 - pos);
          // 1/3拍 = 3連符の一員として8分音符+連符記号で表記
          const isTriplet = Math.abs(dur - 1 / 3) < 0.04;
          const { dur: d, dots } = isTriplet ? { dur: '8', dots: 0 } : nearestDur(dur);
          const p = midiToParts(n.displayMidi, flats);
          const chord = chords[Math.min(n.chordIndex, chords.length - 1)];
          let label = '';
          if (labelMode === 'name') label = midiToName(n.displayMidi, flats).replace(/-?\d+$/, '');
          else if (labelMode === 'solfege') label = midiToSolfege(n.displayMidi, flats);
          else if (labelMode === 'degree' && chord) label = degreeLabel(mod12(n.displayMidi), chord.rootPc, chord.quality);
          items.push({
            keys: [`${p.letter.toLowerCase()}${p.accidental}/${p.octave}`],
            dur: d,
            dots,
            isRest: false,
            acc: p.accidental,
            globalIndex: gi,
            label,
            triplet: isTriplet,
          });
          t = pos + dur;
        }
        if (items.length === 0) {
          items.push({ keys: [noteClef === 'bass' ? 'd/3' : 'b/4'], dur: 'wr', dots: 0, isRest: true, acc: '', globalIndex: -1, label: '' });
        } else if (t < 3.95) {
          for (const r of restDurations(4 - t)) {
            items.push({ keys: [noteClef === 'bass' ? 'd/3' : 'b/4'], dur: r.dur + 'r', dots: r.dots, isRest: true, acc: '', globalIndex: -1, label: '' });
          }
        }
        measureItems.push(items);
      }

      // 内容の密度(音数+臨時記号数)から1小節に必要な幅を見積もり、
      // 1行あたりの小節数を決める。幅が足りないと音符が重なって描画されるため。
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
      // 行の高さ: 五線譜のみ130 / TABのみ120 / 五線譜+TAB 235 / グランド210
      const lineHeight = isGrand ? 210 : showStaff && showTab ? 235 : showTab ? 120 : 130;
      const tabOffsetY = showStaff ? 95 : 0; // 五線譜の下にTABを置くときのオフセット
      const topPad = 24;
      const height = lines * lineHeight + topPad;

      const renderer = new Renderer(container, Renderer.Backends.SVG);
      renderer.resize(width, height);
      const ctx = renderer.getContext();

      for (let m = 0; m < measures; m++) {
        const line = Math.floor(m / perLine);
        const col = m % perLine;
        const isLineStart = col === 0;
        const baseW = width / perLine;
        const x = col * baseW;
        const y = topPad + line * lineHeight;

        // 五線譜(TABのみの場合は描かない)
        let stave: Stave | null = null;
        if (showStaff) {
          stave = new Stave(x, y, baseW - 1);
          if (isLineStart) stave.addClef(noteClef);
          if (m === measures - 1) stave.setEndBarType(3); // BarlineType.END
          stave.setContext(ctx);
          stave.draw();
        }

        // TAB譜
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

        // コード名などの横位置の基準になる譜表
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
            const sn = new StaveNote({ keys: item.keys, duration: item.dur, clef: noteClef, auto_stem: true });
            if (item.acc && !item.isRest) sn.addModifier(new Accidental(item.acc), 0);
            if (item.dots > 0) Dot.buildAndAttach([sn], { all: true });
            if (item.label) {
              const ann = new Annotation(item.label);
              ann.setFont('Helvetica', 9);
              ann.setVerticalJustification(AnnotationVerticalJustify.BOTTOM);
              sn.addModifier(ann, 0);
            }
            return sn;
          });
        }

        // TABノート(休符は透明なスペーサーで揃える)
        let tabTickables: (TabNote | GhostNote)[] = [];
        if (showTab) {
          tabTickables = items.map((item) => {
            const baseDur = item.dur.replace('r', '');
            if (item.isRest) return new GhostNote(baseDur);
            const pos = tabByGi[item.globalIndex] ?? { str: 1, fret: 0 };
            const tn = new TabNote({ positions: [pos], duration: baseDur });
            // TABのみ表示のときは、音の役割ラベルをTAB側に付ける
            if (!showStaff && item.label) {
              const ann = new Annotation(item.label);
              ann.setFont('Helvetica', 9);
              ann.setVerticalJustification(AnnotationVerticalJustify.BOTTOM);
              tn.addModifier(ann, 0);
            }
            return tn;
          });
        }

        // 3連符: 連続する3つの1/3拍ノートを連符としてまとめる(フォーマット前に作成)
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
          // 従来どおりの五線譜のみ
          const beams = Beam.generateBeams(staveNotes);
          Formatter.FormatAndDraw(ctx, stave, staveNotes);
          beams.forEach((b) => b.setContext(ctx).draw());
          tuplets.forEach((tp) => tp.setContext(ctx).draw());
        } else if (showStaff && showTab && stave && tabStave) {
          // 五線譜+TAB: 両方の声部を同じ横位置に揃えてフォーマット
          const beams = Beam.generateBeams(staveNotes);
          const voice = new Voice({ num_beats: 4, beat_value: 4 }).setMode(Voice.Mode.SOFT).addTickables(staveNotes);
          const tabVoice = new Voice({ num_beats: 4, beat_value: 4 }).setMode(Voice.Mode.SOFT).addTickables(tabTickables);
          new Formatter().joinVoices([voice]).joinVoices([tabVoice]).formatToStave([voice, tabVoice], stave);
          voice.draw(ctx, stave);
          beams.forEach((b) => b.setContext(ctx).draw());
          tuplets.forEach((tp) => tp.setContext(ctx).draw());
          tabVoice.draw(ctx, tabStave);
        } else if (showTab && tabStave) {
          // TABのみ
          const tabVoice = new Voice({ num_beats: 4, beat_value: 4 }).setMode(Voice.Mode.SOFT).addTickables(tabTickables);
          new Formatter().joinVoices([tabVoice]).formatToStave([tabVoice], tabStave);
          tabVoice.draw(ctx, tabStave);
        }

        // ハイライト用に SVG 要素を記録(VexFlowは各ノートを g#vf-{id} に描画する)
        const collectEl = (note: unknown): SVGElement | null => {
          const id = (note as { getAttribute(name: string): string | undefined }).getAttribute('id');
          return id ? (container.querySelector(`#vf-${id}`) as SVGElement | null) : null;
        };
        items.forEach((item, i) => {
          if (item.globalIndex < 0) return;
          const els: SVGElement[] = [];
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
