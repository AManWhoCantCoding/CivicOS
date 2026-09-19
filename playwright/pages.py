from __future__ import annotations

import re
from typing import Any
from urllib.parse import urljoin

from playwright.sync_api import APIResponse, Page, expect


class CivicApp:
    """UI-only business flows plus the two explicitly permitted health operations."""

    def __init__(self, page: Page, base_url: str):
        self.page = page
        self.base_url = base_url.rstrip("/")

    def for_page(self, page: Page) -> "CivicApp":
        return CivicApp(page, self.base_url)

    def url(self, path: str) -> str:
        return urljoin(f"{self.base_url}/", path.lstrip("/"))

    def goto(self, path: str) -> None:
        self.page.goto(self.url(path), wait_until="domcontentloaded")

    def login(self, account: Any) -> None:
        self.goto("/login")
        expect(self.page.get_by_role("heading", name="Vào đúng hồ sơ. Làm đúng nhiệm vụ.")).to_be_visible()
        self.page.get_by_label("Email", exact=True).fill(account.email)
        self.page.get_by_label("Mật khẩu", exact=True).fill(account.password)
        self.page.get_by_role("button", name="Đăng nhập", exact=True).click()
        expect(self.page).to_have_url(re.compile(rf"{re.escape(self.base_url)}/?$"))
        expect(self.page.get_by_text("Trung tâm điều hành", exact=True)).to_be_visible()

    def logout(self) -> None:
        button = self.page.get_by_role(
            "button", name=re.compile(r"^(Đăng xuất|Thoát)$"), exact=True
        )
        link = self.page.get_by_role(
            "link", name=re.compile(r"^(Đăng xuất|Thoát)$"), exact=True
        )
        if button.count() == 0 and link.count() == 0:
            self.goto("/")
        control = button.or_(link).first
        expect(control).to_be_visible()
        control.click()
        expect(self.page).to_have_url(re.compile(r"/login/?$"))

    def create_incident(self, marker: str) -> str:
        self.goto("/intake")
        expect(self.page.get_by_role("heading", name="Ghi nhận tin báo")).to_be_visible()
        self.page.get_by_label("Nội dung tin báo", exact=True).fill(
            f"Incident E2E {marker}: kiểm tra luồng nghiệp vụ qua giao diện."
        )
        self.page.get_by_label("Tên nguồn tin", exact=True).fill(f"Nguồn E2E {marker}")
        self.page.get_by_label("Liên hệ nguồn tin", exact=True).fill("0900000000")
        self.page.get_by_role("button", name="Tạo Incident", exact=True).click()
        expect(self.page).to_have_url(re.compile(r"/incidents/[^/]+$"))
        return self._last_path_segment()

    def open_incident(self, incident_id: str) -> None:
        self.goto(f"/incidents/{incident_id}")
        loaded = self.page.get_by_text("Incident", exact=True).first
        denied = self.page.get_by_role(
            "heading", name="Không có quyền truy cập", exact=True
        )
        expect(loaded.or_(denied).first).to_be_visible()

    def incident_status(self, status: str) -> None:
        expect(self.page.get_by_text(status, exact=True).last).to_be_visible()

    def incident_classify(self) -> None:
        self.page.get_by_role("button", name="Lưu phân loại", exact=True).click()
        expect(self.page.get_by_text("Đã ghi nhận thao tác.", exact=True)).to_be_visible()
        self.page.reload(wait_until="domcontentloaded")
        self.incident_status("classified")

    def incident_start_verification(self) -> None:
        self.page.get_by_label("Ghi chú xác minh", exact=True).fill(
            "Đã kiểm tra thông tin ban đầu qua UI E2E."
        )
        self.page.get_by_role("button", name="Bắt đầu xác minh", exact=True).click()
        expect(self.page.get_by_text("Đã ghi nhận thao tác.", exact=True)).to_be_visible()
        self.page.reload(wait_until="domcontentloaded")
        self.incident_status("verifying")

    def incident_request_resolution(self) -> None:
        self.page.get_by_label("Nội dung kết quả xử lý", exact=True).fill(
            "Đã xử lý theo xác minh ban đầu."
        )
        self.page.get_by_role(
            "button", name="Gửi đề xuất kết quả", exact=True
        ).click()
        expect(self.page.get_by_text("Đã gửi yêu cầu Approval.", exact=True)).to_be_visible()
        expect(self.page.get_by_role("button", name="Phê duyệt", exact=True)).to_be_visible()

    def incident_approve(self, expected_status: str) -> None:
        self.page.get_by_role("button", name="Phê duyệt", exact=True).click()
        self.page.reload(wait_until="domcontentloaded")
        self.incident_status(expected_status)

    def incident_reject(self, expected_status: str) -> None:
        self.page.get_by_label("Lý do Approval", exact=True).fill(
            "Cần bổ sung thông tin trước khi quyết định."
        )
        self.page.get_by_role("button", name="Từ chối", exact=True).click()
        expect(self.page.get_by_text("Đã ghi nhận thao tác.", exact=True)).to_be_visible()
        self.page.reload(wait_until="domcontentloaded")
        self.incident_status(expected_status)

    def incident_request_close(self) -> None:
        self.page.get_by_role(
            "button", name="Gửi yêu cầu đóng Incident", exact=True
        ).click()
        expect(self.page.get_by_text("Đã gửi yêu cầu Approval.", exact=True)).to_be_visible()
        expect(self.page.get_by_role("button", name="Phê duyệt", exact=True)).to_be_visible()

    def assign_incident(self, account: Any, *, expect_success: bool = True) -> None:
        checkbox = self.page.get_by_role(
            "checkbox", name=re.compile(re.escape(account.email))
        )
        expect(checkbox).to_be_visible()
        checkbox.check()
        self.page.get_by_role("button", name="Gửi phân công", exact=True).click()
        if expect_success:
            expect(self.page.get_by_text("Đã gửi phân công.", exact=True)).to_be_visible()
        else:
            expect(
                self.page.get_by_role(
                    "alert", name=re.compile("Không thể phân công Incident")
                )
            ).to_be_visible()

    def revoke_assignment(self, resource_id: str, reason: str) -> None:
        self.goto("/assignments")
        assignment = self.page.locator("li").filter(has_text=resource_id).first
        expect(assignment).to_be_visible()
        assignment.get_by_role(
            "button", name="Thu hồi Assignment", exact=True
        ).click()
        assignment.get_by_label("Lý do thu hồi", exact=True).fill(reason)
        assignment.get_by_role("button", name="Xác nhận thu hồi", exact=True).click()
        expect(self.page.get_by_text("Đã thu hồi Assignment.", exact=True)).to_be_visible()

    def expect_access_denied(self) -> None:
        heading = self.page.get_by_role(
            "heading", name="Không có quyền truy cập", exact=True
        )
        message = self.page.get_by_text(re.compile(r"Không có quyền (xem|truy cập)"))
        expect(heading.or_(message).first).to_be_visible()

    def expect_no_assignment(self, assignee_user_id: str) -> None:
        assignments = self.page.locator('[aria-label="Danh sách Assignment"]')
        expect(assignments.get_by_text(assignee_user_id, exact=True)).not_to_be_visible()

    def create_establishment(self, marker: str) -> tuple[str, str]:
        self.goto("/inspections/establishments")
        name = f"Cơ sở E2E {marker}"
        self.page.get_by_label("Tên cơ sở", exact=True).fill(name)
        self.page.get_by_label("Chủ cơ sở", exact=True).fill(f"Chủ E2E {marker}")
        self.page.get_by_label("Địa chỉ", exact=True).fill(f"Địa chỉ E2E {marker}")
        self.page.get_by_label("Loại hình", exact=True).fill("Karaoke")
        self.page.get_by_label(re.compile(r"^Mã giấy phép")).fill(f"GP-{marker}")
        self.page.get_by_role("button", name="Tạo cơ sở", exact=True).click()
        expect(self.page.get_by_text("Đã tạo cơ sở.", exact=True)).to_be_visible()
        link = self.page.locator(
            'a[href^="/inspections/establishments/"]'
        ).filter(has_text=name).first
        expect(link).to_be_visible()
        href = link.get_attribute("href")
        assert href is not None
        return href.rstrip("/").split("/")[-1], name

    def edit_establishment(self, establishment_id: str, old_name: str, marker: str) -> str:
        self.goto(f"/inspections/establishments/{establishment_id}")
        new_name = f"{old_name} / đã cập nhật"
        name_input = self.page.get_by_label("Tên cơ sở", exact=True)
        expect(name_input).to_have_value(old_name)
        name_input.fill(new_name)
        self.page.get_by_role("button", name="Lưu thay đổi", exact=True).click()
        expect(self.page.get_by_text("Đã cập nhật cơ sở.", exact=True)).to_be_visible()
        expect(self.page.get_by_role("heading", name=new_name, exact=True)).to_be_visible()
        return new_name

    def schedule_inspection(self, establishment_id: str, assignee_id: str) -> str:
        self.goto(f"/inspections/establishments/{establishment_id}")
        self.page.get_by_label("Thời gian kiểm tra", exact=True).fill(
            "2030-01-15T10:00"
        )
        self.page.get_by_label("Chu kỳ", exact=True).select_option("3")
        assignee = self.page.get_by_label(re.compile(r"^Người được giao"))
        try:
            assignee.select_option(value=assignee_id)
        except Exception:
            assignee.fill(assignee_id)
        self.page.get_by_role("button", name="Tạo lịch kiểm tra", exact=True).click()
        expect(self.page.get_by_text("Đã lập lịch kiểm tra.", exact=True)).to_be_visible()
        self.goto("/inspections/establishments")
        link = self.page.locator(
            'a[href^="/inspections/"]:not([href^="/inspections/establishments/"])'
        ).first
        expect(link).to_be_visible()
        href = link.get_attribute("href")
        assert href is not None
        return href.rstrip("/").split("/")[-1]

    def open_inspection(self, inspection_id: str) -> None:
        self.goto(f"/inspections/{inspection_id}")
        expect(self.page.get_by_text("Inspection", exact=True).first).to_be_visible()

    def inspection_status(self, status: str) -> None:
        labels = {
            "scheduled": "Đã lập lịch",
            "in_progress": "Đang kiểm tra",
            "completed": "Đã hoàn tất",
        }
        expect(self.page.get_by_text(labels.get(status, status), exact=True)).to_be_visible()

    def fill_required_checklist(self, marker: str) -> None:
        for label, value in (
            (r"Giấy phép kinh doanh hợp lệ", f"Hồ sơ hợp lệ {marker}"),
            (r"Điều kiện an ninh và kiểm soát ra vào", f"An ninh đạt {marker}"),
        ):
            expect(self.page.get_by_label(re.compile(rf"^{label}")).first).to_be_visible()
            self.page.get_by_label(re.compile(rf"^{label}")).first.fill(value)

    def upload_evidence(
        self,
        filename: str = "inspection-evidence.jpg",
        *,
        expect_uploaded: bool = True,
    ) -> None:
        self._grant_geolocation()
        self.page.get_by_label("Chọn ảnh bằng chứng", exact=True).set_input_files(
            {
                "name": filename,
                "mimeType": "image/jpeg",
                "buffer": b"\xff\xd8\xff\xe0civicos-e2e\xff\xd9",
            }
        )
        expect(self.page.get_by_text(f"Đã chọn: {filename}", exact=True)).to_be_visible()
        if expect_uploaded:
            expect(
                self.page.get_by_text(
                    f"Đã tải {filename} lên máy chủ.", exact=True
                )
            ).to_be_visible()
        else:
            expect(
                self.page.get_by_text(
                    "Đã giữ tệp cục bộ. Kết nối mạng để tải bằng chứng lên.",
                    exact=True,
                )
            ).to_be_visible()

    def retry_evidence_upload(self, filename: str) -> None:
        self.page.get_by_role("button", name="Tải bằng chứng", exact=True).click()
        expect(
            self.page.get_by_text(f"Đã tải {filename} lên máy chủ.", exact=True)
        ).to_be_visible()

    def checklist_start(self) -> None:
        self.page.get_by_role("button", name="Bắt đầu kiểm tra", exact=True).click()
        expect(self.page.get_by_text(re.compile(r"Đã bắt đầu inspection|Đã lưu cục bộ"))).to_be_visible()

    def checklist_save(self) -> None:
        self.page.get_by_role("button", name="Lưu checklist", exact=True).click()
        expect(self.page.get_by_text(re.compile(r"Đã lưu checklist|Đã lưu cục bộ"))).to_be_visible()

    def record_finding(self, description: str = "Phát hiện E2E cần theo dõi.") -> None:
        self.page.get_by_label("Mục checklist", exact=True).select_option("license")
        self.page.get_by_label("Mô tả phát hiện", exact=True).fill(description)
        self.page.get_by_label("Kết quả", exact=True).select_option("needs_action")
        self.page.get_by_role("button", name="Lưu phát hiện", exact=True).click()
        expect(
            self.page.get_by_text(re.compile(r"Đã ghi phát hiện|Đã lưu phát hiện cục bộ"))
        ).to_be_visible()

    def checklist_complete(self) -> None:
        self.page.get_by_label("Kết quả hoàn tất inspection", exact=True).select_option(
            "pass"
        )
        self.page.get_by_role("button", name="Hoàn tất", exact=True).click()
        expect(
            self.page.get_by_text(re.compile(r"Đã hoàn tất inspection|Đã lưu cục bộ"))
        ).to_be_visible()

    def submit_recommendation(self, action: str, reason: str) -> None:
        checkbox = self.page.get_by_role("checkbox", name=re.compile("license")).first
        expect(checkbox).to_be_visible()
        checkbox.check()
        self.page.get_by_label("Hành động đề xuất", exact=True).fill(action)
        self.page.get_by_label("Lý do", exact=True).fill(reason)
        self.page.get_by_role("button", name="Gửi đề xuất", exact=True).click()
        expect(self.page.get_by_text("Đã gửi đề xuất, chờ phê duyệt.", exact=True)).to_be_visible()

    def recommendation_approve(self) -> None:
        self.page.get_by_role("button", name="Duyệt", exact=True).click()
        expect(self.page.get_by_text("Đã duyệt đề xuất.", exact=True)).to_be_visible()
        expect(self.page.get_by_text("approved", exact=True)).to_be_visible()

    def recommendation_reject(self, reason: str) -> None:
        self.page.get_by_label("Lý do từ chối", exact=True).fill(reason)
        self.page.get_by_role("button", name="Từ chối", exact=True).click()
        expect(self.page.get_by_text("Đã từ chối đề xuất.", exact=True)).to_be_visible()
        expect(self.page.get_by_text("rejected", exact=True)).to_be_visible()

    def open_offline_status(self) -> None:
        self.goto("/field/offline")
        expect(self.page.get_by_role("heading", name="Trạng thái thiết bị", exact=True)).to_be_visible()

    def open_offline_status_tab(self) -> "CivicApp":
        status_page = self.page.context.new_page()
        status_app = self.for_page(status_page)
        status_app.open_offline_status()
        return status_app

    def expect_offline(self) -> None:
        expect(self.page.get_by_text("Offline", exact=True)).to_be_visible()
        expect(self.page.get_by_text("Đang ngoại tuyến. Thao tác mới sẽ chờ đồng bộ.", exact=True)).to_be_visible()

    def expect_queue_count(self, label: str, value: str) -> None:
        definition = self.page.get_by_text(label, exact=True).locator("..")
        expect(definition.get_by_text(value, exact=True)).to_be_visible()

    def sync_offline_queue(self, expected_synced: int | None = None) -> None:
        self.page.context.set_offline(False)
        self.open_offline_status()
        expect(self.page.get_by_text("Online", exact=True)).to_be_visible()
        expect.poll(
            lambda: self.page.get_by_text("Chờ gửi", exact=True)
            .locator("..")
            .get_by_text("0", exact=True)
            .count(),
            timeout=15_000,
            intervals=[100, 250, 500, 1_000],
        ).to_be(1)
        if expected_synced is not None:
            self.expect_queue_count("Đã xác nhận", str(expected_synced))
        else:
            expect(self.page.get_by_text("Đã xác nhận", exact=True)).to_be_visible()

    def offline_queue_error(self) -> str | None:
        return self.page.evaluate(
            """
            () => {
              const queue = JSON.parse(localStorage.getItem('civicos:offline-queue') || '[]');
              const item = queue.find((entry) => entry.status === 'rejected' || entry.status === 'failed');
              return item?.error ?? null;
            }
            """
        )

    def submit_vehicle_observation(
        self,
        plate: str,
        description: str,
        latitude: str = "20.96",
        longitude: str = "105.93",
        navigate: bool = True,
    ) -> None:
        if navigate:
            self.goto("/field/vehicles")
        self.page.get_by_label("Biển số", exact=True).fill(plate)
        self.page.get_by_label("Vĩ độ", exact=True).fill(latitude)
        self.page.get_by_label("Kinh độ", exact=True).fill(longitude)
        self.page.get_by_label("Mô tả", exact=True).fill(description)
        self.page.get_by_role("button", name="Ghi nhận phương tiện", exact=True).click()
        expect(
            self.page.get_by_role("status").filter(
                has_text=re.compile(r"Đã (lưu|ghi nhận)|chờ đồng bộ")
            )
        ).to_be_visible()

    def duplicate_last_offline_command(self) -> None:
        self.page.evaluate(
            """
            () => {
              const key = 'civicos:offline-queue';
              const queue = JSON.parse(localStorage.getItem(key) || '[]');
              if (!queue.length) throw new Error('No UI-created offline command to replay');
              queue.push({ ...queue[queue.length - 1] });
              localStorage.setItem(key, JSON.stringify(queue));
            }
            """
        )

    def vehicle_observation_id_for_plate(self, plate: str) -> str:
        link = self.page.locator("a[href^='/field/vehicles/']").filter(has_text=plate).first
        expect(link).to_be_visible()
        href = link.get_attribute("href")
        assert href is not None
        return href.rstrip("/").split("/")[-1]

    def open_vehicle_observation(self, observation_id: str) -> None:
        self.goto(f"/field/vehicles/{observation_id}")
        loaded = self.page.get_by_text("VehicleObservation", exact=True)
        denied = self.page.get_by_text(re.compile(r"Không có quyền xem quan sát"))
        expect(loaded.or_(denied).first).to_be_visible()

    def vehicle_status(self, status: str) -> None:
        labels = {
            "recorded": "Đã ghi nhận",
            "match_suggested": "Chờ xác nhận match",
            "match_confirmed": "Đã xác nhận match",
            "verified": "Đã xác minh",
            "escalated": "Đã chuyển đơn vị",
        }
        expect(self.page.get_by_text(labels.get(status, status), exact=True)).to_be_visible()

    def create_registry_entry(self, plate: str, marker: str) -> None:
        self.goto("/vehicles/registry")
        self.page.get_by_label("Biển số", exact=True).fill(plate)
        self.page.get_by_label("Nguồn", exact=True).fill(f"Nguồn E2E {marker}")
        self.page.get_by_label("Lý do", exact=True).fill(f"Lý do theo dõi {marker}")
        self.page.get_by_label("Có hiệu lực từ", exact=True).fill("2020-01-01T00:00")
        self.page.get_by_label("Hết hạn", exact=False).fill("2030-01-01T00:00")
        self.page.get_by_role("button", name="Thêm registry", exact=True).click()
        expect(self.page.get_by_text("Đã thêm biển số vào registry.", exact=True)).to_be_visible()

    def confirm_vehicle_match(self) -> None:
        self.page.get_by_role("button", name="Xác nhận match", exact=True).click()
        expect(self.page.get_by_text("Đã xác nhận match. Có thể tiếp tục xác minh.", exact=True)).to_be_visible()
        self.vehicle_status("match_confirmed")

    def verify_vehicle(self, result: str, notes: str, evidence_name: str) -> None:
        self._grant_geolocation()
        self.page.get_by_label("Kết quả xác minh", exact=True).fill(result)
        self.page.get_by_label("Ghi chú", exact=True).fill(notes)
        self.page.get_by_label("Chọn ảnh bằng chứng", exact=True).set_input_files(
            {
                "name": evidence_name,
                "mimeType": "image/jpeg",
                "buffer": b"\xff\xd8\xff\xe0civicos-vehicle\xff\xd9",
            }
        )
        expect(self.page.get_by_text(f"Đã chọn: {evidence_name}", exact=True)).to_be_visible()
        expect(self.page.get_by_text(f"Đã tải {evidence_name} lên máy chủ.", exact=True)).to_be_visible()
        self.page.get_by_role("button", name="Lưu xác minh", exact=True).click()
        expect(self.page.get_by_text("Đã ghi nhận xác minh.", exact=True)).to_be_visible()
        self.vehicle_status("verified")

    def escalate_vehicle(self, organization_id: str) -> None:
        field = self.page.get_by_label("OrganizationUnit đích", exact=True)
        if field.evaluate("element => element.tagName") == "SELECT":
            field.select_option(value=organization_id)
        else:
            field.fill(organization_id)
        self.page.get_by_role("button", name="Chuyển đơn vị", exact=True).click()
        expect(self.page.get_by_text("Đã chuyển quan sát tới OrganizationUnit.", exact=True)).to_be_visible()
        self.vehicle_status("escalated")

    def worker_health(self) -> dict[str, Any]:
        response: APIResponse = self.page.context.request.get(
            self.url("/api/health/worker")
        )
        assert response.ok, response.text()
        body = response.json()
        assert isinstance(body, dict)
        return body

    def wait_for_projection(self) -> None:
        expect.poll(
            lambda: self.worker_health().get("pendingCount"),
            timeout=15_000,
            intervals=[100, 250, 500, 1_000],
        ).to_be(0)
        expect.poll(
            lambda: self.worker_health().get("deadLetterCount"),
            timeout=15_000,
            intervals=[100, 250, 500, 1_000],
        ).to_be(0)
        expect.poll(
            lambda: self.worker_health().get("processingCount"),
            timeout=15_000,
            intervals=[100, 250, 500, 1_000],
        ).to_be(0)
        health = self.worker_health()
        assert health.get("projectionStatus") in {"idle", "tracked"}

    def _last_path_segment(self) -> str:
        return self.page.url.rstrip("/").split("/")[-1]

    def _inspection_id_from_page(self) -> str:
        match = re.search(r"/inspections/([^/]+)$", self.page.url.rstrip("/"))
        if match and match.group(1) != "establishments":
            return match.group(1)
        link = self.page.locator(
            'a[href^="/inspections/"]:not([href^="/inspections/establishments/"])'
        ).first
        expect(link).to_be_visible()
        href = link.get_attribute("href")
        assert href is not None
        return href.rstrip("/").split("/")[-1]

    def _grant_geolocation(self) -> None:
        try:
            self.page.context.grant_permissions(["geolocation"], origin=self.base_url)
            self.page.context.set_geolocation(
                {"latitude": 20.96, "longitude": 105.93}
            )
        except Exception:
            pass
