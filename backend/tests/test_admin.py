import uuid
from datetime import datetime, timedelta

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.admin import escape_like
from app.models.moderation import Warning
from app.models.user import AdminActionLog, User


async def _make_user(db: AsyncSession, **overrides) -> User:
    fields = {
        "id": uuid.uuid4(),
        "email": f"admin-test-{uuid.uuid4()}@example.com",
        "name": "Admin Test Target",
        "hashed_password": "x",
        "is_active": True,
    }
    fields.update(overrides)
    user = User(**fields)
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return user


class TestEscapeLike:
    def test_escapes_percent(self):
        assert escape_like("50%off") == "50\\%off"

    def test_escapes_underscore(self):
        assert escape_like("a_b") == "a\\_b"

    def test_escapes_backslash_first(self):
        # Must escape backslashes before % / _ or a literal backslash from
        # escaping % would itself get re-escaped, corrupting the pattern.
        assert escape_like("100\\%") == "100\\\\\\%"


class TestAdminAuthorizationGuard:
    @pytest.mark.asyncio
    async def test_non_admin_gets_403(self, client: AsyncClient, token: str):
        response = await client.get(
            "/api/admin/users", headers={"Authorization": f"Bearer {token}"}
        )

        assert response.status_code == 403

    @pytest.mark.asyncio
    async def test_unauthenticated_gets_401(self, client: AsyncClient):
        response = await client.get("/api/admin/users")

        assert response.status_code == 401


class TestAdminStats:
    @pytest.mark.asyncio
    async def test_returns_stats_reflecting_known_users(
        self, client: AsyncClient, admin_auth_headers: dict, db_session: AsyncSession
    ):
        active = await _make_user(db_session)
        suspended = await _make_user(
            db_session,
            suspended_at=datetime.utcnow(),
            suspended_until=datetime.utcnow() + timedelta(days=1),
        )
        banned = await _make_user(db_session, banned_at=datetime.utcnow())

        response = await client.get("/api/admin/stats", headers=admin_auth_headers)

        assert response.status_code == 200
        data = response.json()
        # Other tests/fixtures create users concurrently in this shared DB,
        # so assert lower bounds rather than exact totals.
        assert data["total_users"] >= 3
        assert data["suspended_users"] >= 1
        assert data["banned_users"] >= 1
        assert data["admin_users"] >= 1
        for user in (active, suspended, banned):
            assert user.id is not None  # created successfully, sanity check


