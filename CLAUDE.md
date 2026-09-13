# First Chorus — Claude向け作業引き継ぎ

最終整理: 2026-09-13

## 最初に読むもの

**コードを変更する前に [HANDOFF.md](HANDOFF.md) を必ず通読すること。** 方針、アーキテクチャ、過去の不具合から決まった設計原則、検証手順の正本。AI共通の最低限の指示は [AGENTS.md](AGENTS.md) にもある。

## 現在地

- 公開アプリ: https://tanbo-hiroooi.github.io/Jazz-improvisation/
- ブランチ: `main`（pushでGitHub Pagesへ自動デプロイ）
- アプリ本体の最新公開コミット: `12a0a10 Show one score while editing phrases`
- その直前の関連コミット:
  - `e7f7648 Make phrase entry positions intuitive`
  - `76fabba Replace the phrase grid with step entry`
  - `bf56f8f Keep the whole score visible while practising`
- 作業開始時は必ず `git status --short` と `git log -5 --oneline` で、この記述より新しい変更やユーザーの未コミット差分がないか確認する。

## 直近で完成した変更

フレーズ編集は、従来の分割された黒丸・点のセルを廃止し、譜面を直接触る順番入力になった。

- 音価を選び、音名ボタンで入力。カーソルは入力した長さだけ進む。
- 休符のタップで入力位置を選び、音符のタップで既存音を編集する。
- オレンジの縦線が現在の入力位置。「戻る / 進む」で裏拍・16分・3連位置へ移動する。
- 編集画面に出す譜面は同時に1つだけ。「小節を編集 / 全体を見る」で同じ欄を切り替える。
- 全体譜の小節タップ、編集中小節の選択欄、前後ボタンから小節を移動できる。
- 表示切替や集中モードからの復帰で、入力位置・選択音価・Undo履歴を保持する。
- TABのみを選んでいても、編集する小節には休符を操作できる五線譜を併記する。全体表示と演奏画面は選択した記譜方式を維持する。
- 「譜面全体で練習」では全小節を使用可能な高さへ収め、演奏中の縦スクロールを避ける。

主な実装場所:

- `src/components/GridEditor.tsx`: 表示切替、小節移動、入力カーソル、音価・音名入力
- `src/components/StaffView.tsx`: VexFlow描画、選択可能な休符、オレンジのカーソル、全体フィット
- `src/theory/gridEntry.ts`: 1拍=12tickの順番入力、衝突・音価・3連の純ロジック
- `src/components/GridComposer.tsx`: 自由練習のフレーズ作成
- `src/components/StepPractice.tsx`: レッスン下書きと達成判定
- `src/components/FocusStage.tsx`: 演奏時の全画面譜面
- `src/i18n.ts`: 日英UI文言

## 最新変更の検証実績

- `npx tsc --noEmit`: 成功
- `npm run test:entry`: 1291 assertions、編集可能な30 STEPを網羅
- `npm run build`: 成功（既知のchunk size警告のみ）
- 実ブラウザで全51 STEPを日本語ギター、英語ピアノ大譜表、移調楽器の3条件で走査
- 編集可能な全30 STEPで入力、表示切替、Undoを確認
- モバイル390px、TABのみ、全画面練習からの復帰、横スクロールなし、console error/warn 0を確認

今後の変更でも、影響範囲に応じて同等の確認を行う。全コースに触れる変更なら全51 STEPを走査する。

## 絶対に壊さない契約

1. AIや乱数による見本ソロ・見本フレーズを追加しない。鳴らせるのは表示中の固定譜例とユーザー自身のフレーズだけ。
2. 内部音程はConcert MIDI。移調は表示時のみ。五線譜、TAB、音名、再生音を一致させる。
3. `courses.ts` のSTEP説明、表示譜面、再生内容を一致させる。
4. 編集STEPの達成状態をstateへコピーしない。`StepPractice.tsx` でdraftから毎レンダー導出する。
5. `GridPhrase`の保存形式を保つ。新しい入力UIは既存保存データと互換であること。
6. 再生フックはアクティブな画面・STEPにつき1つ。集中モード用に別の再生画面を作らない。
7. 日本語と英語を同時に更新する。
8. 録音機能は追加しない。これは未着手項目ではなく、オーナーが不要と決定した仕様。

## 現在の既知の制限

- 1小節に2コードある場合、フレーズ編集の音パレットは1つ目のコードを使う。
- 3連の拍境界をまたぐholdは扱わない。
- 行をまたぐタイは左右の半タイで表示する。
- 自由練習の「基礎練習」は固定譜例方式で、グリッド編集は「フレーズを作る」にだけ使う。

## 変更を渡す前の手順

```bash
npx tsc --noEmit
npm run test:entry  # 入力・グリッドに触れた場合
npm run build
```

その後、実ブラウザで対象操作、console error 0、390px幅の横スクロールなしを確認する。コミットメッセージは英語の要約1行と日本語の箇条書き本文。コミット・pushはオーナーの確認後に行う。
