import httpx
import asyncio

async def test():
    async with httpx.AsyncClient(base_url='http://localhost:8000') as client:
        r = await client.post('/api/v1/auth/login', json={'email': 'admin@example.com', 'password': 'admin123'})
        print(f"Status: {r.status_code}")
        print(f"Response: {r.json()}")

asyncio.run(test())