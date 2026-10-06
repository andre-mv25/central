from jose import jwt
from app.core.config import get_settings

settings = get_settings()

# Test token from login
token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOjQsImVtYWlsIjoiYWRtaW5AZXhhbXBsZS5jb20iLCJyb2wiOiJhZG1pbiIsImV4cCI6MTc5MTI4NjAzOH0.WArtpyq0nR7G35eiD2mxwkGY0HWz4iCoc75FkIbDyj4"

try:
    payload = jwt.decode(token, settings.JWT_SECRET_KEY, algorithms=[settings.JWT_ALGORITHM])
    print(f"Decoded: {payload}")
except Exception as e:
    print(f"Error: {e}")

# Test creating a new token
from datetime import datetime, timedelta
data = {"sub": 4, "email": "admin@example.com", "rol": "admin"}
expire = datetime.utcnow() + timedelta(minutes=480)
to_encode = data.copy()
to_encode.update({"exp": expire})
new_token = jwt.encode(to_encode, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)
print(f"New token: {new_token}")

# Try decoding the new token
try:
    payload = jwt.decode(new_token, settings.JWT_SECRET_KEY, algorithms=["HS256"])
    print(f"New token decoded: {payload}")
except Exception as e:
    print(f"New token error: {e}")