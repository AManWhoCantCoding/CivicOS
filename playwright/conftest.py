from __future__ import annotations

import hashlib
import json
import os
import signal
import socket
import subprocess
import sys
import time
import uuid
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any, Iterator
from urllib.error import HTTPError, URLError
from urllib.parse import parse_qsl, urlencode, urlsplit, urlunsplit
from urllib.request import Request, urlopen

import pytest


REPO_ROOT = Path(__file__).resolve().parents[1]
PLAYWRIGHT_ROOT = Path(__file__).resolve().parent
if str(PLAYWRIGHT_ROOT) not in sys.path:
    sys.path.insert(0, str(PLAYWRIGHT_ROOT))

try:
    import psycopg
    from psycopg.types.json import Jsonb
except ModuleNotFoundError:  # pragma: no cover - reported during fixture setup
    psycopg = None  # type: ignore[assignment]
    Jsonb = None  # type: ignore[assignment,misc]

from pages import CivicApp


DEFAULT_DATABASE_URL = "postgresql://civicos:civicos@localhost:5432/civicos"
E2E_DATABASE_NAME = "civicos_e2e"
DEFAULT_PASSWORD = "civicos-dev"

# Serialises concurrent `prisma generate` runs (parallel pytest workers or a
# previous e2e server still holding the query-engine DLL on Windows) and
# retries the known transient EPERM/EBUSY rename of
# `query_engine-windows.dll.node.tmp...`. Generation is never skipped when the
# schema changed or the client is missing; a fingerprint stamp only avoids a
# redundant regeneration.
_PRISMA_GENERATE_LOCK_NAME = "prisma-generate.lock"
_PRISMA_GENERATE_STAMP_NAME = ".prisma-generate.stamp"
_PRISMA_GENERATE_RETRIES = 5
_PRISMA_GENERATE_LOCK_TIMEOUT = 300.0


@dataclass(frozen=True)
class TestAccount:
    key: str
    user_id: str
    email: str
    password: str
    name: str
    role: str
    organization_id: str


ACCOUNT_SPECS: tuple[tuple[str, str, str, str, str, str], ...] = (
    (
        "commander",
        "e2e-user-commander",
        "truong@civicos.local",
        "Trưởng Công an xã",
        "commander",
        "unit-nghia-tru",
    ),
    (
        "duty_officer",
        "e2e-user-duty-officer",
        "trucban@civicos.local",
        "Cán bộ trực ban",
        "duty_officer",
        "unit-nghia-tru",
    ),
    (
        "field_officer",
        "e2e-user-field-officer",
        "hientruong@civicos.local",
        "Cán bộ hiện trường",
        "field_officer",
        "unit-nghia-tru",
    ),
    (
        "office_officer",
        "e2e-user-office-officer",
        "vanphong@civicos.local",
        "Cán bộ văn phòng",
        "office_officer",
        "unit-nghia-tru",
    ),
    (
        "unassigned_field_officer",
        "e2e-user-unassigned",
        "khongduocphancong@civicos.local",
        "User không được phân công",
        "field_officer",
        "unit-nghia-tru",
    ),
    (
        "cross_org_field_officer",
        "e2e-user-cross-org",
        "captren@civicos.local",
        "Cán bộ đơn vị cấp trên",
        "superior_officer",
        "unit-cap-tren",
    ),
    (
        "superior_commander",
        "e2e-user-superior-commander",
        "captren-chihuy@civicos.local",
        "Chỉ huy đơn vị cấp trên",
        "superior_commander",
        "unit-cap-tren",
    ),
    (
        "system_operator",
        "e2e-user-system-operator",
        "system-operator@civicos.local",
        "Vận hành hệ thống",
        "system_operator",
        "unit-nghia-tru",
    ),
    (
        "village_officer",
        "e2e-user-village",
        "thon@civicos.local",
        "Cán bộ thôn",
        "village_officer",
        "unit-nghia-tru",
    ),
)

