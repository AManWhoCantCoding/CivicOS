"""DB-free unit tests for the Python E2E database target and lifecycle.

Everything here is pure: no PostgreSQL connection, no migration, no browser,
no service. The `civicos_db_free` marker is checked by the autouse fixture in
`conftest.py` BEFORE any database/service fixture can be requested, so this
file never triggers `e2e_database`, `e2e_services`, or Chromium.
"""

from __future__ import annotations

import pytest

from conftest import (
    DB_FREE_MARKER,
    E2E_ADVISORY_LOCK_ACQUIRE_SQL,
    E2E_ADVISORY_LOCK_RELEASE_SQL,
    E2EDatabase,
    E2ESpecError,
    PROTECTED_TABLES,
    application_tables_from,
    e2e_database_lifecycle,
    quote_postgres_identifier,
    resolve_e2e_database_url,
)

pytestmark = pytest.mark.civicos_db_free

OK_URL = "postgresql://civicos:civicos@127.0.0.1:5432/civicos_e2e"


# ---------------------------------------------------------------- resolver


def test_accepts_exact_explicit_target():
    assert resolve_e2e_database_url({"CIVICOS_E2E_DATABASE_URL": OK_URL}) == OK_URL


def test_accepts_zero_six_url_scheme_alias_and_query_options():
    url = "postgres://u:p@127.0.0.1:5432/civicos_e2e?schema=public&connection_limit=10"
    assert resolve_e2e_database_url({"CIVICOS_E2E_DATABASE_URL": url}) == url


def test_missing_target_fails_closed_without_fallback():
    # A populated DATABASE_URL underneath must NOT become the target.
    env = {"DATABASE_URL": OK_URL}
    with pytest.raises(E2ESpecError) as err:
        resolve_e2e_database_url(env)
    assert err.value.code == "E2E_DATABASE_URL_REQUIRED"


def test_blank_target_refused():
    for value in ("   ", ""):
        with pytest.raises(E2ESpecError) as err:
            resolve_e2e_database_url({"CIVICOS_E2E_DATABASE_URL": value})
        assert err.value.code == "E2E_DATABASE_URL_REQUIRED"


@pytest.mark.parametrize(
    "url",
    [
        "not-a-url",
        "postgresql://u:p@<'bad:5432/civicos_e2e",
    ],
)
def test_malformed_target_is_malformed(url):
    with pytest.raises(E2ESpecError) as err:
        resolve_e2e_database_url({"CIVICOS_E2E_DATABASE_URL": url})
    assert err.value.code == "E2E_DATABASE_URL_MALFORMED"


@pytest.mark.parametrize(
    "url",
    [
        # Product/demo/test databases must never be accepted.
        "postgresql://civicos:civicos@127.0.0.1:5432/civicos",
        "postgresql://civicos:civicos@127.0.0.1:5432/civicos_test",
        "postgresql://civicos:civicos@127.0.0.1:5432/civicos_demo",
        # Host/port/path rewrites and fragments must never be accepted.
        "postgresql://civicos:civicos@localhost:5432/civicos_e2e",
        "postgresql://civicos:civicos@127.0.0.1:5433/civicos_e2e",
        "postgresql://civicos:civicos@127.0.0.1/civicos_e2e",
        "postgresql://civicos:civicos@127.0.0.1:5432/other_db",
        "mysql://civicos:civicos@127.0.0.1:5432/civicos_e2e",
        "postgresql://civicos:civicos@127.0.0.1:5432/civicos_e2e#frag",
        # Query allowlist violations.
        OK_URL + "?schema=private",
        OK_URL + "?connection_limit=0",
        OK_URL + "?connection_limit=-1",
        OK_URL + "?connection_limit=abc",
        OK_URL + "?sslmode=require",
        OK_URL + "?schema=public&schema=public",
        OK_URL + "?connection_limit=5&connection_limit=5",
    ],
)
def test_refused_targets_before_any_connect(url):
    with pytest.raises(E2ESpecError) as err:
        resolve_e2e_database_url({"CIVICOS_E2E_DATABASE_URL": url})
    assert err.value.code == "E2E_DATABASE_URL_REFUSED"
    # Credential-free refusal: the message is the code alone, never a URL.
    assert str(err.value) == err.value.code


# ------------------------------------------------- table enumeration/quote


def test_application_tables_exclude_protected_and_catalog_names():
    tables = application_tables_from(
        ["Incident", "_prisma_migrations", "spatial_ref_sys", "pg_catalog_stub"]
        + list(PROTECTED_TABLES)
    )
    assert "Incident" in tables
    for name in PROTECTED_TABLES:
        assert name not in tables
    assert not any(name for name in tables if name.startswith("pg_"))


