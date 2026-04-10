from fastapi import FastAPI, APIRouter, HTTPException, Request, Response
from fastapi.responses import JSONResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
import uuid
import bcrypt
import requests
import base64
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional, Any
from datetime import datetime, timezone, timedelta


ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

app = FastAPI()
api_router = APIRouter(prefix="/api")

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


# ─── Helpers ──────────────────────────────────────────────────────────────────

def hash_stop_password(pw: str) -> str:
    return bcrypt.hashpw(pw.lower().encode(), bcrypt.gensalt()).decode()

def check_stop_password(pw: str, hashed: str) -> bool:
    return bcrypt.checkpw(pw.lower().encode(), hashed.encode())

async def get_current_user(request: Request) -> dict:
    token = None
    # 1. Cookie
    cookie_token = request.cookies.get("session_token")
    if cookie_token:
        token = cookie_token
    # 2. Authorization header
    auth_header = request.headers.get("Authorization", "")
    if auth_header.startswith("Bearer "):
        token = auth_header[7:]
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    session = await db.user_sessions.find_one({"session_token": token}, {"_id": 0})
    if not session:
        raise HTTPException(status_code=401, detail="Invalid session")
    # Check expiry
    expires_at = session["expires_at"]
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    if expires_at < datetime.now(timezone.utc):
        raise HTTPException(status_code=401, detail="Session expired")
    user = await db.users.find_one({"user_id": session["user_id"]}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return user


# ─── Models ────────────────────────────────────────────────────────────────────

class StopCreate(BaseModel):
    name: str
    location: str
    description: str
    password: str
    order: int
    emoji: str = "📍"

class SessionCreate(BaseModel):
    title: str
    date: str
    stops: List[StopCreate]

class UnlockRequest(BaseModel):
    password: str

class StopUpdate(BaseModel):
    done: Optional[bool] = None
    rating: Optional[int] = None
    comment: Optional[str] = None
    photo_ids: Optional[List[str]] = None

class DetourCreate(BaseModel):
    place: str
    what: Optional[str] = None
    photo_ids: Optional[List[str]] = []
    rating: Optional[int] = None
    comment: Optional[str] = None

class PhotoUpload(BaseModel):
    data: str  # base64 string
    stop_id: str
    type: str = "stop"  # "stop" or "detour"
    detour_id: Optional[str] = None


# ─── Auth ──────────────────────────────────────────────────────────────────────

@api_router.post("/auth/session")
async def exchange_session(request: Request, response: Response):
    body = await request.json()
    session_id = body.get("session_id")
    if not session_id:
        raise HTTPException(status_code=400, detail="session_id required")

    # Call Emergent auth to get user data
    try:
        res = requests.get(
            "https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data",
            headers={"X-Session-ID": session_id},
            timeout=10
        )
        if res.status_code != 200:
            raise HTTPException(status_code=401, detail="Invalid session_id")
        data = res.json()
    except requests.RequestException:
        raise HTTPException(status_code=503, detail="Auth service unavailable")

    email = data.get("email")
    name = data.get("name", email)
    picture = data.get("picture", "")
    session_token = data.get("session_token")

    # Upsert user
    existing = await db.users.find_one({"email": email}, {"_id": 0})
    if existing:
        user_id = existing["user_id"]
        await db.users.update_one(
            {"email": email},
            {"$set": {"name": name, "picture": picture}}
        )
    else:
        user_id = f"user_{uuid.uuid4().hex[:12]}"
        await db.users.insert_one({
            "user_id": user_id,
            "email": email,
            "name": name,
            "picture": picture,
            "created_at": datetime.now(timezone.utc)
        })

    # Store session
    expires_at = datetime.now(timezone.utc) + timedelta(days=7)
    await db.user_sessions.delete_many({"user_id": user_id})  # clean old
    await db.user_sessions.insert_one({
        "user_id": user_id,
        "session_token": session_token,
        "expires_at": expires_at,
        "created_at": datetime.now(timezone.utc)
    })

    # Set httpOnly cookie
    response.set_cookie(
        key="session_token",
        value=session_token,
        httponly=True,
        secure=True,
        samesite="none",
        max_age=7 * 24 * 3600,
        path="/"
    )

    user = await db.users.find_one({"user_id": user_id}, {"_id": 0})
    return {"user": user, "session_token": session_token}


@api_router.get("/auth/me")
async def get_me(request: Request):
    user = await get_current_user(request)
    return user


@api_router.post("/auth/logout")
async def logout(request: Request, response: Response):
    token = request.cookies.get("session_token")
    auth_header = request.headers.get("Authorization", "")
    if auth_header.startswith("Bearer "):
        token = auth_header[7:]
    if token:
        await db.user_sessions.delete_many({"session_token": token})
    response.delete_cookie("session_token", path="/")
    return {"message": "Logged out"}


# ─── Sessions ──────────────────────────────────────────────────────────────────

@api_router.post("/sessions")
async def create_session(body: SessionCreate, request: Request):
    user = await get_current_user(request)
    session_id = f"sess_{uuid.uuid4().hex[:16]}"
    now = datetime.now(timezone.utc)

    await db.date_sessions.insert_one({
        "session_id": session_id,
        "user_id": user["user_id"],
        "title": body.title,
        "date": body.date,
        "created_at": now
    })

    for stop_data in body.stops:
        stop_id = f"stop_{uuid.uuid4().hex[:16]}"
        await db.stops.insert_one({
            "stop_id": stop_id,
            "session_id": session_id,
            "name": stop_data.name,
            "location": stop_data.location,
            "description": stop_data.description,
            "password_hash": hash_stop_password(stop_data.password),
            "order": stop_data.order,
            "emoji": stop_data.emoji,
            "unlocked": False,
            "done": False,
            "rating": None,
            "comment": None,
            "photo_ids": [],
            "detour": None,
            "created_at": now
        })

    return {"session_id": session_id, "message": "Session created"}


@api_router.get("/sessions")
async def list_sessions(request: Request):
    user = await get_current_user(request)
    sessions = await db.date_sessions.find(
        {"user_id": user["user_id"]},
        {"_id": 0}
    ).sort("created_at", -1).to_list(50)
    # Add stop count per session
    result = []
    for s in sessions:
        total = await db.stops.count_documents({"session_id": s["session_id"]})
        done = await db.stops.count_documents({"session_id": s["session_id"], "done": True})
        result.append({**s, "total_stops": total, "done_stops": done})
    return result


@api_router.get("/sessions/{session_id}")
async def get_session(session_id: str, request: Request):
    user = await get_current_user(request)
    session = await db.date_sessions.find_one(
        {"session_id": session_id, "user_id": user["user_id"]},
        {"_id": 0}
    )
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    stops_raw = await db.stops.find(
        {"session_id": session_id},
        {"_id": 0, "password_hash": 0}
    ).sort("order", 1).to_list(None)
    return {"session": session, "stops": stops_raw}


# ─── Stops ─────────────────────────────────────────────────────────────────────

@api_router.post("/stops/{stop_id}/unlock")
async def unlock_stop(stop_id: str, body: UnlockRequest, request: Request):
    user = await get_current_user(request)
    stop = await db.stops.find_one({"stop_id": stop_id}, {"_id": 0})
    if not stop:
        raise HTTPException(status_code=404, detail="Stop not found")

    # Verify session ownership
    session = await db.date_sessions.find_one({
        "session_id": stop["session_id"],
        "user_id": user["user_id"]
    })
    if not session:
        raise HTTPException(status_code=403, detail="Not your session")

    # Already unlocked
    if stop["unlocked"]:
        stop_out = dict(stop)
        stop_out.pop("password_hash", None)
        return {"unlocked": True, "stop": stop_out}

    # Check previous stop is done (sequential unlock)
    if stop["order"] > 1:
        prev = await db.stops.find_one({
            "session_id": stop["session_id"],
            "order": stop["order"] - 1
        }, {"_id": 0})
        if prev and not prev.get("done", False):
            raise HTTPException(status_code=403, detail="Complete previous stop first")

    # Verify password
    if not check_stop_password(body.password, stop["password_hash"]):
        raise HTTPException(status_code=401, detail="Wrong password")

    # Mark unlocked
    await db.stops.update_one({"stop_id": stop_id}, {"$set": {"unlocked": True}})

    stop_out = dict(stop)
    stop_out.pop("password_hash", None)
    stop_out["unlocked"] = True
    return {"unlocked": True, "stop": stop_out}


@api_router.patch("/stops/{stop_id}")
async def update_stop(stop_id: str, body: StopUpdate, request: Request):
    user = await get_current_user(request)
    stop = await db.stops.find_one({"stop_id": stop_id}, {"_id": 0})
    if not stop:
        raise HTTPException(status_code=404, detail="Stop not found")

    session = await db.date_sessions.find_one({
        "session_id": stop["session_id"],
        "user_id": user["user_id"]
    })
    if not session:
        raise HTTPException(status_code=403, detail="Not your session")

    updates = {}
    if body.done is not None:
        updates["done"] = body.done
    if body.rating is not None:
        updates["rating"] = body.rating
    if body.comment is not None:
        updates["comment"] = body.comment
    if body.photo_ids is not None:
        updates["photo_ids"] = body.photo_ids

    if updates:
        await db.stops.update_one({"stop_id": stop_id}, {"$set": updates})

    updated = await db.stops.find_one({"stop_id": stop_id}, {"_id": 0, "password_hash": 0})
    return updated


# ─── Detours ───────────────────────────────────────────────────────────────────

@api_router.post("/stops/{stop_id}/detour")
async def save_detour(stop_id: str, body: DetourCreate, request: Request):
    user = await get_current_user(request)
    stop = await db.stops.find_one({"stop_id": stop_id}, {"_id": 0})
    if not stop:
        raise HTTPException(status_code=404, detail="Stop not found")

    session = await db.date_sessions.find_one({
        "session_id": stop["session_id"],
        "user_id": user["user_id"]
    })
    if not session:
        raise HTTPException(status_code=403, detail="Not your session")

    detour = {
        "detour_id": f"det_{uuid.uuid4().hex[:12]}",
        "stop_id": stop_id,
        "place": body.place,
        "what": body.what,
        "photo_ids": body.photo_ids or [],
        "rating": body.rating,
        "comment": body.comment,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.stops.update_one({"stop_id": stop_id}, {"$set": {"detour": detour}})
    return detour


# ─── Photos ────────────────────────────────────────────────────────────────────

@api_router.post("/photos/upload")
async def upload_photo(body: PhotoUpload, request: Request):
    user = await get_current_user(request)
    # Verify ownership
    stop = await db.stops.find_one({"stop_id": body.stop_id}, {"_id": 0})
    if not stop:
        raise HTTPException(status_code=404, detail="Stop not found")
    session = await db.date_sessions.find_one({
        "session_id": stop["session_id"],
        "user_id": user["user_id"]
    })
    if not session:
        raise HTTPException(status_code=403, detail="Not your session")

    # Clean base64 (remove data URI prefix if present)
    data = body.data
    if "," in data:
        data = data.split(",")[1]

    photo_id = f"photo_{uuid.uuid4().hex[:16]}"
    await db.photos.insert_one({
        "photo_id": photo_id,
        "stop_id": body.stop_id,
        "detour_id": body.detour_id,
        "data": data,
        "type": body.type,
        "created_at": datetime.now(timezone.utc)
    })
    return {"photo_id": photo_id}


@api_router.get("/photos/{photo_id}")
async def get_photo(photo_id: str):
    photo = await db.photos.find_one({"photo_id": photo_id}, {"_id": 0})
    if not photo:
        raise HTTPException(status_code=404, detail="Photo not found")
    img_bytes = base64.b64decode(photo["data"])
    return Response(content=img_bytes, media_type="image/jpeg")


@api_router.delete("/photos/{photo_id}")
async def delete_photo(photo_id: str, request: Request):
    user = await get_current_user(request)
    photo = await db.photos.find_one({"photo_id": photo_id}, {"_id": 0})
    if not photo:
        raise HTTPException(status_code=404, detail="Photo not found")
    stop = await db.stops.find_one({"stop_id": photo["stop_id"]}, {"_id": 0})
    if stop:
        session = await db.date_sessions.find_one({
            "session_id": stop["session_id"],
            "user_id": user["user_id"]
        })
        if not session:
            raise HTTPException(status_code=403, detail="Not your session")
    await db.photos.delete_one({"photo_id": photo_id})
    return {"message": "Deleted"}


app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
