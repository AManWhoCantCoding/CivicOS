# B1 — Đầu vào: `civicos-unified-web-workspace`

## Yêu cầu người dùng

> Giờ tôi muốn dùng chung appshell của module đất đai cho toàn bộ các module và
> phân hệ khác để chúng ta chỉ có một app duy nhất. Giao diện web của PS-E1-004,
> PS-E1-005, PS-E1-007 sẽ bị bỏ. Hãy rà soát lại tất cả nghiệp vụ và tích hợp
> các modules và phân hệ thành một app thống nhất hiển thị chức năng theo role.
> Đồng thời xem lại phần giao diện mobile đã đồng bộ với web app chưa? Nếu chưa
> thì điều chỉnh cho phù hợp.

## Quyết định làm rõ đã ghi nhận

- **PS-E1-004/005/007:** bỏ khỏi navigation/launcher; giữ route và API hiện tại
  để backward compatibility. Không tự xóa page, endpoint hoặc business module.
- **Unified app:** chỉ hợp nhất web. Mobile giữ native shell và capability
  boundary hiện tại; chỉ audit presentation so với web.
- **Điểm vào sau login:** workspace theo role, dùng role/Assignment hiện có để
  hiển thị chức năng được phép.

## Ghi chú workflow

- Đây là change request mở rộng đáng kể so với `civicos-uiux-alignment`, không
  được tự động áp dụng vào SOW UI-only đã khóa trước đó.
- B1-B4/legal evidence của work item UI alignment được tái sử dụng vì chưa có
  legal/API/data requirement mới được nêu; không replay evidence cũ.