class TestListUsers:
    @pytest.mark.asyncio
    async def test_lists_and_paginates(
        self, client: AsyncClient, admin_auth_headers: dict, db_session: AsyncSession
    ):
        user = await _make_user(db_session)

        response = await client.get(
            "/api/admin/users?limit=5&offset=0", headers=admin_auth_headers
        )

        assert response.status_code == 200
        data = response.json()
        assert data["limit"] == 5
        assert data["offset"] == 0
        assert data["total"] >= 1
        assert any(item["id"] == str(user.id) for item in data["items"])

    @pytest.mark.asyncio
    async def test_query_filters_by_name_or_email(
        self, client: AsyncClient, admin_auth_headers: dict, db_session: AsyncSession
    ):
        unique = str(uuid.uuid4())
        user = await _make_user(db_session, name=f"Findable-{unique}")

        response = await client.get(
            f"/api/admin/users?query=Findable-{unique}", headers=admin_auth_headers
        )

        assert response.status_code == 200
        data = response.json()
        assert data["total"] == 1
        assert data["items"][0]["id"] == str(user.id)

    @pytest.mark.asyncio
    async def test_query_with_wildcard_characters_is_treated_literally(
        self, client: AsyncClient, admin_auth_headers: dict, db_session: AsyncSession
    ):
        unique = str(uuid.uuid4())
        # A literal "%" in a search term must not act as a SQL wildcard -
        # escape_like() is what prevents this from matching every user.
        await _make_user(db_session, name=f"NoMatch-{unique}")
        matching = await _make_user(db_session, name=f"5%off-{unique}")

        response = await client.get(
            f"/api/admin/users?query=5%25off-{unique}", headers=admin_auth_headers
        )

        assert response.status_code == 200
        data = response.json()
        assert data["total"] == 1
        assert data["items"][0]["id"] == str(matching.id)

    @pytest.mark.asyncio
    async def test_is_suspended_filter(
        self, client: AsyncClient, admin_auth_headers: dict, db_session: AsyncSession
    ):
        suspended = await _make_user(
            db_session,
            suspended_at=datetime.utcnow(),
            suspended_until=datetime.utcnow() + timedelta(days=1),
        )

        response = await client.get(
            "/api/admin/users?is_suspended=true&limit=100", headers=admin_auth_headers
        )

        assert response.status_code == 200
        ids = {item["id"] for item in response.json()["items"]}
        assert str(suspended.id) in ids

    @pytest.mark.asyncio
    async def test_is_suspended_false_filter_excludes_suspended(
        self, client: AsyncClient, admin_auth_headers: dict, db_session: AsyncSession
    ):
        suspended = await _make_user(
            db_session,
            suspended_at=datetime.utcnow(),
            suspended_until=datetime.utcnow() + timedelta(days=1),
        )
        not_suspended = await _make_user(db_session)

        response = await client.get(
            "/api/admin/users?is_suspended=false&limit=100", headers=admin_auth_headers
        )

        assert response.status_code == 200
        ids = {item["id"] for item in response.json()["items"]}
        assert str(not_suspended.id) in ids
        assert str(suspended.id) not in ids

    @pytest.mark.asyncio
    async def test_is_banned_filter(
        self, client: AsyncClient, admin_auth_headers: dict, db_session: AsyncSession
    ):
        banned = await _make_user(db_session, banned_at=datetime.utcnow())

        response = await client.get(
            "/api/admin/users?is_banned=true&limit=100", headers=admin_auth_headers
        )

        assert response.status_code == 200
        ids = {item["id"] for item in response.json()["items"]}
        assert str(banned.id) in ids

    @pytest.mark.asyncio
    async def test_is_banned_false_filter_excludes_banned(
        self, client: AsyncClient, admin_auth_headers: dict, db_session: AsyncSession
    ):
        banned = await _make_user(db_session, banned_at=datetime.utcnow())
        not_banned = await _make_user(db_session)

        response = await client.get(
            "/api/admin/users?is_banned=false&limit=100", headers=admin_auth_headers
        )

        assert response.status_code == 200
        ids = {item["id"] for item in response.json()["items"]}
        assert str(not_banned.id) in ids
        assert str(banned.id) not in ids

    @pytest.mark.asyncio
    async def test_is_active_filter(
        self, client: AsyncClient, admin_auth_headers: dict, db_session: AsyncSession
    ):
        inactive = await _make_user(db_session, is_active=False)

        response = await client.get(
            "/api/admin/users?is_active=false&limit=100", headers=admin_auth_headers
        )

        assert response.status_code == 200
        ids = {item["id"] for item in response.json()["items"]}
        assert str(inactive.id) in ids

    @pytest.mark.asyncio
    async def test_is_superuser_filter(
        self, client: AsyncClient, admin_auth_headers: dict, db_session: AsyncSession
    ):
        superuser = await _make_user(db_session, is_superuser=True)

        response = await client.get(
            "/api/admin/users?is_superuser=true&limit=100", headers=admin_auth_headers
        )

        assert response.status_code == 200
        ids = {item["id"] for item in response.json()["items"]}
        assert str(superuser.id) in ids

    @pytest.mark.asyncio
    async def test_sort_order_ascending(
        self, client: AsyncClient, admin_auth_headers: dict, db_session: AsyncSession
    ):
        response = await client.get(
            "/api/admin/users?sort_by=created_at&sort_order=asc&limit=5",
            headers=admin_auth_headers,
        )

        assert response.status_code == 200
        created_ats = [item["created_at"] for item in response.json()["items"]]
        assert created_ats == sorted(created_ats)


