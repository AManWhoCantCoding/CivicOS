# Plan áp dụng workflow

1. Chuẩn hóa issue/spec dưới `.scratch/<feature>/`.
2. Khóa design bằng `check-scope.mjs verify-lock`.
3. Giao plan check trước code.
4. Verify bằng script, ghi digest/tests/evidence.
5. Review traceability và commit theo ticket.

## Không làm

- Không xóa untracked source-of-truth.
- Không sửa AC/design để né verify.
- Không commit khi thiếu identity Git hoặc evidence bắt buộc.
