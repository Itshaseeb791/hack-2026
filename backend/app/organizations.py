from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlmodel import Session, select

from app.models import Organization, get_session

router = APIRouter()

VALID_TYPES = {"shelter", "orphanage"}


@router.post("/organizations", response_model=Organization)
def create_organization(org: Organization, session: Session = Depends(get_session)):
    if org.type not in VALID_TYPES:
        raise HTTPException(422, f"type must be one of {sorted(VALID_TYPES)}")
    org.id = None
    session.add(org)
    session.commit()
    session.refresh(org)
    return org


@router.get("/organizations", response_model=list[Organization])
def list_organizations(
    type: Optional[str] = Query(default=None),
    session: Session = Depends(get_session),
):
    if type is not None and type not in VALID_TYPES:
        raise HTTPException(422, f"type must be one of {sorted(VALID_TYPES)}")
    stmt = select(Organization)
    if type:
        stmt = stmt.where(Organization.type == type)
    return session.exec(stmt).all()
