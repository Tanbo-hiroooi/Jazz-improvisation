// 練習ログ(localStorage 保存)

import { useState } from 'react';

export interface LogEntry {
  id: string;
  date: string; // ISO
  menu: string;
  key: string;
  bpm: number;
  instrument: string;
  mode: string;
  difficulty: string;
  memo: string;
}

const STORAGE_KEY = 'jazz-phrase-lab-logs-v1';

export function loadLogs(): LogEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as LogEntry[]) : [];
  } catch {
    return [];
  }
}

function saveLogs(logs: LogEntry[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(logs));
}

interface Props {
  currentSettings: Omit<LogEntry, 'id' | 'date' | 'memo'>;
}

export function PracticeLogPanel({ currentSettings }: Props) {
  const [logs, setLogs] = useState<LogEntry[]>(loadLogs);
  const [memo, setMemo] = useState('');

  const addLog = () => {
    const entry: LogEntry = {
      id: `${Date.now()}`,
      date: new Date().toISOString(),
      ...currentSettings,
      memo: memo.trim(),
    };
    const next = [entry, ...logs];
    setLogs(next);
    saveLogs(next);
    setMemo('');
  };

  const removeLog = (id: string) => {
    const next = logs.filter((l) => l.id !== id);
    setLogs(next);
    saveLogs(next);
  };

  return (
    <section className="panel log-panel">
      <h2>練習ログ</h2>
      <div className="log-form">
        <textarea
          value={memo}
          onChange={(e) => setMemo(e.target.value)}
          placeholder="例: G7からCmaj7に行くとき、Eに着地すると安定した。リズムが単調になりやすい。"
          rows={3}
        />
        <div className="log-form-meta">
          <span>
            {currentSettings.menu} / Key {currentSettings.key} / {currentSettings.bpm} BPM / {currentSettings.instrument} / {currentSettings.mode}
          </span>
          <button className="btn primary" onClick={addLog}>今日の練習を記録</button>
        </div>
      </div>
      {logs.length === 0 ? (
        <p className="hint-text">まだ記録がありません。練習したら記録してみましょう。</p>
      ) : (
        <ul className="log-list">
          {logs.map((l) => (
            <li key={l.id} className="log-item">
              <div className="log-item-head">
                <strong>{new Date(l.date).toLocaleDateString('ja-JP', { year: 'numeric', month: 'short', day: 'numeric', weekday: 'short' })}</strong>
                <span className="log-item-meta">{l.menu} / Key {l.key} / {l.bpm} BPM / {l.instrument} / {l.mode} / {l.difficulty}</span>
                <button className="btn tiny danger" onClick={() => removeLog(l.id)} aria-label="削除">×</button>
              </div>
              {l.memo && <p className="log-item-memo">{l.memo}</p>}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
