# Glossary — `ui-auto-demo`

| Thuật ngữ | Định nghĩa | Không đồng nghĩa với |
|---|---|---|
| **Demo Center** | Surface điều khiển một demo run, narrator, progress và lifecycle. | Dashboard nghiệp vụ hoặc permission center. |
| **Demo run** | Một lần chạy manifest với persona, surface, target và ordered steps. | Một database transaction hoặc production workflow. |
| **Demo mode** | Runtime guard cho phép orchestration trong môi trường demo được xác định. | Quyền nghiệp vụ hoặc role mới. |
| **LIVE_DEMO** | Chế độ web được phép thực hiện mutation thật trên `civicos_demo`. | Production live operation. |
| **Persona** | Alias demo được provider ánh xạ tới một User/role/Assignment hiện có. | Role claim do runner tự cấp. |
| **Persona broker** | Local/demo integration giữ credential và thiết lập session qua auth boundary. | Kho password trong client bundle. |
| **Scenario manifest** | Danh sách scene/step có precondition, explanation, expected state và cleanup policy. | Arbitrary script được chạy không kiểm soát. |
| **Scene** | Một flow theo surface/persona/state, ví dụ web Incident hoặc mobile RelatedInfo. | Một database aggregate mới. |
| **Step** | Một thao tác hoặc readiness/assertion có narration và expected result. | Một sleep đơn thuần. |
| **Action adapter** | Lớp chuyển action vocabulary thành user-level interaction của component/native control. | API bypass hoặc DOM mutation. |
| **Settled** | Control/route/state đã đạt điều kiện observable để bước tiếp tục. | Hết 3 giây bất kể UI đã sẵn sàng hay chưa. |
| **Pacing delay** | Khoảng chờ mặc định 3.000ms sau action settled trước action kế tiếp. | Readiness timeout. |
| **Blocked** | Trạng thái không thể tiếp tục vì prerequisite/contract boundary, có safe reason. | Thành công hoặc silent skip. |
| **Live mutation** | Web create/update/approve/reject/close/assign đi qua existing domain flow trên demo target. | Mobile write hoặc direct DB edit. |
| **Demo target** | Database/runtime được xác định chính xác là `civicos_demo`. | Bất kỳ database local nào có tên gần giống. |
| **Cleanup pending** | Run đã dừng/kết thúc nhưng mutation cần operator cleanup/reset. | Cam kết dữ liệu đã sạch. |
| **Native runner** | Điều phối app React Native hiện có qua bridge/device harness. | Một web viewport giả mobile. |
| **Read-only mobile** | Mobile chỉ read/search/tap/deep-link/map theo server scope; write bị chặn. | Web write parity. |
| **Bridge** | Local/demo channel giữa Demo Center/orchestrator và native runner. | Public API production. |
| **Provider readiness** | Trạng thái broker/bridge/worker/map/device đã sẵn sàng hoặc blocked. | Việc runner tự khởi động provider. |
| **Safe evidence** | Metadata run/scene/step/status/duration/reason không chứa secret/PII/raw payload. | Log toàn bộ network response. |