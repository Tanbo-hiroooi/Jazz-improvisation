# Jazz Phrase Lab

楽譜は読めるけれどアドリブが苦手な演奏者のための、ジャズ・フレーズ練習Webアプリ。

コード進行 × ガイドトーン × 見本フレーズ × リズム練習で、譜面演奏から即興演奏への橋渡しをします。

## 起動方法

```bash
npm install
npm run dev      # 開発サーバー(http://localhost:5173)
npm run build    # 本番ビルド(dist/ に出力)
npm run preview  # 本番ビルドの確認
```

テスターに共有するときは、`npm run build` の成果物(`dist/`)を Netlify / Vercel / Cloudflare Pages などにデプロイして URL を渡すだけです。

## 主な機能

- **練習メニュー**: ii-V-I / マイナー ii-V-I / ジャズブルース(12小節)/ 循環進行(I-vi-ii-V)/ 逆循環(iii-vi-ii-V)/ 枯葉進行(8小節)/ マイナーブルース(12小節)
- **実践モード(自由進行)**: コード進行(ルート×コードタイプ)と小節数(1〜16)を自由に設定し、コード音+メトロノームをバックに練習。「使える音」タブで各コードのおすすめスケールを五線譜に表示
- **キー変更**: 12キー対応。コード・コードトーン・ガイドトーン・見本フレーズすべて自動移調
- **楽器設定**: Piano(Grand/Treble/Bass)、Guitar、Bass、Trumpet、Trombone、Sax 4種(Soprano/Alto/Tenor/Baritone)、Vocal、Other
- **Concert / Written 切替**: B♭管・E♭管の記譜と実音の違いを表示(例: Concert C の Dm7→G7→Cmaj7 は E♭管で Bm7→E7→Amaj7)
- **五線譜表示**(VexFlow): 見本フレーズ / コードトーン / ガイドトーンをタブ切替。音名(CDE)・ドレミ・度数の補助表示、再生中の音をハイライト
- **見本フレーズ**: Beginner / Guide Tone / Rhythm Focus / Melodic / Advanced の5難易度。BPM・キーに追従
- **リズム練習**: Rhythm Only(音程なしでリズムだけ)、リズム違い、同じリズムで別メロディー
- **ループ**: 進行全体 / 2小節 / 1小節(小節タップで開始位置選択)
- **再生**: Start / Stop / Loop / 4カウントイン / メトロノーム / 簡易コード音(Tone.js)
- **コード情報**: コードトーン・ガイドトーン(3度と7度を強調)・おすすめスケール・度数
- **練習モード**: Guide Tone Line / Chord Tone Phrase / Rhythm Variation / Motif Development / Approach Notes / Call & Response / Free Improvisation(それぞれ練習ポイント付き)
- **練習ログ**: 日付・メニュー・キー・BPM・楽器・モード・メモを localStorage に保存

## アーキテクチャ

将来の iOS 化を見据えて、**ロジック層と表示層を分離**しています。

```
src/
├── theory/          # 音楽理論ロジック(UI非依存・そのまま移植可能)
│   ├── notes.ts         # 音名・移調・♯♭スペリング・ドレミ
│   ├── chords.ts        # コード品質(構成音・ガイドトーン・スケール・度数)
│   ├── progressions.ts  # コード進行(キー非依存の相対表現)
│   ├── instruments.ts   # 楽器ごとの譜表・移調定義
│   ├── phrases.ts       # 見本フレーズ生成エンジン
│   └── modes.ts         # 練習モードと練習ポイント
├── audio/
│   └── engine.ts    # Tone.js 再生エンジン(メトロノーム・カウントイン・ループ・コード音)
├── components/      # React 表示層
│   ├── StaffView.tsx           # VexFlow 五線譜レンダリング
│   ├── ChordProgressionView.tsx
│   ├── ChordInfoPanel.tsx
│   └── PracticeLogPanel.tsx
└── App.tsx          # 状態管理と画面統合
```

### データ設計のポイント

- **コード進行**はキーからの相対値(`rootOffset` + `quality`)で定義 → 12キー対応が自動
- **見本フレーズ**はコードルートからの半音オフセット(`o`)+ 拍(`s`)+ 長さ(`d`)+ ベロシティ(`v`)のリックとして定義し、進行・キー・難易度から実音(MIDIノート)の `NoteEvent { midi, start, duration, velocity, chordIndex }` に展開
- オクターブはボイスリーディング(直前の音に最も近い高さ)で自動調整
- **移調楽器**は「記譜音 = 実音 + writtenShift 半音」の1パラメータで表現。再生は常に実音、表示だけ移調
- 練習ログは `localStorage`(キー: `jazz-phrase-lab-logs-v1`)の JSON

## iOS アプリ化の方針(将来)

ロジック(`theory/`, `audio/`)は TypeScript の純粋モジュールなので、以下のどの経路でも再利用できます。

| 方法 | 作り直し量 | 向いているケース |
|---|---|---|
| **PWA** | ほぼゼロ | まず最速で「ホーム画面に追加」体験を提供したい。App Store 不要。iOS Safari の Web Audio 制約(無音スイッチ・バックグラウンド再生不可)を許容できる場合 |
| **Capacitor**(推奨) | 小(このコードをそのままラップ) | App Store 公開したい。Web 版と同一コードベースを維持しつつ、ネイティブ音声プラグインでレイテンシ改善も可能 |
| **React Native** | 大(UI全書き直し、VexFlow/Tone.js 代替が必要) | 完全ネイティブの操作感・低レイテンシ音声が必須になった場合のみ |

推奨ステップ: Web版でテスター検証 → PWA化(manifest は設置済み、Service Worker 追加のみ)→ 反応が良ければ Capacitor で App Store へ。

### iOS ブラウザでの注意

- 音は最初のタップ(Start等)で `Tone.start()` を呼んで有効化しています(実装済み)
- マナーモード(無音スイッチ)ON だと音が出ないことがあります(画面フッターに注記済み)

## 後回しにした機能(スコープ外)

録音、マイク音程判定、MIDI入力、リズム判定、AI採点、本格バッキング、スタンダード曲、ユーザー定義進行。