ROLE_NAMES = (
    "commander",
    "duty_officer",
    "field_officer",
    "office_officer",
    "village_officer",
    "superior_officer",
    "superior_commander",
    "system_operator",
)

# Nhan kich ban demo on dinh, khop voi scripts/demo/seed.ts de nguoi trinh
# dien chon dung ho so tren database demo co lap.
DEMO_SCENARIO_LABELS = (
    "[DEMO-INCIDENT-01]",
    "[DEMO] Quan karaoke Sao Dem",
    "43DEMO01",
)

REFERENCE_TABLES = (
    "Assignment",
    "AuditEvent",
    "EventRecord",
    "OutboxMessage",
    "ProjectionCheckpoint",
    "ProjectionRecord",
    "Evidence",
    "SlaInstance",
    "Notification",
    "OfflineCommand",
    "IntakeReport",
    "Incident",
    "Approval",
    "Establishment",
    "Inspection",
    "InspectionFinding",
    "EnforcementRecommendation",
    "SuspiciousVehicleEntry",
    "VehicleObservation",
    "VehicleVerification",
)


def _node_command() -> str:
    return "npm.cmd" if os.name == "nt" else "npm"


def _prisma_schema_fingerprint() -> str:
    schema = REPO_ROOT / "prisma" / "schema.prisma"
    return hashlib.sha256(schema.read_bytes()).hexdigest()


def _prisma_client_ready(fingerprint: str) -> bool:
    client_dir = REPO_ROOT / "node_modules" / ".prisma" / "client"
    stamp_file = REPO_ROOT / "node_modules" / ".prisma" / _PRISMA_GENERATE_STAMP_NAME
    if not client_dir.is_dir():
        return False
    try:
        return stamp_file.read_text(encoding="utf-8").strip() == fingerprint
    except OSError:
        return False


def _pid_is_alive(pid: int) -> bool:
    try:
        os.kill(pid, 0)
    except ProcessLookupError:
        return False
    except PermissionError:
        return True
    return True


def _acquire_generate_lock(lock_path: Path, timeout: float) -> str:
    token = uuid.uuid4().hex
    deadline = time.monotonic() + timeout
    while True:
        try:
            fd = os.open(str(lock_path), os.O_CREAT | os.O_EXCL | os.O_WRONLY)
        except FileExistsError:
            try:
                if time.time() - lock_path.stat().st_mtime > 600:
                    owner = json.loads(lock_path.read_text(encoding="utf-8"))
                    owner_pid = int(owner["pid"])
                    if not _pid_is_alive(owner_pid):
                        lock_path.unlink()
                        continue
            except OSError:
                pass
            except (ValueError, KeyError, TypeError, json.JSONDecodeError):
                pass
            if time.monotonic() >= deadline:
                raise RuntimeError(
                    f"Timed out waiting for Prisma generate lock: {lock_path}"
                )
            time.sleep(0.5)
            continue
        with os.fdopen(fd, "w", encoding="utf-8") as handle:
            json.dump({"pid": os.getpid(), "token": token}, handle)
        return token


def _release_generate_lock(lock_path: Path, token: str) -> None:
    try:
        owner = json.loads(lock_path.read_text(encoding="utf-8"))
        if owner.get("pid") != os.getpid() or owner.get("token") != token:
            return
        lock_path.unlink()
    except (OSError, ValueError, KeyError, TypeError, json.JSONDecodeError):
        pass


def _without_prisma_options(url: str) -> str:
    parts = urlsplit(url)
    query = [(key, value) for key, value in parse_qsl(parts.query) if key != "schema"]
    return urlunsplit(parts._replace(query=urlencode(query)))


def _e2e_database_url() -> str:
    source = os.environ.get("CIVICOS_E2E_DATABASE_URL") or os.environ.get(
        "DATABASE_URL", DEFAULT_DATABASE_URL
    )
    parts = urlsplit(source)
    return urlunsplit(parts._replace(path=f"/{E2E_DATABASE_NAME}"))


