import httpx
import asyncio

async def test():
    async with httpx.AsyncClient(base_url='http://localhost:8000') as client:
        # Login
        r = await client.post('/api/v1/auth/login', json={'email': 'admin@example.com', 'password': 'admin123'})
        print(f"Login: {r.status_code}")
        data = r.json()
        token = data['access_token']
        headers = {'Authorization': f'Bearer {token}'}
        
        # Test products - manually follow redirect
        r = await client.get('/api/v1/productos/', headers=headers, follow_redirects=False)
        print(f"Products: {r.status_code}")
        print(f"Location: {r.headers.get('location')}")
        if r.status_code == 307:
            r2 = await client.get(r.headers.get('location'), headers=headers)
            print(f"Products (followed): {r2.status_code}")
            print(f"Response: {r2.json()}")

asyncio.run(test())