from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import os
from dotenv import load_dotenv
import base64
import json
import time
from cryptography.hazmat.primitives.ciphers.aead import AESGCM

load_dotenv()

app = FastAPI()

from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

SHARED_KEY = os.getenv("SHARED_KEY")
if not SHARED_KEY:
    raise ValueError("SHARED_KEY must be set in .env")

# Ensure key is 32 bytes (256 bits) for AES-256
# In a real app, this should be a proper hex or base64 string decoding
# For this demo, we'll assume the env var is a 32-byte hex string or similar.
# Let's enforce it to be a hex string for safety.
try:
    key_bytes = bytes.fromhex(SHARED_KEY)
    if len(key_bytes) != 32:
        raise ValueError
except:
    print("Warning: SHARED_KEY is not a valid 32-byte hex string. Using a fallback for demo if needed, but this will fail decryption.")
    key_bytes = b'0'*32 # Placeholder

aesgcm = AESGCM(key_bytes)

class UserProfile(BaseModel):
    profile_id: str
    pan_last_4: str
    pan_hash: str
    language: str = "en"
    nickname: str

@app.get("/launch-voyage-token")
def get_launch_token():
    # Mock User Data
    user_data = {
        "profile_id": "user_12345",
        "pan_last_4": "9876",
        "pan_hash": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855", # SHA256 of empty string for demo
        "language": "en",
        "nickname": "Jaison",
        "nonce": str(int(time.time())) + "_randomsalt" # Simple nonce
    }
    
    payload_json = json.dumps(user_data).encode('utf-8')
    nonce = os.urandom(12) # GCM nonce
    
    ciphertext = aesgcm.encrypt(nonce, payload_json, None)
    
    # Return format: nonce_hex + ciphertext_hex
    encrypted_token = nonce.hex() + ciphertext.hex()
    
    return {"token": encrypted_token, "voyage_url": "http://localhost:3001"} # Assuming voyage app runs on 3001

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