class TestGetUser:
    @pytest.mark.asyncio
    async def test_returns_user_with_profile_fields(
        self, client: AsyncClient, admin_auth_headers: dict, test_user: User
    ):
        response = await client.get(
            f"/api/admin/users/{test_user.id}", headers=admin_auth_headers
        )

        assert response.status_code == 200
        data = response.json()
        assert data["id"] == str(test_user.id)
        # test_user has a Profile created by the autouse test_profile fixture.
        assert data["profile_display_name"] == "Test User"

    @pytest.mark.asyncio
    async def test_returns_user_without_profile(
        self, client: AsyncClient, admin_auth_headers: dict, db_session: AsyncSession
    ):
        user = await _make_user(db_session)

        response = await client.get(
            f"/api/admin/users/{user.id}", headers=admin_auth_headers
        )

        assert response.status_code == 200
        assert response.json()["profile_display_name"] is None

    @pytest.mark.asyncio
    async def test_404_for_missing_user(
        self, client: AsyncClient, admin_auth_headers: dict
    ):
        response = await client.get(
            f"/api/admin/users/{uuid.uuid4()}", headers=admin_auth_headers
        )

        assert response.status_code == 404


class TestUpdateUser:
    @pytest.mark.asyncio
    async def test_updates_name_and_logs_action(
        self,
        client: AsyncClient,
        admin_auth_headers: dict,
        db_session: AsyncSession,
        test_admin_user: User,
    ):
        user = await _make_user(db_session)

        response = await client.patch(
            f"/api/admin/users/{user.id}",
            json={"name": "Updated Name"},
            headers=admin_auth_headers,
        )

        assert response.status_code == 200
        assert response.json()["name"] == "Updated Name"

        from sqlalchemy import select

        log_result = await db_session.execute(
            select(AdminActionLog).where(
                AdminActionLog.target_user_id == user.id,
                AdminActionLog.action == "UPDATE_USER",
            )
        )
        assert log_result.scalars().first() is not None

    @pytest.mark.asyncio
    async def test_updates_is_active_and_is_superuser(
        self, client: AsyncClient, admin_auth_headers: dict, db_session: AsyncSession
    ):
        user = await _make_user(db_session)

        response = await client.patch(
            f"/api/admin/users/{user.id}",
            json={"is_active": False, "is_superuser": True},
            headers=admin_auth_headers,
        )

        assert response.status_code == 200
        data = response.json()
        assert data["is_active"] is False
        assert data["is_superuser"] is True

    @pytest.mark.asyncio
    async def test_no_changes_does_not_log(
        self, client: AsyncClient, admin_auth_headers: dict, db_session: AsyncSession
    ):
        user = await _make_user(db_session, name="Same Name")

        response = await client.patch(
            f"/api/admin/users/{user.id}",
            json={"name": "Same Name"},
            headers=admin_auth_headers,
        )

        assert response.status_code == 200
        from sqlalchemy import select

        log_result = await db_session.execute(
            select(AdminActionLog).where(
                AdminActionLog.target_user_id == user.id,
                AdminActionLog.action == "UPDATE_USER",
            )
        )
        assert log_result.scalars().first() is None

    @pytest.mark.asyncio
    async def test_cannot_remove_own_admin_status(
        self, client: AsyncClient, admin_auth_headers: dict, test_admin_user: User
    ):
        response = await client.patch(
            f"/api/admin/users/{test_admin_user.id}",
            json={"is_superuser": False},
            headers=admin_auth_headers,
        )

        assert response.status_code == 400

    @pytest.mark.asyncio
    async def test_404_for_missing_user(
        self, client: AsyncClient, admin_auth_headers: dict
    ):
        response = await client.patch(
            f"/api/admin/users/{uuid.uuid4()}",
            json={"name": "X"},
            headers=admin_auth_headers,
        )

        assert response.status_code == 404