def test_application_tables_fail_closed_on_illegal_identifier():
    with pytest.raises(E2ESpecError) as err:
        application_tables_from(["Bad Name"])
    assert err.value.code == "E2E_RESET_TABLE_NAME_REFUSED"
    with pytest.raises(E2ESpecError) as err:
        application_tables_from(None)
    assert err.value.code == "E2E_RESET_QUERY_FAILED"
    assert quote_postgres_identifier("Incident") == '"Incident"'


# ------------------------------------------------------------ reset seam


class FakeResult:
    def __init__(self, rows) -> None:
        self._rows = list(rows)

    def fetchone(self):
        return self._rows[0] if self._rows else None

    def fetchall(self):
        return list(self._rows)


class FakeConnection:
    """Record-only psycopg stand-in; never touches a database."""

    def __init__(self, log, *, current_db, tables, database_exists, lock_acquired):
        self.log = log
        self._current_db = current_db
        self._tables = tuple(tables)
        self._database_exists = database_exists
        self._lock_acquired = lock_acquired
        self.autocommit = False

    def __setattr__(self, name, value):
        # Record autocommit transitions on the shared log so tests can prove
        # ordering relative to the advisory-lock SQL.
        if name == "autocommit" and "log" in self.__dict__:
            self.log.append(("autocommit", value))
        super().__setattr__(name, value)

    def execute(self, sql, params=None):
        self.log.append(("execute", sql))
        if "pg_database" in sql:
            rows = [("civicos_e2e",)] if self._database_exists else []
            return FakeResult(rows)
        if "current_database" in sql:
            return FakeResult([(self._current_db,)])
        if "pg_tables" in sql:
            return FakeResult([(table,) for table in self._tables])
        if "pg_advisory_lock" in sql:
            return FakeResult([(self._lock_acquired,)])
        return FakeResult([])

    def close(self):
        self.log.append(("close",))

    def __enter__(self):
        self.log.append(("enter",))
        return self

    def __exit__(self, *args):
        self.log.append(("exit",))
        return False


def make_database(
    *,
    tables=("Incident", "Session", "_prisma_migrations", "spatial_ref_sys"),
    database_exists=True,
    lock_acquired=True,
    current_db="civicos_e2e",
):
    database = E2EDatabase(resolve_e2e_database_url({"CIVICOS_E2E_DATABASE_URL": OK_URL}))
    log: list[tuple] = []

    def connect(url=None):
        # The psycopg URL strips prisma options; the admin URL points at postgres.
        if url is not None and url.endswith("/postgres"):
            log.append(("connect", "admin"))
        else:
            log.append(("connect", "e2e"))
        return FakeConnection(
            log,
            current_db=current_db,
            tables=tables,
            database_exists=database_exists,
            lock_acquired=lock_acquired,
        )

    database.connect = connect  # type: ignore[method-assign]
    # NEVER let real Node/Prisma/migration or heavy seeding run from these
    # DB-free tests; tests override these seams explicitly when relevant.
    database.migrate = lambda: None  # type: ignore[method-assign]
    database.seed_reference_data = lambda: None  # type: ignore[method-assign]
    return database, log


def sqls(log):
    return [entry[1] for entry in log if len(entry) == 2 and entry[0] == "execute"]


def truncate_count(log):
    return len([sql for sql in sqls(log) if "TRUNCATE" in sql])


# -------------------------------------------------- reset behavior (pure)


def test_reset_refused_before_ownership():
    database, log = make_database()
    with pytest.raises(E2ESpecError) as err:
        database.reset_application_data()
    assert err.value.code == "E2E_LOCK_NOT_OWNED"
    assert not any(kind == "execute" for kind, _ in log)


def test_reset_proves_identity_before_any_writes():
    database, log = make_database(current_db="civicos")
    database.acquire_advisory_lock()
    with pytest.raises(E2ESpecError) as err:
        database.reset_application_data()
    assert err.value.code == "E2E_RESET_CONNECTED_DATABASE_REFUSED"
    emitted = sqls(log)
    assert not any("TRUNCATE" in sql for sql in emitted)
    assert not database.reset_owed
    database.release_advisory_lock()
    assert not database.lock_owned


def test_reset_truncates_application_tables_only_under_lock():
    database, log = make_database()
    database.acquire_advisory_lock()
    truncated = database.reset_application_data()
    assert tuple(truncated) == ("Incident", "Session")
    truncate = [sql for sql in sqls(log) if "TRUNCATE" in sql]
    assert len(truncate) == 1
    for name in PROTECTED_TABLES:
        assert name not in truncate[0]
    assert database.reset_owed
    database.release_advisory_lock()
    assert not database.lock_owned


