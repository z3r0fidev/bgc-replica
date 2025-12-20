from locust import HttpUser, task, between
import uuid

class BGCLiveUser(HttpUser):
    wait_time = between(1, 5)
    
    def on_start(self):
        # In a real scenario, login and get token
        self.user_id = str(uuid.uuid4())
        self.headers = {"Authorization": "Bearer test-token"}

    @task(3)
    def view_feed(self):
        self.client.get("/api/feed/?limit=20", headers=self.headers)

    @task(2)
    def search_profiles(self):
        self.client.get("/api/search/?ethnicity=Other&limit=20", headers=self.headers)

    @task(1)
    def get_own_profile(self):
        self.client.get("/api/profiles/me", headers=self.headers)

    @task(1)
    def view_rooms(self):
        self.client.get("/api/chat/rooms", headers=self.headers)