def _admin_database_url(database_url: str) -> str:
    return urlunsplit(urlsplit(database_url)._replace(path="/postgres"))


def _password_hash(password: str) -> str:
    # Matches Node's scryptSync(password, salt, 64) defaults used by the local provider.
    salt = os.urandom(16).hex()
    digest = hashlib.scrypt(
        password.encode("utf-8"),
        salt=salt.encode("utf-8"),
        n=2**14,
        r=8,
        p=1,
        dklen=64,
    )
    return f"{salt}.{digest.hex()}"


class E2EDatabase:
    def __init__(self, database_url: str, recreate: bool) -> None:
        self.url = database_url
        self.psycopg_url = _without_prisma_options(database_url)
        self.admin_url = _without_prisma_options(_admin_database_url(database_url))
        self.recreate = recreate
        self.accounts: dict[str, TestAccount] = {}

    def connect(self, url: str | None = None):
        if psycopg is None:
            pytest.fail(
                "psycopg is required for the browser harness; install playwright/pyproject.toml"
            )
        return psycopg.connect(url or self.psycopg_url, connect_timeout=5)

    def wait_for_postgres(self, timeout: float) -> None:
        deadline = time.monotonic() + timeout
        last_error: Exception | None = None
        while time.monotonic() < deadline:
            try:
                with self.connect(self.admin_url):
                    return
            except Exception as error:  # pragma: no cover - depends on local PostgreSQL
                last_error = error
                time.sleep(0.25)
        raise RuntimeError(f"PostgreSQL was not ready: {last_error}")

    def _database_exists(self) -> bool:
        with self.connect(self.admin_url) as connection:
            row = connection.execute(
                "SELECT 1 FROM pg_database WHERE datname = %s",
                (E2E_DATABASE_NAME,),
            ).fetchone()
        return row is not None

    def _drop_database(self) -> None:
        if not self._database_exists():
            return
        with self.connect(self.admin_url,) as connection:
            connection.autocommit = True
            connection.execute(
                "SELECT pg_terminate_backend(pid) "
                "FROM pg_stat_activity "
                "WHERE datname = %s AND pid <> pg_backend_pid()",
                (E2E_DATABASE_NAME,),
            )
            connection.execute(f'DROP DATABASE "{E2E_DATABASE_NAME}"')

    def _create_database(self) -> None:
        if self._database_exists():
            return
        with self.connect(self.admin_url) as connection:
            connection.autocommit = True
            connection.execute(f'CREATE DATABASE "{E2E_DATABASE_NAME}"')

    def _node_environment(self) -> dict[str, str]:
        environment = os.environ.copy()
        environment.update(
            {
                "DATABASE_URL": self.url,
                "NODE_ENV": "development",
                "SESSION_SECRET": "civicos-e2e-session-secret",
                "EVENT_WORKER_INTERVAL_MS": os.environ.get(
                    "CIVICOS_E2E_WORKER_INTERVAL_MS", "100"
                ),
                "EVENT_MAX_ATTEMPTS": "5",
            }
        )
        return environment

    def _run_node_command(self, command: list[str]) -> None:
        result = subprocess.run(
            command,
            cwd=REPO_ROOT,
            env=self._node_environment(),
            text=True,
            capture_output=True,
            check=False,
        )
        if result.returncode:
            output = "\n".join(
                part.strip() for part in (result.stdout, result.stderr) if part.strip()
            )
            raise RuntimeError(
                f"Command failed ({result.returncode}): {' '.join(command)}\n{output}"
            )

    def _run_prisma_generate(self) -> None:
        npm = _node_command()
        fingerprint = _prisma_schema_fingerprint()
        if _prisma_client_ready(fingerprint):
            return
        prisma_dir = REPO_ROOT / "node_modules" / ".prisma"
        prisma_dir.mkdir(parents=True, exist_ok=True)
        lock_path = prisma_dir / _PRISMA_GENERATE_LOCK_NAME
        lock_token = _acquire_generate_lock(lock_path, _PRISMA_GENERATE_LOCK_TIMEOUT)
        try:
            if _prisma_client_ready(fingerprint):
                return
            last_error: RuntimeError | None = None
            for attempt in range(1, _PRISMA_GENERATE_RETRIES + 1):
                try:
                    self._run_node_command([npm, "run", "prisma:generate"])
                except RuntimeError as error:
                    last_error = error
                    transient = "EPERM" in str(error) or "EBUSY" in str(error)
                    if not transient or attempt == _PRISMA_GENERATE_RETRIES:
                        raise
                    time.sleep(min(2**attempt, 15))
                    continue
                last_error = None
                break
            if last_error is not None:
                raise last_error
            stamp_file = prisma_dir / _PRISMA_GENERATE_STAMP_NAME
            try:
                stamp_file.write_text(fingerprint, encoding="utf-8")
            except OSError:
                pass
        finally:
            _release_generate_lock(lock_path, lock_token)

    def migrate(self) -> None:
        self._run_prisma_generate()
        self._run_node_command([_node_command(), "run", "prisma:migrate:deploy"])

    def prepare(self, timeout: float) -> None:
        self.wait_for_postgres(timeout)
        if self.recreate:
            self._drop_database()
        self._create_database()
        self.migrate()
        self.seed_reference_data()

    def seed_reference_data(self) -> None:
        now = time.strftime("%Y-%m-%dT%H:%M:%S+00:00", time.gmtime())
        with self.connect() as connection:
            role_ids: dict[str, str] = {}
            for role_name in ROLE_NAMES:
                row = connection.execute(
                    "INSERT INTO \"Role\" (\"id\", \"name\", \"description\") "
                    "VALUES (%s, %s, %s) "
                    "ON CONFLICT (\"name\") DO UPDATE SET \"description\" = EXCLUDED.\"description\" "
                    "RETURNING \"id\"",
                    (
                        f"e2e-role-{role_name}",
                        role_name,
                        f"E2E role: {role_name}",
                    ),
                ).fetchone()
                assert row is not None
                role_ids[role_name] = row[0]

            for unit_id, name, level, parent_id in (
                ("unit-cap-tren", "Đơn vị cấp trên", "district", None),
                ("unit-nghia-tru", "Công an xã Nghĩa Trụ", "commune", "unit-cap-tren"),
            ):
                connection.execute(
                    "INSERT INTO \"OrganizationUnit\" "
                    "(\"id\", \"name\", \"level\", \"parentId\", \"active\", \"createdAt\", \"updatedAt\") "
                    "VALUES (%s, %s, %s, %s, TRUE, %s, %s) "
                    "ON CONFLICT (\"id\") DO UPDATE SET \"name\" = EXCLUDED.\"name\", "
                    "\"level\" = EXCLUDED.\"level\", \"parentId\" = EXCLUDED.\"parentId\", "
                    "\"active\" = TRUE, \"updatedAt\" = EXCLUDED.\"updatedAt\"",
                    (unit_id, name, level, parent_id, now, now),
                )

            for key, user_id, email, name, role_name, organization_id in ACCOUNT_SPECS:
                row = connection.execute(
                    "INSERT INTO \"User\" "
                    "(\"id\", \"email\", \"name\", \"passwordHash\", \"organizationUnitId\", \"active\", \"createdAt\", \"updatedAt\") "
                    "VALUES (%s, %s, %s, %s, %s, TRUE, %s, %s) "
                    "ON CONFLICT (\"email\") DO UPDATE SET \"name\" = EXCLUDED.\"name\", "
                    "\"passwordHash\" = EXCLUDED.\"passwordHash\", "
                    "\"organizationUnitId\" = EXCLUDED.\"organizationUnitId\", \"active\" = TRUE, "
                    "\"updatedAt\" = EXCLUDED.\"updatedAt\" RETURNING \"id\"",
                    (
                        user_id,
                        email,
                        name,
                        _password_hash(DEFAULT_PASSWORD),
                        organization_id,
                        now,
                        now,
                    ),
                ).fetchone()
                assert row is not None
                actual_user_id = row[0]
                connection.execute(
                    'DELETE FROM "UserRole" WHERE "userId" = %s',
                    (actual_user_id,),
                )
                connection.execute(
                    'INSERT INTO "UserRole" ("userId", "roleId") VALUES (%s, %s)',
                    (actual_user_id, role_ids[role_name]),
                )
                self.accounts[key] = TestAccount(
                    key=key,
                    user_id=actual_user_id,
                    email=email,
                    password=DEFAULT_PASSWORD,
                    name=name,
                    role=role_name,
                    organization_id=organization_id,
                )

            templates = (
                (
                    "e2e-template-karaoke-v1",
                    "Karaoke",
                    [
                        {
                            "key": "license",
                            "label": "Giấy phép kinh doanh hợp lệ",
                            "required": True,
                        },
                        {
                            "key": "security",
                            "label": "Điều kiện an ninh và kiểm soát ra vào",
                            "required": True,
                        },
                        {
                            "key": "safety",
                            "label": "Điều kiện phòng cháy và an toàn",
                            "required": False,
                        },
                    ],
                ),
                (
                    "e2e-template-nha-nghi-v1",
                    "Nhà nghỉ",
                    [
                        {
                            "key": "license",
                            "label": "Giấy phép lưu trú hợp lệ",
                            "required": True,
                        },
                        {
                            "key": "security",
                            "label": "Sổ theo dõi khách lưu trú và điều kiện an ninh",
                            "required": True,
                        },
                    ],
                ),
            )
            for template_id, establishment_type, items in templates:
                connection.execute(
                    "INSERT INTO \"ChecklistTemplate\" "
                    "(\"id\", \"establishmentType\", \"version\", \"title\", \"items\", \"active\", \"createdAt\") "
                    "VALUES (%s, %s, 1, %s, %s, TRUE, %s) "
                    "ON CONFLICT (\"establishmentType\", \"version\") DO UPDATE SET "
                    "\"title\" = EXCLUDED.\"title\", \"items\" = EXCLUDED.\"items\", \"active\" = TRUE",
                    (
                        template_id,
                        establishment_type,
                        f"Checklist {establishment_type}",
                        Jsonb(items),
                        now,
                    ),
                )

    def reset_business_data(self) -> None:
        table_list = ", ".join(f'"{table}"' for table in REFERENCE_TABLES)
        with self.connect() as connection:
            connection.execute(f"TRUNCATE TABLE {table_list} RESTART IDENTITY CASCADE")
            connection.execute(
                'DELETE FROM "Session" WHERE "id" <> %s',
                ("e2e-health-session",),
            )

    def create_health_session(self) -> str:
        token = os.urandom(32).hex()
        now = datetime.now(timezone.utc)
        token_hash = hashlib.sha256(token.encode("utf-8")).hexdigest()
        with self.connect() as connection:
            connection.execute(
                'INSERT INTO "Session" '
                '("id", "userId", "tokenHash", "expiresAt", "createdAt") '
                "VALUES ('e2e-health-session', %s, %s, %s, %s) "
                'ON CONFLICT ("id") DO UPDATE SET "userId" = EXCLUDED."userId", '
                '"tokenHash" = EXCLUDED."tokenHash", "expiresAt" = EXCLUDED."expiresAt"',
                (
                    self.accounts["commander"].user_id,
                    token_hash,
                    now + timedelta(hours=1),
                    now,
                ),
            )
        return token

    def drop(self) -> None:
        if self._database_exists():
            self._drop_database()


