import os
import uuid
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, UploadFile
from pydantic import BaseModel
from sqlmodel import Session, select

from app.models import Listing, get_session

router = APIRouter()

UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

ALLOWED_EXT = {"jpg": "image/jpeg", "jpeg": "image/jpeg", "png": "image/png", "webp": "image/webp"}
MAX_PHOTO_BYTES = 5 * 1024 * 1024

VALID_SOURCES = {"restaurant", "sponsored", "donated"}


def _save_photo(photo: UploadFile) -> str:
    ext = photo.filename.rsplit(".", 1)[-1].lower() if "." in photo.filename else ""
    if ext not in ALLOWED_EXT:
        raise HTTPException(422, "photo must be jpg, png or webp")
    if photo.content_type not in set(ALLOWED_EXT.values()):
        raise HTTPException(422, "photo content type does not match an allowed image type")

    contents = photo.file.read(MAX_PHOTO_BYTES + 1)
    if len(contents) > MAX_PHOTO_BYTES:
        raise HTTPException(422, "photo must be 5MB or smaller")

    filename = f"{uuid.uuid4().hex}.{ext}"
    path = os.path.join(UPLOAD_DIR, filename)
    with open(path, "wb") as f:
        f.write(contents)
    return f"/uploads/{filename}"


@router.post("/listings", response_model=Listing)
def create_listing(
    source: str = Form(...),
    title: str = Form(...),
    qty: int = Form(...),
    pickup_location: str = Form(...),
    expiry_time: datetime = Form(...),
    description: Optional[str] = Form(default=None),
    vendor_name: Optional[str] = Form(default=None),
    original_price: Optional[float] = Form(default=None),
    current_price: Optional[float] = Form(default=None),
    donor_name: Optional[str] = Form(default=None),
    sponsor_pct: Optional[int] = Form(default=None),
    prepared_at: Optional[datetime] = Form(default=None),
    photo: Optional[UploadFile] = File(default=None),
    session: Session = Depends(get_session),
):
    if source not in VALID_SOURCES:
        raise HTTPException(422, f"source must be one of {sorted(VALID_SOURCES)}")
    if qty <= 0:
        raise HTTPException(422, "qty must be greater than 0")
    if expiry_time <= datetime.utcnow():
        raise HTTPException(422, "expiry_time must be in the future")

    audience = "public" if source == "restaurant" else "orgs_only"
    org_price = None

    if source == "restaurant":
        if not vendor_name or original_price is None or current_price is None:
            raise HTTPException(422, "restaurant listings require vendor_name, original_price, current_price")
        if original_price < 0 or current_price < 0:
            raise HTTPException(422, "prices must be >= 0")
        if current_price > original_price:
            raise HTTPException(422, "current_price must be <= original_price")

    elif source == "sponsored":
        if not vendor_name or not donor_name or original_price is None or sponsor_pct is None:
            raise HTTPException(422, "sponsored listings require vendor_name, donor_name, original_price, sponsor_pct")
        if original_price < 0:
            raise HTTPException(422, "original_price must be >= 0")
        if not (1 <= sponsor_pct <= 100):
            raise HTTPException(422, "sponsor_pct must be between 1 and 100")
        org_price = round(original_price * (100 - sponsor_pct) / 100, 2)

    elif source == "donated":
        if not donor_name or prepared_at is None:
            raise HTTPException(422, "donated listings require donor_name, prepared_at")
        if prepared_at >= expiry_time:
            raise HTTPException(422, "prepared_at must be before expiry_time")
        original_price = 0
        org_price = 0

    image_url = _save_photo(photo) if photo is not None else None

    listing = Listing(
        source=source,
        vendor_name=vendor_name,
        donor_name=donor_name,
        title=title,
        description=description,
        qty=qty,
        original_price=original_price,
        current_price=current_price,
        sponsor_pct=sponsor_pct,
        org_price=org_price,
        audience=audience,
        image_url=image_url,
        pickup_location=pickup_location,
        prepared_at=prepared_at,
        expiry_time=expiry_time,
        status="available",
    )
    session.add(listing)
    session.commit()
    session.refresh(listing)
    return listing


class ListingOut(BaseModel):
    id: int
    source: str
    vendor_name: Optional[str]
    donor_name: Optional[str]
    title: str
    description: Optional[str]
    qty: int
    price: float
    is_free: bool
    sponsor_pct: Optional[int]
    image_url: Optional[str]
    pickup_location: str
    expiry_time: datetime
    minutes_left: int
    status: str

    class Config:
        from_attributes = True


