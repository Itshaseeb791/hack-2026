import React, { useEffect, useState } from 'react';
import { listingService } from '../../services/listingService';
import { Listing } from '../../types';
import { ListingCard } from './ListingCard';

export const PublicFeed: React.FC = () => {
  const [listings, setListings] = useState<Listing[]>([]);
  const fetch = async () => { try { const data = await listingService.getListings('buyer'); setListings(data.filter((l: Listing) => l.qty > 0)); } catch (e) {} };
  useEffect(() => { fetch(); const i = setInterval(fetch, 60000); return () => clearInterval(i); }, []);
  return <div className="space-y-4"><h2 className="text-2xl font-bold">Discounted Food</h2><div className="grid grid-cols-1 md:grid-cols-2 gap-4">{listings.map(l => <ListingCard key={l.id} listing={l} actionLabel="Reserve" onAction={() => alert(`Reserve ${l.title}`)} />)}</div></div>;
};
