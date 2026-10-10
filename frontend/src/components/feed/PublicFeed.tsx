import React, { useEffect, useState } from 'react';
import { listingService } from '../../services/listingService';
import type { Listing } from '../../types';
import { ListingCard } from './ListingCard';

export const PublicFeed: React.FC = () => {
  const [listings, setListings] = useState<Listing[]>([]);
  const fetch = async () => { try { const data = await listingService.getListings('buyer'); setListings(data.filter((l: Listing) => l.qty > 0)); } catch (e) {} };
  useEffect(() => { fetch(); const i = setInterval(fetch, 60000); return () => clearInterval(i); }, []);

  const handleReserve = async (listing: Listing) => {
    const name = window.prompt('Your name (for the pickup code):');
    if (!name) return;
    try {
      const res = await listingService.reserveListing(listing.id, { role: 'buyer', qty: 1, name });
      alert(`Reserved! Pickup code: ${res.pickup_code}\nShow this at ${res.pickup_location}.`);
      fetch();
    } catch (e) {
      alert('Could not reserve this item — it may already be gone.');
    }
  };

  return <div className="space-y-4"><h2 className="text-2xl font-bold">Discounted Food</h2><div className="grid grid-cols-1 md:grid-cols-2 gap-4">{listings.map(l => <ListingCard key={l.id} listing={l} actionLabel="Reserve" onAction={() => handleReserve(l)} />)}</div></div>;
};
