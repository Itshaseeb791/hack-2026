from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.models import init_db, get_session
from app.seed import seed_if_empty
from app.organizations import router as organizations_router
from app.listings import router as listings_router, UPLOAD_DIR
from app.reservations import router as reservations_router
from app.donors import router as donors_router
from app.chat import router as chat_router
from sqlmodel import Session

app = FastAPI(title="SaveFood API")

app.include_router(organizations_router)
app.include_router(listings_router)
app.include_router(reservations_router)
app.include_router(donors_router)
app.include_router(chat_router)
app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def on_startup():
    init_db()
    session_gen = get_session()
    session: Session = next(session_gen)
    try:
        seed_if_empty(session)
    finally:
        session.close()


@app.get("/health")
def health():
    return {"ok": True}
