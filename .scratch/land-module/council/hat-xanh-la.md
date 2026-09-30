# Mũ Xanh Lá — ý tưởng và khả năng mở rộng

## Ý tưởng có thể giữ trong boundary

- Dùng timeline projection từ EventRecord thay vì tạo bảng timeline riêng.
- Tách `NationalLandAdapter` khỏi application service để fixture success/failure có thể thay thế.
- Dùng Geometry repository SQL parameterized cho Polygon và validation PostGIS.
- Dùng EvidenceStorageAdapter hiện có, hash và unique resource/hash để chống upload lặp.
- Public lookup có thể mở rộng read projection sau này, nhưng hiện tại không trả polygon.

## Ý tưởng không đưa vào scope

- Public map, legal-rule versioning, OCR, chữ ký điện tử, kết nối thuế/ngân hàng/công chứng.
- Background sync tự động hoặc retry vô hạn.
- Bảng attachment mới hoặc mobile upload.
