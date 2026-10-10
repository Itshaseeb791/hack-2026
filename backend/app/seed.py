from datetime import datetime, timedelta

from sqlmodel import Session, select, delete

from app.models import Organization, Listing, Reservation


def _demo_orgs(now: datetime) -> list[Organization]:
    return [
        Organization(name="Edhi Shelter Gulberg", type="shelter", area="Gulberg, Lahore",
                      daily_need="40 meals"),
        Organization(name="Saylani Dastarkhwan Johar Town", type="shelter", area="Johar Town, Lahore",
                      daily_need="60 meals"),
        Organization(name="SOS Children's Village Lahore", type="orphanage", area="Model Town, Lahore",
                      daily_need="30 meals", dietary_notes="No spicy food for younger kids"),
        Organization(name="Dar-ul-Aman Orphanage Model Town", type="orphanage", area="Model Town, Lahore",
                      daily_need="25 meals"),
    ]


def _demo_listings(now: datetime) -> list[Listing]:
    return [
        Listing(source="restaurant", vendor_name="Cafe Zouk", title="Chicken sandwiches",
                description="Grilled chicken sandwiches, boxed", qty=20,
                original_price=350, current_price=180, audience="public",
                pickup_location="Cafe Zouk, Gulberg, Lahore",
                expiry_time=now + timedelta(hours=4)),
        Listing(source="restaurant", vendor_name="Shahi Naan Bakery", title="Fresh naan (pack of 5)",
                description="Tandoor naan, baked this evening", qty=15,
                original_price=250, current_price=100, audience="public",
                pickup_location="Shahi Naan Bakery, Ichhra, Lahore",
                expiry_time=now + timedelta(hours=3)),
        Listing(source="restaurant", vendor_name="Haveli Restaurant", title="Chicken biryani plates",
                description="Leftover biryani from dinner service", qty=25,
                original_price=400, current_price=200, audience="public",
                pickup_location="Haveli Restaurant, Food Street, Lahore",
                expiry_time=now + timedelta(hours=5)),
        Listing(source="restaurant", vendor_name="Sweet Tooth Bakers", title="Assorted pastries",
                description="Cream and fruit pastries, boxed", qty=30,
                original_price=150, current_price=60, audience="public",
                pickup_location="Sweet Tooth Bakers, DHA, Lahore",
                expiry_time=now + timedelta(hours=6)),
        Listing(source="restaurant", vendor_name="Rahat Daal Chawal", title="Daal chawal (plate)",
                description="Daal chawal with salad", qty=18,
                original_price=200, current_price=90, audience="public",
                pickup_location="Rahat Daal Chawal, Anarkali, Lahore",
                expiry_time=now + timedelta(hours=2, minutes=30)),

        # 30 plates sponsored by Ahmed — 10 already claimed+collected below so
        # "My Impact" has real numbers to show immediately, 20 left to claim live.
        Listing(source="sponsored", vendor_name="Haveli Restaurant", donor_name="Ahmed",
                title="Chicken biryani plates (sponsored for orphans)",
                description="30 plates sponsored 100% for orphanages", qty=20,
                original_price=400, sponsor_pct=100, org_price=0, audience="orgs_only",
                pickup_location="Haveli Restaurant, Food Street, Lahore",
                expiry_time=now + timedelta(hours=5)),
        Listing(source="sponsored", vendor_name="Cafe Zouk", donor_name="Bilal",
                title="Chicken sandwich meal boxes (50% sponsored)",
                description="20 meal boxes, half sponsored", qty=20,
                original_price=350, sponsor_pct=50, org_price=175, audience="orgs_only",
                pickup_location="Cafe Zouk, Gulberg, Lahore",
                expiry_time=now + timedelta(hours=4)),

        Listing(source="donated", donor_name="Sana (home kitchen)",
                title="Homemade chicken karahi + roti",
                description="Fresh home-cooked food from a wedding event", qty=40,
                original_price=0, org_price=0, audience="orgs_only",
                pickup_location="DHA Phase 5, Lahore",
                prepared_at=now - timedelta(hours=1),
                expiry_time=now + timedelta(hours=6)),
    ]


def _insert_demo_data(session: Session):
    now = datetime.utcnow()

    for org in _demo_orgs(now):
        session.add(org)
    for listing in _demo_listings(now):
        session.add(listing)
    session.commit()

    # Pre-fill one collected reservation so Ahmed's donor impact and SOS's
    # history aren't empty the first time someone opens those screens.
    sos = session.exec(select(Organization).where(Organization.name == "SOS Children's Village Lahore")).first()
    ahmed_listing = session.exec(
        select(Listing).where(Listing.donor_name == "Ahmed", Listing.source == "sponsored")
    ).first()
    if sos and ahmed_listing:
        session.add(Reservation(
            listing_id=ahmed_listing.id,
            reserved_by=sos.name,
            org_id=sos.id,
            qty=10,
            price_per_unit=0,
            pickup_code="DEM8K2",
            status="collected",
        ))
        session.commit()


def seed_if_empty(session: Session):
    """Called on every backend startup — only seeds an empty database."""
    if session.exec(select(Organization)).first():
        return
    _insert_demo_data(session)


def reset_and_seed(session: Session):
    """Wipes all demo data and reinserts a fresh set. Run on demand before a
    demo to undo whatever testing/clicking has changed, without needing
    `docker compose down -v` (which also clears uploaded photos)."""
    session.exec(delete(Reservation))
    session.exec(delete(Listing))
    session.exec(delete(Organization))
    session.commit()
    _insert_demo_data(session)


if __name__ == "__main__":
    from app.models import init_db, engine

    init_db()
    with Session(engine) as session:
        reset_and_seed(session)
    print("Demo data reset: 4 organizations, 8 listings, 1 pre-collected reservation.")
