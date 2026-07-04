// VexFlow による五線譜表示
// 表示専用: 音の高さは Concert MIDI + 表示シフト(移調楽器/クレフ)で描画する

import { useEffect, useMemo, useRef } from 'react';
import {
  Accidental,
  Annotation,
  AnnotationVerticalJustify,
  Beam,
  Dot,
  Formatter,
  Renderer,
  Stave,
  StaveConnector,
  StaveNote,
} from 'vexflow';
import { degreeLabel, type Quality } from '../theory/chords';
import { midiToParts, midiToName, midiToSolfege, mod12 } from '../theory/notes';
import type { NoteEvent } from '../theory/phrases';
import type { Clef } from '../theory/instruments';

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

export function StaffView({ notes, measures, clef, shift, flats, labelMode, chords, currentIndex }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const noteElsRef = useRef<(SVGElement | null)[]>([]);
  const prevHighlight = useRef<SVGElement | null>(null);
  // 再描画でSVGが作り直されてもハイライトを復元できるよう、現在位置をrefにも保持
  const currentIndexRef = useRef(currentIndex);
  currentIndexRef.current = currentIndex;

  // 表示用MIDI: 移調 + クレフに収まるオクターブへ全体シフト
  const displayNotes = useMemo(() => {
    if (notes.length === 0) return [] as (NoteEvent & { displayMidi: number })[];
    const noteClef = clef === 'bass' ? 'bass' : 'treble';
    const target = noteClef === 'bass' ? 50 : 71;
    const shifted = notes.map((n) => n.midi + shift);
    const sorted = [...shifted].sort((a, b) => a - b);
    const median = sorted[Math.floor(sorted.length / 2)];
    const k = Math.round((target - median) / 12) * 12;
    return notes.map((n, i) => ({ ...n, displayMidi: shifted[i] + k }));
  }, [notes, shift, clef]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const render = () => {
      container.innerHTML = '';
      noteElsRef.current = [];
      prevHighlight.current = null;

      const width = container.clientWidth || 600;
      const perLine = Math.min(measures, width < 620 ? 2 : 4);
      const lines = Math.ceil(measures / perLine);
      const isGrand = clef === 'grand';
      const lineHeight = isGrand ? 210 : 130;
      const topPad = 24;
      const height = lines * lineHeight + topPad;

      const renderer = new Renderer(container, Renderer.Backends.SVG);
      renderer.resize(width, height);
      const ctx = renderer.getContext();
      const noteClef = clef === 'bass' ? 'bass' : 'treble';

      // 小節ごとの表示ノート(休符詰め)を構築
      interface Item {
        keys: string[];
        dur: string;
        dots: number;
        isRest: boolean;
        acc: '' | '#' | 'b';
        globalIndex: number; // notes配列のインデックス(-1: 休符)
        label: string;
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
          const { dur: d, dots } = nearestDur(dur);
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

      for (let m = 0; m < measures; m++) {
        const line = Math.floor(m / perLine);
        const col = m % perLine;
        const isLineStart = col === 0;
        const baseW = width / perLine;
        const x = col * baseW;
        const y = topPad + line * lineHeight;

        const stave = new Stave(x, y, baseW - 1);
        if (isLineStart) stave.addClef(noteClef);
        if (m === measures - 1) stave.setEndBarType(3); // BarlineType.END
        stave.setContext(ctx);
        stave.draw();

        let bassStave: Stave | null = null;
        if (isGrand) {
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

        // コードネーム
        const chordsInMeasure = chords.filter((c) => c.measure === m);
        ctx.save();
        ctx.setFont('Helvetica', 13, 'bold');
        ctx.setFillStyle('#1a1a2e');
        for (const c of chordsInMeasure) {
          const nx = stave.getNoteStartX() + (c.beat / 4) * (stave.getNoteEndX() - stave.getNoteStartX());
          ctx.fillText(c.symbol, nx, y - 2);
        }
        ctx.restore();

        // ノート生成
        const items = measureItems[m];
        const staveNotes = items.map((item) => {
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

        const beams = Beam.generateBeams(staveNotes);
        Formatter.FormatAndDraw(ctx, stave, staveNotes);
        beams.forEach((b) => b.setContext(ctx).draw());

        // ハイライト用に SVG 要素を記録(VexFlowは各ノートを g#vf-{id} に描画する)
        items.forEach((item, i) => {
          if (item.globalIndex >= 0) {
            const id = (staveNotes[i] as unknown as { getAttribute(name: string): string | undefined }).getAttribute('id');
            const el = id ? (container.querySelector(`#vf-${id}`) as SVGElement | null) : null;
            noteElsRef.current[item.globalIndex] = el;
          }
        });
      }

      // 再描画後にハイライトを復元
      const ci = currentIndexRef.current;
      if (ci >= 0) {
        const el = noteElsRef.current[ci];
        if (el) {
          el.classList.add('vf-current');
          prevHighlight.current = el;
        }
      }
    };

    render();
    const ro = new ResizeObserver(() => render());
    ro.observe(container);
    return () => ro.disconnect();
  }, [displayNotes, measures, clef, flats, labelMode, chords]);

  // 再生中ノートのハイライト(再描画せずクラス切替)
  useEffect(() => {
    if (prevHighlight.current) {
      prevHighlight.current.classList.remove('vf-current');
      prevHighlight.current = null;
    }
    if (currentIndex >= 0) {
      const el = noteElsRef.current[currentIndex];
      if (el) {
        el.classList.add('vf-current');
        prevHighlight.current = el;
      }
    }
  }, [currentIndex]);

  return <div ref={containerRef} className="staff-container" />;
}
