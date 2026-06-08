from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from api.database import init_db, close_db, reset_db
from api.routers import auth, application_types, applications, approvals, export


@asynccontextmanager
async def lifespan(app):
    await init_db()
    yield
    await close_db()


app = FastAPI(lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(application_types.router)
app.include_router(applications.router)
app.include_router(approvals.router)
app.include_router(export.router)


@app.delete("/api/database")
async def reset_database():
    await reset_db()
    return {"ok": True}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8117)
