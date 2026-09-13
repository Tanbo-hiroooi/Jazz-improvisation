# First Chorus 開発引き継ぎ資料

AIアシスタント(GPT / Claude / その他)や新規開発者が、このプロジェクトの開発を引き継ぐための資料です。
**コードを変更する前に必ず通読してください。** 特に「絶対に守る方針」はプロダクトの根幹です。

最終更新: 2026-09-13（現在地の短い要約はCLAUDE.md、履歴はgit logを参照）

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
│   ├── courses.ts      # ★コースデータ(6章27レッスン)。純データ、UI非依存 ※§5
├── components/
│   ├── StaffView.tsx      # VexFlow描画(タイ分割・3連・アーティキュレーション・TAB)※§9
│   ├── GridEditor.tsx     # ★拍グリッド編集UI(チュートリアル内蔵)
│   ├── GridComposer.tsx   # 自由練習のフレーズ作成モード
│   ├── StepPractice.tsx   # ★レッスンのSTEP練習の中枢(下書き管理・達成判定)※§10
│   ├── SessionSetupPanel.tsx # 練習前の設定確認(マイ楽器/今回の設定)
│   ├── VolumeControls.tsx # チャンネル別音量スライダー
│   └── ...
├── screens/         # Home / FreePractice / Course→Lesson
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

- コースは1つ: 「リズムから始めるアドリブ入門」6章27レッスン。
- 章: ①1音とリズムだけでスウィングする ②コードの中から使う音を選ぶ(3度→ガイドトーン→コードトーン) ③拍の頭と裏を使い分けて音を置く(着地/裏拍入り/食い) ④コードが変わる小節間を半音で繋げる(7th→3rd/ターゲット/アプローチ) ⑤同じ形を繰り返して1コーラスに(モチーフ/問いと答え) ⑥ブルースで1コーラス。
- 第2〜5章の最終レッスンは `isThrough: true` の【通し】。12小節ブルースでその章の技だけを使う。一覧で「通し」バッジが出る。
- 文章規約: タイトルは動作形、本文は行動だけ(理由は`trivia.why`へ)、指示は「〜しよう」、楽器中立語(「弾く」ではなく「演奏する」)。専門用語は`technicalName`(日英ペア)に逃がす。
- レッスン文章は3区分: `outcome`(できるようになること)/`steps`/`selfCheck` + `trivia`(折りたたみ豆知識)。
- **STEPの2形態**:
  - `content`(固定譜例STEP): `source`で内容を厳密指定(root/third/guide-tones/approach-pair/enclosure/landing-approach/custom-path/sample-motif/blues-riff/blue-note-demo/scale...)。**「chord-tonesで近似」は禁止** — STEPの説明文と譜面・再生音を完全一致させること(過去に不一致で大きな手戻りが発生)。訪問だけで達成扱い。
  - `editable`(グリッド編集STEP): material/bars/divisions/initial/conditions/requiredAction等。条件+操作課題を満たすまで未達成。
- レッスン単位の設定: `defaultBpm` / `clickPattern`(第1章はbackbeat) / `tempoLadder` / `keyLadder`。
- **レッスンIDを変えると進捗(completedLessonIds)がリセットされる。** テスターの有無をオーナーに確認してから変更すること。

## 6. 拍グリッド(theory/grid.ts)— フレーズ編集の中核

- モデル: `GridPhrase → bars[] → beats[4](division: 1|2|3|4) → cells[](attack|rest|hold)`。
  attackは`midi`(実音)と`articulation?`を持つ。**合計は構造上つねに4拍×小節数**(拍あふれ・不足が存在しない — これがブロック式から移行した理由)。
- `hold`は直前の音を延長し、拍・小節線をまたげる(シンコペーション・食い)。ただし**3連の拍の境界はまたげない**(gridEntryで禁止。表記が崩れるため)。
- `gridToNoteEvents()`: attack起点で連続holdを音価に合算。音の直後でないholdはrest扱い。
- パレット: `paletteFor(keyPc, chord, material)` — material = root-only / chord-tone / guide-tone / blues(=0,3,5,6,7,10)。音域50〜84の連続リストで、音名ボタンとオクターブ切替に使う。
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