def _safe_name(value: str) -> str:
    return "".join(character if character.isalnum() else "_" for character in value)[-120:]


def _select_available_loopback_port(requested_port: int) -> int:
    try:
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as probe:
            probe.bind(("127.0.0.1", requested_port))
            return requested_port
    except OSError:
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as probe:
            probe.bind(("127.0.0.1", 0))
            return int(probe.getsockname()[1])


def _terminate(process: subprocess.Popen[str] | None) -> None:
    """Stop a service process and its children on either Windows or POSIX."""
    if process is None or process.poll() is not None:
        return
    if os.name != "nt":
        try:
            os.killpg(os.getpgid(process.pid), signal.SIGTERM)
            process.wait(timeout=10)
            return
        except (OSError, ProcessLookupError, subprocess.TimeoutExpired):
            pass
        try:
            os.killpg(os.getpgid(process.pid), signal.SIGKILL)
            process.wait(timeout=5)
        except (OSError, ProcessLookupError, subprocess.TimeoutExpired):
            pass
        return
    try:
        subprocess.run(
            ["cmd.exe", "/d", "/s", "/c", f"taskkill /PID {process.pid} /T /F"],
            capture_output=True,
            check=False,
            timeout=30,
        )
        process.wait(timeout=10)
    except (OSError, subprocess.TimeoutExpired):
        try:
            process.kill()
            process.wait(timeout=5)
        except (ProcessLookupError, subprocess.TimeoutExpired):
            pass


