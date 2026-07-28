import re

# Matches this app's username format (app/schemas/user.py's _USERNAME_RE):
# starts with a letter, 3-30 chars total, letters/numbers/underscores only.
_MENTION_RE = re.compile(r"@([a-zA-Z][a-zA-Z0-9_]{2,29})")


def extract_mentioned_usernames(content: str) -> set[str]:
    """Extract unique, lowercased @username tokens from post content."""
    return {m.group(1).lower() for m in _MENTION_RE.finditer(content)}
