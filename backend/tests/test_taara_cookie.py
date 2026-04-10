"""Backend API tests for Taara & Cookie's Day Out"""
import pytest
import requests
import os

BASE_URL = os.environ.get("EXPO_PUBLIC_BACKEND_URL", "").rstrip("/")
TOKEN = "test_session_demo_taara_cookie"
SESSION_ID = "sess_5704d6ebc25c4924"
AUTH_HEADER = {"Authorization": f"Bearer {TOKEN}"}


@pytest.fixture(scope="module")
def client():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json", "Authorization": f"Bearer {TOKEN}"})
    return s


# Auth tests
class TestAuth:
    def test_get_me(self, client):
        r = client.get(f"{BASE_URL}/api/auth/me")
        assert r.status_code == 200
        data = r.json()
        assert "user_id" in data
        assert data.get("email") == "taara@demo.com"

    def test_get_me_no_auth(self):
        r = requests.get(f"{BASE_URL}/api/auth/me")
        assert r.status_code == 401


# Sessions tests
class TestSessions:
    def test_list_sessions(self, client):
        r = client.get(f"{BASE_URL}/api/sessions")
        assert r.status_code == 200
        data = r.json()
        assert isinstance(data, list)
        assert len(data) >= 1

    def test_get_session(self, client):
        r = client.get(f"{BASE_URL}/api/sessions/{SESSION_ID}")
        assert r.status_code == 200
        data = r.json()
        assert "session" in data
        assert "stops" in data
        assert len(data["stops"]) == 4

    def test_session_has_correct_fields(self, client):
        r = client.get(f"{BASE_URL}/api/sessions/{SESSION_ID}")
        data = r.json()
        session = data["session"]
        assert session["session_id"] == SESSION_ID
        stops = data["stops"]
        for stop in stops:
            assert "stop_id" in stop
            assert "name" in stop
            assert "emoji" in stop
            assert "password_hash" not in stop  # must be excluded

    def test_get_invalid_session(self, client):
        r = client.get(f"{BASE_URL}/api/sessions/invalid_session_id")
        assert r.status_code == 404


# Stop unlock tests
class TestStopUnlock:
    def _get_stop_id(self, client, order):
        r = client.get(f"{BASE_URL}/api/sessions/{SESSION_ID}")
        stops = r.json()["stops"]
        for s in stops:
            if s["order"] == order:
                return s["stop_id"]
        return None

    def test_unlock_stop1_correct_password(self, client):
        stop_id = self._get_stop_id(client, 1)
        assert stop_id is not None
        r = client.post(f"{BASE_URL}/api/stops/{stop_id}/unlock", json={"password": "tekken"})
        assert r.status_code == 200
        data = r.json()
        assert data["unlocked"] == True

    def test_unlock_wrong_password(self, client):
        stop_id = self._get_stop_id(client, 1)
        assert stop_id is not None
        r = client.post(f"{BASE_URL}/api/stops/{stop_id}/unlock", json={"password": "wrongpassword"})
        assert r.status_code == 401

    def test_unlock_case_insensitive(self, client):
        stop_id = self._get_stop_id(client, 1)
        r = client.post(f"{BASE_URL}/api/stops/{stop_id}/unlock", json={"password": "TEKKEN"})
        assert r.status_code == 200


# Stop update tests
class TestStopUpdate:
    def _get_stop_id(self, client, order):
        r = client.get(f"{BASE_URL}/api/sessions/{SESSION_ID}")
        stops = r.json()["stops"]
        for s in stops:
            if s["order"] == order:
                return s["stop_id"]
        return None

    def test_update_stop_rating(self, client):
        stop_id = self._get_stop_id(client, 1)
        r = client.patch(f"{BASE_URL}/api/stops/{stop_id}", json={"rating": 5})
        assert r.status_code == 200
        data = r.json()
        assert data["rating"] == 5

    def test_update_stop_comment(self, client):
        stop_id = self._get_stop_id(client, 1)
        r = client.patch(f"{BASE_URL}/api/stops/{stop_id}", json={"comment": "TEST_comment"})
        assert r.status_code == 200
        data = r.json()
        assert data["comment"] == "TEST_comment"

    def test_mark_stop_done(self, client):
        stop_id = self._get_stop_id(client, 1)
        r = client.patch(f"{BASE_URL}/api/stops/{stop_id}", json={"done": True})
        assert r.status_code == 200
        data = r.json()
        assert data["done"] == True


# Photo upload test
class TestPhotos:
    def _get_stop_id(self, client, order):
        r = client.get(f"{BASE_URL}/api/sessions/{SESSION_ID}")
        stops = r.json()["stops"]
        for s in stops:
            if s["order"] == order:
                return s["stop_id"]
        return None

    def test_upload_photo(self, client):
        stop_id = self._get_stop_id(client, 1)
        # Tiny 1x1 red pixel base64 JPEG
        tiny_jpeg = "/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/wAARC"
        r = client.post(f"{BASE_URL}/api/photos/upload", json={
            "data": tiny_jpeg,
            "stop_id": stop_id,
            "type": "stop"
        })
        assert r.status_code == 200
        data = r.json()
        assert "photo_id" in data