- **停止時はDrawキューも捨てる**: 位置・ハイライトの通知は `Tone.getDraw().schedule()` 経由なので、
  Transportを止めただけでは既に積まれたコールバックが後から発火し、停止時に光っていた音符が残る。
  `stop()` で `Tone.getDraw().cancel(0)` を呼び、コールバック側も `if (!this.running) return;` で二重に防ぐ。
- **コードタイプは12種類**(`QUALITIES`)。`tones` は必ず [Root, 3rd相当, 5th相当, 7th相当] の4つで、
  course側の「3度」「7度」判定(targetAsNotes / third-only / requireEndOn3rd)がこの並びに依存する。
  6th系は tones[3] が6th、7sus4は tones[1] が4th。追加時はこの契約を崩さないこと。
  dim7のスケールは8音なので、`scaleAsNotes` は8音以上ならオクターブを足さず1小節に収める。
- **1小節2コード**: `CustomChord.pc2/q2` があれば beat0とbeat2の2イベントに展開する(`isSplitBar`)。
  既知の制限: グリッド編集(`chordForBar`)は小節に1パレットなので、フレーズ作成では1つ目のコードだけが使われる。
- **フレーズ保存**(`state/savedPhrases.ts`, localStorage `fc-saved-phrases-v1`, 最大50件):
  音は進行の上でしか意味を持たないので、GridPhrase単体ではなく menuId/customChords/keyPc/material/bars ごと保存する。
  読み込みは FreePracticeScreen の `loadSavedPhrase` が全部を戻す。**注意**: 進行を変えると小節数を自動同期する
  effectがあるため、そのままだと読み込んだ小節数を上書きしてしまう。`prevMeasuresRef` を読み込み側で先に
  更新しておくことで自動同期を発火させない。ここを壊すと「8小節の進行に4小節を読み込む」が失敗する。
