from collections import defaultdict

from fastapi import APIRouter, Depends
from sqlmodel import Session, select

from app.models import Listing, Organization, Reservation, get_session

router = APIRouter()


@router.get("/donors/{donor_name}/impact")
def donor_impact(donor_name: str, session: Session = Depends(get_session)):
    donor_listings = session.exec(
        select(Listing).where(Listing.donor_name == donor_name)
    ).all()
    listing_ids = {l.id: l for l in donor_listings}
    if not listing_ids:
        return {
            "donor_name": donor_name,
            "meals_delivered": 0,
            "amount_sponsored_pkr": 0.0,
            "organizations_helped": [],
        }

    collected = session.exec(
        select(Reservation).where(
            Reservation.listing_id.in_(listing_ids.keys()),
            Reservation.status == "collected",
        )
    ).all()

    meals_delivered = 0
    amount_sponsored = 0.0
    org_meals: dict[int, int] = defaultdict(int)

    for res in collected:
        meals_delivered += res.qty
        listing = listing_ids[res.listing_id]
        if listing.source == "sponsored" and listing.sponsor_pct:
            amount_sponsored += listing.original_price * (listing.sponsor_pct / 100) * res.qty
        if res.org_id is not None:
            org_meals[res.org_id] += res.qty

    organizations_helped = []
    for org_id, meals in org_meals.items():
        org = session.get(Organization, org_id)
        if org:
            organizations_helped.append({"name": org.name, "type": org.type, "meals": meals})

    return {
        "donor_name": donor_name,
        "meals_delivered": meals_delivered,
        "amount_sponsored_pkr": round(amount_sponsored, 2),
        "organizations_helped": organizations_helped,
    }