class TestSuspendUser:
    @pytest.mark.asyncio
    async def test_suspends_with_duration(
        self, client: AsyncClient, admin_auth_headers: dict, db_session: AsyncSession
    ):
        user = await _make_user(db_session)

        response = await client.post(
            f"/api/admin/users/{user.id}/suspend",
            json={"reason": "Spamming the forums", "duration_hours": 24},
            headers=admin_auth_headers,
        )

        assert response.status_code == 200
        await db_session.refresh(user)
        assert user.suspended_at is not None
        assert user.suspension_reason == "Spamming the forums"

    @pytest.mark.asyncio
    async def test_suspends_indefinitely_without_duration(
        self, client: AsyncClient, admin_auth_headers: dict, db_session: AsyncSession
    ):
        user = await _make_user(db_session)

        response = await client.post(
            f"/api/admin/users/{user.id}/suspend",
            json={"reason": "Repeated violations"},
            headers=admin_auth_headers,
        )

        assert response.status_code == 200
        await db_session.refresh(user)
        assert user.suspended_until.year >= datetime.utcnow().year + 90

    @pytest.mark.asyncio
    async def test_cannot_suspend_self(
        self, client: AsyncClient, admin_auth_headers: dict, test_admin_user: User
    ):
        response = await client.post(
            f"/api/admin/users/{test_admin_user.id}/suspend",
            json={"reason": "Testing self-suspend guard"},
            headers=admin_auth_headers,
        )

        assert response.status_code == 400

    @pytest.mark.asyncio
    async def test_cannot_suspend_already_banned_user(
        self, client: AsyncClient, admin_auth_headers: dict, db_session: AsyncSession
    ):
        user = await _make_user(db_session, banned_at=datetime.utcnow())

        response = await client.post(
            f"/api/admin/users/{user.id}/suspend",
            json={"reason": "Testing banned guard"},
            headers=admin_auth_headers,
        )

        assert response.status_code == 400

    @pytest.mark.asyncio
    async def test_404_for_missing_user(
        self, client: AsyncClient, admin_auth_headers: dict
    ):
        response = await client.post(
            f"/api/admin/users/{uuid.uuid4()}/suspend",
            json={"reason": "Testing not-found guard"},
            headers=admin_auth_headers,
        )

        assert response.status_code == 404


class TestBanUser:
    @pytest.mark.asyncio
    async def test_bans_and_clears_suspension(
        self, client: AsyncClient, admin_auth_headers: dict, db_session: AsyncSession
    ):
        user = await _make_user(
            db_session,
            suspended_at=datetime.utcnow(),
            suspended_until=datetime.utcnow() + timedelta(days=1),
        )

        response = await client.post(
            f"/api/admin/users/{user.id}/ban",
            json={"reason": "Severe TOS violation"},
            headers=admin_auth_headers,
        )

        assert response.status_code == 200
        await db_session.refresh(user)
        assert user.banned_at is not None
        assert user.is_active is False
        assert user.suspended_at is None
        assert user.suspended_until is None

    @pytest.mark.asyncio
    async def test_cannot_ban_self(
        self, client: AsyncClient, admin_auth_headers: dict, test_admin_user: User
    ):
        response = await client.post(
            f"/api/admin/users/{test_admin_user.id}/ban",
            json={"reason": "Testing self-ban guard"},
            headers=admin_auth_headers,
        )

        assert response.status_code == 400

    @pytest.mark.asyncio
    async def test_cannot_ban_another_admin(
        self, client: AsyncClient, admin_auth_headers: dict, db_session: AsyncSession
    ):
        other_admin = await _make_user(db_session, is_superuser=True)

        response = await client.post(
            f"/api/admin/users/{other_admin.id}/ban",
            json={"reason": "Testing admin-ban guard"},
            headers=admin_auth_headers,
        )

        assert response.status_code == 400

    @pytest.mark.asyncio
    async def test_404_for_missing_user(
        self, client: AsyncClient, admin_auth_headers: dict
    ):
        response = await client.post(
            f"/api/admin/users/{uuid.uuid4()}/ban",
            json={"reason": "Testing not-found guard"},
            headers=admin_auth_headers,
        )

        assert response.status_code == 404


