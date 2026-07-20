// 音量調整パネル(折りたたみ): メトロノーム / 2・4拍クリック / コード音を個別に調整。
// 設定はlocalStorageに保存され、全画面共通。再生中の変更も次の発音からライブ反映される。

import { useState } from 'react';
import { engine, type ChannelVolumes } from '../audio/engine';
import { t as tr, type Lang } from '../i18n';

interface Props {
  lang: Lang;
}

export function VolumeControls({ lang }: Props) {
  const t = (key: Parameters<typeof tr>[1]) => tr(lang, key);
  const [vols, setVols] = useState<ChannelVolumes>(engine.volumes);

  const update = (patch: Partial<ChannelVolumes>) => {
    engine.setVolumes(patch);
    setVols({ ...engine.volumes });
  };

  const row = (key: keyof ChannelVolumes, label: string) => (
    <div className="volume-row">
      <label htmlFor={`vol-${key}`}>{label}: <strong>{Math.round(vols[key] * 100)}%</strong></label>
      <input
        id={`vol-${key}`}
        type="range"
        min={0}
        max={100}
        value={Math.round(vols[key] * 100)}
        onChange={(e) => update({ [key]: Number(e.target.value) / 100 } as Partial<ChannelVolumes>)}
      />
    </div>
  );

  return (
    <details className="volume-panel">
      <summary>🔊 {t('volumeTitle')}</summary>
      <div className="volume-body">
        {row('metronome', t('volMetronome'))}
        {row('backbeat', t('volBackbeat'))}
        {row('comp', t('volComp'))}
      </div>
    </details>
  );
}