def test_advisory_lock_sql_uses_shared_key_on_one_session():
    database, log = make_database()
    database.acquire_advisory_lock()
    emitted = sqls(log)
    assert E2E_ADVISORY_LOCK_ACQUIRE_SQL in emitted
    assert E2E_ADVISORY_LOCK_ACQUIRE_SQL.endswith("IS NOT NULL AS acquired")
    database.release_advisory_lock()
    assert sqls(log).count(E2E_ADVISORY_LOCK_RELEASE_SQL) == 1
    assert database._lock_connection is None


def test_lock_acquire_failure_is_hard_and_leaves_nothing_held():
    database, _ = make_database(lock_acquired=False)
    with pytest.raises(E2ESpecError) as err:
        database.acquire_advisory_lock()
    assert err.value.code == "E2E_ADVISORY_LOCK_FAILED"
    assert not database.lock_owned
    assert database._lock_connection is None


# ------------------------------------------------------ lifecycle ordering


def test_lifecycle_full_run_order_and_final_reset():
    database, log = make_database()
    steps: list[str] = []
    real_reset = database.reset_application_data
    real_seed = database.seed_reference_data

    def migrate():
        steps.append("migrate")

    def record_reset():
        steps.append("reset")
        return real_reset()

    def record_seed():
        steps.append("seed")
        real_seed()

    database.migrate = migrate  # type: ignore[method-assign]
    database.reset_application_data = record_reset  # type: ignore[method-assign]
    database.seed_reference_data = record_seed  # type: ignore[method-assign]

    with e2e_database_lifecycle(database, timeout=0.5):
        steps.append("body")

    assert steps == [
        "migrate",
        "reset",  # initial, under lock, before seeding
        "seed",
        "body",
        "reset",  # final, after dependent fixtures stop
    ]
    emitted = sqls(log)
    connects = [entry for entry in log if entry[0] == "connect"]
    # Readiness/create-if-missing (admin) precedes the E2E lock connection.
    assert connects[0] == ("connect", "admin")
    first_e2e = next(index for index, entry in enumerate(connects) if entry == ("connect", "e2e"))
    assert first_e2e > 0
    assert not any(sql.startswith("CREATE DATABASE") for sql in emitted)
    assert emitted.count(E2E_ADVISORY_LOCK_ACQUIRE_SQL) == 1
    assert emitted.count(E2E_ADVISORY_LOCK_RELEASE_SQL) == 1
    assert truncate_count(log) == 2  # initial + final
    assert not database.lock_owned


def test_lifecycle_creates_missing_database_before_lock():
    database, log = make_database(database_exists=False)
    with e2e_database_lifecycle(database, timeout=0.5):
        pass
    emitted = sqls(log)
    assert any(sql.startswith("CREATE DATABASE") for sql in emitted)
    connects = [entry for entry in log if entry[0] == "connect"]
    assert connects[0] == ("connect", "admin")
    first_e2e = next(index for index, entry in enumerate(connects) if entry == ("connect", "e2e"))
    assert first_e2e > 0
    assert emitted.count(E2E_ADVISORY_LOCK_RELEASE_SQL) == 1


def test_lifecycle_seed_failure_still_final_resets_and_unlocks():
    database, log = make_database()
    steps: list[str] = []

    def failing_seed():
        steps.append("seed")
        raise RuntimeError("seed boom")

    database.seed_reference_data = failing_seed  # type: ignore[method-assign]

    with pytest.raises(RuntimeError, match="seed boom"):
        with e2e_database_lifecycle(database, timeout=0.5):
            steps.append("body")

    # The initial reset succeeded, so the final reset is still owed even
    # though seeding never finished.
    emitted = sqls(log)
    assert steps == ["seed"]
    assert len([sql for sql in emitted if "TRUNCATE" in sql]) == 2
    assert E2E_ADVISORY_LOCK_RELEASE_SQL in emitted
    assert not database.lock_owned


def test_lifecycle_acquire_failure_runs_no_locked_step_and_no_unlock():
    database, log = make_database(lock_acquired=False)
    steps: list[str] = []

    def migrate():
        steps.append("migrate")

    database.migrate = migrate  # type: ignore[method-assign]

    with pytest.raises(E2ESpecError) as err:
        with e2e_database_lifecycle(database, timeout=0.5):
            steps.append("body")

    assert err.value.code == "E2E_ADVISORY_LOCK_FAILED"
    assert steps == []
    emitted = sqls(log)
    assert E2E_ADVISORY_LOCK_RELEASE_SQL not in emitted
    assert not any("TRUNCATE" in sql for sql in emitted)


def test_lifecycle_never_creates_drops_or_terminates_when_db_exists():
    database, log = make_database(database_exists=True)
    with e2e_database_lifecycle(database, timeout=0.5):
        pass
    emitted = sqls(log)
    assert not any(sql.startswith("CREATE DATABASE") for sql in emitted)
    assert not any("DROP DATABASE" in sql for sql in emitted)
    assert not any("pg_terminate_backend" in sql for sql in emitted)


