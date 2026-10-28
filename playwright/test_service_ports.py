from __future__ import annotations

import socket

import pytest

from conftest import _select_available_loopback_port

pytestmark = pytest.mark.civicos_db_free


def test_occupied_requested_port_uses_available_port_without_killing_listener():
    listener = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    listener.bind(("127.0.0.1", 0))
    listener.listen()
    requested_port = listener.getsockname()[1]

    try:
        selected_port = _select_available_loopback_port(requested_port)

        assert selected_port != requested_port
        with socket.create_connection(("127.0.0.1", requested_port), timeout=1):
            pass
    finally:
        listener.close()
