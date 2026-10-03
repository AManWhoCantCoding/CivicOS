'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

import {
  buildInformationUpdateInput,
  buildMortgageInput,
  buildSplitMergeInput,
  buildTransferInput,
  generateIdempotencyKey,
  isShareTotalValid,
  mapCreateErrorToMessage,
  normalizeShareInput,
} from '@/components/land/application-view';
import {
  createLandApplication,
  fetchParcelList,
  fetchPartyList,
} from '@/components/land/land-api';
import type { ParcelView, PartyView } from '@/components/land/workspace-view';

const DRAFT_KEY = 'lnd09-application-draft';

type ProposedHolder = { partyId: string; sharePercent: string };

function maskedOptionLabel(party: PartyView): string {
  const masked = party.identityNumberMasked ?? 'chưa có số định danh';
  return `${party.referenceCode} · ${masked} (đã che)`;
}

export function ApplicationForm() {
  const router = useRouter();
  const [changeType, setChangeType] = useState('transfer');
  const [parties, setParties] = useState<PartyView[]>([]);
  const [parcels, setParcels] = useState<ParcelView[]>([]);
  const [currentHolderId, setCurrentHolderId] = useState('');
  const [proposedHolders, setProposedHolders] = useState<ProposedHolder[]>([
    { partyId: '', sharePercent: '100.00' },
  ]);
  const [applicantId, setApplicantId] = useState('');
  const [subjectParcelId, setSubjectParcelId] = useState('');
  const [infoField, setInfoField] = useState('address');
  const [infoNewValue, setInfoNewValue] = useState('');
  const [mortgageAction, setMortgageAction] = useState('register');
  const [securedPartyId, setSecuredPartyId] = useState('');
  const [splitOperation, setSplitOperation] = useState('split');
  const [sourceParcelIds, setSourceParcelIds] = useState<string[]>(['']);
  const [resultParcelIds, setResultParcelIds] = useState<string[]>(['']);
  const [idempotencyKey] = useState(() => generateIdempotencyKey());
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [online, setOnline] = useState(true);
  const errorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function sync() {
      setOnline(window.navigator.onLine);
    }
    sync();
    window.addEventListener('online', sync);
    window.addEventListener('offline', sync);
    return () => {
      window.removeEventListener('online', sync);
      window.removeEventListener('offline', sync);
    };
  }, []);

  useEffect(() => {
    void (async () => {
      const [partyResult, parcelResult] = await Promise.all([
        fetchPartyList('?limit=100'),
        fetchParcelList('?limit=100'),
      ]);
      if (partyResult.items.length) setParties(partyResult.items);
      if (parcelResult.items.length) setParcels(parcelResult.items);
    })();
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        const raw = window.sessionStorage.getItem(DRAFT_KEY);
        if (!raw) return;
        const draft = JSON.parse(raw) as Record<string, unknown>;
        if (typeof draft.changeType === 'string')
          setChangeType(draft.changeType);
        if (typeof draft.currentHolderId === 'string')
          setCurrentHolderId(draft.currentHolderId);
        if (Array.isArray(draft.proposedHolders))
          setProposedHolders(draft.proposedHolders as ProposedHolder[]);
        if (typeof draft.applicantId === 'string')
          setApplicantId(draft.applicantId);
        if (typeof draft.subjectParcelId === 'string')
          setSubjectParcelId(draft.subjectParcelId);
        if (typeof draft.infoField === 'string') setInfoField(draft.infoField);
        if (typeof draft.infoNewValue === 'string')
          setInfoNewValue(draft.infoNewValue);
        if (typeof draft.mortgageAction === 'string')
          setMortgageAction(draft.mortgageAction);
        if (typeof draft.securedPartyId === 'string')
          setSecuredPartyId(draft.securedPartyId);
        if (typeof draft.splitOperation === 'string')
          setSplitOperation(draft.splitOperation);
        if (Array.isArray(draft.sourceParcelIds))
          setSourceParcelIds(draft.sourceParcelIds as string[]);
        if (Array.isArray(draft.resultParcelIds))
          setResultParcelIds(draft.resultParcelIds as string[]);
      } catch {
        /* draft đọc best-effort */
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    try {
      window.sessionStorage.setItem(
        DRAFT_KEY,
        JSON.stringify({
          changeType,
          currentHolderId,
          proposedHolders,
          applicantId,
          subjectParcelId,
          infoField,
          infoNewValue,
          mortgageAction,
          securedPartyId,
          splitOperation,
          sourceParcelIds,
          resultParcelIds,
        }),
      );
    } catch {
      /* lưu nháp best-effort */
    }
  }, [
    changeType,
    currentHolderId,
    proposedHolders,
    applicantId,
    subjectParcelId,
    infoField,
    infoNewValue,
    mortgageAction,
    securedPartyId,
    splitOperation,
    sourceParcelIds,
    resultParcelIds,
  ]);

  function validate(): Record<string, string> {
    const errors: Record<string, string> = {};
    if (changeType === 'transfer') {
      if (!currentHolderId) errors.currentHolderId = 'Chọn chủ thể đang giữ.';
      if (!subjectParcelId) errors.subjectParcelId = 'Chọn thửa đất liên quan.';
      if (!proposedHolders.length || proposedHolders.some((h) => !h.partyId))
        errors.proposedHolders = 'Chọn ít nhất một chủ thể nhận.';
      const shares = proposedHolders.map((h) => h.sharePercent);
      if (!isShareTotalValid(shares))
        errors.shareTotal = 'Tổng tỷ lệ phải bằng 100.00.';
      const seen = new Set<string>();
      for (const h of proposedHolders) {
        const key = `${h.partyId} proposed_holder`;
        if (h.partyId && seen.has(key))
          errors.uniqueSelection = 'Mỗi chủ thể chỉ chọn một lần.';
        seen.add(key);
      }
      if (
        currentHolderId &&
        proposedHolders.some((h) => h.partyId === currentHolderId && h.partyId)
      )
        errors.uniqueSelection =
          'Chủ thể đang giữ và nhận không được trùng nhau.';
    }
    if (changeType === 'information_update') {
      if (!applicantId) errors.applicantId = 'Chọn chủ thể nộp hồ sơ.';
      if (!subjectParcelId) errors.subjectParcelId = 'Chọn thửa đất liên quan.';
      if (infoField !== 'address' && infoField !== 'landUseType')
        errors.infoField = 'Chọn trường address hoặc landUseType.';
      if (!infoNewValue.trim()) errors.infoNewValue = 'Nhập giá trị mới.';
    }
    if (changeType === 'mortgage') {
      if (!subjectParcelId) errors.subjectParcelId = 'Chọn thửa đất liên quan.';
      if (mortgageAction !== 'register' && mortgageAction !== 'release')
        errors.mortgageAction = 'Chọn register hoặc release.';
      if (mortgageAction === 'register' && !securedPartyId)
        errors.securedPartyId = 'Chọn bên được bảo đảm cho register.';
    }
    if (changeType === 'parcel_split_merge') {
      if (!applicantId) errors.applicantId = 'Chọn chủ thể nộp hồ sơ.';
      if (splitOperation !== 'split' && splitOperation !== 'merge')
        errors.splitOperation = 'Chọn split hoặc merge.';
      if (sourceParcelIds.some((id) => !id) || !sourceParcelIds.length)
        errors.sourceParcelIds = 'Chọn ít nhất một thửa nguồn.';
      if (resultParcelIds.some((id) => !id) || !resultParcelIds.length)
        errors.resultParcelIds = 'Chọn ít nhất một thửa kết quả.';
      const all = [...sourceParcelIds, ...resultParcelIds];
      if (new Set(all).size !== all.length)
        errors.uniqueSelection = 'Mỗi thửa chỉ chọn một lần.';
    }
    return errors;
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (submitting) return;
    const errors = validate();
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) {
      setFormError('Dữ liệu chưa hợp lệ. Kiểm tra lại trường được đánh dấu.');
      errorRef.current?.focus();
      return;
    }
    setSubmitting(true);
    setFormError(null);
    let payload: {
      changeType: string;
      changePayload: Record<string, unknown>;
      parties: Array<{
        partyId: string;
        partyRole: string;
        sharePercent: string | null;
      }>;
      parcels: Array<{ parcelId: string; parcelRole: string }>;
    };
    if (changeType === 'transfer') {
      payload = buildTransferInput({
        currentHolderPartyId: currentHolderId,
        proposedHolders: proposedHolders.map((h) => ({
          partyId: h.partyId,
          sharePercent: normalizeShareInput(h.sharePercent),
        })),
        subjectParcelId,
      });
    } else if (changeType === 'information_update') {
      payload = buildInformationUpdateInput({
        applicantPartyId: applicantId,
        subjectParcelId,
        field: infoField,
        newValue: infoNewValue.trim(),
      });
    } else if (changeType === 'mortgage') {
      payload = buildMortgageInput({
        action: mortgageAction,
        securedPartyId: mortgageAction === 'register' ? securedPartyId : null,
        applicantPartyId: mortgageAction === 'release' ? applicantId : null,
        subjectParcelId,
      });
    } else {
      payload = buildSplitMergeInput({
        operation: splitOperation,
        applicantPartyId: applicantId,
        sourceParcelIds: sourceParcelIds.filter(Boolean),
        resultParcelIds: resultParcelIds.filter(Boolean),
      });
    }
    // Gửi kèm Idempotency-Key; cùng key được tái dùng khi retry.
    const result = await createLandApplication({
      ...payload,
      idempotencyKey,
    });
    // 201 là tạo mới; 200 là replay cùng key+cùng payload, đều chuyển tới detail.
    if (result.status === 201 || result.status === 200) {
      if (result.application) {
        try {
          window.sessionStorage.removeItem(DRAFT_KEY);
        } catch {
          /* best-effort */
        }
        router.push(`/land/applications/${result.application.id}`);
        return;
      }
    }
    const code = result.error?.code ?? null;
    const status = result.status === 0 ? null : result.status;
    if (code === 'LAND_IDEMPOTENCY_CONFLICT') {
      setFormError(mapCreateErrorToMessage(code, status));
    } else {
      setFormError(mapCreateErrorToMessage(code, status));
    }
    // Giữ nguyên toàn bộ input để retry cùng Idempotency-Key.
    setSubmitting(false);
    errorRef.current?.focus();
  }

  const submitDisabled = submitting || !online;

  return (
    <form
      onSubmit={handleSubmit}
      aria-label="Tạo hồ sơ biến động"
      className="space-y-6"
    >
      {!online ? (
        <p role="status" className="text-sm text-[var(--civicos-info)]">
          Đang ngoại tuyến. Nút gửi tạm tắt; bản nháp được giữ lại trong phiên
          (sessionStorage).
        </p>
      ) : null}
      {formError ? (
        <div
          ref={errorRef}
          tabIndex={-1}
          role="alert"
          className="rounded-xl border border-[var(--civicos-danger)] bg-[var(--civicos-surface)] p-4"
        >
          <p className="text-sm text-[var(--civicos-danger)]">{formError}</p>
          <button
            type="button"
            onClick={() => errorRef.current?.focus()}
            className="mt-3 min-h-[44px] rounded-lg border border-[var(--civicos-danger)] px-3 py-2 text-sm text-[var(--civicos-danger)]"
          >
            Thử lại
          </button>
        </div>
      ) : null}
      <div>
        <label
          htmlFor="lnd-change-type"
          className="flex min-h-[44px] flex-col gap-1 text-sm text-[var(--civicos-text)]"
        >
          Loại biến động
          <select
            id="lnd-change-type"
            value={changeType}
            onChange={(event) => setChangeType(event.target.value)}
            className="min-h-[44px] rounded-lg border border-[var(--civicos-border)] bg-[var(--civicos-surface-muted)] px-3 py-2 text-sm text-[var(--civicos-text)]"
          >
            <option value="transfer">Chuyển nhượng (transfer)</option>
            <option value="information_update">
              Cập nhật thông tin (information_update)
            </option>
            <option value="mortgage">Thế chấp (mortgage)</option>
            <option value="parcel_split_merge">
              Tách/Gộp thửa (parcel_split_merge)
            </option>
          </select>
        </label>
      </div>

      {changeType === 'transfer' ? (
        <section aria-labelledby="lnd-transfer-heading" className="space-y-4">
          <h2
            id="lnd-transfer-heading"
            className="text-xl text-[var(--civicos-text)]"
          >
            Chuyển nhượng
          </h2>
          <label className="flex min-h-[44px] flex-col gap-1 text-sm text-[var(--civicos-text)]">
            Chủ thể đang giữ (current holder)
            <select
              aria-label="Chủ thể đang giữ"
              value={currentHolderId}
              onChange={(event) => setCurrentHolderId(event.target.value)}
              className="min-h-[44px] rounded-lg border border-[var(--civicos-border)] bg-[var(--civicos-surface-muted)] px-3 py-2 text-sm text-[var(--civicos-text)]"
            >
              <option value="">Chọn chủ thể</option>
              {parties.map((party) => (
                <option key={party.id} value={party.id}>
                  {maskedOptionLabel(party)}
                </option>
              ))}
            </select>
          </label>
          {fieldErrors.currentHolderId ? (
            <p role="alert" className="text-sm text-[var(--civicos-danger)]">
              {fieldErrors.currentHolderId}
            </p>
          ) : null}
          {proposedHolders.map((holder, index) => (
            <div key={index} className="flex flex-wrap gap-3">
              <label className="flex min-h-[44px] flex-col gap-1 text-sm text-[var(--civicos-text)]">
                Chủ thể nhận {index + 1} (proposed holder)
                <select
                  aria-label={`Chủ thể nhận ${index + 1}`}
                  value={holder.partyId}
                  onChange={(event) =>
                    setProposedHolders((current) =>
                      current.map((entry, position) =>
                        position === index
                          ? { ...entry, partyId: event.target.value }
                          : entry,
                      ),
                    )
                  }
                  className="min-h-[44px] rounded-lg border border-[var(--civicos-border)] bg-[var(--civicos-surface-muted)] px-3 py-2 text-sm text-[var(--civicos-text)]"
                >
                  <option value="">Chọn chủ thể</option>
                  {parties.map((party) => (
                    <option key={party.id} value={party.id}>
                      {maskedOptionLabel(party)}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex min-h-[44px] flex-col gap-1 text-sm text-[var(--civicos-text)]">
                Tỷ lệ (%)
                <input
                  aria-label={`Tỷ lệ chủ thể nhận ${index + 1}`}
                  value={holder.sharePercent}
                  onChange={(event) =>
                    setProposedHolders((current) =>
                      current.map((entry, position) =>
                        position === index
                          ? { ...entry, sharePercent: event.target.value }
                          : entry,
                      ),
                    )
                  }
                  placeholder="100.00"
                  inputMode="decimal"
                  className="min-h-[44px] rounded-lg border border-[var(--civicos-border)] bg-[var(--civicos-surface-muted)] px-3 py-2 font-mono text-sm text-[var(--civicos-text)]"
                />
              </label>
            </div>
          ))}
          <p className="text-sm text-[var(--civicos-text-muted)]">
            Tổng tỷ lệ phải bằng 100.00. Mã tham chiếu dùng referenceCode, số
            định danh luôn dạng che (identityNumberMasked).
          </p>
          {fieldErrors.shareTotal ? (
            <p role="alert" className="text-sm text-[var(--civicos-danger)]">
              {fieldErrors.shareTotal}
            </p>
          ) : null}
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() =>
                setProposedHolders((current) => [
                  ...current,
                  { partyId: '', sharePercent: '' },
                ])
              }
              className="min-h-[44px] rounded-lg border border-[var(--civicos-border)] px-3 py-2 text-sm text-[var(--civicos-text)]"
            >
              Thêm người nhận
            </button>
          </div>
          <label className="flex min-h-[44px] flex-col gap-1 text-sm text-[var(--civicos-text)]">
            Thửa đất (parcelCode)
            <select
              aria-label="Thửa đất chuyển nhượng"
              value={subjectParcelId}
              onChange={(event) => setSubjectParcelId(event.target.value)}
              className="min-h-[44px] rounded-lg border border-[var(--civicos-border)] bg-[var(--civicos-surface-muted)] px-3 py-2 font-mono text-sm text-[var(--civicos-text)]"
            >
              <option value="">Chọn thửa</option>
              {parcels.map((parcel) => (
                <option key={parcel.id} value={parcel.id}>
                  {parcel.parcelCode}
                </option>
              ))}
            </select>
          </label>
        </section>
      ) : null}

      {changeType === 'information_update' ? (
        <section aria-labelledby="lnd-info-heading" className="space-y-4">
          <h2
            id="lnd-info-heading"
            className="text-xl text-[var(--civicos-text)]"
          >
            Cập nhật thông tin
          </h2>
          <label className="flex min-h-[44px] flex-col gap-1 text-sm text-[var(--civicos-text)]">
            Chủ thể nộp (referenceCode)
            <select
              aria-label="Chủ thể nộp cập nhật"
              value={applicantId}
              onChange={(event) => setApplicantId(event.target.value)}
              className="min-h-[44px] rounded-lg border border-[var(--civicos-border)] bg-[var(--civicos-surface-muted)] px-3 py-2 text-sm text-[var(--civicos-text)]"
            >
              <option value="">Chọn chủ thể</option>
              {parties.map((party) => (
                <option key={party.id} value={party.id}>
                  {maskedOptionLabel(party)}
                </option>
              ))}
            </select>
          </label>
          <label className="flex min-h-[44px] flex-col gap-1 text-sm text-[var(--civicos-text)]">
            Thửa đất (parcelCode)
            <select
              aria-label="Thửa đất cập nhật"
              value={subjectParcelId}
              onChange={(event) => setSubjectParcelId(event.target.value)}
              className="min-h-[44px] rounded-lg border border-[var(--civicos-border)] bg-[var(--civicos-surface-muted)] px-3 py-2 font-mono text-sm text-[var(--civicos-text)]"
            >
              <option value="">Chọn thửa</option>
              {parcels.map((parcel) => (
                <option key={parcel.id} value={parcel.id}>
                  {parcel.parcelCode}
                </option>
              ))}
            </select>
          </label>
          <label className="flex min-h-[44px] flex-col gap-1 text-sm text-[var(--civicos-text)]">
            Trường cập nhật
            <select
              aria-label="Trường cập nhật"
              value={infoField}
              onChange={(event) => setInfoField(event.target.value)}
              className="min-h-[44px] rounded-lg border border-[var(--civicos-border)] bg-[var(--civicos-surface-muted)] px-3 py-2 text-sm text-[var(--civicos-text)]"
            >
              <option value="address">address</option>
              <option value="landUseType">landUseType</option>
            </select>
          </label>
          <label className="flex min-h-[44px] flex-col gap-1 text-sm text-[var(--civicos-text)]">
            Giá trị mới
            <input
              aria-label="Giá trị mới"
              value={infoNewValue}
              onChange={(event) => setInfoNewValue(event.target.value)}
              placeholder="Địa chỉ mới hoặc loại đất mới"
              className="min-h-[44px] rounded-lg border border-[var(--civicos-border)] bg-[var(--civicos-surface-muted)] px-3 py-2 text-sm text-[var(--civicos-text)]"
            />
          </label>
          {fieldErrors.infoNewValue ? (
            <p role="alert" className="text-sm text-[var(--civicos-danger)]">
              {fieldErrors.infoNewValue}
            </p>
          ) : null}
        </section>
      ) : null}

      {changeType === 'mortgage' ? (
        <section aria-labelledby="lnd-mortgage-heading" className="space-y-4">
          <h2
            id="lnd-mortgage-heading"
            className="text-xl text-[var(--civicos-text)]"
          >
            Thế chấp
          </h2>
          <label className="flex min-h-[44px] flex-col gap-1 text-sm text-[var(--civicos-text)]">
            Hành động
            <select
              aria-label="Hành động thế chấp"
              value={mortgageAction}
              onChange={(event) => setMortgageAction(event.target.value)}
              className="min-h-[44px] rounded-lg border border-[var(--civicos-border)] bg-[var(--civicos-surface-muted)] px-3 py-2 text-sm text-[var(--civicos-text)]"
            >
              <option value="register">register</option>
              <option value="release">release</option>
            </select>
          </label>
          <label className="flex min-h-[44px] flex-col gap-1 text-sm text-[var(--civicos-text)]">
            Thửa đất (parcelCode)
            <select
              aria-label="Thửa đất thế chấp"
              value={subjectParcelId}
              onChange={(event) => setSubjectParcelId(event.target.value)}
              className="min-h-[44px] rounded-lg border border-[var(--civicos-border)] bg-[var(--civicos-surface-muted)] px-3 py-2 font-mono text-sm text-[var(--civicos-text)]"
            >
              <option value="">Chọn thửa</option>
              {parcels.map((parcel) => (
                <option key={parcel.id} value={parcel.id}>
                  {parcel.parcelCode}
                </option>
              ))}
            </select>
          </label>
          {mortgageAction === 'register' ? (
            <label className="flex min-h-[44px] flex-col gap-1 text-sm text-[var(--civicos-text)]">
              Bên được bảo đảm (secured party, chỉ cho register)
              <select
                aria-label="Bên được bảo đảm"
                value={securedPartyId}
                onChange={(event) => setSecuredPartyId(event.target.value)}
                className="min-h-[44px] rounded-lg border border-[var(--civicos-border)] bg-[var(--civicos-surface-muted)] px-3 py-2 text-sm text-[var(--civicos-text)]"
              >
                <option value="">Chọn chủ thể</option>
                {parties.map((party) => (
                  <option key={party.id} value={party.id}>
                    {maskedOptionLabel(party)}
                  </option>
                ))}
              </select>
            </label>
          ) : (
            <label className="flex min-h-[44px] flex-col gap-1 text-sm text-[var(--civicos-text)]">
              Chủ thể nộp (release)
              <select
                aria-label="Chủ thể nộp giải tỏa"
                value={applicantId}
                onChange={(event) => setApplicantId(event.target.value)}
                className="min-h-[44px] rounded-lg border border-[var(--civicos-border)] bg-[var(--civicos-surface-muted)] px-3 py-2 text-sm text-[var(--civicos-text)]"
              >
                <option value="">Chọn chủ thể</option>
                {parties.map((party) => (
                  <option key={party.id} value={party.id}>
                    {maskedOptionLabel(party)}
                  </option>
                ))}
              </select>
            </label>
          )}
        </section>
      ) : null}

      {changeType === 'parcel_split_merge' ? (
        <section aria-labelledby="lnd-split-heading" className="space-y-4">
          <h2
            id="lnd-split-heading"
            className="text-xl text-[var(--civicos-text)]"
          >
            Tách/Gộp thửa
          </h2>
          <label className="flex min-h-[44px] flex-col gap-1 text-sm text-[var(--civicos-text)]">
            Chủ thể nộp (referenceCode)
            <select
              aria-label="Chủ thể nộp tách gộp"
              value={applicantId}
              onChange={(event) => setApplicantId(event.target.value)}
              className="min-h-[44px] rounded-lg border border-[var(--civicos-border)] bg-[var(--civicos-surface-muted)] px-3 py-2 text-sm text-[var(--civicos-text)]"
            >
              <option value="">Chọn chủ thể</option>
              {parties.map((party) => (
                <option key={party.id} value={party.id}>
                  {maskedOptionLabel(party)}
                </option>
              ))}
            </select>
          </label>
          <label className="flex min-h-[44px] flex-col gap-1 text-sm text-[var(--civicos-text)]">
            Thao tác
            <select
              aria-label="Thao tác tách gộp"
              value={splitOperation}
              onChange={(event) => setSplitOperation(event.target.value)}
              className="min-h-[44px] rounded-lg border border-[var(--civicos-border)] bg-[var(--civicos-surface-muted)] px-3 py-2 text-sm text-[var(--civicos-text)]"
            >
              <option value="split">split</option>
              <option value="merge">merge</option>
            </select>
          </label>
          <div className="space-y-3">
            <p className="text-sm text-[var(--civicos-text)]">
              Thửa nguồn (source)
            </p>
            {sourceParcelIds.map((parcelId, index) => (
              <label
                key={index}
                className="flex min-h-[44px] flex-col gap-1 text-sm text-[var(--civicos-text)]"
              >
                {`Nguồn ${index + 1} (parcelCode)`}
                <select
                  aria-label={`Thửa nguồn ${index + 1}`}
                  value={parcelId}
                  onChange={(event) =>
                    setSourceParcelIds((current) =>
                      current.map((entry, position) =>
                        position === index ? event.target.value : entry,
                      ),
                    )
                  }
                  className="min-h-[44px] rounded-lg border border-[var(--civicos-border)] bg-[var(--civicos-surface-muted)] px-3 py-2 font-mono text-sm text-[var(--civicos-text)]"
                >
                  <option value="">Chọn thửa</option>
                  {parcels.map((parcel) => (
                    <option key={parcel.id} value={parcel.id}>
                      {parcel.parcelCode}
                    </option>
                  ))}
                </select>
              </label>
            ))}
          </div>
          <div className="space-y-3">
            <p className="text-sm text-[var(--civicos-text)]">
              Thửa kết quả (result)
            </p>
            {resultParcelIds.map((parcelId, index) => (
              <label
                key={index}
                className="flex min-h-[44px] flex-col gap-1 text-sm text-[var(--civicos-text)]"
              >
                {`Kết quả ${index + 1} (parcelCode)`}
                <select
                  aria-label={`Thửa kết quả ${index + 1}`}
                  value={parcelId}
                  onChange={(event) =>
                    setResultParcelIds((current) =>
                      current.map((entry, position) =>
                        position === index ? event.target.value : entry,
                      ),
                    )
                  }
                  className="min-h-[44px] rounded-lg border border-[var(--civicos-border)] bg-[var(--civicos-surface-muted)] px-3 py-2 font-mono text-sm text-[var(--civicos-text)]"
                >
                  <option value="">Chọn thửa</option>
                  {parcels.map((parcel) => (
                    <option key={parcel.id} value={parcel.id}>
                      {parcel.parcelCode}
                    </option>
                  ))}
                </select>
              </label>
            ))}
          </div>
        </section>
      ) : null}

      {fieldErrors.uniqueSelection ? (
        <p role="alert" className="text-sm text-[var(--civicos-danger)]">
          {fieldErrors.uniqueSelection}
        </p>
      ) : null}

      <div className="flex flex-wrap gap-3">
        <button
          type="submit"
          disabled={submitDisabled}
          className={`inline-flex min-h-[44px] items-center rounded-lg px-4 py-2 text-sm font-semibold ${
            submitDisabled
              ? 'cursor-not-allowed bg-[var(--civicos-surface-muted)] text-[var(--civicos-text-muted)]'
              : 'bg-[var(--civicos-accent)] text-[var(--civicos-accent-contrast)] hover:bg-[var(--civicos-accent-hover)]'
          }`}
        >
          {submitting ? 'Đang gửi…' : 'Gửi hồ sơ'}
        </button>
      </div>
      <p className="font-mono text-xs text-[var(--civicos-text-muted)]">
        Idempotency-Key: {idempotencyKey}
      </p>
    </form>
  );
}
