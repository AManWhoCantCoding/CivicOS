'use client';

import { useState } from 'react';

export function EvidenceCapture() {
  const [fileName, setFileName] = useState<string | null>(null);
  const [location, setLocation] = useState<string>('Chưa lấy GPS');
  function capture(file: File | undefined) {
    setFileName(file?.name ?? null);
    if (!file || !navigator.geolocation) {
      setLocation('Thiết bị không cung cấp GPS');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      ({ coords }) =>
        setLocation(
          `${coords.latitude.toFixed(5)}, ${coords.longitude.toFixed(5)}`,
        ),
      () => setLocation('Chưa lấy được GPS'),
      { enableHighAccuracy: true, timeout: 5000 },
    );
  }
  return (
    <label className="block rounded-xl border border-dashed border-slate-700 bg-slate-900/70 p-4 text-sm text-slate-300">
      <span className="font-medium text-white">Ảnh bằng chứng</span>
      <span className="mt-1 block text-xs leading-5 text-slate-500">
        Ảnh sẽ giữ thời gian và vị trí khi gửi lên máy chủ.
      </span>
      <input
        className="mt-4 block w-full text-xs text-slate-400 file:mr-3 file:rounded-md file:border-0 file:bg-cyan-300 file:px-3 file:py-2 file:font-semibold file:text-slate-950"
        type="file"
        accept="image/*"
        capture="environment"
        onChange={(event) => capture(event.target.files?.[0])}
      />
      {fileName ? (
        <span className="mt-3 block text-xs text-emerald-300">
          Đã chọn: {fileName}
        </span>
      ) : null}
      <span className="mt-2 block text-xs text-slate-500">GPS: {location}</span>
    </label>
  );
}