- **音符の順番入力**（GridEditor + theory/gridEntry.ts）:
  - 音価→音名で入力し、カーソルを自動で進める。拡大譜面の音符タップは修正モード（自動で進めない）。
  - 内部・保存形式は従来のGridPhrase。gridEntryは1拍=12整数tickで時刻を扱い、既存のattackと終端を動かさず必要な分割に再配置する。
  - 別の音との重なり・フレーズ末尾超過・表現不能な位置を拒否。縮めた余白はrest。3連の拍をまたぐ音は禁止。
  - convertEntryBeatは1拍の位置と長さを丸めた候補を返す。既存音ありなら譜面プレビュー→適用、衝突や拍をまたぐタイがあれば拒否。勝手に音を消さない。
  - fixedRhythmは元のセルのmidiだけ変更し、分割・hold・休符を一切変えない。fixedPitchは音名選択を隠す。
  - 入力位置はセル番号でなく時刻。小節移動は内部の自動送りと外部の小節選択を区別して、拍の途中への自動送りを0拍へ戻さない。
  - Undo/Redoは親の履歴をそのまま使う。エディタ内のWeakMapにはカーソル位置だけを保存（達成状態は保存しない）。
  - 入力開始は1小節目。点のセル列は使わず、オレンジの縦線と「戻る／進む」で現在地を示す。移動先は音価に応じた細分位置と既存音の開始・終了で、音の途中は飛ばす。
  - **全体譜が編集面**(2026-09-13、オーナー指摘「1拍が1小節に見える／全体像が見えない」を受けて)。`GridEditor`の`fullScore`が
    全小節を表示し、休符タップ=入力位置、音符タップ=修正、空き部分タップ=小節移動、をすべて絶対時刻で受ける。
    1小節の拡大欄(`detailScore`)は「この小節を拡大」の補助表示に格下げ(狭い画面は既定ON)。
    「小節を編集/全体を見る」の切替は廃止。GridComposer・EditableStepBodyに別の全体譜を置かない方針は変わらない。
  - 休符を拍ごとに分けるのは**編集中の小節だけ**(`entryFocusMeasure`)。全小節でやると空の小節が4分休符×4で埋まって騒がしい。
    他の小節の長い休符は、当たり判定の中でタップされたx位置から拍を割り出す(`span`と割合)。
  - **ドラッグ**(StaffView `onDragNote` → GridEditor): 最初に6px動いた向きで軸を固定。上下=`steps`(論理8pxごとにパレット1段)、
    左右=`time`(ポインタのある行の項目区間から比例で拍を換算)。リスナーはwindowに付ける(描き直しで当たり判定の要素が消えるため)。
    ドラッグ中は`dragGrid`に仮の譜面を持ち、指を離した時だけ`onChange`で履歴に入れる(1操作=Undo 1回)。
    左右は`snapTime`で8分/16分/3連の位置へ丸め、`moveNote`(消して入れ直す純関数、`test:entry`で検証)で移動。重なる先には動かない。
    ドラッグ直後のclickは`suppressClickRef`で捨てる。`.vf-note-hit`は`touch-action: none`。
    ▲▼ボタン・↑↓キー(`onNudgeNote`)は`stepPitch`で1段ずつ。
  - 全体譜の高さは画面の46%(200〜440px)。広い画面では上に貼り付け(`.entry-full` sticky)、狭い画面は従来どおり入力パネル側(`.entry-workbench`)だけを貼り付ける(両方貼ると画面より高くなって届かない)。
  - labelModeは親から渡し、小節表示・全体表示・集中モードで揃える。再生と集中モードの管理は引き続き親が担当する。
  - StaffViewのentryDivisions/entryCursorは編集詳細だけに渡す。空白を拍ごとの休符（3連の拍は3分割）に分け、現在位置も休符の境界にする。変更するのは休符の表示だけで、元の音符・保存データ・全体譜のリズムは変えない。
  - onSelectNote/onSelectRest/ラベルcallbackはref経由で、再描画depsへ追加しない。休符の当たり判定と縦線はVexFlowの描画座標に合わせる。TABのみでも編集詳細には五線譜を併記し、透明なTAB休符を操作対象にしない。
  - 同じ音のタイ・TABの重複セグメントもクリック可能だが、キーボードと読み上げは先頭だけ。
  - 音名ボタンにshiftを表示時だけ適用。previewNoteは実音MIDI、再生中は鳴らさない専用シンセ。
  - モバイルは拡大譜面＋入力パネルを同じsticky要素にして重なりを防ぐ。短い画面はstickyを解除。
    bottom固定は譜面や操作ボタンを覆って誤入力になるため禁止。top固定で自然な文書順を維持する。
  - 高速入力の試聴はTone.now()が同じ時刻になりうる。previewNoteの開始時刻を単調増加させ、ensureStarted後も再生中フラグを確認する。音声初期化のawait後はstartedを再確認して二重生成しない。
  - 拡大小節はその小節で鳴る区間だけを出す。小節線をまたぐタイの全体形状は全体譜で見える。
  - 1小節2コードの編集パレットは引き続き最初のコードを使用（既知の制限）。
  - 自動回帰テスト: npm run test:entry（全編集STEPの初期データ、時刻保存、衝突、長音、3連変換、休符、移動を検証）。

- **練習の長さ(4/8小節)**: `fitProgression(prog, bars)` が進行を繰り返して伸ばす(縮めるだけだった旧`progressionSlice`を置換)。
  `resizeGrid`で下書きを捨てずに伸縮、`scaleConditions`で音符数・休符拍の条件を長さに比例させる。
  courses.tsの文章は `{bars}` `{minNotes}` `{minRest}` を埋め込み、StepPracticeの`p()`が**実効値**に差し替える。
  ここを守らないと「説明は4小節・譜面は8小節」のような不一致が起きる(このプロジェクトで最も嫌う種類のバグ)。
  一覧に出るレッスン名・outcomeは長さが決まっていないので、数字を書かない言い回しにしてある。
