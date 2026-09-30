# Trạng thái workflow — demo-seed-canonical-clean

- Mục tiêu: giữ `civicos` bất biến, chỉ thao tác trên `civicos_demo` và dữ liệu synthetic.
- Target guard, confirmation và evidence namespace là điều kiện fail-closed.
- Canonical rebuild phải deterministic theo fixed clock; verifier kiểm tra counts, keys, derived rows và orphan.
- Các quyết định đầy đủ được chuyển sang `docs/design/demo-seed-complete/`.