class E2EServices:
    def __init__(self, database: E2EDatabase, port: int, timeout: float) -> None:
        self.database = database
        self.port = _select_available_loopback_port(port)
        self.timeout = timeout
        self.base_url = f"http://127.0.0.1:{self.port}"
        self.run_id = uuid.uuid4().hex[:12]
        self.app_process: subprocess.Popen[str] | None = None
        self.worker_process: subprocess.Popen[str] | None = None
        self.health_token: str | None = None
        self.log_dir = PLAYWRIGHT_ROOT / "test-results" / "services"
        self.log_dir.mkdir(parents=True, exist_ok=True)
        self._log_handles: list[Any] = []

    def _process_environment(self) -> dict[str, str]:
        return self.database._node_environment()

    def _start_process(self, command: list[str], log_name: str) -> subprocess.Popen[str]:
        log_handle = (self.log_dir / log_name).open("w", encoding="utf-8")
        self._log_handles.append(log_handle)
        kwargs: dict[str, Any] = {
            "cwd": REPO_ROOT,
            "env": self._process_environment(),
            "stdout": log_handle,
            "stderr": subprocess.STDOUT,
            "text": True,
        }
        if os.name == "nt":
            kwargs["creationflags"] = subprocess.CREATE_NEW_PROCESS_GROUP
        else:
            kwargs["start_new_session"] = True
        return subprocess.Popen(command, **kwargs)

    def _log_excerpt(self, log_name: str) -> str:
        path = self.log_dir / log_name
        if not path.exists():
            return "(no service log)"
        try:
            return path.read_text(encoding="utf-8", errors="replace")[-4000:]
        except OSError:
            return "(service log unavailable)"

    def _wait_for_app(self) -> None:
        """Wait for stable logins; fail fast with the service log when Next exits."""
        deadline = time.monotonic() + self.timeout
        last_error = ""
        stable_responses = 0
        while time.monotonic() < deadline:
            if self.app_process and self.app_process.poll() is not None:
                raise RuntimeError(
                    f"Next app on {self.base_url} exited before readiness "
                    "(a previous dev server may still hold the requested port; "
                    "stop stale node processes before retrying):\n"
                    + self._log_excerpt("next.log")
                )
            try:
                with urlopen(f"{self.base_url}/login", timeout=2) as response:
                    if response.status < 500:
                        stable_responses += 1
                        if stable_responses >= 3:
                            return
                    else:
                        stable_responses = 0
                    last_error = f"HTTP {response.status}"
            except (OSError, HTTPError, URLError) as error:
                stable_responses = 0
                last_error = str(error)
            time.sleep(0.5)
        raise RuntimeError(f"Next app was not ready: {last_error}\n{self._log_excerpt('next.log')}")

    def _worker_health(self) -> dict[str, Any] | None:
        if self.health_token is None:
            self.health_token = self.database.create_health_session()
        try:
            health_request = Request(
                f"{self.base_url}/api/health/worker",
                headers={"Cookie": f"civicos_session={self.health_token}"},
            )
            with urlopen(health_request, timeout=3) as response:
                if response.status != 200:
                    return None
                body = json.loads(response.read().decode("utf-8"))
                return body if isinstance(body, dict) else None
        except (OSError, HTTPError, URLError, json.JSONDecodeError):
            return None

    def _wait_for_worker(self) -> None:
        deadline = time.monotonic() + self.timeout
        while time.monotonic() < deadline:
            if self.worker_process and self.worker_process.poll() is not None:
                raise RuntimeError(
                    "CivicOS worker exited before readiness:\n"
                    + self._log_excerpt("worker.log")
                )
            health = self._worker_health()
            if health is not None and health.get("deadLetterCount") == 0:
                return
            time.sleep(0.25)
        raise RuntimeError(
            "CivicOS worker was not ready within the timeout:\n"
            + self._log_excerpt("worker.log")
        )

    def start(self) -> None:
        """Start app and worker; tear down partial startup instead of leaking it."""
        npm = _node_command()
        try:
            self.app_process = self._start_process(
                [npm, "run", "dev", "--", "--hostname", "127.0.0.1", "--port", str(self.port)],
                "next.log",
            )
            self._wait_for_app()
            self.worker_process = self._start_process(
                [npm, "run", "worker", "--", f"--e2e-run={self.run_id}"],
                "worker.log",
            )
            self._wait_for_worker()
        except Exception:
            self.stop()
            raise

    def stop(self) -> None:
        _terminate(self.worker_process)
        _terminate(self.app_process)
        for handle in self._log_handles:
            handle.close()
        self._log_handles.clear()


