# Test skeleton — 05b mobile Gradle repository mode fix

- Red test: Gradle dependency resolution phải tôn trọng repository mode đã chốt và không lấy repository ngoài allowlist.
- Assert: settings/plugin repositories thống nhất; build không báo repository mode conflict.
- Verify: chạy test skeleton và Android configuration checkpoint.
