import httpx
import asyncio

async def test():
    async with httpx.AsyncClient(base_url='http://localhost:8000') as client:
        r = await client.post('/api/v1/auth/login', json={'username': 'admin', 'password': 'admin123'})
        print(f"Login: {r.status_code}")
        print(f"Response: {r.text}")

asyncio.run(test())