def test_db_free_marker_constant():
    assert DB_FREE_MARKER == "civicos_db_free"


def test_database_url_is_exact_target_no_rewrite():
    database, _ = make_database()
    # No path rewrite: the resolved E2E name and admin URL are derived directly.
    assert database.url.endswith("/civicos_e2e")
    assert_database_admin_url(database)


def assert_database_admin_url(database):
    assert database.admin_url.endswith("/postgres")


def test_never_touches_database_url_env():
    # resolve must ignore DATABASE_URL entirely (no fallback, no rewrite).
    with pytest.raises(E2ESpecError):
        resolve_e2e_database_url({"DATABASE_URL": OK_URL})


# --------------------------------------------------- business-reset guard


def test_business_reset_refused_before_any_connect_or_sql():
    database, log = make_database()
    with pytest.raises(E2ESpecError) as err:
        database.reset_business_data()
    assert err.value.code == "E2E_LOCK_NOT_OWNED"
    # No connect, no execute, no close: refused before any SQL can run.
    assert log == []


def test_business_reset_truncates_only_under_lock():
    database, log = make_database()
    database.acquire_advisory_lock()
    before = len(log)
    database.reset_business_data()
    emitted = sqls(log[before:])
    assert any("TRUNCATE TABLE" in sql for sql in emitted)
    assert not any(sql.startswith("DROP") for sql in emitted)
    database.release_advisory_lock()


# -------------------------------------------------- other mutation guards


def test_migrate_seed_and_health_session_require_lock_without_connect():
    database, log = make_database()
    # make_database() stubs migrate; call the real method so its lock guard runs.
    with pytest.raises(E2ESpecError) as err:
        E2EDatabase.migrate(database)
    assert err.value.code == "E2E_LOCK_NOT_OWNED"
    with pytest.raises(E2ESpecError) as err:
        E2EDatabase.seed_reference_data(database)
    assert err.value.code == "E2E_LOCK_NOT_OWNED"
    with pytest.raises(E2ESpecError) as err:
        database.create_health_session()
    assert err.value.code == "E2E_LOCK_NOT_OWNED"
    # Guarded before any connection or SQL in every case.
    assert log == []


# --------------------------------------------------- child env sanitization


def test_node_environment_passes_only_the_e2e_target(monkeypatch: pytest.MonkeyPatch):
    monkeypatch.setenv("DATABASE_URL", "postgresql://civicos:civicos@127.0.0.1:5432/civicos_test")
    monkeypatch.setenv("DEMO_DATABASE_URL", "postgresql://civicos:civicos@127.0.0.1:5432/civicos_demo")
    monkeypatch.setenv("CIVICOS_DATABASE_URL", "postgresql://civicos:civicos@127.0.0.1:5432/civicos")
    monkeypatch.setenv("CIVICOS_TEST_DATABASE_URL", OK_URL.replace("civicos_e2e", "civicos_test"))
    database, _ = make_database()
    environment = database._node_environment()
    # Exactly the validated E2E URL, unmodified.
    assert environment["DATABASE_URL"] == OK_URL
    assert environment["CIVICOS_E2E_DATABASE_URL"] == OK_URL
    # Unsafe inherited aliases are removed entirely, never rewritten.
    assert "DEMO_DATABASE_URL" not in environment
    assert "CIVICOS_DATABASE_URL" not in environment
    assert "CIVICOS_TEST_DATABASE_URL" not in environment


def test_node_environment_leaves_no_residue_when_missing(monkeypatch: pytest.MonkeyPatch):
    for name in (
        "DATABASE_URL",
        "DEMO_DATABASE_URL",
        "CIVICOS_DATABASE_URL",
        "CIVICOS_TEST_DATABASE_URL",
        "CIVICOS_E2E_DATABASE_URL",
    ):
        monkeypatch.delenv(name, raising=False)
    database, _ = make_database()
    environment = database._node_environment()
    assert environment["DATABASE_URL"] == OK_URL
    assert environment["CIVICOS_E2E_DATABASE_URL"] == OK_URL


# ------------------------------------------------- lock session autocommit


def test_lock_connection_runs_autocommit_before_acquire_sql():
    database, log = make_database()
    database.acquire_advisory_lock()
    # autocommit must be set on the persistent session BEFORE the session-level
    # pg_advisory_lock execute, so the lock session holds no idle transaction.
    kinds = [entry[0] for entry in log]
    assert ("autocommit", True) in log
    assert kinds.index("autocommit") < kinds.index("execute")
    database.release_advisory_lock()