@pytest.hookimpl(hookwrapper=True)
def pytest_runtest_makereport(item: pytest.Item, call: pytest.CallInfo[Any]):
    outcome = yield
    report = outcome.get_result()
    setattr(item, f"rep_{report.when}", report)


def pytest_addoption(parser: pytest.Parser) -> None:
    group = parser.getgroup("CivicOS E2E")
    group.addoption(
        "--app-port",
        action="store",
        type=int,
        default=int(os.environ.get("CIVICOS_E2E_APP_PORT", "4317")),
        help="Port for the isolated Next development server.",
    )
    group.addoption(
        "--service-timeout",
        action="store",
        type=float,
        default=float(os.environ.get("CIVICOS_E2E_TIMEOUT", "90")),
        help="Readiness timeout for PostgreSQL, Next, and the worker.",
    )
    group.addoption(
        "--keep-e2e-db",
        action="store_true",
        default=os.environ.get("CIVICOS_E2E_KEEP_DB") == "1",
        help="Keep civicos_e2e after the run for local debugging.",
    )
    group.addoption(
        "--project",
        choices=("all", "desktop", "mobile"),
        default=os.environ.get("CIVICOS_E2E_PROJECT", "all"),
        help="Run the Chromium desktop project, mobile project, or both.",
    )
    group.addoption(
        "--recreate-e2e-db",
        action="store_true",
        default=False,
        help="Opt in to dropping and recreating the dedicated database.",
    )
    group.addoption(
        "--drop-e2e-db",
        action="store_true",
        default=False,
        help="Opt in to dropping the dedicated database after the run.",
    )

