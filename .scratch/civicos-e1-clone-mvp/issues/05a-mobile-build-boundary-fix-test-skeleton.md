# Test skeleton — 05a mobile build boundary fix

- Red test: build boundary phải chạy từ `mobile/`, không kéo file web/server vào bundle.
- Assert: source root, package boundary và generated output đúng contract; failure message chỉ rõ path vi phạm.
- Verify: chạy test skeleton trước implementation, sau đó chạy mobile build checkpoint.
