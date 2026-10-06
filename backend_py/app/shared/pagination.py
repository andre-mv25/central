from typing import Generic, List, Optional, TypeVar
from pydantic import BaseModel, Field
from sqlalchemy import Select, func
from sqlalchemy.ext.asyncio import AsyncSession

T = TypeVar("T")


class CursorPage(BaseModel, Generic[T]):
    items: List[T]
    next_cursor: Optional[str] = None
    has_more: bool = False
    limit: int


class CursorParams(BaseModel):
    cursor: Optional[str] = None
    limit: int = Field(default=50, ge=1, le=200)


async def paginate_cursor(
    session: AsyncSession,
    query: Select,
    params: CursorParams,
    order_column,
    mapper=None,
) -> CursorPage:
    limit = params.limit + 1
    
    if params.cursor:
        query = query.where(order_column > params.cursor)
    
    query = query.order_by(order_column).limit(limit)
    result = await session.execute(query)
    items = result.scalars().all()
    
    has_more = len(items) > params.limit
    if has_more:
        items = items[:params.limit]
    
    next_cursor = None
    if has_more and items:
        last_item = items[-1]
        if mapper:
            next_cursor = str(mapper(last_item))
        else:
            next_cursor = str(getattr(last_item, order_column.key))
    
    return CursorPage(
        items=items,
        next_cursor=next_cursor,
        has_more=has_more,
        limit=params.limit,
    )


class OffsetPage(BaseModel, Generic[T]):
    items: List[T]
    total: int
    page: int
    size: int
    pages: int


class OffsetParams(BaseModel):
    page: int = Field(default=1, ge=1)
    size: int = Field(default=50, ge=1, le=200)


async def paginate_offset(
    session: AsyncSession,
    query: Select,
    params: OffsetParams,
    mapper=None,
) -> OffsetPage:
    count_query = query.with_only_columns(func.count()).order_by(None)
    total_result = await session.execute(count_query)
    total = total_result.scalar_one()
    
    query = query.offset((params.page - 1) * params.size).limit(params.size)
    result = await session.execute(query)
    items = result.scalars().all()
    
    pages = (total + params.size - 1) // params.size
    
    return OffsetPage(
        items=items,
        total=total,
        page=params.page,
        size=params.size,
        pages=pages,
    )