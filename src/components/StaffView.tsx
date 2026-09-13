// VexFlow による五線譜/TAB譜表示
// 表示専用: 五線譜は Concert MIDI + 表示シフト(移調楽器/記譜オクターブ)で描画し、
// TABは実音MIDIから弦・フレットを求める(音声・五線譜と音程が一致する)
//
// 拍グリッド対応:
// - 小節線・拍をまたぐ音はタイで分割して描画する(以前は小節境界で切り捨てていた)
// - 3連(1/3拍)の音符・休符を連符記号でまとめる
// - アーティキュレーション(>・スタッカート・テヌート)を表示する

import { useEffect, useMemo, useRef } from 'react';
import { staffBoxHeight } from './staffSizing';
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
  /** 編集で選択中のノートインデックス(-1: なし)。編集中どの音を触っているか示す */
  selectedIndex?: number;
  /** 入力対象として選ばれている小節(0始まり)。譜面上で色を付ける */
  selectedMeasure?: number;
  /** 小節をクリックしたときの通知。渡すと譜面がクリック可能になる */
  onSelectMeasure?: (measure: number) => void;
  onSelectNote?: (index: number) => void;
  noteSelectLabel?: (index: number) => string;
  /**
   * 音符のドラッグ。上下は steps(パレット上の段数、上が正)、左右は time(拍。譜面上の位置から換算)。
   * 最初に動いた向きで軸を決め、片方だけを送る。指を離したら phase 'end'。
   */
  onDragNote?: (index: number, drag: { steps: number; time: number | null; phase: 'move' | 'end' }) => void;
  /** 音符にフォーカスして↑↓を押したとき(1段ずつ高さを変える) */
  onNudgeNote?: (index: number, dir: 1 | -1) => void;
  /** Editing only: show rests by beat, and make them selectable. */
  entryDivisions?: number[];
  entryCursor?: number;
  /**
   * 拍ごとに休符を分けるのはこの小節だけ(省略時は全小節)。
   * 全体譜を編集面にしたとき、他の小節まで4分休符×4で埋まって騒がしくならないようにする。
   * 他の小節の長い休符は、タップした位置から拍を割り出す。
   */
  entryFocusMeasure?: number;
  onSelectRest?: (start: number) => void;
  restSelectLabel?: (start: number) => string;
  /**
   * 譜面の拡大率(1=等倍)。レイアウトは「表示幅 ÷ 拡大率」で組み、最後に表示サイズだけ引き伸ばす。
   * 音符・音部記号・タイまで一緒に大きくなる。
   */
  zoom?: number;
  /**
   * 使える高さ(px)。省略時はカードと画面から実測。全体が収まる最大倍率を選ぶ。
   * 入りきらないときは縮小して収める(演奏しながら譜面をスクロールさせないため)。
   */
  fitHeight?: number;
  /** 拡大率の上限。省略時は全画面3、通常表示はzoom(既定1)。 */
  fitMaxZoom?: number;
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
function restSegments(gapStart: number, gapEnd: number): { start: number; dur: string; dots: number; triplet: boolean }[] {
  const out: { start: number; dur: string; dots: number; triplet: boolean }[] = [];
  let pos = gapStart;
  while (gapEnd - pos > 0.04) {
    const beatOff = pos - Math.floor(pos + 1e-3);
    const rem = gapEnd - pos;
    const thirdAligned = near(beatOff, 1 / 3) || near(beatOff, 2 / 3);
    const remFrac = rem - Math.floor(rem + 1e-3);
    const remIsThird = near(remFrac, 1 / 3) || near(remFrac, 2 / 3);
    if (thirdAligned || (near(beatOff, 0) && remIsThird && rem < 0.9)) {
      out.push({ start: pos, dur: '8', dots: 0, triplet: true });
      pos += 1 / 3;
    } else {
      const units = [4, 2, 1, 0.5, 0.25];
      const u = units.find((x) => x <= rem + 0.01) ?? 0.25;
      const d = nearestDur(u);
      out.push({ start: pos, dur: d.dur, dots: d.dots, triplet: false });
      pos += u;
    }
  }
  return out;
}

