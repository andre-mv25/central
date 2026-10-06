import httpx
import asyncio

async def test():
    async with httpx.AsyncClient(base_url='http://localhost:8000') as client:
        # Login
        r = await client.post('/api/v1/auth/login', json={'email': 'admin@example.com', 'password': 'admin123'})
        token = r.json()['access_token']
        headers = {'Authorization': f'Bearer {token}'}
        
        # Test products - correct path is /api/v1/productos
        r = await client.get('/api/v1/productos/', headers=headers)
        print(f"Products: {r.status_code}")
        print(f"Response text: {r.text[:200]}")
        
        # Test lots - correct path is /api/v1/lotes
        r = await client.get('/api/v1/lotes/', headers=headers)
        print(f"Lots: {r.status_code}")
        print(f"Response text: {r.text[:200]}")
        
        # Test almacenes
        r = await client.get('/api/v1/productos/almacenes', headers=headers)
        print(f"Almacenes: {r.status_code}")
        print(f"Response text: {r.text[:200]}")

asyncio.run(test())