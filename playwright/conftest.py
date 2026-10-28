from __future__ import annotations

import hashlib
import json
import os
import re
import signal
import socket
import subprocess
import sys
import time
import uuid
from dataclasses import dataclass
from contextlib import contextmanager
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


E2E_DATABASE_NAME = "civicos_e2e"
DEFAULT_PASSWORD = "civicos-dev"

# allowlist for the ONLY accepted E2E target — mirrors scripts/e2e/e2e-target.mjs
E2E_TARGET_HOST = "127.0.0.1"
E2E_TARGET_PORT = 5432
E2E_TARGET_DATABASE = "civicos_e2e"
E2E_ALLOWED_QUERY_KEYS = frozenset({"schema", "connection_limit"})
_CONNECTION_LIMIT_PATTERN = r"[1-9][0-9]*"

# Cross-runner advisory lock serialized with the Node harnesses
# (see scripts/e2e/database-lifecycle.mjs). App data resets, migrations and
# fixture seeding below run only while this lock is held on one persistent
# session; schema, `_prisma_migrations` and PostGIS data always survive.
E2E_ADVISORY_LOCK_KEY = 1128236101
E2E_ADVISORY_LOCK_ACQUIRE_SQL = (
    f"SELECT pg_advisory_lock({E2E_ADVISORY_LOCK_KEY}) IS NOT NULL AS acquired"
)
E2E_ADVISORY_LOCK_RELEASE_SQL = f"SELECT pg_advisory_unlock({E2E_ADVISORY_LOCK_KEY})"

# `public` tables that are NOT application data: migration history and PostGIS
# reference rows. Restarting application data never touches these tables.
PROTECTED_TABLES = ("_prisma_migrations", "spatial_ref_sys")
_IDENTIFIER_PATTERN = r"[A-Za-z_][A-Za-z0-9_]*"


class E2ESpecError(RuntimeError):
    """Stable, credential-free refusal — the message is the error code alone."""

    def __init__(self, code: str) -> None:
        super().__init__(code)
        self.code = code


def quote_postgres_identifier(name: str) -> str:
    if not isinstance(name, str) or re.fullmatch(_IDENTIFIER_PATTERN, name) is None:
        raise E2ESpecError("E2E_RESET_TABLE_NAME_REFUSED")
    return f'"{name}"'


def application_tables_from(tablenames: Any) -> tuple[str, ...]:
    """Filter a `public` table list to application tables only."""
    if not isinstance(tablenames, (list, tuple)):
        raise E2ESpecError("E2E_RESET_QUERY_FAILED")
    excluded = lambda name: name.startswith("pg_") or name in PROTECTED_TABLES
    result: list[str] = []
    for name in tablenames:
        if not isinstance(name, str):
            raise E2ESpecError("E2E_RESET_TABLE_NAME_REFUSED")
        if not re.fullmatch(_IDENTIFIER_PATTERN, name) and not excluded(name):
            # A legitimate application table must never be silently skipped.
            raise E2ESpecError("E2E_RESET_TABLE_NAME_REFUSED")
        if not excluded(name):
            result.append(name)
    return tuple(result)


