"""
Load tests for Admin Dashboard API endpoints.

Run with:
    locust -f tests/load_test_admin.py --host=http://localhost:8000

For headless mode with specific parameters:
    locust -f tests/load_test_admin.py --host=http://localhost:8000 \
        --headless -u 50 -r 10 -t 60s

Options:
    -u: Number of users to simulate
    -r: Spawn rate (users per second)
    -t: Test duration
"""
from locust import HttpUser, task, between, events
import uuid
from datetime import datetime


class AdminUser(HttpUser):
    """Simulates an admin user accessing the admin dashboard."""

    wait_time = between(1, 3)

    def on_start(self):
        """Set up admin authentication on start."""
        import os

        # Get token from environment or login
        token = os.environ.get("ADMIN_TOKEN")

        if not token:
            # Try to login
            email = os.environ.get("ADMIN_EMAIL", "admin@bgclive.com")
            password = os.environ.get("ADMIN_PASSWORD", "AdminPass123!")

            response = self.client.post(
                "/api/auth/login",
                data={"username": email, "password": password},
                headers={"Content-Type": "application/x-www-form-urlencoded"},
            )

            if response.status_code == 200:
                token = response.json().get("access_token")
            else:
                print(f"Login failed: {response.status_code} - {response.text}")
                token = "invalid-token"

        self.admin_id = str(uuid.uuid4())
        self.headers = {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
        }
        # Track request counts for reporting
        self.request_count = 0

    @task(5)
    def get_admin_stats(self):
        """Test admin stats endpoint - high frequency."""
        with self.client.get(
            "/api/admin/stats",
            headers=self.headers,
            name="/api/admin/stats",
            catch_response=True,
        ) as response:
            if response.status_code == 200:
                data = response.json()
                if "total_users" not in data:
                    response.failure("Missing total_users in response")
            elif response.status_code == 429:
                response.failure("Rate limited")
            self.request_count += 1

    @task(4)
    def list_users(self):
        """Test user listing with pagination."""
        with self.client.get(
            "/api/admin/users?limit=20&offset=0",
            headers=self.headers,
            name="/api/admin/users",
            catch_response=True,
        ) as response:
            if response.status_code == 200:
                data = response.json()
                if "items" not in data or "total" not in data:
                    response.failure("Invalid response structure")
            elif response.status_code == 429:
                response.failure("Rate limited")

    @task(3)
    def list_users_with_search(self):
        """Test user search functionality."""
        search_terms = ["test", "user", "admin", "john"]
        import random

        query = random.choice(search_terms)
        with self.client.get(
            f"/api/admin/users?query={query}&limit=20",
            headers=self.headers,
            name="/api/admin/users?query=[search]",
            catch_response=True,
        ) as response:
            if response.status_code == 200:
                response.success()
            elif response.status_code == 429:
                response.failure("Rate limited")

    @task(3)
    def list_users_with_filters(self):
        """Test user filtering by status."""
        filters = [
            "is_active=true",
            "is_active=false",
            "is_superuser=true",
            "is_banned=true",
            "is_suspended=true",
        ]
        import random

        filter_param = random.choice(filters)
        with self.client.get(
            f"/api/admin/users?{filter_param}&limit=20",
            headers=self.headers,
            name="/api/admin/users?[filter]",
            catch_response=True,
        ) as response:
            if response.status_code == 200:
                response.success()
            elif response.status_code == 429:
                response.failure("Rate limited")

    @task(2)
    def get_action_logs(self):
        """Test admin action logs endpoint."""
        with self.client.get(
            "/api/admin/action-logs?limit=50",
            headers=self.headers,
            name="/api/admin/action-logs",
            catch_response=True,
        ) as response:
            if response.status_code == 200:
                data = response.json()
                if "items" not in data:
                    response.failure("Invalid response structure")
            elif response.status_code == 429:
                response.failure("Rate limited")

    @task(2)
    def get_analytics_overview(self):
        """Test analytics overview endpoint."""
        with self.client.get(
            "/api/admin/analytics/overview?days=30",
            headers=self.headers,
            name="/api/admin/analytics/overview",
            catch_response=True,
        ) as response:
            if response.status_code == 200:
                response.success()
            elif response.status_code == 429:
                response.failure("Rate limited")

    @task(2)
    def get_user_analytics(self):
        """Test user analytics endpoint."""
        with self.client.get(
            "/api/admin/analytics/users?days=30",
            headers=self.headers,
            name="/api/admin/analytics/users",
            catch_response=True,
        ) as response:
            if response.status_code == 200:
                response.success()
            elif response.status_code == 429:
                response.failure("Rate limited")

    @task(2)
    def get_engagement_analytics(self):
        """Test engagement analytics endpoint."""
        with self.client.get(
            "/api/admin/analytics/engagement?days=30",
            headers=self.headers,
            name="/api/admin/analytics/engagement",
            catch_response=True,
        ) as response:
            if response.status_code == 200:
                response.success()
            elif response.status_code == 429:
                response.failure("Rate limited")

    @task(3)
    def get_system_health(self):
        """Test comprehensive health endpoint."""
        with self.client.get(
            "/api/admin/health",
            headers=self.headers,
            name="/api/admin/health",
            catch_response=True,
        ) as response:
            if response.status_code == 200:
                data = response.json()
                if "status" not in data:
                    response.failure("Missing status in response")
            elif response.status_code == 429:
                response.failure("Rate limited")

    @task(2)
    def get_database_health(self):
        """Test database health endpoint."""
        with self.client.get(
            "/api/admin/health/database",
            headers=self.headers,
            name="/api/admin/health/database",
            catch_response=True,
        ) as response:
            if response.status_code == 200:
                data = response.json()
                if "status" not in data:
                    response.failure("Missing status in response")
            elif response.status_code == 429:
                response.failure("Rate limited")

    @task(2)
    def get_redis_health(self):
        """Test Redis health endpoint."""
        with self.client.get(
            "/api/admin/health/redis",
            headers=self.headers,
            name="/api/admin/health/redis",
            catch_response=True,
        ) as response:
            if response.status_code == 200:
                data = response.json()
                if "status" not in data:
                    response.failure("Missing status in response")
            elif response.status_code == 429:
                response.failure("Rate limited")


