import httpx
import asyncio

async def test():
    async with httpx.AsyncClient(base_url='http://localhost:8000') as client:
        r = await client.post('/api/v1/auth/login', json={'username': 'admin', 'password': 'admin123'})
        token = r.json()['access_token']
        headers = {'Authorization': f'Bearer {token}'}
        
        r = await client.get('/api/v1/productos/', headers=headers)
        print(f"Products: {r.status_code}")
        print(f"Response: {r.text[:200]}")

asyncio.run(test())