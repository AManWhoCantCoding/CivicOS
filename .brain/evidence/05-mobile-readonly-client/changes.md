# Ticket redo — 05-mobile-readonly-client

Ticket redo lại mobile React Native read-only cho auth/main/map, RelatedInfo và alarm/dispatch/task.
Whitelist lần này chỉ là `mobile/**`, `tests/**` và evidence ticket; không sửa backend, shared contract, env/secrets hay sibling baseline.
AC chính: HTTP backend thật, OU + Assignment + masking ở server, GET-only, state động, MapLibre/OSS và không public citizen/write flow.
Deep-link bắt buộc ưu tiên `incidentId`; chỉ fallback sang RelatedInfo khi không có incidentId, dùng nguyên seam Incident ticket 03/06.
Native scope là Android/JS trên Windows, dùng đúng dependency batch đã được duyệt.

## Redo implementation

- `mobile/**`: rewrite ticket-owned client/package/config/auth/map/RelatedInfo/forces/navigation/components/features theo HTTP backend thật, GET-only, masking/403/offline và UI baseline screen-11/12/13; không import server-only code, không business store/fixture.
- `mobile/src/navigation/deepLinks.ts`, `mobile/src/navigation/AppNavigator.tsx`: reference precedence là `incidentId` → Incident, sau đó `relatedInfo` → RelatedInfo, rồi resource/coordinates → Map; khi đã có Incident thì không truyền HOTSPOT reference làm link active.
- `mobile/src/features/incident/IncidentScreen.tsx`: fetch detail qua `GET /api/incidents/:incidentId` và giữ envelope đã tồn tại; không thêm Incident wire type/contract/test mới và không mở RelatedInfo từ Incident context.
- `mobile/src/features/__tests__/deepLinks.test.ts`: regression cho response có đồng thời `incidentId` + `relatedInfo`, và fallback RelatedInfo khi thiếu `incidentId`.
- `tests/mobile/readonly-http.contract.test.ts`: giữ consumer checks cho map, RelatedInfo và forces thật; không tạo Incident contract/type/test riêng trong ticket 05.

## Deep-link verification handoff

- Tester dùng response ticket 06 có đồng thời `incidentId` và `relatedInfo: HOTSPOT`, tap alarm/dispatch/task, xác nhận route là `Incident` và request detail đúng `/api/incidents/:incidentId`.
- Với response không có `incidentId` nhưng có reference RelatedInfo hợp lệ, xác nhận route là `RelatedInfoDetail` và detail fetch đúng endpoint entity/id; chỉ resource/coordinates thì route Map.

## Files changed this execution

- `mobile/src/navigation/deepLinks.ts`
- `mobile/src/navigation/AppNavigator.tsx`
- `mobile/src/features/incident/IncidentScreen.tsx`
- `mobile/src/features/__tests__/deepLinks.test.ts`
- `tests/mobile/readonly-http.contract.test.ts`
- `Lesson-learned.md`

## Verification boundary

- Không chạy test, lint, typecheck, format, build, emulator, verify, npm, Docker hoặc server; Tester là agent duy nhất kiểm tra.
- Không sửa `src/modules/**/contracts.ts`, `.env*`, ticket/AC, backend/server-only code hoặc file ngoài whitelist.
