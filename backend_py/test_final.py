import httpx
import asyncio

async def test():
    async with httpx.AsyncClient(base_url='http://localhost:8000') as client:
        # Login
        r = await client.post('/api/v1/auth/login', json={'email': 'admin@example.com', 'password': 'admin123'})
        token = r.json()['access_token']
        headers = {'Authorization': f'Bearer {token}'}
        
        # Test products
        r = await client.get('/api/v1/productos/', headers=headers)
        print(f"Products: {r.status_code}, count: {len(r.json())}")
        
        # Test lots
        r = await client.get('/api/v1/lotes/', headers=headers)
        print(f"Lots: {r.status_code}, count: {len(r.json())}")
        
        # Test almacenes
        r = await client.get('/api/v1/productos/almacenes', headers=headers)
        print(f"Almacenes: {r.status_code}, count: {len(r.json())}")
        
        # Test categorias
        r = await client.get('/api/v1/productos/categorias', headers=headers)
        print(f"Categorias: {r.status_code}, count: {len(r.json())}")
        
        # Test proveedores
        r = await client.get('/api/v1/lotes/proveedores', headers=headers)
        print(f"Proveedores: {r.status_code}, count: {len(r.json())}")
        
        # Test presentaciones
        r = await client.get('/api/v1/productos/presentaciones', headers=headers)
        print(f"Presentaciones: {r.status_code}, count: {len(r.json())}")
        
        # Test me endpoint
        r = await client.get('/api/v1/auth/me', headers=headers)
        print(f"Me: {r.status_code}, user: {r.json().get('email')}")

asyncio.run(test())