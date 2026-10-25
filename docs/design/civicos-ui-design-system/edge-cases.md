# Case biên presentation: `civicos-ui-design-system`

Tất cả case dưới đây là cách hiển thị hoặc bảo toàn boundary đã có. Chúng
không thêm state machine, API error, permission, route, data status hay UX flow
mới. Nguồn kiểm thử là `.scratch/civicos-ui-design-system/ui/test-scenarios.md`
TS-01–TS-11 và các ticket CUI-001–CUI-004.

| Case đã có trong scope             | Cách migration phải giữ                                                                                                           | Không được suy ra hoặc thực hiện                                                                      |
| ---------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| Loading/skeleton                   | Dùng semantic `info`, copy `Đang tải` và skeleton theo kích thước nội dung đã duyệt; không hiển thị dữ liệu cũ như ready.         | Không thêm trạng thái tải mới, API call mới hoặc timeout policy mới.                                  |
| Empty                              | Giữ empty state và bước tiếp theo đã có trong surface; không dùng màu đơn độc để giải thích empty.                                | Không tự tạo dữ liệu, filter, route hoặc CTA nghiệp vụ mới.                                           |
| Error/conflict                     | Giữ message/mã lỗi an toàn và retry/reload theo contract hiện có; presentation không biến lỗi thành success.                      | Không đổi HTTP status/error code, không retry vô hạn và không che lỗi bằng fallback không được duyệt. |
| Forbidden/masked/out-of-scope      | Hiển thị state an toàn, giữ masking và không xác nhận existence/resource ngoài scope.                                             | Không reveal thêm dữ liệu, không nới permission/Assignment và không thay đổi policy.                  |
| Stale/reload                       | Giữ cảnh báo stale, `updatedAt` và action reload đã có trong prototype; response cũ không được gọi là current.                    | Không tạo freshness field, cache policy hoặc domain state mới.                                        |
| Offline                            | Giữ banner `Đang ngoại tuyến.` và copy no-polygon đã duyệt; không fake success mutation.                                          | Không lưu/render land polygon offline, không dùng public lookup làm projection fallback.              |
| Geometry/provider failure của map  | Giữ geometry-unavailable/provider-error, message an toàn và retry/quay lại theo screen đã duyệt; không render polygon bán hợp lệ. | Không sửa geometry, đổi CRS, thêm provider hoặc mở rộng projection allowlist.                         |
| Simulated/internal data            | Giữ nhãn `internal / simulated` và copy mô phỏng gần surface liên quan.                                                           | Không dùng `official`, `certified` hoặc wording tạo public/legal claim.                               |
| Responsive/focus/touch             | Giữ viewport tham chiếu web `1440 × 900`, mobile `390 × 844`, focus-visible và target tối thiểu `44px`/`44 × 44px`.               | Không tạo breakpoint, control hoặc interaction flow mới ngoài token/prototype.                        |
| Stitch preview không click-through | Dùng 7 resource trong catalog và composite board như visual reference; limitation runtime đã được chấp nhận tại B8.               | Không coi screenshot/HTML là production behavior và không tạo screen resource mới.                    |
| Surface hoặc path ngoài ticket     | Dừng và mở review nếu yêu cầu vượt boundary; ticket scope là giới hạn thực thi.                                                   | Không mở rộng sang source, API, schema, route, config hoặc Stitch resources.                          |

## Boundary dữ liệu và domain

- Các case này không định nghĩa legal rule, retention, permission, Assignment,
  masking policy, API contract, schema/migration, audit storage hoặc state
  machine mới.
- `docs/design/civicos-ui-design-system/data-model.md` §§7–30 là kết luận B9:
  không có tác động data model. `api-contract.md` §§7–26 là nguồn sự thật cho
  compatibility, không bị thay thế bởi bảng trên.
- Khi implementation gặp case chưa có trong các artifact đã duyệt, đó là
  contract gap cần Research/contract owner mở review; không tự bổ sung behavior
  vào feature UI-only.