@pytest.fixture(scope="session")
def e2e_database(pytestconfig: pytest.Config) -> Iterator[E2EDatabase]:
    database = E2EDatabase(
        _e2e_database_url(),
        recreate=pytestconfig.getoption("--recreate-e2e-db"),
    )
    try:
        database.prepare(pytestconfig.getoption("--service-timeout"))
        yield database
    finally:
        if pytestconfig.getoption("--drop-e2e-db") and not pytestconfig.getoption(
            "--keep-e2e-db"
        ):
            database.drop()


@pytest.fixture(scope="session")
def e2e_services(
    pytestconfig: pytest.Config,
    e2e_database: E2EDatabase,
) -> Iterator[E2EServices]:
    browser_option = pytestconfig.getoption("--browser")
    browser_names = (
        list(browser_option)
        if isinstance(browser_option, (list, tuple))
        else [browser_option]
    )
    if browser_names != ["chromium"]:
        pytest.fail(
            f"CivicOS E2E requires real Chromium; received --browser {browser_names!r}"
        )
    services = E2EServices(
        e2e_database,
        port=pytestconfig.getoption("--app-port"),
        timeout=pytestconfig.getoption("--service-timeout"),
    )
    try:
        services.start()
        yield services
    finally:
        services.stop()


@pytest.fixture(scope="session")
def base_url(e2e_services: E2EServices) -> str:
    return e2e_services.base_url