def resolve_e2e_database_url(
    env: dict[str, str] | None = None,
) -> str:
    """Resolve the ONLY accepted E2E database target, fail closed.

    The target must be the explicit process environment variable
    ``CIVICOS_E2E_DATABASE_URL`` pointing at PostgreSQL
    ``127.0.0.1:5432/civicos_e2e``. There is NO fallback to ``DATABASE_URL``
    and no path rewrite. Raises ``E2ESpecError`` with a stable, credential-free
    code before any connection is opened.
    """
    snapshot = os.environ if env is None else env
    raw = snapshot.get("CIVICOS_E2E_DATABASE_URL")
    if not isinstance(raw, str) or raw.strip() == "":
        raise E2ESpecError("E2E_DATABASE_URL_REQUIRED")
    try:
        parts = urlsplit(raw)
        port = parts.port  # non-numeric port raises ValueError
    except ValueError:
        raise E2ESpecError("E2E_DATABASE_URL_MALFORMED") from None
    if not parts.scheme or not parts.netloc:
        # Nothing resembling an authority at all: like Node's URL constructor.
        raise E2ESpecError("E2E_DATABASE_URL_MALFORMED")
    hostname = parts.hostname
    if not isinstance(hostname, str) or re.fullmatch(r"[A-Za-z0-9.\-_]+", hostname) is None:
        # Python's urlsplit is looser than Node's WHATWG URL parser; reject
        # exotic hostnames as malformed to keep the parity contract.
        raise E2ESpecError("E2E_DATABASE_URL_MALFORMED")
    if parts.scheme not in ("postgres", "postgresql"):
        raise E2ESpecError("E2E_DATABASE_URL_REFUSED")
    if (
        parts.hostname != E2E_TARGET_HOST
        or port != E2E_TARGET_PORT
        or parts.path != f"/{E2E_TARGET_DATABASE}"
        or parts.fragment
    ):
        raise E2ESpecError("E2E_DATABASE_URL_REFUSED")
    query_pairs = parse_qsl(parts.query, keep_blank_values=True)
    query_keys = [key for key, _ in query_pairs]
    if len(set(query_keys)) != len(query_keys):
        raise E2ESpecError("E2E_DATABASE_URL_REFUSED")
    for key, value in query_pairs:
        if key not in E2E_ALLOWED_QUERY_KEYS:
            raise E2ESpecError("E2E_DATABASE_URL_REFUSED")
        if key == "schema" and value != "public":
            raise E2ESpecError("E2E_DATABASE_URL_REFUSED")
        if key == "connection_limit" and re.fullmatch(_CONNECTION_LIMIT_PATTERN, value) is None:
            raise E2ESpecError("E2E_DATABASE_URL_REFUSED")
    return raw

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
    query = [
        (key, value)
        for key, value in parse_qsl(parts.query)
        if key not in E2E_ALLOWED_QUERY_KEYS
    ]
    return urlunsplit(parts._replace(query=urlencode(query)))


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
    def __init__(self, database_url: str) -> None:
        self.url = database_url
        self.psycopg_url = _without_prisma_options(database_url)
        self.admin_url = _without_prisma_options(_admin_database_url(database_url))
        self.accounts: dict[str, TestAccount] = {}
        # Whole-run advisory-lock ownership: set only after
        # `pg_advisory_lock(1128236101)` is confirmed on the persistent
        # session stored in `_lock_connection`. Reset SQL NEVER runs while this
        # is False, and the unlock runs on the same session on every path.
        self.lock_owned = False
        self._lock_connection: Any = None
        # Owed-final-reset flag: set when the UNDER-LOCK initial reset
        # succeeded; the final reset runs afterwards on every outcome.
        self.reset_owed = False

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

    def create_database_if_missing(self) -> None:
        """Safe create-if-missing only. The database is NEVER dropped,
        sessions are never terminated, and existing schema/data are preserved."""
        if self._database_exists():
            return
        with self.connect(self.admin_url) as connection:
            connection.autocommit = True
            connection.execute(f'CREATE DATABASE "{E2E_DATABASE_NAME}"')

    def _node_environment(self) -> dict[str, str]:
        environment = os.environ.copy()
        # Child Node processes must only ever see the validated exact
        # `civicos_e2e` target. Any inherited main/demo/test database URL
        # alias is scrubbed, never trusted, and never rewritten.
        for unsafe in (
            "DATABASE_URL",
            "DEMO_DATABASE_URL",
            "CIVICOS_DATABASE_URL",
            "CIVICOS_TEST_DATABASE_URL",
        ):
            environment.pop(unsafe, None)
        environment.update(
            {
                "DATABASE_URL": self.url,
                "CIVICOS_E2E_DATABASE_URL": self.url,
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
        if not self.lock_owned:
            raise E2ESpecError("E2E_LOCK_NOT_OWNED")
        self._run_prisma_generate()
        self._run_node_command([_node_command(), "run", "prisma:migrate:deploy"])

    def acquire_advisory_lock(self) -> None:
        """Acquire the shared whole-run advisory lock on one persistent
        connection to the exact `civicos_e2e` database.

        Must be called only after the target was validated and PostgreSQL is
        ready and the database exists. Refusal to acquire is a hard failure —
        never a silent continue. No reset/migration/seed may run until this
        confirms ownership.
        """
        connection = self.connect()
        self._lock_connection = connection
        try:
            # Session-level advisory locks are session-scoped regardless of
            # transaction state; autocommit avoids pinning an idle open
            # transaction for the whole suite.
            connection.autocommit = True
            row = connection.execute(E2E_ADVISORY_LOCK_ACQUIRE_SQL).fetchone()
            if row is None or not row[0]:
                raise E2ESpecError("E2E_ADVISORY_LOCK_FAILED")
            self.lock_owned = True
        except Exception:
            try:
                connection.close()
            except Exception:  # pragma: no cover - close failure on lost session
                pass
            if self._lock_connection is connection:
                self._lock_connection = None
            raise

    def release_advisory_lock(self) -> None:
        """Unlock the same persistent session and close it.

        Closing the connection also releases session-level locks, so a failed
        SQL unlock still cannot leak the lock for other runners.
        """
        connection = self._lock_connection
        if self.lock_owned and connection is not None:
            try:
                connection.execute(E2E_ADVISORY_LOCK_RELEASE_SQL)
            except Exception:
                pass
            try:
                connection.close()
            except Exception:
                pass
        self.lock_owned = False
        self._lock_connection = None

    def reset_application_data(self) -> tuple[str, ...]:
        """Truncate ALL application data under lock ownership only.

        Proves `current_database()` = 'civicos_e2e' before any mutating SQL,
        dynamically enumerates `public` application tables (excluding
        `_prisma_migrations`, `spatial_ref_sys`, and `pg_` catalog names), and
        keeps schema, migration history, and PostGIS rows intact.
        """
        if not self.lock_owned:
            raise E2ESpecError("E2E_LOCK_NOT_OWNED")
        with self.connect() as connection:
            identity_row = connection.execute(
                "SELECT current_database() AS db"
            ).fetchone()
            if identity_row is None or identity_row[0] != E2E_TARGET_DATABASE:
                raise E2ESpecError("E2E_RESET_CONNECTED_DATABASE_REFUSED")
            listing = connection.execute(
                "SELECT tablename AS table_name FROM pg_tables "
                "WHERE schemaname = 'public' "
                "ORDER BY tablename"
            ).fetchall()
            tables = application_tables_from([row[0] for row in listing])
            if tables:
                quoted = ", ".join(quote_postgres_identifier(t) for t in tables)
                connection.execute(f"TRUNCATE TABLE {quoted} RESTART IDENTITY CASCADE")
        if not self.reset_owed:
            self.reset_owed = True
        return tables

    def prepare(self, timeout: float) -> None:
        """Legacy single-call prepare (readiness → create → lock → migrate →
        reset → seed). The session fixture uses `e2e_database_lifecycle` to
        keep the lock held across the test session; prefer that path."""
        with e2e_database_lifecycle(self, timeout):
            pass

    def seed_reference_data(self) -> None:
        if not self.lock_owned:
            raise E2ESpecError("E2E_LOCK_NOT_OWNED")
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
        if not self.lock_owned:
            raise E2ESpecError("E2E_LOCK_NOT_OWNED")
        table_list = ", ".join(f'"{table}"' for table in REFERENCE_TABLES)
        with self.connect() as connection:
            connection.execute(f"TRUNCATE TABLE {table_list} RESTART IDENTITY CASCADE")
            connection.execute(
                'DELETE FROM "Session" WHERE "id" <> %s',
                ("e2e-health-session",),
            )

    def create_health_session(self) -> str:
        if not self.lock_owned:
            raise E2ESpecError("E2E_LOCK_NOT_OWNED")
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
        "--project",
        choices=("all", "desktop", "mobile"),
        default=os.environ.get("CIVICOS_E2E_PROJECT", "all"),
        help="Run the Chromium desktop project, mobile project, or both.",
    )


@contextmanager
def e2e_database_lifecycle(database: E2EDatabase, timeout: float):
    """Whole-run E2E database session lifecycle (once per `e2e_database`).

    Order: readiness → safe create-if-missing → whole-run advisory lock on the
    persistent `civicos_e2e` session → migrate → initial FULL application-data
    reset → seed reference fixtures → test body → final FULL reset AFTER the
    dependent app/worker fixtures have torn down → unlock on the same session.
    """
    database.wait_for_postgres(timeout)
    database.create_database_if_missing()
    database.acquire_advisory_lock()
    try:
        database.migrate()
        database.reset_application_data()
        database.seed_reference_data()
        yield database
    finally:
        error: BaseException | None = None
        # Owed only once the initial reset succeeded; attempted on EVERY
        # outcome (including a failed seed or failed test start).
        if database.reset_owed:
            try:
                database.reset_application_data()
            except BaseException as exception:  # noqa: BLE001 - re-raised after unlock
                error = exception
        try:
            database.release_advisory_lock()
        except BaseException as exception:  # pragma: no cover - defensive
            if error is None:
                error = exception
        if error is not None:
            raise error


@pytest.fixture(scope="session")
def e2e_database(pytestconfig: pytest.Config) -> Iterator[E2EDatabase]:
    timeout = float(pytestconfig.getoption("--service-timeout"))
    database = E2EDatabase(resolve_e2e_database_url())
    with e2e_database_lifecycle(database, timeout):
        yield database


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


# Marker scoped to the DB-free lifecycle unit tests: nothing under it may
# request the E2E database or service fixtures, and the autouse per-test
# business cleanup below must NOT touch PostgreSQL for those tests.
DB_FREE_MARKER = "civicos_db_free"


def pytest_configure(config: pytest.Config) -> None:
    config.addinivalue_line(
        "markers",
        f"{DB_FREE_MARKER}: pure database-target/lifecycle unit tests; never touch the DB, services, or browser",
    )


@pytest.fixture(autouse=True)
def _verify_url(request: pytest.FixtureRequest) -> Iterator[None]:
    """Narrow override of pytest-base-url's SESSION-SCOPE autouse verifier.

    The plugin's `_verify_url` requests the `base_url` fixture unconditionally,
    which forces `e2e_services`/`e2e_database` (and Chromium-era service
    startup) even for DB-free tests. This override keeps behavior for browser
    tests (this suite never exercises the plugin's URL verification) while
    letting DB-free tests run without any service/DB fixture.
    """
    if request.node.get_closest_marker(DB_FREE_MARKER) is not None:
        yield
        return
    pytestconfig = request.getfixturevalue("pytestconfig")
    if pytestconfig.getoption("verify_base_url", default=False):
        request.getfixturevalue("base_url")
    yield


@pytest.fixture(autouse=True)
def clean_business_data(request: pytest.FixtureRequest) -> Iterator[None]:
    marker = request.node.get_closest_marker(DB_FREE_MARKER)
    if marker is not None:
        # DB-free test: resolve no fixture that could connect or start services.
        yield
        return
    pytestconfig = request.getfixturevalue("pytestconfig")
    services = request.getfixturevalue("e2e_services")
    database = request.getfixturevalue("e2e_database")
    services.stop()
    database.reset_business_data()
    try:
        services.start()
        yield
    finally:
        services.stop()


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