def _to_out(listing: Listing, role: str) -> ListingOut:
    price = listing.org_price if role == "org" else listing.current_price
    price = price if price is not None else 0.0
    minutes_left = max(0, int((listing.expiry_time - datetime.utcnow()).total_seconds() // 60))
    return ListingOut(
        id=listing.id,
        source=listing.source,
        vendor_name=listing.vendor_name,
        donor_name=listing.donor_name,
        title=listing.title,
        description=listing.description,
        qty=listing.qty,
        price=price,
        is_free=price == 0,
        sponsor_pct=listing.sponsor_pct,
        image_url=listing.image_url,
        pickup_location=listing.pickup_location,
        expiry_time=listing.expiry_time,
        minutes_left=minutes_left,
        status=listing.status,
    )


def search_listings(
    session: Session,
    role: str,
    keyword: Optional[str] = None,
    max_price: Optional[float] = None,
    free_only: Optional[bool] = None,
    area: Optional[str] = None,
    expiring_within_hours: Optional[float] = None,
    limit: int = 10,
) -> list[Listing]:
    audience = "public" if role == "buyer" else "orgs_only"
    now = datetime.utcnow()
    stmt = select(Listing).where(
        Listing.audience == audience,
        Listing.status == "available",
        Listing.qty > 0,
        Listing.expiry_time > now,
    )
    if keyword:
        stmt = stmt.where(Listing.title.ilike(f"%{keyword}%"))
    if area:
        stmt = stmt.where(Listing.pickup_location.ilike(f"%{area}%"))
    stmt = stmt.order_by(Listing.expiry_time.asc())
    results = session.exec(stmt).all()

    price_field = "org_price" if role == "org" else "current_price"

    def price_of(listing: Listing) -> float:
        p = getattr(listing, price_field)
        return p if p is not None else 0.0

    if max_price is not None:
        results = [l for l in results if price_of(l) <= max_price]
    if free_only:
        results = [l for l in results if price_of(l) == 0]
    if expiring_within_hours is not None:
        from datetime import timedelta
        cutoff = now + timedelta(hours=expiring_within_hours)
        results = [l for l in results if l.expiry_time <= cutoff]

    return results[:limit]


@router.get("/listings", response_model=list[ListingOut])
def list_listings(
    role: str = Query(...),
    q: Optional[str] = Query(default=None),
    max_price: Optional[float] = Query(default=None),
    free_only: Optional[bool] = Query(default=None),
    area: Optional[str] = Query(default=None),
    session: Session = Depends(get_session),
):
    if role not in {"buyer", "org"}:
        raise HTTPException(422, "role must be 'buyer' or 'org'")
    results = search_listings(
        session, role, keyword=q, max_price=max_price, free_only=free_only, area=area, limit=100
    )
    return [_to_out(l, role) for l in results]


@router.get("/listings/{listing_id}", response_model=Listing)
def get_listing(listing_id: int, session: Session = Depends(get_session)):
    listing = session.get(Listing, listing_id)
    if not listing:
        raise HTTPException(404, "listing not found")
    return listing


class SponsorRequest(BaseModel):
    donor_name: str
    qty: int
    sponsor_pct: int


@router.post("/listings/{listing_id}/sponsor", response_model=Listing)
def sponsor_listing(listing_id: int, body: SponsorRequest, session: Session = Depends(get_session)):
    if body.qty <= 0:
        raise HTTPException(422, "qty must be greater than 0")
    if not (1 <= body.sponsor_pct <= 100):
        raise HTTPException(422, "sponsor_pct must be between 1 and 100")

    listing = session.exec(
        select(Listing).where(Listing.id == listing_id).with_for_update()
    ).first()
    if not listing:
        raise HTTPException(404, "listing not found")
    if listing.source != "restaurant" or listing.audience != "public":
        raise HTTPException(422, "only public restaurant listings can be sponsored")
    if listing.status != "available":
        raise HTTPException(409, "listing is no longer available")
    if listing.expiry_time <= datetime.utcnow():
        raise HTTPException(409, "listing has expired")
    if body.qty > listing.qty:
        raise HTTPException(422, f"only {listing.qty} left to sponsor")

    donor_pays_per_unit = listing.current_price if listing.current_price is not None else 0.0
    org_price = round(donor_pays_per_unit * (100 - body.sponsor_pct) / 100, 2)

    sponsored = Listing(
        source="sponsored",
        vendor_name=listing.vendor_name,
        donor_name=body.donor_name,
        title=listing.title,
        description=listing.description,
        qty=body.qty,
        original_price=donor_pays_per_unit,
        sponsor_pct=body.sponsor_pct,
        org_price=org_price,
        audience="orgs_only",
        image_url=listing.image_url,
        pickup_location=listing.pickup_location,
        expiry_time=listing.expiry_time,
        status="available",
    )
    session.add(sponsored)

    listing.qty -= body.qty
    if listing.qty == 0:
        listing.status = "sold_out"
    session.add(listing)

    session.commit()
    session.refresh(sponsored)
    return sponsored
