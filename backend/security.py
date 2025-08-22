from datetime import datetime, timedelta, timezone
from passlib.context import CryptContext
from jose import JWTError, jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer

# --- PIN Kód Hashing ---
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def verify_pin(plain_pin: str, hashed_pin: str):
    return pwd_context.verify(plain_pin, hashed_pin)

def get_pin_hash(pin: str):
    return pwd_context.hash(pin)

# --- JWT Token Kezelés ---
SECRET_KEY = "730fc814f963f2f37ea0142e11ce1e69913092a46bc06d53e13e3a074fec0521" # Győződj meg róla, hogy ez egyedi és titkos!
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7 # 1 hét

# Ezt a sort adjuk hozzá: megmondja a FastAPI-nak, hogy a tokent a '/api/login' címen lehet megszerezni
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/login")

def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt