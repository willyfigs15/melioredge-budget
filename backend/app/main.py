from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware

from app.config import settings
from app.limiter import limiter
from app.routes import auth as auth_routes
from app.routes import budgets, categories, transactions, imports, dashboard


app = FastAPI(title="MeliorEdge Budget API", version="0.1.0")

app.state.limiter = limiter
app.add_middleware(SlowAPIMiddleware)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(RateLimitExceeded)
async def _rate_limit(_request, exc):
    from fastapi.responses import JSONResponse
    return JSONResponse(status_code=429, content={"detail": "Rate limit exceeded"})


@app.get("/api/health")
def health():
    return {"status": "ok", "app": settings.APP_ID}


app.include_router(auth_routes.router)
app.include_router(budgets.router)
app.include_router(categories.router)
app.include_router(transactions.router)
app.include_router(imports.router)
app.include_router(dashboard.router)
