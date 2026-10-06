import httpx
import asyncio

async def test():
    async with httpx.AsyncClient(base_url='http://localhost:8000') as client:
        # Login
        r = await client.post('/api/v1/auth/login', json={'email': 'admin@example.com', 'password': 'admin123'})
        print(f"Login: {r.status_code}")
        data = r.json()
        token = data['access_token']
        print(f"Token: {token[:50]}...")
        headers = {'Authorization': f'Bearer {token}'}
        
        # Test products
        r = await client.get('/api/v1/productos/', headers=headers)
        print(f"Products: {r.status_code}")
        print(f"Response: {r.text[:200]}")

asyncio.run(test())