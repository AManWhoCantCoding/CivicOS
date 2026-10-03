'use client';

import {
  type ChangeEvent,
  type FormEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';

import {
  EVIDENCE_MIME_TYPES,
  fetchEvidence,
  isSupportedEvidenceMime,
  MAX_EVIDENCE_SIZE_BYTES,
  postEvidence,
  type EvidenceResourceType,
  type EvidenceView,
} from '@/components/land/land-api';

export type EvidencePanelErrorKind = 'forbidden' | 'error' | 'offline';

export function mapEvidencePanelError(
  status: number,
  code: string | null,
  online: boolean,
): EvidencePanelErrorKind {
  if (!online) return 'offline';
  if (
    status === 401 ||
    status === 403 ||
    code === 'LAND_FORBIDDEN' ||
    code === 'LAND_ASSIGNMENT_REQUIRED'
  ) {
    return 'forbidden';
  }
  return 'error';
}

export function validateEvidenceFile(
  file: Pick<File, 'type' | 'size'> | null,
): string | null {
  if (!file) return 'Hãy chọn một tệp Evidence trước khi tải lên.';
  if (!isSupportedEvidenceMime(file.type)) {
    return 'Định dạng tệp Evidence không được hỗ trợ.';
  }
  if (file.size > MAX_EVIDENCE_SIZE_BYTES) {
    return 'Tệp Evidence vượt quá dung lượng cho phép.';
  }
  return null;
}

export function mapEvidenceUploadError(
  code: string | null,
  status: number | null,
  online: boolean,
): string {
  if (!online) return 'Đang ngoại tuyến. Tải lên Evidence tạm thời bị khóa.';
  if (status === 0 || status === null) {
    return 'Không thể kết nối để tải lên Evidence. Tệp vẫn được giữ để thử lại.';
  }
  if (code === 'LAND_EVIDENCE_TYPE_UNSUPPORTED') {
    return 'Định dạng tệp Evidence không được hỗ trợ.';
  }
  if (code === 'LAND_EVIDENCE_TOO_LARGE') {
    return 'Tệp Evidence vượt quá dung lượng cho phép.';
  }
  if (code === 'LAND_ASSIGNMENT_REQUIRED') {
    return 'Bạn chưa được phân công xử lý trong phạm vi này.';
  }
  if (code === 'LAND_FORBIDDEN' || code === 'LAND_UNAUTHENTICATED') {
    return 'Bạn không có quyền tải lên Evidence trong phạm vi này.';
  }
  return 'Không tải lên được Evidence. Tệp vẫn được giữ để thử lại.';
}

type EvidencePanelProps = {
  resourceType: EvidenceResourceType;
  resourceId: string;
  canList: boolean;
  canUpload?: boolean;
  readOnly?: boolean;
};

function listErrorCopy(kind: EvidencePanelErrorKind): string {
  if (kind === 'offline') {
    return 'Đang ngoại tuyến. Siêu dữ liệu Evidence chưa được tải; hãy thử lại khi có kết nối.';
  }
  if (kind === 'forbidden') {
    return 'Bạn không có quyền xem siêu dữ liệu Evidence trong phạm vi này.';
  }
  return 'Không tải được siêu dữ liệu Evidence. Vui lòng thử lại.';
}

function evidenceResourceLabel(resourceType: EvidenceResourceType): string {
  if (resourceType === 'application') return 'hồ sơ';
  if (resourceType === 'parcel') return 'thửa đất';
  return 'chủ thể';
}

export function EvidencePanel({
  resourceType,
  resourceId,
  canList,
  canUpload = false,
  readOnly = false,
}: EvidencePanelProps) {
  const [evidence, setEvidence] = useState<EvidenceView[]>([]);
  const [loading, setLoading] = useState(canList);
  const [listError, setListError] = useState<EvidencePanelErrorKind | null>(
    canList ? null : 'forbidden',
  );
  const [reloadToken, setReloadToken] = useState(0);
  const [online, setOnline] = useState(true);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [description, setDescription] = useState('');
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function syncOnline() {
      setOnline(window.navigator.onLine);
    }
    syncOnline();
    window.addEventListener('online', syncOnline);
    window.addEventListener('offline', syncOnline);
    return () => {
      window.removeEventListener('online', syncOnline);
      window.removeEventListener('offline', syncOnline);
    };
  }, []);

  const load = useCallback(async () => {
    if (!canList) {
      setEvidence([]);
      setListError('forbidden');
      setLoading(false);
      return;
    }
    setLoading(true);
    const result = await fetchEvidence(resourceType, resourceId);
    if (result.error) {
      const kind = mapEvidencePanelError(
        result.status,
        result.error.code,
        window.navigator.onLine,
      );
      if (kind === 'forbidden') setEvidence([]);
      setListError(kind);
    } else {
      setEvidence(result.evidence);
      setListError(null);
    }
    setLoading(false);
  }, [canList, resourceId, resourceType]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void load();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [load, reloadToken]);

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0] ?? null;
    setSelectedFile(file);
    setUploadError(file ? validateEvidenceFile(file) : null);
  }

  async function submitUpload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canUpload || readOnly) return;
    const file = selectedFile;
    const validationError = validateEvidenceFile(file);
    if (validationError) {
      setUploadError(validationError);
      return;
    }
    if (!file) return;
    if (!online) {
      setUploadError(mapEvidenceUploadError(null, 0, false));
      return;
    }

    setUploading(true);
    setUploadError(null);
    const result = await postEvidence(
      resourceType,
      resourceId,
      file,
      description,
    );
    if (result.error || !result.evidence) {
      setUploadError(
        mapEvidenceUploadError(
          result.error?.code ?? null,
          result.status,
          online,
        ),
      );
      setUploading(false);
      return;
    }

    setSelectedFile(null);
    setDescription('');
    if (fileInputRef.current) fileInputRef.current.value = '';
    await load();
    setUploading(false);
  }

  const headingId = `${resourceType}-evidence-heading`;
  const uploadErrorId = `${resourceType}-evidence-upload-error`;
  const showUpload =
    canList && canUpload && !readOnly && listError !== 'forbidden';

  return (
    <section
      aria-labelledby={headingId}
      className="rounded-xl border border-[var(--civicos-border)] bg-[var(--civicos-surface)] p-4"
    >
      <h3
        id={headingId}
        className="text-xl font-semibold text-[var(--civicos-text)]"
      >
        Evidence (siêu dữ liệu)
      </h3>

      {loading ? (
        <p
          role="status"
          className="mt-2 text-sm text-[var(--civicos-text-muted)]"
        >
          Đang tải siêu dữ liệu Evidence…
        </p>
      ) : null}
      {!loading && listError ? (
        <div className="mt-2 space-y-2">
          <p
            role={listError === 'offline' ? 'status' : 'alert'}
            className="text-sm text-[var(--civicos-text-muted)]"
          >
            {listErrorCopy(listError)}
          </p>
          {listError !== 'forbidden' ? (
            <button
              type="button"
              onClick={() => setReloadToken((value) => value + 1)}
              className="min-h-[44px] rounded-lg border border-[var(--civicos-border)] px-3 py-2 text-sm text-[var(--civicos-text)] hover:border-[var(--civicos-accent)]"
            >
              Thử lại
            </button>
          ) : null}
        </div>
      ) : null}
      {!loading && !listError && !evidence.length ? (
        <p
          role="status"
          className="mt-2 text-sm text-[var(--civicos-text-muted)]"
        >
          Chưa có Evidence nào gắn với {evidenceResourceLabel(resourceType)}
          này.
        </p>
      ) : null}
      {evidence.length && listError !== 'forbidden' ? (
        <table className="mt-3 w-full border-collapse text-sm">
          <caption className="py-2 text-left text-[var(--civicos-text-muted)]">
            Danh sách Evidence; chỉ hiển thị siêu dữ liệu bất biến
          </caption>
          <thead>
            <tr className="text-left text-[var(--civicos-text)]">
              <th
                scope="col"
                className="border-b border-[var(--civicos-border)] px-3 py-2"
              >
                Tên tệp
              </th>
              <th
                scope="col"
                className="border-b border-[var(--civicos-border)] px-3 py-2"
              >
                MIME
              </th>
              <th
                scope="col"
                className="border-b border-[var(--civicos-border)] px-3 py-2"
              >
                Dung lượng
              </th>
              <th
                scope="col"
                className="border-b border-[var(--civicos-border)] px-3 py-2"
              >
                SHA-256
              </th>
              <th
                scope="col"
                className="border-b border-[var(--civicos-border)] px-3 py-2"
              >
                Bất biến
              </th>
              <th
                scope="col"
                className="border-b border-[var(--civicos-border)] px-3 py-2"
              >
                Mô tả
              </th>
              <th
                scope="col"
                className="border-b border-[var(--civicos-border)] px-3 py-2"
              >
                Thời điểm tạo (UTC)
              </th>
            </tr>
          </thead>
          <tbody>
            {evidence.map((item) => (
              <tr
                key={item.id}
                className="border-b border-[var(--civicos-border)]"
              >
                <td className="px-3 py-2 text-[var(--civicos-text)]">
                  {item.fileName}
                </td>
                <td className="px-3 py-2 font-mono text-[var(--civicos-text)]">
                  {item.mimeType}
                </td>
                <td className="px-3 py-2 font-mono text-[var(--civicos-text)]">
                  {item.sizeBytes.toLocaleString('vi-VN')} byte
                </td>
                <td className="px-3 py-2 font-mono text-xs break-all text-[var(--civicos-text)]">
                  {item.originalHash}
                </td>
                <td className="px-3 py-2 text-[var(--civicos-text)]">
                  {item.immutable ? 'Có' : 'Không'}
                </td>
                <td className="px-3 py-2 text-[var(--civicos-text)]">
                  {item.description ?? '—'}
                </td>
                <td className="px-3 py-2 font-mono text-xs text-[var(--civicos-text)]">
                  {item.createdAt}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : null}

      {showUpload ? (
        <form
          className="mt-4 space-y-3 border-t border-[var(--civicos-border)] pt-4"
          onSubmit={(event) => void submitUpload(event)}
        >
          <div>
            <label
              htmlFor={`${resourceType}-evidence-file`}
              className="block text-sm font-semibold text-[var(--civicos-text)]"
            >
              Tệp Evidence
            </label>
            <input
              ref={fileInputRef}
              id={`${resourceType}-evidence-file`}
              name="file"
              type="file"
              accept={EVIDENCE_MIME_TYPES.join(',')}
              onChange={handleFileChange}
              disabled={uploading || !online}
              aria-describedby={uploadError ? uploadErrorId : undefined}
              className="mt-2 min-h-[44px] w-full rounded-lg border border-[var(--civicos-border)] bg-[var(--civicos-surface-muted)] px-3 py-2 text-sm text-[var(--civicos-text)] file:mr-3 file:rounded file:border-0 file:bg-[var(--civicos-surface-muted)] file:px-3 file:py-2 file:text-[var(--civicos-text)] disabled:cursor-not-allowed disabled:opacity-50"
            />
            <p className="mt-2 text-xs text-[var(--civicos-text-muted)]">
              Chỉ nhận PDF, JPEG hoặc PNG; tối đa 10 MiB.
            </p>
            {uploadError ? (
              <p
                id={uploadErrorId}
                role="alert"
                className="mt-2 text-sm text-[var(--civicos-danger)]"
              >
                {uploadError}
              </p>
            ) : null}
            {!online ? (
              <p
                role="status"
                className="mt-2 text-sm text-[var(--civicos-info)]"
              >
                Đang ngoại tuyến. Tải lên Evidence tạm thời bị khóa.
              </p>
            ) : null}
          </div>
          <div>
            <label
              htmlFor={`${resourceType}-evidence-description`}
              className="block text-sm font-semibold text-[var(--civicos-text)]"
            >
              Mô tả (tùy chọn)
            </label>
            <textarea
              id={`${resourceType}-evidence-description`}
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              rows={2}
              disabled={uploading}
              className="mt-2 min-h-[44px] w-full rounded-lg border border-[var(--civicos-border)] bg-[var(--civicos-surface-muted)] px-3 py-2 text-sm text-[var(--civicos-text)] disabled:opacity-50"
            />
          </div>
          <button
            type="submit"
            disabled={uploading || !selectedFile || !online}
            className="min-h-[44px] rounded-lg bg-[var(--civicos-accent)] px-4 py-2 text-sm font-semibold text-[var(--civicos-text)] hover:bg-[var(--civicos-accent-hover)] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {uploading ? 'Đang tải lên…' : 'Tải lên Evidence'}
          </button>
        </form>
      ) : null}
    </section>
  );
}
