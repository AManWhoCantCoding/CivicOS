from __future__ import annotations

import re
import uuid

import pytest
from playwright.sync_api import expect

from pages import CivicApp


pytestmark = pytest.mark.vehicle


def test_vehicle_registry_observation_match_confirm_verify_evidence_and_escalate(
    app: CivicApp, accounts: dict[str, object]
) -> None:
    marker = uuid.uuid4().hex[:8]
    plate = f"29E2E{marker[:3].upper()}"
    app.login(accounts["commander"])
    app.create_registry_entry(plate, marker)
    app.logout()

    app.login(accounts["field_officer"])
    app.goto("/field/vehicles")
    offline_status = app.open_offline_status_tab()
    app.page.context.set_offline(True)
    offline_status.expect_offline()
    app.submit_vehicle_observation(
        plate, f"Quan sát khớp registry {marker}", navigate=False
    )
    app.sync_offline_queue(expected_synced=1)
    offline_status.page.close()
    app.goto("/field/vehicles")
    observation_id = app.vehicle_observation_id_for_plate(plate)
    app.open_vehicle_observation(observation_id)
    app.vehicle_status("match_suggested")
    app.confirm_vehicle_match()
    app.verify_vehicle("Đã xác minh", "Đối chiếu thực địa đạt yêu cầu.", "vehicle-evidence.jpg")
    app.escalate_vehicle(accounts["cross_org_field_officer"].organization_id)
    expect(app.page.get_by_text(re.compile(r"Bằng chứng 1 · xem"))).to_be_visible()
    app.logout()
    app.login(accounts["commander"])
    app.wait_for_projection()


def test_duplicate_offline_vehicle_command_is_idempotent(
    app: CivicApp, accounts: dict[str, object]
) -> None:
    marker = uuid.uuid4().hex[:8]
    plate = f"30E2E{marker[:3].upper()}"
    app.login(accounts["field_officer"])
    app.goto("/field/vehicles")
    offline_status = app.open_offline_status_tab()
    app.page.context.set_offline(True)
    offline_status.expect_offline()
    app.submit_vehicle_observation(
        plate, f"Quan sát replay {marker}", navigate=False
    )
    app.duplicate_last_offline_command()
    app.sync_offline_queue(expected_synced=2)
    offline_status.page.close()

    app.goto("/field/vehicles")
    links = app.page.locator("a[href^='/field/vehicles/']").filter(has_text=plate)
    expect(links).to_have_count(1)


def test_vehicle_observation_is_denied_to_an_unassigned_role(
    app: CivicApp, accounts: dict[str, object]
) -> None:
    marker = uuid.uuid4().hex[:8]
    plate = f"31E2E{marker[:3].upper()}"
    app.login(accounts["field_officer"])
    app.submit_vehicle_observation(plate, "Quan sát cần bảo vệ")
    observation_id = app.vehicle_observation_id_for_plate(plate)
    app.logout()

    app.login(accounts["unassigned_field_officer"])
    app.open_vehicle_observation(observation_id)
    app.expect_access_denied()
