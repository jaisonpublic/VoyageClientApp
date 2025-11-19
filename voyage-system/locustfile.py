from locust import HttpUser, task, between
import json
import os
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
import time

# Shared Key for generating valid tokens for testing
SHARED_KEY = bytes.fromhex("000102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f")
aesgcm = AESGCM(SHARED_KEY)

class VoyageUser(HttpUser):
    wait_time = between(1, 3)
    
    def on_start(self):
        # 1. Generate Encrypted Token (Simulating ClientBackend)
        user_data = {
            "profile_id": "user_loadtest",
            "pan_last_4": "1234",
            "pan_hash": "hash123",
            "language": "en",
            "nickname": "LoadTester",
            "nonce": str(int(time.time())) + "_salt"
        }
        payload_json = json.dumps(user_data).encode('utf-8')
        nonce = os.urandom(12)
        ciphertext = aesgcm.encrypt(nonce, payload_json, None)
        token = nonce.hex() + ciphertext.hex()
        
        # 2. Exchange Token for JWT
        response = self.client.post("/auth/exchange", json={"token": token})
        if response.status_code == 200:
            self.jwt_token = response.json()["access_token"]
            self.headers = {"Authorization": f"Bearer {self.jwt_token}"}
        else:
            print("Auth failed:", response.text)
            self.jwt_token = None

    @task(2)
    def plan_trip(self):
        if not self.jwt_token: return
        
        # Start Chat
        res = self.client.post("/chat", json={
            "origin": "London",
            "destination": "Tokyo",
            "travel_date": "2023-12-01",
            "pax": 2
        }, headers=self.headers)
        
        if res.status_code == 200:
            plan_id = res.json()["tripplanid"]
            
            # Poll a few times
            for _ in range(3):
                self.client.get(f"/chat/{plan_id}", headers=self.headers)
                time.sleep(0.5)

    @task(1)
    def update_profile(self):
        if not self.jwt_token: return
        self.client.post("/profile", json={"language": "fr"}, headers=self.headers)