- **集中モード**(`FocusStage.tsx`): 譜面と再生だけをポータルで全画面表示する。
  「伴奏を流す」で自動的に開き、「譜面全体で練習」から再生前にも開ける。基礎練習にも対応済み。
  テンポ・再生設定は折りたたみ。設定の開閉でカードの高さが変わると譜面も再フィットする。
  **画面を新設せず、STEPのbodyがJSXの出し先を変えるだけ**にしてある(`usePracticePlayback`は1画面1つという決まりを守るため。
  別画面にすると再生フックが2つになり、過去に「音が出ない」バグが出た)。
  譜面に使える高さは開いたあと実測する(`.focus-stage .staff-card`はflexで高さが決まり、中身に影響されないので振動しない)。
- **譜面の拡大・縮小**(StaffView `zoom` / `fitHeight` / `fitMaxZoom`): レイアウトは `幅 ÷ 拡大率` の論理幅で組み、
  最後にSVGのstyleだけ引き伸ばす。VexFlowが付けるviewBoxのおかげで音符も当たり判定も一緒に拡大される。
  `fitHeight`は省略可能。省略時は`staffSizing.ts`が、全画面ではカードの実寸からpaddingを引き、通常表示では画面高から見出しの実寸・paddingを引いて求める。
  その高さに収まる最大の拡大率を探す。**0.6の下限は禁止**(密な12〜16小節・TAB付き・小画面では収まらない)。1小節が横にはみ出さない論理幅も確保する。
  **1未満まで許すのが要点**: 縮小すると論理幅が広がって1行に入る小節が増え、行数が減って全体が収まる。
  これが無いと「小節数が多いと演奏しながら譜面をスクロールする」状態になる(オーナーからの指摘、2026-09-07)。
  `fitMaxZoom`は上限。省略時は通常表示`1`、集中モード`3`。呼び出し元で概算高さをstateに持たず、`StaffView`が実枠を監視する。
  通常表示は`staffBoxHeight(container)`を使う(styles.cssの`.staff-sticky`のmax-heightと対応させること)。全画面のカードは`flex: 1 1 0`で中身に左右されない高さを確定し、ResizeObserverで監視する。画面回転・見出しの折り返し・設定開閉でも再計測する。
  同じ幅・高さでは再描画しないこと(自身のSVGの高さ変更によるResizeObserverの循環を防ぐ)。
- **章まとめ練習**(`chapterWorkout()` + `ChapterWorkoutScreen`): 章の編集STEPから
  「いちばん多い(進行×小節数)」を主役に選び、その上に載る課題だけを集めてチェックリストにする。
  判定は各レッスンの`conditions`を**同じグリッドに**`validateGrid`でかけるだけ(新しい判定ロジックは無い)。
  同時に成立しない組み合わせ(第3章の「1小節目を裏拍/頭から」)は意図的にA/B比較なので、両方を並べて出す。
  UIは`GridComposer`の再利用(`materialOptions`/`barOptions`/`tasks`を渡すと章まとめ用の見た目になる)。
- **1行あたりの小節数**(StaffView): 画面幅で上限(<620px:2 / <860px:4 / それ以上:6)。
  実際の数は**内容の密度で決める**(`maxRequired` = 50 + アイテム数×32 + 臨時記号×12、行頭の音部記号ぶん60pxを引く)。
  **ここに「最低○小節」の下限を入れてはいけない。** VexFlowは幅が足りないとき小節内で詰めるのではなく
  小節の外へはみ出すので、密度を無視して並べると次の小節の音符と重なって印刷される
  (2026-09-06に「1行最低4小節」を入れて8分音符のレッスンで実際に発生。符頭が1〜2px差で二重に見えた)。
  そのうえで最終行が1〜2小節にならないよう、割り切れる/最終行が長い並べ方を選ぶ(8小節=6+2ではなく4+4)。
  検証は「StaffViewを裏で直接renderして`.vf-notehead`のbboxの隙間を測る」のが速い(UIを辿る必要なし)。
  行の判定は**いちばん近いstave**で行うこと(±30pxなどで判定すると、譜表の上に出た音符を隣の行と誤判定する)。
  素材の選択(コードトーン/ガイドトーン/スケール/ブルース)はグリッドの直上に置く(使える音とセットで見せるため)。
