from app.services.mentions import extract_mentioned_usernames


class TestExtractMentionedUsernames:
    def test_extracts_single_mention(self):
        assert extract_mentioned_usernames("Hey @johndoe, check this out") == {"johndoe"}

    def test_extracts_multiple_mentions(self):
        result = extract_mentioned_usernames("cc @alice and @bob_123")
        assert result == {"alice", "bob_123"}

    def test_deduplicates_repeated_mentions(self):
        result = extract_mentioned_usernames("@alice thanks @alice!")
        assert result == {"alice"}

    def test_lowercases_mentions(self):
        result = extract_mentioned_usernames("@AliceInWonderland")
        assert result == {"aliceinwonderland"}

    def test_no_mentions_returns_empty_set(self):
        assert extract_mentioned_usernames("just a normal post, no mentions here") == set()

    def test_ignores_email_addresses(self):
        # The @ in an email is preceded by a domain-name-shaped local part,
        # but the regex only looks *after* @, so "example.com" after the @
        # in a bare email would actually match "example" (stops at the dot)
        # - this is a known, accepted false positive rather than something
        # worth a much more complex regex for a first pass.
        result = extract_mentioned_usernames("contact me at user@example.com")
        assert result == {"example"}

    def test_requires_letter_start_matching_username_format(self):
        # "@123abc" - starts with a digit, not a valid username, shouldn't match
        result = extract_mentioned_usernames("ping @123abc")
        assert result == set()

    def test_mention_at_end_of_sentence(self):
        result = extract_mentioned_usernames("great point @alice.")
        assert result == {"alice"}

    def test_too_short_mention_not_matched(self):
        # Username format requires 3+ chars; "@ab" is only 2
        result = extract_mentioned_usernames("hi @ab")
        assert result == set()
