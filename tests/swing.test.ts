import assert from 'node:assert/strict';
import { swingNotes } from '../src/theory/rhythms';
let n = 0;
const eq = (a: unknown, b: unknown) => { assert.deepEqual(a, b); n++; };
const near = (a: number, b: number) => { assert.ok(Math.abs(a - b) < 1e-9, `${a} != ${b}`); n++; };
const sw = 1 / 6;
const note = (start: number, duration: number) => ({ start, duration });
// 8分だけの拍: ウラ拍が遅れ、オモテの8分が伸びる(従来どおり)
let r = swingNotes([note(0, 0.5), note(0.5, 0.5)], sw);
near(r[0].duration, 0.5 + sw); near(r[1].start, 0.5 + sw); near(r[1].duration, 0.5 - sw);
// 16分4つの拍: 何も動かない
r = swingNotes([note(0, 0.25), note(0.25, 0.25), note(0.5, 0.25), note(0.75, 0.25)], sw);
eq(r.map((x) => [x.start, x.duration]), [[0, 0.25], [0.25, 0.25], [0.5, 0.25], [0.75, 0.25]]);
// 8分+16分16分 の拍: x.5の16分を遅らせるとx.75とぶつかるので、拍ごとイーブン
r = swingNotes([note(0, 0.5), note(0.5, 0.25), note(0.75, 0.25)], sw);
eq(r.map((x) => [x.start, x.duration]), [[0, 0.5], [0.5, 0.25], [0.75, 0.25]]);
// 16分+16分+8分: 8分がx.5から始まるが、その拍に16分があるのでイーブン
r = swingNotes([note(0, 0.25), note(0.25, 0.25), note(0.5, 0.5)], sw);
eq(r.map((x) => [x.start, x.duration]), [[0, 0.25], [0.25, 0.25], [0.5, 0.5]]);
// 16分は前の拍にだけある: 次の拍の8分は普通にスウィングする
r = swingNotes([note(0, 0.25), note(0.25, 0.75), note(1, 0.5), note(1.5, 0.5)], sw);
near(r[2].duration, 0.5 + sw); near(r[3].start, 1.5 + sw);
// 3連の拍: 触らない
r = swingNotes([note(0, 1 / 3), note(1 / 3, 1 / 3), note(2 / 3, 1 / 3)], sw);
eq(r.map((x) => x.start), [0, 1 / 3, 2 / 3]);
// ウラ拍から始まる長い音(食い): 遅れるが音価は詰めない
r = swingNotes([note(3.5, 1)], sw);
near(r[0].start, 3.5 + sw); near(r[0].duration, 1);
// sw=0 は恒等
eq(swingNotes([note(0.5, 0.5)], 0), [note(0.5, 0.5)]);
console.log(`${n} swing assertions passed.`);
