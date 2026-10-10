import os
from datetime import datetime
from typing import Optional

from sqlmodel import SQLModel, Field, create_engine, Session

DATABASE_URL = os.environ["DATABASE_URL"]
engine = create_engine(DATABASE_URL, echo=False)


class Organization(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str
    type: str  # "shelter" | "orphanage"
    area: str
    daily_need: str
    dietary_notes: Optional[str] = None


class Listing(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    source: str  # "restaurant" | "sponsored" | "donated"
    vendor_name: Optional[str] = None
    donor_name: Optional[str] = None
    title: str
    description: Optional[str] = None
    qty: int
    original_price: float
    current_price: Optional[float] = None
    sponsor_pct: Optional[int] = None
    org_price: Optional[float] = None
    audience: str  # "public" | "orgs_only"
    image_url: Optional[str] = None
    pickup_location: str
    prepared_at: Optional[datetime] = None
    expiry_time: datetime
    status: str = "available"  # "available" | "sold_out"
    created_at: datetime = Field(default_factory=datetime.utcnow)


class Reservation(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    listing_id: int = Field(foreign_key="listing.id")
    reserved_by: str
    org_id: Optional[int] = Field(default=None, foreign_key="organization.id")
    qty: int
    price_per_unit: float
    pickup_code: str = Field(unique=True)
    status: str = "reserved"  # "reserved" | "collected"
    created_at: datetime = Field(default_factory=datetime.utcnow)


def init_db():
    SQLModel.metadata.create_all(engine)


def get_session():
    with Session(engine) as session:
        yield session
