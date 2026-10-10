import React, { useEffect, useState } from 'react';
import { listingService } from '../../services/listingService';
import { organizationService } from '../../services/organizationService';
import type { Listing, Organization } from '../../types';
import { ListingCard } from './ListingCard';

export const OrgsFeed: React.FC = () => {
  const [listings, setListings] = useState<Listing[]>([]);
  const fetch = async () => { try { const data = await listingService.getListings('org'); setListings(data.filter((l: Listing) => l.qty > 0)); } catch (e) {} };
  useEffect(() => { fetch(); const i = setInterval(fetch, 60000); return () => clearInterval(i); }, []);

  const handleClaim = async (listing: Listing) => {
    let orgs: Organization[] = [];
    try { orgs = await organizationService.getOrganizations(); } catch (e) {}
    if (orgs.length === 0) { alert('No registered organizations found.'); return; }

    const choice = window.prompt(
      `Which organization is claiming this?\n${orgs.map((o, i) => `${i + 1}. ${o.name}`).join('\n')}\n\nEnter the number:`
    );
    const org = choice ? orgs[Number(choice) - 1] : undefined;
    if (!org) return;

    try {
      const res = await listingService.reserveListing(listing.id, { role: 'org', qty: listing.qty, org_id: org.id });
      alert(`Claimed for ${org.name}! Pickup code: ${res.pickup_code}\nShow this at ${res.pickup_location}.`);
      fetch();
    } catch (e) {
      alert('Could not claim this item — it may already be gone.');
    }
  };

  return <div className="space-y-4"><h2 className="text-2xl font-bold">Free & Subsidized Food</h2><div className="grid grid-cols-1 md:grid-cols-2 gap-4">{listings.map(l => <ListingCard key={l.id} listing={l} actionLabel="Claim" onAction={() => handleClaim(l)} />)}</div></div>;
};
