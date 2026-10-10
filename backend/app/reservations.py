import random
import string
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlmodel import Session, select

from app.models import Listing, Organization, Reservation, get_session

router = APIRouter()

CODE_CHARS = "".join(c for c in string.ascii_uppercase + string.digits if c not in "O0I1")


def _generate_pickup_code(session: Session) -> str:
    for _ in range(20):
        code = "".join(random.choice(CODE_CHARS) for _ in range(6))
        existing = session.exec(select(Reservation).where(Reservation.pickup_code == code)).first()
        if not existing:
            return code
    raise HTTPException(500, "could not generate a unique pickup code, try again")


class ReserveRequest(BaseModel):
    role: str  # "buyer" | "org"
    qty: int
    name: Optional[str] = None     # required for buyer
    org_id: Optional[int] = None   # required for org


class ReserveResponse(BaseModel):
    reservation_id: int
    pickup_code: str
    qty: int
    price_per_unit: float
    total_price: float
    pickup_location: str
    expiry_time: str


@router.post("/listings/{listing_id}/reserve", response_model=ReserveResponse)
def reserve_listing(listing_id: int, body: ReserveRequest, session: Session = Depends(get_session)):
    if body.role not in {"buyer", "org"}:
        raise HTTPException(422, "role must be 'buyer' or 'org'")
    if body.qty <= 0:
        raise HTTPException(422, "qty must be greater than 0")

    # Lock the row so two concurrent reservations can't both read stale qty.
    listing = session.exec(
        select(Listing).where(Listing.id == listing_id).with_for_update()
    ).first()
    if not listing:
        raise HTTPException(404, "listing not found")

    if listing.status != "available":
        raise HTTPException(409, "listing is no longer available")

    from datetime import datetime
    if listing.expiry_time <= datetime.utcnow():
        raise HTTPException(409, "listing has expired")

    expected_audience = "public" if body.role == "buyer" else "orgs_only"
    if listing.audience != expected_audience:
        raise HTTPException(403, f"{body.role} cannot reserve this listing")

    if body.qty > listing.qty:
        raise HTTPException(422, f"only {listing.qty} left")

    if body.role == "buyer":
        if not body.name:
            raise HTTPException(422, "name is required for buyer reservations")
        reserved_by = body.name
        org_id = None
        price_per_unit = listing.current_price if listing.current_price is not None else 0.0
    else:
        if body.org_id is None:
            raise HTTPException(422, "org_id is required for org reservations")
        org = session.get(Organization, body.org_id)
        if not org:
            raise HTTPException(404, "organization not found")
        reserved_by = org.name
        org_id = org.id
        price_per_unit = listing.org_price if listing.org_price is not None else 0.0

    pickup_code = _generate_pickup_code(session)

    reservation = Reservation(
        listing_id=listing.id,
        reserved_by=reserved_by,
        org_id=org_id,
        qty=body.qty,
        price_per_unit=price_per_unit,
        pickup_code=pickup_code,
        status="reserved",
    )
    session.add(reservation)

    listing.qty -= body.qty
    if listing.qty == 0:
        listing.status = "sold_out"
    session.add(listing)

    session.commit()
    session.refresh(reservation)

    return ReserveResponse(
        reservation_id=reservation.id,
        pickup_code=pickup_code,
        qty=body.qty,
        price_per_unit=price_per_unit,
        total_price=round(price_per_unit * body.qty, 2),
        pickup_location=listing.pickup_location,
        expiry_time=listing.expiry_time.isoformat(),
    )


class PickupRequest(BaseModel):
    pickup_code: str


@router.post("/reservations/pickup", response_model=Reservation)
def confirm_pickup(body: PickupRequest, session: Session = Depends(get_session)):
    reservation = session.exec(
        select(Reservation).where(Reservation.pickup_code == body.pickup_code.upper())
    ).first()
    if not reservation:
        raise HTTPException(404, "pickup code not found")
    if reservation.status == "collected":
        raise HTTPException(409, "already collected")

    reservation.status = "collected"
    session.add(reservation)
    session.commit()
    session.refresh(reservation)
    return reservation


@router.get("/reservations", response_model=list[Reservation])
def list_reservations(
    name: Optional[str] = Query(default=None),
    org_id: Optional[int] = Query(default=None),
    session: Session = Depends(get_session),
):
    stmt = select(Reservation)
    if name:
        stmt = stmt.where(Reservation.reserved_by == name)
    if org_id is not None:
        stmt = stmt.where(Reservation.org_id == org_id)
    return session.exec(stmt).all()