class AdminWriteUser(HttpUser):
    """
    Simulates admin write operations at lower frequency.
    These should be tested separately due to their impact.
    """

    wait_time = between(5, 10)
    weight = 1  # Lower weight than read operations

    def on_start(self):
        """Set up admin authentication on start."""
        self.admin_id = str(uuid.uuid4())
        self.headers = {
            "Authorization": "Bearer admin-test-token",
            "Content-Type": "application/json",
        }
        # Generate test user IDs for operations
        self.test_user_ids = [str(uuid.uuid4()) for _ in range(10)]
        self.current_test_idx = 0

    def get_next_test_user(self):
        """Get next test user ID for operations."""
        user_id = self.test_user_ids[self.current_test_idx]
        self.current_test_idx = (self.current_test_idx + 1) % len(self.test_user_ids)
        return user_id

    @task(1)
    def update_user(self):
        """Test user update endpoint."""
        user_id = self.get_next_test_user()
        payload = {"name": f"Updated User {datetime.now().isoformat()}"}
        with self.client.patch(
            f"/api/admin/users/{user_id}",
            json=payload,
            headers=self.headers,
            name="/api/admin/users/[id] PATCH",
            catch_response=True,
        ) as response:
            # 404 is expected for random UUIDs in test
            if response.status_code in [200, 404]:
                response.success()
            elif response.status_code == 429:
                response.failure("Rate limited")


class DashboardRefreshSimulator(HttpUser):
    """
    Simulates dashboard auto-refresh behavior.
    The admin dashboard refreshes health data every 30 seconds.
    """

    wait_time = between(25, 35)  # Simulate 30-second refresh interval

    def on_start(self):
        """Set up admin authentication."""
        self.headers = {
            "Authorization": "Bearer admin-test-token",
            "Content-Type": "application/json",
        }

    @task
    def dashboard_refresh(self):
        """Simulate complete dashboard refresh."""
        # Stats card refresh
        self.client.get(
            "/api/admin/stats",
            headers=self.headers,
            name="[Dashboard] Stats Refresh",
        )

        # Health monitor refresh
        self.client.get(
            "/api/admin/health",
            headers=self.headers,
            name="[Dashboard] Health Refresh",
        )


# Event hooks for custom reporting
@events.test_stop.add_listener
def on_test_stop(environment, **kwargs):
    """Log summary statistics when test stops."""
    stats = environment.stats
    print("\n" + "=" * 80)
    print("ADMIN DASHBOARD LOAD TEST SUMMARY")
    print("=" * 80)
    print(f"Total Requests: {stats.total.num_requests}")
    print(f"Failed Requests: {stats.total.num_failures}")
    print(f"Failure Rate: {stats.total.fail_ratio * 100:.2f}%")
    print(f"Average Response Time: {stats.total.avg_response_time:.2f}ms")
    print(f"95th Percentile: {stats.total.get_response_time_percentile(0.95):.2f}ms")
    print(f"99th Percentile: {stats.total.get_response_time_percentile(0.99):.2f}ms")
    print("=" * 80)