class TestRestoreUser:
    @pytest.mark.asyncio
    async def test_restores_from_ban(
        self, client: AsyncClient, admin_auth_headers: dict, db_session: AsyncSession
    ):
        user = await _make_user(
            db_session, banned_at=datetime.utcnow(), is_active=False
        )

        response = await client.post(
            f"/api/admin/users/{user.id}/restore", headers=admin_auth_headers
        )

        assert response.status_code == 200
        await db_session.refresh(user)
        assert user.banned_at is None
        assert user.is_active is True

    @pytest.mark.asyncio
    async def test_restores_from_suspension(
        self, client: AsyncClient, admin_auth_headers: dict, db_session: AsyncSession
    ):
        user = await _make_user(
            db_session,
            suspended_at=datetime.utcnow(),
            suspended_until=datetime.utcnow() + timedelta(days=1),
        )

        response = await client.post(
            f"/api/admin/users/{user.id}/restore", headers=admin_auth_headers
        )

        assert response.status_code == 200
        await db_session.refresh(user)
        assert user.suspended_at is None

    @pytest.mark.asyncio
    async def test_400_when_not_suspended_or_banned(
        self, client: AsyncClient, admin_auth_headers: dict, db_session: AsyncSession
    ):
        user = await _make_user(db_session)

        response = await client.post(
            f"/api/admin/users/{user.id}/restore", headers=admin_auth_headers
        )

        assert response.status_code == 400

    @pytest.mark.asyncio
    async def test_404_for_missing_user(
        self, client: AsyncClient, admin_auth_headers: dict
    ):
        response = await client.post(
            f"/api/admin/users/{uuid.uuid4()}/restore", headers=admin_auth_headers
        )

        assert response.status_code == 404


class TestIssueWarning:
    @pytest.mark.asyncio
    async def test_issues_warning_and_returns_active_count(
        self, client: AsyncClient, admin_auth_headers: dict, db_session: AsyncSession
    ):
        user = await _make_user(db_session)

        response = await client.post(
            f"/api/admin/users/{user.id}/warnings",
            json={"reason": "Posting inappropriate content", "notify": False},
            headers=admin_auth_headers,
        )

        assert response.status_code == 200
        data = response.json()
        assert data["warning"]["user_id"] == str(user.id)
        assert data["warning"]["reason"] == "Posting inappropriate content"
        assert data["active_count"] == 1
        assert data["escalated"] is False

    @pytest.mark.asyncio
    async def test_cannot_warn_self(
        self, client: AsyncClient, admin_auth_headers: dict, test_admin_user: User
    ):
        response = await client.post(
            f"/api/admin/users/{test_admin_user.id}/warnings",
            json={"reason": "Testing self-warn guard", "notify": False},
            headers=admin_auth_headers,
        )

        assert response.status_code == 400

    @pytest.mark.asyncio
    async def test_404_for_missing_user(
        self, client: AsyncClient, admin_auth_headers: dict
    ):
        response = await client.post(
            f"/api/admin/users/{uuid.uuid4()}/warnings",
            json={"reason": "Testing not-found guard", "notify": False},
            headers=admin_auth_headers,
        )

        assert response.status_code == 404


class TestGetUserWarnings:
    @pytest.mark.asyncio
    async def test_lists_warnings_with_admin_name(
        self,
        client: AsyncClient,
        admin_auth_headers: dict,
        db_session: AsyncSession,
        test_admin_user: User,
    ):
        user = await _make_user(db_session)
        await client.post(
            f"/api/admin/users/{user.id}/warnings",
            json={"reason": "First warning for this user", "notify": False},
            headers=admin_auth_headers,
        )

        response = await client.get(
            f"/api/admin/users/{user.id}/warnings", headers=admin_auth_headers
        )

        assert response.status_code == 200
        data = response.json()
        assert data["total"] == 1
        assert data["active_count"] == 1
        assert data["items"][0]["admin_name"] == test_admin_user.name

    @pytest.mark.asyncio
    async def test_filters_by_status(
        self, client: AsyncClient, admin_auth_headers: dict, db_session: AsyncSession
    ):
        user = await _make_user(db_session)
        await client.post(
            f"/api/admin/users/{user.id}/warnings",
            json={"reason": "Warning to be filtered out", "notify": False},
            headers=admin_auth_headers,
        )

        response = await client.get(
            f"/api/admin/users/{user.id}/warnings?status=REVOKED",
            headers=admin_auth_headers,
        )

        assert response.status_code == 200
        assert response.json()["total"] == 0


