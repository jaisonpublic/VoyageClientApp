from fastapi import FastAPI, HTTPException, Depends, Header
from pydantic import BaseModel
from sqlalchemy import create_engine, Column, Integer, String, Text, ForeignKey
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session
import os
from dotenv import load_dotenv
import json
import time
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from jose import jwt
from typing import Optional, List

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

# --- Config ---
SHARED_KEY = os.getenv("SHARED_KEY")
JWT_SECRET = os.getenv("JWT_SECRET", "supersecretjwtkey")
JWT_ALGORITHM = "HS256"

if not SHARED_KEY:
    raise ValueError("SHARED_KEY must be set")
key_bytes = bytes.fromhex(SHARED_KEY)
aesgcm = AESGCM(key_bytes)

# --- Database ---
SQLALCHEMY_DATABASE_URL = "sqlite:///./voyage.db"
engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

class Profile(Base):
    __tablename__ = "profiles"
    id = Column(Integer, primary_key=True, index=True)
    profile_id = Column(String, unique=True, index=True)
    pan_last_4 = Column(String)
    pan_hash = Column(String)
    language = Column(String)
    nickname = Column(String)

class ChatSession(Base):
    __tablename__ = "chat_sessions"
    id = Column(Integer, primary_key=True, index=True)
    profile_id = Column(String, ForeignKey("profiles.profile_id"))
    origin = Column(String)
    destination = Column(String)
    travel_date = Column(String)
    pax = Column(Integer)
    status = Column(String) # 'processing', 'completed'
    last_response = Column(Text)

Base.metadata.create_all(bind=engine)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# --- Schemas ---
class AuthExchangeRequest(BaseModel):
    token: str

class ChatRequest(BaseModel):
    origin: str
    destination: str
    travel_date: str
    pax: int
    tripplanid: Optional[int] = None

class ProfileUpdate(BaseModel):
    language: Optional[str] = None

# --- Auth Helper ---
def verify_jwt(authorization: str = Header(...)):
    try:
        token = authorization.split(" ")[1]
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        return payload
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid Token")

# --- APIs ---

@app.post("/auth/exchange")
def exchange_token(req: AuthExchangeRequest, db: Session = Depends(get_db)):
    try:
        # Decrypt
        encrypted_data = bytes.fromhex(req.token)
        nonce = encrypted_data[:12]
        ciphertext = encrypted_data[12:]
        
        decrypted_json = aesgcm.decrypt(nonce, ciphertext, None)
        data = json.loads(decrypted_json)
        
        # Validate Nonce (Simple timestamp check)
        token_nonce = data.get("nonce", "")
        ts = float(token_nonce.split("_")[0])
        if time.time() - ts > 300: # 5 mins
            raise HTTPException(status_code=400, detail="Token expired")
            
        # Create/Update Profile
        profile = db.query(Profile).filter(Profile.profile_id == data["profile_id"]).first()
        if not profile:
            profile = Profile(
                profile_id=data["profile_id"],
                pan_last_4=data["pan_last_4"],
                pan_hash=data["pan_hash"],
                language=data["language"],
                nickname=data["nickname"]
            )
            db.add(profile)
        else:
            profile.language = data["language"]
            profile.nickname = data["nickname"]
        db.commit()
        
        # Issue JWT
        jwt_payload = {"sub": profile.profile_id, "exp": time.time() + 3600}
        token = jwt.encode(jwt_payload, JWT_SECRET, algorithm=JWT_ALGORITHM)
        
        return {"access_token": token, "profile": data}
        
    except Exception as e:
        print(e)
        raise HTTPException(status_code=400, detail="Invalid Token or Decryption Failed")

@app.post("/profile")
def update_profile(update: ProfileUpdate, user=Depends(verify_jwt), db: Session = Depends(get_db)):
    profile = db.query(Profile).filter(Profile.profile_id == user["sub"]).first()
    if update.language:
        profile.language = update.language
    db.commit()
    return {"status": "updated"}

@app.post("/chat")
def chat(req: ChatRequest, user=Depends(verify_jwt), db: Session = Depends(get_db)):
    if req.tripplanid:
        session = db.query(ChatSession).filter(ChatSession.id == req.tripplanid).first()
        if not session:
            raise HTTPException(status_code=404, detail="Session not found")
        # Update session logic here (multi-turn)
        session.last_response = f"Updated plan for {req.destination} based on new info."
    else:
        session = ChatSession(
            profile_id=user["sub"],
            origin=req.origin,
            destination=req.destination,
            travel_date=req.travel_date,
            pax=req.pax,
            status="processing",
            last_response="Calculating best route..."
        )
        db.add(session)
        db.commit() # to get ID
        
        # Simulate async processing
        session.last_response = f"Trip to {req.destination} planned! ID: {session.id}"
        
    db.commit()
    return {"tripplanid": session.id, "message": "Request received"}

@app.get("/chat/{tripplanid}")
def get_chat_status(tripplanid: int, user=Depends(verify_jwt), db: Session = Depends(get_db)):
    session = db.query(ChatSession).filter(ChatSession.id == tripplanid).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    return {"tripplanid": tripplanid, "status": session.status, "response": session.last_response}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
