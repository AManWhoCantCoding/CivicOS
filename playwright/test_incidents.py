from __future__ import annotations

import uuid

import pytest

from pages import CivicApp


pytestmark = pytest.mark.incident


def test_incident_full_lifecycle_approves_and_rejects_commands(
    app: CivicApp, accounts: dict[str, object]
) -> None:
    app.login(accounts["commander"])
    incident_id = app.create_incident(f"lifecycle-{uuid.uuid4().hex[:8]}")
    app.incident_status("received")
    app.assign_incident(accounts["field_officer"])

    app.logout()
    app.login(accounts["field_officer"])
    app.open_incident(incident_id)
    app.incident_classify()
    app.incident_start_verification()

    app.open_incident(incident_id)
    app.incident_request_resolution()
    app.logout()
    app.login(accounts["commander"])
    app.open_incident(incident_id)
    app.incident_reject("verifying")

    app.logout()
    app.login(accounts["field_officer"])
    app.open_incident(incident_id)
    app.incident_request_resolution()
    app.logout()
    app.login(accounts["commander"])
    app.open_incident(incident_id)
    app.incident_approve("resolved")

    app.logout()
    app.login(accounts["field_officer"])
    app.open_incident(incident_id)
    app.incident_request_close()
    app.logout()
    app.login(accounts["commander"])
    app.open_incident(incident_id)
    app.incident_reject("resolved")

    app.logout()
    app.login(accounts["field_officer"])
    app.open_incident(incident_id)
    app.incident_request_close()
    app.logout()
    app.login(accounts["commander"])
    app.open_incident(incident_id)
    app.incident_approve("closed")


def test_incident_projection_tracks_the_ui_lifecycle(
    app: CivicApp, accounts: dict[str, object]
) -> None:
    app.login(accounts["commander"])
    incident_id = app.create_incident(f"projection-{uuid.uuid4().hex[:8]}")
    app.assign_incident(accounts["field_officer"])
    app.logout()
    app.login(accounts["field_officer"])
    app.open_incident(incident_id)
    app.incident_classify()
    app.logout()
    app.login(accounts["commander"])
    app.wait_for_projection()
    app.open_incident(incident_id)
    app.incident_status("classified")
    app.page.get_by_text("IncidentClassified", exact=True).wait_for(state="visible")
    assert app.worker_health()["deadLetterCount"] == 0
