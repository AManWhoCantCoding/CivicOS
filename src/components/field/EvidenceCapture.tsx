'use client';

import { useState } from 'react';

import {
  FeedbackMessage,
  readResponseError,
  useOnlineStatus,
} from './client-state';
import { EvidenceList } from './EvidenceList';

type Coordinates = { latitude: number; longitude: number };

type UploadedEvidence = {
  id: string;
  fileName: string;
  mimeType: string;
};

export function EvidenceCapture({
  resourceType,
  resourceId,
  onUploaded,
  onUploadStateChange,
  disabled = false,
}: {
  resourceType: string;
  resourceId: string;
  onUploaded?: (evidence: UploadedEvidence) => void;
  onUploadStateChange?: (uploading: boolean) => void;
  disabled?: boolean;
}) {
  const online = useOnlineStatus();
  const [file, setFile] = useState<File | null>(null);
  const [coordinates, setCoordinates] = useState<Coordinates | null>(null);
  const [location, setLocation] = useState('Chưa lấy GPS');
  const [uploaded, setUploaded] = useState<UploadedEvidence | null>(null);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [tone, setTone] = useState<'success' | 'error' | 'warning'>('success');

  async function uploadEvidence(
    selectedFile: File,
    selectedCoordinates: Coordinates | null,
  ) {
    if (!resourceId) {
      setUploading(false);
      onUploadStateChange?.(false);
      setTone('error');
      setMessage('Thiếu hồ sơ đích để tải bằng chứng lên.');
      return;
    }
    if (!navigator.onLine) {
      setUploading(false);
      onUploadStateChange?.(false);
      setTone('warning');
      setMessage('Đang ngoại tuyến. Giữ tệp này và thử tải lên khi có mạng.');
      return;
    }

    setUploading(true);
    onUploadStateChange?.(true);
    setMessage(null);
    const form = new FormData();
    form.append('file', selectedFile);
    form.append('resourceType', resourceType);
    form.append('resourceId', resourceId);
    form.append('capturedAt', new Date().toISOString());
    if (selectedCoordinates) {
      form.append('latitude', String(selectedCoordinates.latitude));
      form.append('longitude', String(selectedCoordinates.longitude));
    }

    try {
      const response = await fetch('/api/evidence', {
        method: 'POST',
        body: form,
      });
      if (!response.ok) {
        const error = await readResponseError(
          response,
          'EVIDENCE_UPLOAD_FAILED',
        );
        setTone(
          response.status === 401 || response.status === 403
            ? 'warning'
            : 'error',
        );
        setMessage(
          response.status === 401 || response.status === 403
            ? `Không được phép tải bằng chứng: ${error}`
            : `Không thể tải bằng chứng: ${error}`,
        );
        return;
      }
      const body = (await response.json()) as { evidence?: UploadedEvidence };
      if (!body.evidence?.id) {
        setTone('error');
        setMessage('Máy chủ không trả về mã bằng chứng.');
        return;
      }
      setUploaded(body.evidence);
      setTone('success');
      setMessage(`Đã tải ${body.evidence.fileName} lên máy chủ.`);
      onUploaded?.(body.evidence);
    } catch {
      setTone('error');
      setMessage('Không thể kết nối để tải bằng chứng.');
    } finally {
      setUploading(false);
      onUploadStateChange?.(false);
    }
  }

  function capture(selectedFile: File | undefined) {
    setFile(selectedFile ?? null);
    setCoordinates(null);
    setLocation('Chưa lấy GPS');
    setUploaded(null);
    setMessage(null);
    if (!selectedFile) return;
    if (!online) {
      setTone('warning');
      setMessage('Đã giữ tệp cục bộ. Kết nối mạng để tải bằng chứng lên.');
      return;
    }
    setUploading(true);
    onUploadStateChange?.(true);
    if (!navigator.geolocation) {
      setLocation('Thiết bị không cung cấp GPS');
      void uploadEvidence(selectedFile, null);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        const nextCoordinates = {
          latitude: coords.latitude,
          longitude: coords.longitude,
        };
        setCoordinates(nextCoordinates);
        setLocation(
          `${coords.latitude.toFixed(5)}, ${coords.longitude.toFixed(5)}`,
        );
        void uploadEvidence(selectedFile, nextCoordinates);
      },
      () => {
        setLocation('Chưa lấy được GPS');
        void uploadEvidence(selectedFile, null);
      },
      { enableHighAccuracy: true, timeout: 5000 },
    );
  }

  return (
    <div className="rounded-xl border border-dashed border-slate-700 bg-slate-900/70 p-4 text-sm text-slate-300">
      <label className="block">
        <span className="font-medium text-white">Ảnh bằng chứng</span>
        <span className="mt-1 block text-xs leading-5 text-slate-500">
          Tệp được gửi multipart lên hồ sơ này và giữ thời gian, vị trí nếu có.
        </span>
        <input
          className="mt-4 block w-full text-xs text-slate-400 file:mr-3 file:rounded-md file:border-0 file:bg-cyan-300 file:px-3 file:py-2 file:font-semibold file:text-slate-950"
          type="file"
          accept="image/*"
          capture="environment"
          disabled={disabled || uploading}
          onChange={(event) => capture(event.target.files?.[0])}
          aria-label="Chọn ảnh bằng chứng"
        />
      </label>
      {file ? (
        <p className="mt-3 text-xs text-slate-400">Đã chọn: {file.name}</p>
      ) : null}
      <p className="mt-2 text-xs text-slate-500">GPS: {location}</p>
      <p className="mt-1 text-xs text-slate-500">
        Trạng thái mạng: {online ? 'online' : 'offline'}
      </p>
      {file && !uploaded ? (
        <button
          type="button"
          className="mt-3 rounded-md border border-amber-300/50 px-3 py-2 text-xs text-amber-200 hover:border-amber-200 disabled:opacity-60"
          disabled={disabled || uploading}
          onClick={() => void uploadEvidence(file, coordinates)}
        >
          {online ? 'Tải bằng chứng' : 'Thử tải bằng chứng khi có mạng'}
        </button>
      ) : null}
      {message ? (
        <div className="mt-3">
          <FeedbackMessage message={message} tone={tone} />
        </div>
      ) : null}
      {uploaded ? (
        <EvidenceList evidenceIds={[uploaded.id]} label="Đã tải" />
      ) : null}
    </div>
  );
}
