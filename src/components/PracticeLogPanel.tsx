// 練習ログ(localStorage 保存)

import { useState } from 'react';
import { t, type Lang } from '../i18n';

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
  lang: Lang;
}

export function PracticeLogPanel({ currentSettings, lang }: Props) {
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
      <h2>{t(lang, 'logTitle')}</h2>
      <div className="log-form">
        <textarea
          value={memo}
          onChange={(e) => setMemo(e.target.value)}
          placeholder={t(lang, 'logPlaceholder')}
          rows={3}
        />
        <div className="log-form-meta">
          <span>
            {currentSettings.menu} / Key {currentSettings.key} / {currentSettings.bpm} BPM / {currentSettings.instrument} / {currentSettings.mode}
          </span>
          <button className="btn primary" onClick={addLog}>{t(lang, 'logSave')}</button>
        </div>
      </div>
      {logs.length === 0 ? (
        <p className="hint-text">{t(lang, 'logEmpty')}</p>
      ) : (
        <ul className="log-list">
          {logs.map((l) => (
            <li key={l.id} className="log-item">
              <div className="log-item-head">
                <strong>{new Date(l.date).toLocaleDateString(lang === 'ja' ? 'ja-JP' : 'en-US', { year: 'numeric', month: 'short', day: 'numeric', weekday: 'short' })}</strong>
                <span className="log-item-meta">{l.menu} / Key {l.key} / {l.bpm} BPM / {l.instrument} / {l.mode} / {l.difficulty}</span>
                <button className="btn tiny danger" onClick={() => removeLog(l.id)} aria-label={t(lang, 'deleteLog')}>×</button>
              </div>
              {l.memo && <p className="log-item-memo">{l.memo}</p>}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