- engineはシングルトン。`StartOptions`: bpm/countIn/loop/regionBars/metronome/`clickPattern('all'|'backbeat')`/notes/rhythmOnly/comp/swing/コールバック群。
- スウィング: ウラ拍(x.5)を遅らせる方式。再生とハイライト判定が**同じ**タイミング計算を共有(ズレ防止)。
- アーティキュレーション再生: accent=velocity×1.25 / staccato=gate0.45 / tenuto=gate1.0。
- **チャンネル別音量** `engine.volumes {metronome, backbeat, comp}`: velocityへの乗算方式。localStorage('fc-volumes-v1')に保存、UIはVolumeControls.tsx。カウントインはmetronome音量に追従。
- 再生ボタンは2つ: 「♪ 音を確認」(kind='example' 譜面の音が鳴る)と「▶ 伴奏を流す」(自分で演奏する用)。
  自由練習の「譜面ガイド」チェックで後者が kind='rhythm' になり、音は鳴らさず赤いガイドだけ動く。
  旧「Rhythm Only」ボタンは Start との違いがこれだけだったため、表示設定へ格下げした。
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
5. 「音を確認」=伴奏なし、「コードと一緒に確認」=常に伴奏あり(トグル無関係)、「伴奏を流す」=伴奏+メトロノーム(コード音トグル反映)。
6. メトロノームはON/OFFの1つだけ。鳴る拍は seg で `clickPattern: 'all' | 'backbeat'` を選ぶ(OFF時は無効化)。
   engine は `if (!opts.metronome) return;` なので、クリックだけONという状態は作れない設計にしてある。
   2・4拍クリックは別シンセ(clickBack)だが音量は metronome チャンネルに統一。

## 11. その他の画面・機能

- **マイ楽器 vs 今回の練習設定**: App.tsxで`baseInstrument`(永続)と`session`(一時)を別stateで管理。Homeはbaseのみ表示。「この設定をマイ楽器に保存」で明示保存した時だけbase更新。
- レッスン: 開いた直後は設定確認パネル(setupConfirmed初期値false)。扱うのは楽器・譜面・表示ピッチだけ。
  キーとテンポは練習パネル側(StepPractice)にあるので、確認パネルには置かない(二重表示を避ける)。
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
- 全27レッスンに関わる変更をしたら、「一部だけ確認」ではなく**全レッスン・全STEPを走査**して報告する(オーナーの明示要求)。

## 13. 既知の制限・意図的な未実装

- 録音・振り返り: **作らない**(決定)。
- フレーズの保存・一覧・再利用は実装済み（`state/savedPhrases.ts`、`SavedPhrasesPanel.tsx`）。進行・キー・素材・小節数とGridPhraseをまとめてlocalStorageへ最大50件保存する。
- 行またぎのタイは半タイ表示(完全な弧は未対応)。
- 3連の拍をまたぐholdは不可（拍内のholdは既存描画に対応）(表記の複雑化を回避した意図的制限)。
- 自由練習の「基礎練習」タブは旧来の固定譜例方式のまま(グリッドは「フレーズを作る」タブのみ)。
- iOSアプリ化(Capacitor)・追加チューニング・運指最適化: 将来課題。

## 14. オーナー(開発依頼者)との協働メモ

- やり取りは日本語。大きな設計変更は**先に設計案を提示して承認を得てから**実装する(ChatGPTの叩き台を持ち込むこともある)。
- 質問には選択肢+推奨を添えると意思決定が速い。決定事項は明確に伝えてくれる(例: 録音不要、1小節のみ廃止、進捗リセットOK)。
- バグ報告は再現手順つきで来る。修正後は「何が原因で・何を変えて・どう検証したか」を具体的に報告する。
- 初心者への分かりやすさを最重視。専門用語には補足を。文章が散らばる構成を嫌う。
```

なお、Claude固有のメモリ(~/.claude配下)には引き継がれない補足情報があるが、重要事項はすべて本書とREADMEに集約済み。README=ユーザー向け仕様、本書=開発者/AI向け内部知識、という分担。
