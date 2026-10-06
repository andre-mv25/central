import httpx
import asyncio

async def test():
    async with httpx.AsyncClient(base_url='http://localhost:8000', follow_redirects=True) as client:
        # Login
        r = await client.post('/api/v1/auth/login', json={'email': 'admin@example.com', 'password': 'admin123'})
        token = r.json()['access_token']
        headers = {'Authorization': f'Bearer {token}'}
        
        # Test products - with trailing slash
        r = await client.get('/api/v1/productos/', headers=headers)
        print(f"Products: {r.status_code}")
        print(f"Response: {r.json()}")
        
        # Test lots
        r = await client.get('/api/v1/lotes/', headers=headers)
        print(f"Lots: {r.status_code}")
        print(f"Response: {r.json()}")
        
        # Test almacenes
        r = await client.get('/api/v1/productos/almacenes', headers=headers)
        print(f"Almacenes: {r.status_code}")
        print(f"Response: {r.json()}")
        
        # Test categorias
        r = await client.get('/api/v1/productos/categorias', headers=headers)
        print(f"Categorias: {r.status_code}")
        print(f"Response: {r.json()}")
        
        # Test proveedores
        r = await client.get('/api/v1/lotes/proveedores', headers=headers)
        print(f"Proveedores: {r.status_code}")
        print(f"Response: {r.json()}")

asyncio.run(test())