class TestRevokeWarning:
    @pytest.mark.asyncio
    async def test_revokes_active_warning(
        self, client: AsyncClient, admin_auth_headers: dict, db_session: AsyncSession
    ):
        user = await _make_user(db_session)
        issue_response = await client.post(
            f"/api/admin/users/{user.id}/warnings",
            json={"reason": "Warning that will be revoked", "notify": False},
            headers=admin_auth_headers,
        )
        warning_id = issue_response.json()["warning"]["id"]

        response = await client.post(
            f"/api/admin/users/{user.id}/warnings/{warning_id}/revoke",
            json={"reason": "Issued in error"},
            headers=admin_auth_headers,
        )

        assert response.status_code == 200
        from sqlalchemy import select

        result = await db_session.execute(
            select(Warning).where(Warning.id == uuid.UUID(warning_id))
        )
        assert result.scalars().first().status == "REVOKED"

    @pytest.mark.asyncio
    async def test_cannot_revoke_already_revoked_warning(
        self, client: AsyncClient, admin_auth_headers: dict, db_session: AsyncSession
    ):
        user = await _make_user(db_session)
        issue_response = await client.post(
            f"/api/admin/users/{user.id}/warnings",
            json={"reason": "Warning revoked twice", "notify": False},
            headers=admin_auth_headers,
        )
        warning_id = issue_response.json()["warning"]["id"]
        await client.post(
            f"/api/admin/users/{user.id}/warnings/{warning_id}/revoke",
            json={"reason": "First revoke"},
            headers=admin_auth_headers,
        )

        response = await client.post(
            f"/api/admin/users/{user.id}/warnings/{warning_id}/revoke",
            json={"reason": "Second revoke attempt"},
            headers=admin_auth_headers,
        )

        assert response.status_code == 400

    @pytest.mark.asyncio
    async def test_404_for_missing_warning(
        self, client: AsyncClient, admin_auth_headers: dict, db_session: AsyncSession
    ):
        user = await _make_user(db_session)

        response = await client.post(
            f"/api/admin/users/{user.id}/warnings/{uuid.uuid4()}/revoke",
            json={"reason": "Testing not-found guard"},
            headers=admin_auth_headers,
        )

        assert response.status_code == 404


class TestMakeAndRevokeAdmin:
    @pytest.mark.asyncio
    async def test_grants_and_revokes_admin(
        self, client: AsyncClient, admin_auth_headers: dict, db_session: AsyncSession
    ):
        user = await _make_user(db_session)

        grant_response = await client.post(
            f"/api/admin/users/{user.id}/make-admin", headers=admin_auth_headers
        )
        assert grant_response.status_code == 200
        await db_session.refresh(user)
        assert user.is_superuser is True

        revoke_response = await client.post(
            f"/api/admin/users/{user.id}/revoke-admin", headers=admin_auth_headers
        )
        assert revoke_response.status_code == 200
        await db_session.refresh(user)
        assert user.is_superuser is False

    @pytest.mark.asyncio
    async def test_cannot_make_already_admin_user_admin(
        self, client: AsyncClient, admin_auth_headers: dict, db_session: AsyncSession
    ):
        user = await _make_user(db_session, is_superuser=True)

        response = await client.post(
            f"/api/admin/users/{user.id}/make-admin", headers=admin_auth_headers
        )

        assert response.status_code == 400

    @pytest.mark.asyncio
    async def test_cannot_make_banned_user_admin(
        self, client: AsyncClient, admin_auth_headers: dict, db_session: AsyncSession
    ):
        user = await _make_user(db_session, banned_at=datetime.utcnow())

        response = await client.post(
            f"/api/admin/users/{user.id}/make-admin", headers=admin_auth_headers
        )

        assert response.status_code == 400

    @pytest.mark.asyncio
    async def test_cannot_revoke_own_admin_status(
        self, client: AsyncClient, admin_auth_headers: dict, test_admin_user: User
    ):
        response = await client.post(
            f"/api/admin/users/{test_admin_user.id}/revoke-admin",
            headers=admin_auth_headers,
        )

        assert response.status_code == 400

    @pytest.mark.asyncio
    async def test_cannot_revoke_admin_from_non_admin(
        self, client: AsyncClient, admin_auth_headers: dict, db_session: AsyncSession
    ):
        user = await _make_user(db_session)

        response = await client.post(
            f"/api/admin/users/{user.id}/revoke-admin", headers=admin_auth_headers
        )

        assert response.status_code == 400

    @pytest.mark.asyncio
    async def test_make_admin_404_for_missing_user(
        self, client: AsyncClient, admin_auth_headers: dict
    ):
        response = await client.post(
            f"/api/admin/users/{uuid.uuid4()}/make-admin", headers=admin_auth_headers
        )

        assert response.status_code == 404

    @pytest.mark.asyncio
    async def test_revoke_admin_404_for_missing_user(
        self, client: AsyncClient, admin_auth_headers: dict
    ):
        response = await client.post(
            f"/api/admin/users/{uuid.uuid4()}/revoke-admin", headers=admin_auth_headers
        )

        assert response.status_code == 404