@pytest.fixture(scope="session")
def accounts(e2e_database: E2EDatabase) -> dict[str, TestAccount]:
    return e2e_database.accounts


@pytest.fixture(scope="session")
def demo_labels() -> tuple[str, str, str]:
    return DEMO_SCENARIO_LABELS


@pytest.fixture(autouse=True)
def clean_business_data(
    e2e_database: E2EDatabase, e2e_services: E2EServices
) -> Iterator[None]:
    e2e_services.stop()
    e2e_database.reset_business_data()
    try:
        e2e_services.start()
        yield
    finally:
        e2e_services.stop()


@pytest.fixture(params=("desktop", "mobile"), ids=("desktop", "mobile"))
def viewport_project(request: pytest.FixtureRequest, pytestconfig: pytest.Config) -> str:
    selected = pytestconfig.getoption("--project")
    if selected != "all" and request.param != selected:
        pytest.skip(f"--project={selected} excludes {request.param}")
    return request.param


@pytest.fixture
def browser_context_args(browser_context_args: dict[str, Any], viewport_project: str):
    arguments = dict(browser_context_args)
    arguments.pop("no_viewport", None)
    if viewport_project == "mobile":
        arguments.update(
            {
                "viewport": {"width": 390, "height": 844},
                "device_scale_factor": 2,
                "is_mobile": True,
                "has_touch": True,
            }
        )
    else:
        arguments.update(
            {
                "viewport": {"width": 1440, "height": 1000},
                "device_scale_factor": 1,
                "is_mobile": False,
                "has_touch": False,
            }
        )
    return arguments


@pytest.fixture
def context(browser, browser_context_args: dict[str, Any], request: pytest.FixtureRequest):
    artifact_dir = PLAYWRIGHT_ROOT / "test-results" / _safe_name(request.node.nodeid)
    artifact_dir.mkdir(parents=True, exist_ok=True)
    video_dir = artifact_dir / "video"
    video_dir.mkdir(parents=True, exist_ok=True)
    arguments = dict(browser_context_args)
    arguments.pop("record_video_dir", None)
    context = browser.new_context(**arguments, record_video_dir=str(video_dir))
    context.tracing.start(screenshots=True, snapshots=True, sources=True)
    videos = []
    try:
        yield context
    finally:
        failed = bool(
            getattr(getattr(request.node, "rep_call", None), "failed", False)
            or getattr(getattr(request.node, "rep_setup", None), "failed", False)
        )
        pages = list(context.pages)
        if failed:
            for index, page in enumerate(pages):
                try:
                    page.screenshot(
                        path=str(artifact_dir / f"failure-{index}.png"), full_page=True
                    )
                except Exception:
                    pass
        try:
            if failed:
                context.tracing.stop(path=str(artifact_dir / "trace.zip"))
            else:
                context.tracing.stop()
        except Exception:
            pass
        videos = [page.video for page in pages if page.video]
        context.close()
        if not failed:
            for video in videos:
                try:
                    video.delete()
                except Exception:
                    pass


@pytest.fixture
def app(page, base_url: str) -> CivicApp:
    return CivicApp(page, base_url)
