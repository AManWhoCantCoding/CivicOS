from __future__ import annotations

import re
import uuid

import pytest
from playwright.sync_api import expect

from pages import CivicApp


pytestmark = pytest.mark.inspection


def _establishment_and_inspection(app: CivicApp, accounts: dict[str, object]) -> str:
    establishment_id, _ = app.create_establishment(uuid.uuid4().hex[:8])
    return app.schedule_inspection(
        establishment_id, accounts["field_officer"].user_id
    )


def test_establishment_create_edit_and_schedule(
    app: CivicApp, accounts: dict[str, object]
) -> None:
    app.login(accounts["commander"])
    marker = uuid.uuid4().hex[:8]
    establishment_id, original_name = app.create_establishment(marker)
    updated_name = app.edit_establishment(establishment_id, original_name, marker)
    assert updated_name.endswith("/ đã cập nhật")
    inspection_id = app.schedule_inspection(
        establishment_id, accounts["field_officer"].user_id
    )
    app.open_inspection(inspection_id)
    app.inspection_status("scheduled")
    app.wait_for_projection()


def test_inspection_offline_checklist_finding_evidence_completion_and_recurring_schedule(
    app: CivicApp, accounts: dict[str, object]
) -> None:
    app.login(accounts["commander"])
    inspection_id = _establishment_and_inspection(app, accounts)
    app.logout()

    app.login(accounts["field_officer"])
    app.open_inspection(inspection_id)
    offline_status = app.open_offline_status_tab()
    app.page.context.set_offline(True)
    offline_status.expect_offline()
    app.checklist_start()
    app.fill_required_checklist("offline")
    app.checklist_save()
    app.upload_evidence(expect_uploaded=False)
    app.page.context.set_offline(False)
    app.retry_evidence_upload("inspection-evidence.jpg")
    app.page.context.set_offline(True)
    app.record_finding()
    app.checklist_complete()

    if not offline_status.page.is_closed():
        offline_status.page.close()
    app.sync_offline_queue(expected_total=4)
    app.goto(f"/inspections/{inspection_id}")
    app.open_inspection(inspection_id)
    app.inspection_status("completed")
    expect(app.page.get_by_text(re.compile(r"Bằng chứng 1 · xem"))).to_be_visible()
    expect(app.page.get_by_text("pass", exact=True)).to_be_visible()
    app.logout()
    app.login(accounts["commander"])
    app.goto("/inspections/establishments")
    expect(
        app.page.locator("article").filter(
            has_text="Đã lập lịch"
        ).first
    ).to_be_visible()


def test_inspection_recommendation_can_be_approved_and_rejected(
    app: CivicApp, accounts: dict[str, object]
) -> None:
    app.login(accounts["commander"])
    inspection_id = _establishment_and_inspection(app, accounts)
    app.logout()

    app.login(accounts["field_officer"])
    app.open_inspection(inspection_id)
    app.checklist_start()
    app.fill_required_checklist("recommendation")
    app.checklist_save()
    app.record_finding()
    app.submit_recommendation("Tạm đình chỉ", "Cần bổ sung điều kiện an toàn.")
    app.logout()

    app.login(accounts["commander"])
    app.open_inspection(inspection_id)
    app.recommendation_approve()
    expect(app.page.get_by_text("approved", exact=True)).to_be_visible()

    app.logout()
    app.login(accounts["field_officer"])
    app.open_inspection(inspection_id)
    app.submit_recommendation("Theo dõi bổ sung", "Cần kiểm tra lại sau khắc phục.")
    app.logout()

    app.login(accounts["commander"])
    app.open_inspection(inspection_id)
    app.recommendation_reject("Chưa đủ căn cứ để phê duyệt.")
    expect(app.page.get_by_text("rejected", exact=True)).to_be_visible()


def test_stale_offline_inspection_command_is_rejected(
    app: CivicApp, accounts: dict[str, object]
) -> None:
    app.login(accounts["commander"])
    inspection_id = _establishment_and_inspection(app, accounts)
    app.logout()
    app.login(accounts["field_officer"])

    stale_page = app.page.context.new_page()
    stale_app = app.for_page(stale_page)
    stale_app.open_inspection(inspection_id)
    app.open_inspection(inspection_id)
    app.checklist_start()
    app.inspection_status("in_progress")

    stale_page.context.set_offline(True)
    stale_app.checklist_start()
    stale_app.page.context.set_offline(False)
    stale_app.open_offline_status()
    stale_app.wait_for_offline_queue_error("STALE_OFFLINE_COMMAND")
    stale_app.expect_queue_count("Lỗi/từ chối", "1")
    stale_page.close()
