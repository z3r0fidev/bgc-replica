"""add_username_to_users

Revision ID: n8o9p0q1r2s3
Revises: m7n8o9p0q1r2
Create Date: 2026-07-28 00:00:00.000000

"""

import re
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "n8o9p0q1r2s3"
down_revision: Union[str, Sequence[str], None] = "m7n8o9p0q1r2"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

_SLUG_RE = re.compile(r"[^a-z0-9_]+")


def _slugify(seed: str) -> str:
    slug = _SLUG_RE.sub("", seed.lower())[:26]
    return slug or "user"


def upgrade() -> None:
    op.add_column("users", sa.Column("username", sa.String(length=30), nullable=True))
    op.create_index(op.f("ix_users_username"), "users", ["username"], unique=True)

    # Backfill existing rows before this column can be relied on as unique
    # going forward - profiles.display_name if set, else users.email's
    # local-part, deduplicated with a numeric suffix on collision. Done in
    # Python (not a single SQL statement) since the dedup check needs to see
    # usernames assigned earlier in the same pass.
    bind = op.get_bind()
    rows = bind.execute(
        sa.text(
            """
            SELECT u.id, u.email, p.display_name
            FROM users u
            LEFT JOIN profiles p ON p.id = u.id
            WHERE u.username IS NULL
            """
        )
    ).fetchall()

    existing = {
        row[0]
        for row in bind.execute(
            sa.text("SELECT username FROM users WHERE username IS NOT NULL")
        ).fetchall()
    }

    for user_id, email, display_name in rows:
        seed = display_name or (email.split("@")[0] if email else "") or str(user_id)
        base = _slugify(seed)
        candidate = base
        suffix = 1
        while candidate in existing:
            suffix_str = str(suffix)
            candidate = f"{base[: 30 - len(suffix_str) - 1]}_{suffix_str}"
            suffix += 1
        existing.add(candidate)

        bind.execute(
            sa.text("UPDATE users SET username = :username WHERE id = :id"),
            {"username": candidate, "id": user_id},
        )


def downgrade() -> None:
    op.drop_index(op.f("ix_users_username"), table_name="users")
    op.drop_column("users", "username")
