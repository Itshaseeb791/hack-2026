import React from 'react';
import { Listing } from '../../types';
import { formatPKR } from '../../utils/formatting';

export const ListingCard: React.FC<{ listing: Listing; onAction?: () => void; actionLabel?: string }> = ({ listing, onAction, actionLabel }) => (
  <div className="bg-white rounded-lg shadow p-4 border">
    <img src={`http://localhost:8000${listing.image_url}`} alt={listing.title} className="w-full h-48 object-cover rounded mb-3" loading="lazy" />
    <h3 className="text-lg font-bold">{listing.title}</h3>
    <p className="text-sm text-gray-600">{listing.vendor_name}</p>
    {listing.donor_name && <p className="text-sm text-green-600">Sponsored by {listing.donor_name}</p>}
    <p className="mt-2"><b>Qty:</b> {listing.qty} | <b>Price:</b> {listing.sponsor_pct === 100 ? 'FREE' : formatPKR(listing.org_price || listing.current_price || listing.original_price)}</p>
    <p className="text-sm">{listing.pickup_location}</p>
    {onAction && <button onClick={onAction} className="w-full bg-green-600 text-white py-2 rounded mt-3 hover:bg-green-700">{actionLabel}</button>}
  </div>
);