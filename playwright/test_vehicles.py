from __future__ import annotations

import uuid

import pytest
from playwright.sync_api import expect

from pages import CivicApp


pytestmark = pytest.mark.vehicle


def test_vehicle_registry_observation_match_confirm_verify_evidence_and_escalate(
    app: CivicApp, accounts: dict[str, object], e2e_database
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
    app.sync_offline_queue(expected_synced=1, expected_total=1)
    offline_status.page.close()
    app.goto("/field/vehicles")
    observation_id = app.vehicle_observation_id_for_plate(plate)
    app.open_vehicle_observation(observation_id)
    app.vehicle_status("match_suggested")
    app.confirm_vehicle_match()
    app.verify_vehicle("Đã xác minh", "Đối chiếu thực địa đạt yêu cầu.", "vehicle-evidence.jpg")
    evidence_links = app.page.locator("a[href^='/api/evidence?evidenceId=']")
    evidence_hrefs = [link.get_attribute("href") for link in evidence_links.all()]
    assert evidence_hrefs
    assert all(href and href.startswith("/api/evidence?evidenceId=") for href in evidence_hrefs)
    assert len(set(evidence_hrefs)) == 1
    evidence_id = evidence_hrefs[0].split("evidenceId=", 1)[1]
    with e2e_database.connect() as connection:
        audit = connection.execute(
            'SELECT "metadata" FROM "AuditEvent" '
            'WHERE "resourceType" = %s AND "resourceId" = %s '
            'AND "operation" = %s ORDER BY "occurredAt" DESC LIMIT 1',
            ("VehicleObservation", observation_id, "evidence.uploaded"),
        ).fetchone()
    assert audit is not None
    assert audit[0]["evidenceId"] == evidence_id
    app.open_vehicle_observation(observation_id)
    app.escalate_vehicle("unit-cap-tren")
    evidence_resource_links = app.page.locator(
        f"a[href='/api/evidence?evidenceId={evidence_id}']"
    )
    for link in evidence_resource_links.all():
        expect(link).to_be_visible()
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
    app.sync_offline_queue(expected_synced=2, expected_total=2)
    offline_status.page.close()

    app.goto("/field/vehicles")
    links = app.page.locator("a[href^='/field/vehicles/']").filter(has_text=plate)
    expect(links).to_have_count(1)


def test_vehicle_two_hour_sla_and_outbox_are_visible_after_controlled_time_advance(
    app: CivicApp, accounts: dict[str, object], e2e_database
) -> None:
    marker = uuid.uuid4().hex[:8]
    plate = f"32E2E{marker[:3].upper()}"
    app.login(accounts["commander"])
    app.create_registry_entry(plate, marker)
    app.logout()
    app.login(accounts["field_officer"])
    app.submit_vehicle_observation(plate, "SLA kiểm tra cuối tuần")
    observation_id = app.vehicle_observation_id_for_plate(plate)
    with e2e_database.connect() as connection:
        sla = connection.execute(
            'SELECT "id", "dueAt" FROM "SlaInstance" '
            'WHERE "resourceType" = %s AND "resourceId" = %s '
            'AND "kind" = %s',
            ("VehicleObservation", observation_id, "vehicle_escalation_2h"),
        ).fetchone()
        assert sla is not None
        assert connection.execute(
            'SELECT "dueAt" > NOW() FROM "SlaInstance" WHERE "id" = %s',
            (sla[0],),
        ).fetchone()[0]
        connection.execute(
            'UPDATE "SlaInstance" SET "dueAt" = NOW() - INTERVAL \'1 second\' WHERE "id" = %s',
            (sla[0],),
        )

    def sla_state() -> tuple[str, int]:
        with e2e_database.connect() as connection:
            status = connection.execute(
                'SELECT "status" FROM "SlaInstance" WHERE "id" = %s', (sla[0],)
            ).fetchone()[0]
            event_count = connection.execute(
                'SELECT COUNT(*) FROM "EventRecord" WHERE "aggregateType" = %s '
                'AND "aggregateId" = %s AND "eventType" = %s',
                ("SlaInstance", sla[0], "SlaOverdue"),
            ).fetchone()[0]
            return status, event_count

    app._poll_value(
        sla_state,
        expected=("overdue", 1),
        describe="vehicle SLA to become overdue with one event",
        timeout_ms=30_000,
    )

    def outbox_status() -> str:
        with e2e_database.connect() as connection:
            return connection.execute(
                'SELECT "status" FROM "OutboxMessage" WHERE "eventId" = '
                '(SELECT "eventId" FROM "EventRecord" WHERE "aggregateType" = %s '
                'AND "aggregateId" = %s AND "eventType" = %s)',
                ("SlaInstance", sla[0], "SlaOverdue"),
            ).fetchone()[0]

    app._poll_value(
        outbox_status,
        expected="processed",
        describe="SLA outbox message to be processed",
        timeout_ms=30_000,
    )


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