const ARTIC_CODE: Record<string, string> = { accent: 'a>', staccato: 'a.', tenuto: 'a-' };

export function StaffView({
  notes, measures, clef, shift, flats, labelMode, chords, currentIndex, selectedIndex = -1,
  zoom = 1, fitHeight, fitMaxZoom,
  selectedMeasure = -1, onSelectMeasure, onSelectNote, noteSelectLabel, onDragNote, onNudgeNote,
  entryDivisions, entryCursor, entryFocusMeasure, onSelectRest, restSelectLabel,
  notation = 'staff', guitarPosition = 'auto', guitarOpenStrings = true,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  // 1つのノートに複数のセグメント(タイ)×五線譜/TABの要素が対応する
  const noteElsRef = useRef<SVGElement[][]>([]);
  const prevHighlight = useRef<SVGElement[]>([]);
  const prevSelected = useRef<SVGElement[]>([]);
  // 再描画でSVGが作り直されてもハイライトを復元できるよう、現在位置をrefにも保持
  const currentIndexRef = useRef(currentIndex);
  currentIndexRef.current = currentIndex;
  const selectedIndexRef = useRef(selectedIndex);
  selectedIndexRef.current = selectedIndex;
  // 小節クリック(入力する小節を譜面から選ぶ)。コールバックは毎回変わるので
  // refで持ち、描画のdepsには入れない(入れると無限に再描画される)
  const onSelectMeasureRef = useRef(onSelectMeasure);
  onSelectMeasureRef.current = onSelectMeasure;
  const onSelectNoteRef = useRef(onSelectNote);
  onSelectNoteRef.current = onSelectNote;
  const noteSelectLabelRef = useRef(noteSelectLabel);
  noteSelectLabelRef.current = noteSelectLabel;
  const onSelectRestRef = useRef(onSelectRest);
  onSelectRestRef.current = onSelectRest;
  const onDragNoteRef = useRef(onDragNote);
  onDragNoteRef.current = onDragNote;
  const onNudgeNoteRef = useRef(onNudgeNote);
  onNudgeNoteRef.current = onNudgeNote;
  // ドラッグ中に譜面が描き直されても座標変換できるよう、最後の描画の拡大率と位置表を持つ
  const scaleRef = useRef(1);
  const anchorsRef = useRef<{ start: number; x: number; y: number; endX: number }[]>([]);
  // ドラッグ直後の click で選択が二重に走らないようにする
  const suppressClickRef = useRef(false);
  const restSelectLabelRef = useRef(restSelectLabel);
  restSelectLabelRef.current = restSelectLabel;
  const selectedMeasureRef = useRef(selectedMeasure);
  selectedMeasureRef.current = selectedMeasure;
  const measureRectsRef = useRef<SVGRectElement[]>([]);

  // 表示用MIDI: 原則「鳴っている音 + 記譜シフト」をそのまま描画し、
  // 譜表から大きく外れる場合のみオクターブ単位で寄せる。
  //
  // 重要: 寄せ幅は「移調なし(0)→直前の値→0に近い順」で決める(ヒステリシス)。
  // 毎回そのときの中央値から計算し直すと、1つの音を編集しただけで中央値が動き、
  // 変更していない音まで譜面上で1オクターブ飛んでしまうため。
  const octaveShiftRef = useRef(0);
  const displayNotes = useMemo(() => {
    if (notes.length === 0) return [] as (NoteEvent & { displayMidi: number })[];
    const noteClef = clef === 'bass' ? 'bass' : 'treble';
    const shifted = notes.map((n) => n.midi + shift);
    const lo = noteClef === 'bass' ? 43 : 60;
    const hi = noteClef === 'bass' ? 62 : 81;
    // 加線1オクターブ分までは許容する
    const tolerance = 12;
    const min = Math.min(...shifted);
    const max = Math.max(...shifted);
    const fits = (k: number) => min + k >= lo - tolerance && max + k <= hi + tolerance;

    // 0(実音どおり)→直前の値→0に近いものの順に、全部が収まる寄せ幅を探す
    const prev = octaveShiftRef.current;
    const candidates = [0, prev, 12, -12, 24, -24];
    let k = candidates.find(fits);
    if (k === undefined) {
      // どれでも収まらない場合(音域が広すぎる)は中央値を譜表の中に置く
      const sorted = [...shifted].sort((a, b) => a - b);
      const median = sorted[Math.floor(sorted.length / 2)];
      k = 0;
      while (median + k < lo) k += 12;
      while (median + k > hi) k -= 12;
    }
    octaveShiftRef.current = k;
    return notes.map((n, i) => ({ ...n, displayMidi: shifted[i] + k }));
  }, [notes, shift, clef]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let lastSize = '';
    const render = () => {
      const avail = container.clientWidth;
      if (avail <= 0) return;
      const targetHeight = fitHeight ?? staffBoxHeight(container);
      const maxZoom = fitMaxZoom ?? (container.closest('.focus-stage') ? 3 : zoom);
      const size = `${avail}:${targetHeight}:${maxZoom}`;
      if (size === lastSize) return;
      lastSize = size;
      container.innerHTML = '';
      noteElsRef.current = [];
      prevHighlight.current = [];
      prevSelected.current = [];

      const noteClef = clef === 'bass' ? 'bass' : 'treble';
      const showStaff = notation !== 'tab';
      const showTab = notation === 'tab' || notation === 'staff-tab';
      const isGrand = clef === 'grand' && showStaff;
      const lineHeight = isGrand ? 210 : showStaff && showTab ? 235 : showTab ? 120 : 130;
      const tabOffsetY = showStaff ? 95 : 0;
      const topPad = 24;

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
        start: number;
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
          // The editor exposes real rests instead of a second row of abstract cells.
          // Only split silent space; never change the rhythm of an existing note.
          const cuts = [from, to];
          if (entryDivisions) {
            const splitByBeat = entryFocusMeasure === undefined || entryFocusMeasure === m;
            for (let beat = Math.floor(from); splitByBeat && beat < to; beat++) {
              const d = entryDivisions[beat] === 3 ? 3 : 1;
              for (let c = 0; c < d; c++) {
                const time = beat + c / d;
                if (time > from + 0.01 && time < to - 0.01) cuts.push(time);
              }
            }
            if (entryCursor !== undefined && entryCursor > from + 0.01 && entryCursor < to - 0.01) cuts.push(entryCursor);
          }
          cuts.sort((a, b) => a - b);
          for (let i = 0; i < cuts.length - 1; i++) for (const r of restSegments(cuts[i], cuts[i + 1])) {
            const triplet = r.triplet || entryDivisions?.[Math.floor(r.start + 0.001)] === 3;
            items.push({ start: r.start, keys: restKeys, dur: r.dur + 'r', dots: r.dots, isRest: true, acc: '', globalIndex: -1, segIdx: 0, label: '', triplet });
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
            start: s.start,
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
        if (items.length === 0 && !entryDivisions) {
          items.push({ start: m * 4, keys: restKeys, dur: 'wr', dots: 0, isRest: true, acc: '', globalIndex: -1, segIdx: 0, label: '', triplet: false });
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
      /** 論理幅から「1行の小節数・行数・高さ」を決める(拡大率を変えると論理幅が変わる) */
      const layoutFor = (logicalW: number) => {
        // 1行あたりの小節数の上限。広い画面ではもっと横に並べて、譜面の縦を短くする
        const hardCap = logicalW < 620 ? 2 : logicalW < 860 ? 4 : 6;
        // 実際の数は内容の密度で決める。ここを内容より多くすると音符が重なって印刷されるので、
        // 「1行に何小節」より優先する。行頭の音部記号ぶん(約60px)は音符に使えない
        const byDensity = Math.floor(Math.max(120, logicalW - 60) / maxRequired);
        const cap = Math.max(1, Math.min(measures, hardCap, byDensity));
        // 最終行だけ1〜2小節になると見づらいので、割り切れる/最終行が長い並べ方を選ぶ
        // (例: 8小節を 6+2 ではなく 4+4 にする)
        let per = cap;
        if (cap > 1 && measures > cap) {
          let best = -1;
          for (let x = 1; x <= cap; x++) {
            const rem = measures % x;
            const score = rem === 0 ? x : rem;
            if (score >= best) { best = score; per = x; }
          }
        }
        const ln = Math.ceil(measures / per);
        return { perLine: per, lines: ln, height: ln * lineHeight + topPad };
      };

      // 拡大率の決定。利用できる高さに収まる中でいちばん大きい率を選ぶ。
      // 拡大すると1行に入る小節が減って行数が増え、縮小すると逆に1行へ多く入るので、
      // 候補を大きい方から試して最初に収まったものを採用する。
      // 1未満まで許すのは、小節数が多いときに全体を1画面へ収めるため(スクロールしながらの演奏を避ける)。
      // 密な1小節も横にはみ出さない幅を確保。60%の下限は設けず全小節を収める。
      const upper = Math.max(0.001, Math.min(maxZoom, avail / (maxRequired + 60)));
      let scale = Math.min(upper, targetHeight / (measures * lineHeight + topPad));
      for (let z = upper; z >= scale; z -= 0.01) {
        if (layoutFor(Math.floor(avail / z)).height * z <= targetHeight) { scale = z; break; }
      }
      const width = Math.floor(avail / scale);
      const { perLine, height } = layoutFor(width);
      scaleRef.current = scale;

      const renderer = new Renderer(container, Renderer.Backends.SVG);
      renderer.resize(width, height);
      const ctx = renderer.getContext();

      // タイ描画用: ノートごとの五線譜セグメント(小節をまたいで収集)
      const tieNotes: Map<number, { segIdx: number; line: number; sn: StaveNote }[]> = new Map();
      // 小節クリック用の当たり判定(描画後にSVGへ重ねる)
      const measureBoxes: { m: number; x: number; y: number; w: number; h: number }[] = [];
      const entryAnchors: { start: number; x: number; y: number; endX: number; height: number; rest: boolean }[] = [];

      for (let m = 0; m < measures; m++) {
        const line = Math.floor(m / perLine);
        const col = m % perLine;
        const isLineStart = col === 0;
        const baseW = width / perLine;
        const x = col * baseW;
        const y = topPad + line * lineHeight;
        measureBoxes.push({ m, x, y: y - 16, w: baseW - 1, h: lineHeight - 8 });

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
          if (entryDivisions) {
            const tickables = showStaff ? staveNotes : tabTickables;
            entryAnchors.push({ start: item.start, x: tickables[i].getAbsoluteX(), y: y + 14,
              endX: i + 1 < items.length ? tickables[i + 1].getAbsoluteX() : x + baseW - 14,
              height: isGrand ? 150 : showStaff && showTab ? 165 : 76, rest: item.isRest });
          }
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

      // タイの描画。行をまたぐ場合は、行末から出る半タイ+行頭へ入る半タイ(記譜の慣習)
      tieNotes.forEach((segs2) => {
        segs2.sort((a, b) => a.segIdx - b.segIdx);
        for (let i = 0; i + 1 < segs2.length; i++) {
          if (segs2[i].line !== segs2[i + 1].line) {
            new StaveTie({ first_note: segs2[i].sn, first_indices: [0], last_indices: [0] }).setContext(ctx).draw();
            new StaveTie({ last_note: segs2[i + 1].sn, first_indices: [0], last_indices: [0] }).setContext(ctx).draw();
            continue;
          }
          new StaveTie({ first_note: segs2[i].sn, last_note: segs2[i + 1].sn, first_indices: [0], last_indices: [0] })
            .setContext(ctx)
            .draw();
        }
      });

      // 小節の選択枠とクリック領域。選択枠は音符の後ろ、クリック領域は一番手前に置く
      measureRectsRef.current = [];
      const svgEl = container.querySelector('svg') as SVGSVGElement | null;
      if (svgEl && onSelectMeasureRef.current) {
        const NS = 'http://www.w3.org/2000/svg';
        for (const box of measureBoxes) {
          const sel = document.createElementNS(NS, 'rect');
          sel.setAttribute('x', String(box.x));
          sel.setAttribute('y', String(box.y));
          sel.setAttribute('width', String(box.w));
          sel.setAttribute('height', String(box.h));
          sel.setAttribute('class', 'vf-measure-sel');
          sel.setAttribute('data-measure', String(box.m));
          svgEl.insertBefore(sel, svgEl.firstChild);
          measureRectsRef.current[box.m] = sel;

          const hit = document.createElementNS(NS, 'rect');
          hit.setAttribute('x', String(box.x));
          hit.setAttribute('y', String(box.y));
          hit.setAttribute('width', String(box.w));
          hit.setAttribute('height', String(box.h));
          hit.setAttribute('class', 'vf-measure-hit');
          hit.setAttribute('data-measure', String(box.m));
          hit.addEventListener('click', () => onSelectMeasureRef.current?.(box.m));
          svgEl.appendChild(hit);
        }
        const sm = selectedMeasureRef.current;
        if (sm >= 0) measureRectsRef.current[sm]?.classList.add('on');
      }

      anchorsRef.current = entryAnchors;
      if (svgEl && entryDivisions) {
        const NS = 'http://www.w3.org/2000/svg';
        for (const anchor of entryAnchors) {
          if (!anchor.rest || !onSelectRestRef.current) continue;
          const hit = document.createElementNS(NS, 'rect');
          hit.setAttribute('x', String(anchor.x - 6));
          hit.setAttribute('y', String(anchor.y));
          hit.setAttribute('width', String(Math.max(18, anchor.endX - anchor.x - 3)));
          hit.setAttribute('height', String(anchor.height));
          hit.setAttribute('class', 'vf-rest-hit');
          hit.setAttribute('role', 'button');
          hit.setAttribute('tabindex', '0');
          hit.setAttribute('aria-label', restSelectLabelRef.current?.(anchor.start) ?? String(anchor.start));
          // 長い休符(他の小節の全休符など)は、タップした位置の拍から入力できるようにする
          const span = (entryAnchors.find(a => a.start > anchor.start + 0.001)?.start ?? measures * 4) - anchor.start;
          hit.addEventListener('click', e => {
            const box = hit.getBoundingClientRect();
            const ratio = box.width > 0 ? Math.max(0, Math.min(0.999, (e.clientX - box.left) / box.width)) : 0;
            const beatOffset = span > 1.01 ? Math.floor(ratio * span) : 0;
            onSelectRestRef.current?.(anchor.start + beatOffset);
          });
          hit.addEventListener('keydown', e => {
            if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelectRestRef.current?.(anchor.start); }
          });
          svgEl.appendChild(hit);
        }
        const anchor = [...entryAnchors].reverse().find(a => a.start <= (entryCursor ?? -1) + 0.001);
        if (anchor && entryCursor !== undefined) {
          const next = entryAnchors.find(a => a.start > anchor.start + 0.001)?.start ?? measures * 4;
          const ratio = Math.max(0, Math.min(1, (entryCursor - anchor.start) / (next - anchor.start)));
          const cursorX = anchor.x + (anchor.endX - anchor.x) * ratio - 6;
          const line = document.createElementNS(NS, 'line');
          line.setAttribute('x1', String(cursorX)); line.setAttribute('x2', String(cursorX));
          line.setAttribute('y1', String(anchor.y)); line.setAttribute('y2', String(anchor.y + anchor.height));
          line.setAttribute('class', 'vf-entry-cursor');
          svgEl.appendChild(line);
        }
      }

      /** 画面座標を拍へ。ポインタのある行の項目(音符・休符)の区間内での割合で決める */
      const timeAtPointer = (clientX: number, clientY: number): number | null => {
        const anchors = anchorsRef.current;
        const el = container.querySelector('svg');
        if (!anchors.length || !el) return null;
        const box = el.getBoundingClientRect();
        const lx = (clientX - box.left) / scaleRef.current;
        const ly = (clientY - box.top) / scaleRef.current;
        const lineYs = [...new Set(anchors.map((a) => a.y))];
        const lineY = lineYs.reduce((best, y) => (Math.abs(y - ly) < Math.abs(best - ly) ? y : best), lineYs[0]);
        const line = anchors.filter((a) => a.y === lineY).sort((a, b) => a.x - b.x);
        const a = [...line].reverse().find((it) => it.x <= lx) ?? line[0];
        const next = anchors.find((b) => b.start > a.start + 0.001)?.start ?? measures * 4;
        const ratio = Math.max(0, Math.min(1, (lx - a.x) / Math.max(1, a.endX - a.x)));
        return a.start + ratio * (next - a.start);
      };

      // Note hit areas are above measure hit areas; keyboard users get the same action.
      if (svgEl && onSelectNoteRef.current) {
        noteElsRef.current.forEach((els, index) => els.forEach((el, segment) => {
          const box = (el as SVGGraphicsElement).getBBox();
          if (!box.width || !box.height) return;
          const hit = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
          hit.setAttribute('x', String(box.x - 4));
          hit.setAttribute('y', String(box.y - 5));
          hit.setAttribute('width', String(box.width + 8));
          hit.setAttribute('height', String(box.height + 10));
          hit.setAttribute('class', 'vf-note-hit');
          if (segment === 0) hit.setAttribute('role', 'button');
          else hit.setAttribute('aria-hidden', 'true');
          hit.setAttribute('tabindex', segment === 0 ? '0' : '-1');
          hit.setAttribute('aria-label', noteSelectLabelRef.current?.(index) ?? String(index + 1));
          hit.addEventListener('click', e => {
            e.stopPropagation();
            if (suppressClickRef.current) { suppressClickRef.current = false; return; }
            onSelectNoteRef.current?.(index);
          });
          hit.addEventListener('keydown', e => {
            if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelectNoteRef.current?.(index); }
            if (e.key === 'ArrowUp' || e.key === 'ArrowDown') { e.preventDefault(); onNudgeNoteRef.current?.(index, e.key === 'ArrowUp' ? 1 : -1); }
          });
          // ドラッグ: 上下=高さ、左右=位置。描き直しで要素が消えてもよいよう window で追う
          hit.addEventListener('pointerdown', e => {
            if (!onDragNoteRef.current || e.button !== 0) return;
            const startX = e.clientX, startY = e.clientY;
            let axis: 'x' | 'y' | null = null;
            const onMove = (ev: PointerEvent) => {
              const dx = ev.clientX - startX, dy = ev.clientY - startY;
              if (!axis) {
                if (Math.abs(dx) < 6 && Math.abs(dy) < 6) return;
                axis = Math.abs(dy) >= Math.abs(dx) ? 'y' : 'x';
                suppressClickRef.current = true;
              }
              if (axis === 'y') {
                // 論理座標で約8pxごとにパレットの次の音へ(五線の間隔=10px)
                onDragNoteRef.current?.(index, { steps: Math.round(-dy / scaleRef.current / 8), time: null, phase: 'move' });
              } else {
                onDragNoteRef.current?.(index, { steps: 0, time: timeAtPointer(ev.clientX, ev.clientY), phase: 'move' });
              }
            };
            const onUp = () => {
              window.removeEventListener('pointermove', onMove);
              window.removeEventListener('pointerup', onUp);
              window.removeEventListener('pointercancel', onUp);
              if (axis) onDragNoteRef.current?.(index, { steps: 0, time: null, phase: 'end' });
              else suppressClickRef.current = false;
            };
            window.addEventListener('pointermove', onMove);
            window.addEventListener('pointerup', onUp);
            window.addEventListener('pointercancel', onUp);
          });
          svgEl.appendChild(hit);
        }));
      }

      // 論理サイズで組んだSVGを、表示サイズだけ拡大する(viewBoxはVexFlowが付けている)
      if (svgEl) {
        svgEl.style.width = `${Math.floor(width * scale)}px`;
        svgEl.style.height = `${Math.floor(height * scale)}px`;
      }

      // 再描画後にハイライト(再生位置・編集の選択)を復元
      const ci = currentIndexRef.current;
      if (ci >= 0) {
        const els = noteElsRef.current[ci] ?? [];
        els.forEach((el) => el.classList.add('vf-current'));
        prevHighlight.current = els;
      }
      const si = selectedIndexRef.current;
      if (si >= 0) {
        const els = noteElsRef.current[si] ?? [];
        els.forEach((el) => el.classList.add('vf-selected'));
        prevSelected.current = els;
      }
    };

    render();
    const ro = new ResizeObserver(() => render());
    ro.observe(container);
    if (container.closest('.focus-stage') && container.parentElement) ro.observe(container.parentElement);
    const heading = container.closest('.staff-sticky')?.querySelector('.staff-head');
    if (heading) ro.observe(heading);
    window.addEventListener('resize', render);
    window.visualViewport?.addEventListener('resize', render);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', render);
      window.visualViewport?.removeEventListener('resize', render);
    };
  }, [displayNotes, measures, clef, flats, labelMode, chords, notation, guitarPosition, guitarOpenStrings, zoom, fitHeight, fitMaxZoom, entryDivisions, entryCursor, entryFocusMeasure]);

  // 選択中の小節(再描画せずクラス切替)
  useEffect(() => {
    measureRectsRef.current.forEach((r, i) => r?.classList.toggle('on', i === selectedMeasure));
  }, [selectedMeasure]);

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

  // 編集で選択中のノートのハイライト(どの音を触っているか譜面上で分かるように)。
  // 譜面が縦に長い場合は、選択音が見えるよう「譜面の枠内だけ」スクロールする(ページは動かさない)
  useEffect(() => {
    prevSelected.current.forEach((el) => el.classList.remove('vf-selected'));
    prevSelected.current = [];
    if (selectedIndex < 0) return;
    const els = noteElsRef.current[selectedIndex] ?? [];
    els.forEach((el) => el.classList.add('vf-selected'));
    prevSelected.current = els;

    const target = els[0];
    if (!target) return;
    // 「実際に縦スクロールできる」祖先を探す(overflow-x:hidden で overflow-y が
    // auto と計算されるだけの要素は対象外)
    let box: HTMLElement | null = containerRef.current?.parentElement ?? null;
    while (box && box.scrollHeight <= box.clientHeight + 1) {
      box = box.parentElement;
      if (box === document.body || box === document.documentElement) return; // ページ自体は動かさない
    }
    if (!box) return;
    const boxRect = box.getBoundingClientRect();
    const elRect = target.getBoundingClientRect();
    const margin = 24;
    if (elRect.top < boxRect.top + margin) {
      box.scrollTop -= boxRect.top + margin - elRect.top;
    } else if (elRect.bottom > boxRect.bottom - margin) {
      box.scrollTop += elRect.bottom - (boxRect.bottom - margin);
    }
  }, [selectedIndex]);

  return <div ref={containerRef} className="staff-container" />;
}
