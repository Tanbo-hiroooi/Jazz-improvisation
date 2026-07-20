# First Chorus 開発引き継ぎ資料

AIアシスタント(GPT / Claude / その他)や新規開発者が、このプロジェクトの開発を引き継ぐための資料です。
**コードを変更する前に必ず通読してください。** 特に「絶対に守る方針」はプロダクトの根幹です。

最終更新: 2026-07-14(それ以降の変更は git log を参照)

---

## 1. プロジェクト概要

- **First Chorus(はじめてのジャズアドリブ)**: 楽譜は読めるがアドリブは初心者、という楽器経験者向けのジャズアドリブ練習Webアプリ。
- 公開URL: https://tanbo-hiroooi.github.io/Jazz-improvisation/
- リポジトリ: https://github.com/Tanbo-hiroooi/Jazz-improvisation (mainへのpushでGitHub Actionsが自動デプロイ)
- 技術: React 18 + TypeScript 5 + Vite 5 / Tone.js 15(音声) / VexFlow 4(五線譜・TAB) / localStorage(保存) / ルーターなし(App.tsxで画面切替)
- 将来: iOSアプリ化(Capacitor)を想定。**ロジック(src/theory, src/audio)とUIの分離を維持すること。**
- 現在テスターに使ってもらいながら改善を繰り返している段階。

## 2. 絶対に守る方針(オーナーの明示的決定)

