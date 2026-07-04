import asyncio
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text
async def main():
    engine = create_async_engine("postgresql+asyncpg://postgres:postgres@localhost:5432/autoprism")
    async with engine.connect() as conn:
        res = await conn.execute(text("SELECT raw_content FROM raw_intelligence WHERE target_panel_ids::text LIKE '%p13%' ORDER BY created_at DESC LIMIT 3;"))
        for row in res:
            print("---")
            print(row[0])
asyncio.run(main())
