from __future__ import annotations

import uuid

import pytest
from playwright.sync_api import expect

from pages import CivicApp


pytestmark = pytest.mark.identity


def test_login_creates_single_session_and_redirects(app: CivicApp, accounts: dict[str, object]) -> None:
    app.login_with_session_assertion(accounts["commander"])
    expect(app.page.get_by_text("CivicOS / Nghĩa Trụ", exact=True)).to_be_visible()


def test_login_with_wrong_password_stays_on_login(app: CivicApp, accounts: dict[str, object]) -> None:
    app.login_with_wrong_password(accounts["commander"])
    expect(app.page.get_by_role("button", name="Đăng nhập", exact=True)).to_be_visible()


def test_logout_clears_session(app: CivicApp, accounts: dict[str, object]) -> None:
    app.login(accounts["commander"])
    expect(app.page.get_by_text("CivicOS / Nghĩa Trụ", exact=True)).to_be_visible()
    app.logout()
    expect(app.page.get_by_role("button", name="Đăng nhập", exact=True)).to_be_visible()


def test_unassigned_user_is_denied_an_incident(app: CivicApp, accounts: dict[str, object]) -> None:
    app.login(accounts["commander"])
    incident_id = app.create_incident(f"access-{uuid.uuid4().hex[:8]}")
    app.logout()

    app.login(accounts["unassigned_field_officer"])
    app.open_incident(incident_id)
    app.expect_access_denied()


def test_assignment_revocation_removes_access(app: CivicApp, accounts: dict[str, object]) -> None:
    app.login(accounts["commander"])
    incident_id = app.create_incident(f"assignment-{uuid.uuid4().hex[:8]}")
    app.assign_incident(accounts["field_officer"])
    app.logout()

    app.login(accounts["field_officer"])
    app.open_incident(incident_id)
    expect(app.page.get_by_text("Incident", exact=True).first).to_be_visible()
    app.logout()

    app.login(accounts["commander"])
    app.revoke_assignment(incident_id, "Kết thúc nhiệm vụ E2E")
    app.logout()

    app.login(accounts["field_officer"])
    app.open_incident(incident_id)
    app.expect_access_denied()


def test_assignment_rejects_a_cross_organization_user(
    app: CivicApp, accounts: dict[str, object]
) -> None:
    app.login(accounts["commander"])
    incident_id = app.create_incident(f"cross-org-{uuid.uuid4().hex[:8]}")
    app.assign_incident(accounts["cross_org_field_officer"], expect_success=False)
    app.expect_no_assignment(accounts["cross_org_field_officer"].user_id)
    app.open_incident(incident_id)


def test_worker_and_projection_health_are_ready_after_ui_creation(
    app: CivicApp, accounts: dict[str, object]
) -> None:
    app.login(accounts["commander"])
    app.create_incident(f"health-{uuid.uuid4().hex[:8]}")
    app.wait_for_projection()
    health = app.worker_health()
    assert health["deadLetterCount"] == 0
    assert health["projectionStatus"] in {"tracked", "idle"}