1. **見本演奏なし**: AI・乱数による見本ソロ/見本フレーズの生成と再生は**禁止**。
   - OK: メトロノーム/カウントイン/簡易コード伴奏/**譜面に表示された固定譜例の再生**(「この音を確認」)/**ユーザー自身が編集したフレーズの再生**(「音を確認」「コードと一緒に確認」)
   - 禁止用語: 「見本を聴く」「お手本を再生」「フレーズをまねる」「Play Example」
   - 原則: 「譜面に見えているものを音にする」機能だけを持ち、「演奏のお手本」は提供しない。
2. **一度に変えるものは1つだけ**: 各STEPで新しく要求する要素は1つ。ただしこれは**必須条件**を絞る原則であり、**使える道具**(3連・16分など)まで狭めない(第2章以降の自由編集では全分割を許可済み)。
3. **リズム最優先のカリキュラム**: リズム → フレーズ → コード → アドリブ の順(§5参照)。
4. **挫折しない設計**: ハードゲート(次のSTEP・レッスン完了のロック)は編集課題のみ。テンポ/キーの「はしご」は絶対にゲートにしない(ユーザーが自分のペースで上げる)。
5. **録音機能は作らない**(オーナーが明示的に不要と決定。第6章は自己チェック方式)。
6. **音程の扱い**: 内部は常に実音(Concert)MIDI。移調楽器(B♭/E♭)は**表示時のみ**シフト。ギターの+12は記譜オクターブでありトランスポーズではない。TAB・五線譜・再生音の音程は常に一致させる。F管(ホルン等)は追加しない(決定済み)。
7. **内部識別子は変更しない**: package.json name(jazz-phrase-lab)、localStorageキー、リポジトリ名/Pages URL、deploy workflow。ユーザー向け表示にのみ「First Chorus」を使う。
8. 日本語・英語の両対応(i18n.ts + データ内のBi型)。片方だけの更新は不可。

## 3. ディレクトリ構成と役割

```
src/
├── theory/          # 音楽理論の純ロジック(React非依存)
│   ├── notes.ts        # 音名・MIDI・キー(KEYS, mod12, pcName, midiToParts...)
│   ├── chords.ts       # コード定義 QUALITIES(tones/guide/scale/tensions/度数ラベル)
│   ├── progressions.ts # 進行データ(ii-V-I, blues 12小節など。キー相対のrootOffset)
│   ├── phrases.ts      # 固定譜例の生成器(NoteEvent[]を返す)※§7
│   ├── grid.ts         # ★拍グリッドモデル+検証(フレーズ編集の中核)※§6
│   ├── guitar.ts       # TAB生成(ポジション制約つき最近傍フレット)
│   ├── instruments.ts  # 楽器定義(writtenShift, clefs, notationModes)
│   ├── modes.ts        # 練習ガイド文(自由練習用)
│   └── rhythms.ts      # スウィング設定
├── audio/engine.ts  # Tone.js再生エンジン(シングルトン)※§8
├── hooks/usePracticePlayback.ts  # 再生制御の共有フック ※§8
├── data/
│   ├── courses.ts      # ★コースデータ(6章23レッスン)。純データ、UI非依存 ※§5
│   ├── exercises.ts    # 自由練習の課題
│   └── missions.ts     # 曲で実践のミッション
├── components/
│   ├── StaffView.tsx      # VexFlow描画(タイ分割・3連・アーティキュレーション・TAB)※§9
│   ├── GridEditor.tsx     # ★拍グリッド編集UI(チュートリアル内蔵)
│   ├── GridComposer.tsx   # 自由練習のフレーズ作成モード
│   ├── StepPractice.tsx   # ★レッスンのSTEP練習の中枢(下書き管理・達成判定)※§10
│   ├── SessionSetupPanel.tsx # 練習前の設定確認(マイ楽器/今回の設定)
│   ├── VolumeControls.tsx # チャンネル別音量スライダー
│   └── ...
├── screens/         # Home / FreePractice / Course→Lesson / SongPractice
├── state/storage.ts # localStorage抽象化(キー一覧・マイ楽器・進捗+はしご)
└── i18n.ts          # 日英辞書(t(lang,key), pick(lang,ja,en))
```

## 4. 中核データフロー

```
courses.ts(データ) → StepPractice(解決・検証) → GridEditor(編集UI)
                                   ↓ gridToNoteEvents()
                            NoteEvent[](実音MIDI+start/duration拍)
                             ↓                      ↓
                     StaffView(表示専用)      usePracticePlayback → engine(Tone.js)
                     移調シフトは表示時のみ      実音のまま再生
```

**NoteEvent** が全システムの共通通貨: `{ midi(実音), start(拍), duration(拍), velocity, chordIndex, articulation? }`。
この形式に変換すれば表示・再生・TAB・ハイライトの既存機構がすべて動く。

## 5. 練習コース(courses.ts)

- コースは1つ: 「リズムから始めるアドリブ入門」6章23レッスン。
- 章: ①スウィングのノリ(1音・リズムのみ) ②コードトーンでフレーズ(アーティキュレーション導入→4小節完成) ③進行を音で(3度/ガイドトーン/ターゲット/アプローチ) ④モチーフ ⑤ジャズブルース(ブルーノート・リフ・掛け合い) ⑥1コーラス(12小節)。
- レッスン文章は3区分: `outcome`(できるようになること)/`steps`/`selfCheck` + `trivia`(折りたたみ豆知識)。
- **STEPの2形態**:
  - `content`(固定譜例STEP): `source`で内容を厳密指定(root/third/guide-tones/approach-pair/enclosure/landing-approach/custom-path/sample-motif/blues-riff/blue-note-demo/scale...)。**「chord-tonesで近似」は禁止** — STEPの説明文と譜面・再生音を完全一致させること(過去に不一致で大きな手戻りが発生)。訪問だけで達成扱い。
  - `editable`(グリッド編集STEP): material/bars/divisions/initial/conditions/requiredAction等。条件+操作課題を満たすまで未達成。
- レッスン単位の設定: `defaultBpm` / `clickPattern`(第1章はbackbeat) / `tempoLadder` / `keyLadder`。
- **レッスンIDを変えると進捗(completedLessonIds)がリセットされる。** テスターの有無をオーナーに確認してから変更すること。

## 6. 拍グリッド(theory/grid.ts)— フレーズ編集の中核

- モデル: `GridPhrase → bars[] → beats[4](division: 1|2|3|4) → cells[](attack|rest|hold)`。
  attackは`midi`(実音)と`articulation?`を持つ。**合計は構造上つねに4拍×小節数**(拍あふれ・不足が存在しない — これがブロック式から移行した理由)。
- `hold`は直前の音を延長し、拍・小節線をまたげる(シンコペーション・食い)。ただし**3連の拍の境界はまたげない**(GridEditorのextendで禁止。表記が崩れるため)。
- `gridToNoteEvents()`: attack起点で連続holdを音価に合算。音の直後でないholdはrest扱い。
- パレット: `paletteFor(keyPc, chord, material)` — material = root-only / chord-tone / guide-tone / blues(=0,3,5,6,7,10)。音域50〜84の連続リストで、▲▼移動用。
- `copyBarMapped()`: 小節コピー。**パレットのインデックス対応**で移調先コードに写す。
- 検証 `validateGrid(grid, conditions, requiredAction, initial, ctx)`:
  - conditions: minNotes/maxNotes/minRestBeats/minRestBeatsPerBar/requireCrossBarHold/requireOffbeatAttack/requireTriplet/requireSixteenth/requireArticulation/requireEndOn3rd
  - requiredAction: any-change / rhythm-change / pitch-change — **初期グリッドとの署名差分**で「実際に操作したか」を判定(rhythmSignature/pitchSignature/fullSignature)
  - 返り値: structureCompleted / actionCompleted / stepCompleted(=両方) / playbackAllowed(グリッドでは常にtrue) / errors(日英メッセージ)
- `initialGrid('quarters'|'halves'|'empty')`: **attackの後続セルはholdで埋める**こと(過去バグ: hold無しだと4分指定が8分+休符になる)。

## 7. 固定譜例の生成器(theory/phrases.ts)

- `degreePathAsNotes(prog, key, path, rhythm)`: コードごとに1音(度数)を鳴らす。rhythm: basic/offbeat/offbeat8/swing8/charleston/triplet/**anticipation**。
  - anticipationの重要仕様: 食った音が次の小節の1拍目を**先取り**するので、2小節目以降は頭の音を置かない。最終小節の食いはフォーム内で終える(過去バグ: 重複して譜面崩壊)。
- 他: chordTonesAsNotes / guideTonesAsNotes / approachPairAsNotes / enclosureAsNotes / landingWithApproachAsNotes / sampleMotifAsNotes(variant: repeat/rhythm/landing/alternate/sequence — 差分が厳密に「リズムだけ」「最後の音だけ」等になるよう設計) / bluesRiffAsNotes / blueNoteDemoAsNotes / scaleAsNotes / tensionsAsNotes。
- StepContentの`activeMeasures`/`activeOnChordChangesOnly`で「指定小節だけ鳴らす」フィルタ。

## 8. 音声(audio/engine.ts + usePracticePlayback)

- engineはシングルトン。`StartOptions`: bpm/countIn/loop/regionBars/metronome/`clickPattern('all'|'backbeat')`/notes/rhythmOnly/comp/swing/コールバック群。
- スウィング: ウラ拍(x.5)を遅らせる方式。再生とハイライト判定が**同じ**タイミング計算を共有(ズレ防止)。
- アーティキュレーション再生: accent=velocity×1.25 / staccato=gate0.45 / tenuto=gate1.0。
- **チャンネル別音量** `engine.volumes {metronome, backbeat, comp}`: velocityへの乗算方式。localStorage('fc-volumes-v1')に保存、UIはVolumeControls.tsx。カウントインはmetronome音量に追従。
- Rhythm Onlyは音を鳴らさず赤いガイドだけ動かす仕様(自由練習)。
- 開発時のみ `window.__engine` が公開される(ブラウザ検証用)。
- **重要**: `usePracticePlayback`のインスタンスは「アクティブな画面/STEPに1つ」。過去に複数フックの競合で「音が出ない」バグが発生。LessonScreenは`registerStop`パターンで子の停止関数を1つだけ保持し、画面遷移・完了・設定変更時に停止する。

## 9. 譜面描画(StaffView.tsx)

- 表示専用。実音MIDI+表示シフトで描画し、譜表から大きく外れる時のみオクターブ寄せ。
- **タイ分割**: 小節線・表現不能な音価はnoteSegments()で分割しStaveTieで接続。**行をまたぐ場合は半タイ**(行末から出る弧+行頭へ入る弧)。
- 3連: 1/3拍(と2/3=タイ2つ)を検出し、連続3個(音符・休符混在可)をTupletにまとめる。休符詰めもrestSegments()で3連位置を認識。
- 表現可能音価: DUR_MAP {4,3,2,1.5,1,0.75,0.5,0.25} + 1/3。
- TAB: タイの継続セグメントと休符はGhostNote(透明スペーサー)。TAB生成はguitar.ts。
- アーティキュレーション記号: 'a>'/'a.'/'a-'(先頭セグメントのみ)。

## 10. STEP練習の中枢(StepPractice.tsx)— 最重要の設計原則

過去4回の大規模バグ修正で確立した原則。**壊さないこと。**

1. **達成状態はstateにコピーしない**: 編集STEPの達成は`resolveEditable(editable, progression, keyPc, flats, draft)`で**毎レンダー導出**する。親(完了ゲート計算)と子(表示)が同じ関数を使うので食い違いが構造的に起きない。stateとして持つのは`drafts`(編集内容+Undo履歴)と`visitedFixed`(固定STEPの訪問)だけ。
2. **下書きの防御**: draftは`keyPc`を記録。キー不一致またはパレット外の音を含むdraftは使わず初期グリッドへフォールバック(`usable`判定)。
3. **キー変更の一元管理**: すべての経路がLessonScreenの`changeKey`を通る(編集中なら確認→承認時のみ変更)。StepPracticeは`prevKeyRef`で「実際に変わった時だけ」全draftを破棄(**初回マウントでは破棄しない** — 過去バグ)。
4. **完了ゲート**: 全STEP達成(編集=条件+課題、固定=訪問)まで「レッスン完了」無効+残数表示。「もう一度練習する」は`practiceGen`キーで再マウントし完全リセット。
5. 「音を確認」=伴奏なし、「コードと一緒に確認」=常に伴奏あり(トグル無関係)、Start=伴奏+メトロノーム(コード音トグル反映)。

## 11. その他の画面・機能

- **マイ楽器 vs 今回の練習設定**: App.tsxで`baseInstrument`(永続)と`session`(一時)を別stateで管理。Homeはbaseのみ表示。「この設定をマイ楽器に保存」で明示保存した時だけbase更新。
- 曲で実践: 開いた直後は設定確認パネル(setupConfirmed初期値false)。
- テンポ/キーはしご: CourseProgress.ladders にトークン('bpm:80','key:5')で保存。自己申告の「クリアした!」ボタン。
- グリッドのチュートリアル: GridEditor内蔵。初回自動オープン、閉じたらlocalStorage('fc-grid-help-seen-v1')に記憶。STEP種別で項目を出し分け。
- アクセシビリティ: トグルはaria-pressed、STEPタブはrole=tablist/aria-selected。維持すること。
- localStorageキー: jpl-course-progress-v1 / jpl-last-screen-v1 / fc-my-instrument-v1 / fc-volumes-v1 / fc-grid-help-seen-v1 / jazz-phrase-lab-lang / 練習ログ(PracticeLogPanel内)。

## 12. 開発ワークフロー(必須)

```bash
npm run dev        # 開発サーバー(localhost:5173)
npx tsc --noEmit   # 型チェック(コミット前に必ず0エラー)
npm run build      # 本番ビルド(コミット前に必ず成功)
npm run preview    # 本番ビルドの確認
```

- **変更後は必ず実ブラウザで動作検証**してからコミットする(このプロジェクトの慣習。型が通る≠動く)。確認項目: 対象機能の実操作/コンソールエラー0/モバイル390px幅で横スクロールなし/(音声変更時)再生・停止。
- コミットメッセージ: 英語の要約1行+日本語の箇条書き本文(git log参照)。コミット・プッシュは**オーナーの確認後**が基本。mainへのpushで本番へ自動デプロイされる点に注意。
- 全19→23レッスンに関わる変更をしたら、「一部だけ確認」ではなく**全レッスン・全STEPを走査**して報告する(オーナーの明示要求)。

## 13. 既知の制限・意図的な未実装

- 録音・振り返り: **作らない**(決定)。
- フレーズの保存・一覧・再利用: 未実装(「次に実装予定」)。グリッドのデータ構造は保存可能な形。
- 行またぎのタイは半タイ表示(完全な弧は未対応)。
- 3連の拍をまたぐhold・3連内のholdは不可(表記の複雑化を回避した意図的制限)。
- 自由練習(通常モード)は旧来の固定譜例+課題方式のまま(グリッドはフレーズ作成モードのみ)。
- iOSアプリ化(Capacitor)・追加チューニング・運指最適化: 将来課題。

## 14. オーナー(開発依頼者)との協働メモ

- やり取りは日本語。大きな設計変更は**先に設計案を提示して承認を得てから**実装する(ChatGPTの叩き台を持ち込むこともある)。
- 質問には選択肢+推奨を添えると意思決定が速い。決定事項は明確に伝えてくれる(例: 録音不要、1小節のみ廃止、進捗リセットOK)。
- バグ報告は再現手順つきで来る。修正後は「何が原因で・何を変えて・どう検証したか」を具体的に報告する。
- 初心者への分かりやすさを最重視。専門用語には補足を。文章が散らばる構成を嫌う。
```

なお、Claude固有のメモリ(~/.claude配下)には引き継がれない補足情報があるが、重要事項はすべて本書とREADMEに集約済み。README=ユーザー向け仕様、本書=開発者/AI向け内部知識、という分担。