class TestActionLogs:
    @pytest.mark.asyncio
    async def test_lists_logs_with_names_and_filter(
        self,
        client: AsyncClient,
        admin_auth_headers: dict,
        db_session: AsyncSession,
        test_admin_user: User,
    ):
        user = await _make_user(db_session)
        await client.patch(
            f"/api/admin/users/{user.id}",
            json={"name": "Logged Update"},
            headers=admin_auth_headers,
        )

        response = await client.get(
            f"/api/admin/action-logs?action=UPDATE_USER&target_user_id={user.id}",
            headers=admin_auth_headers,
        )

        assert response.status_code == 200
        data = response.json()
        assert data["total"] >= 1
        entry = next(i for i in data["items"] if i["target_user_id"] == str(user.id))
        assert entry["action"] == "UPDATE_USER"
        assert entry["admin_name"] == test_admin_user.name
        assert entry["target_user_name"] == "Logged Update"

    @pytest.mark.asyncio
    async def test_filters_by_admin_id(
        self,
        client: AsyncClient,
        admin_auth_headers: dict,
        db_session: AsyncSession,
        test_admin_user: User,
    ):
        user = await _make_user(db_session)
        await client.post(
            f"/api/admin/users/{user.id}/make-admin", headers=admin_auth_headers
        )

        response = await client.get(
            f"/api/admin/action-logs?admin_id={test_admin_user.id}&limit=100",
            headers=admin_auth_headers,
        )

        assert response.status_code == 200
        admin_ids = {i["admin_id"] for i in response.json()["items"]}
        assert admin_ids == {str(test_admin_user.id)}


class TestAnalyticsAndHealthEndpoints:
    @pytest.mark.asyncio
    async def test_analytics_overview(
        self, client: AsyncClient, admin_auth_headers: dict
    ):
        response = await client.get(
            "/api/admin/analytics/overview", headers=admin_auth_headers
        )

        assert response.status_code == 200

    @pytest.mark.asyncio
    async def test_analytics_users(self, client: AsyncClient, admin_auth_headers: dict):
        response = await client.get(
            "/api/admin/analytics/users", headers=admin_auth_headers
        )

        assert response.status_code == 200
        data = response.json()
        assert "user_growth" in data
        assert "dau" in data

    @pytest.mark.asyncio
    async def test_analytics_engagement(
        self, client: AsyncClient, admin_auth_headers: dict
    ):
        response = await client.get(
            "/api/admin/analytics/engagement", headers=admin_auth_headers
        )

        assert response.status_code == 200
        assert "engagement" in response.json()

    @pytest.mark.asyncio
    async def test_system_health(self, client: AsyncClient, admin_auth_headers: dict):
        response = await client.get("/api/admin/health", headers=admin_auth_headers)

        assert response.status_code == 200

    @pytest.mark.asyncio
    async def test_database_health(self, client: AsyncClient, admin_auth_headers: dict):
        response = await client.get(
            "/api/admin/health/database", headers=admin_auth_headers
        )

        assert response.status_code == 200

    @pytest.mark.asyncio
    async def test_redis_health(self, client: AsyncClient, admin_auth_headers: dict):
        response = await client.get(
            "/api/admin/health/redis", headers=admin_auth_headers
        )

        assert response.status_code == 200
