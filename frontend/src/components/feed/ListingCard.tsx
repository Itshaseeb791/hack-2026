import React, { useState } from 'react';
import { MapPin, ImageOff } from 'lucide-react';
import type { Listing } from '../../types';
import { formatPKR } from '../../utils/formatting';
import { Card } from '../common/Card';
import { Button } from '../common/Button';
import { ExpiryTimer } from '../common/ExpiryTimer';

const SOURCE_LABEL: Record<Listing['source'], string> = {
  restaurant: 'Surplus',
  sponsored: 'Sponsored',
  donated: 'Donated',
};

export const ListingCard: React.FC<{ listing: Listing; onAction?: () => void; actionLabel?: string }> = ({
  listing,
  onAction,
  actionLabel,
}) => {
  const [imageFailed, setImageFailed] = useState(false);
  const showImage = listing.image_url && !imageFailed;

  return (
    <Card padding="none" className="overflow-hidden flex flex-col">
      {showImage ? (
        <img
          src={`http://localhost:8000${listing.image_url}`}
          alt={listing.title}
          className="w-full h-40 object-cover"
          loading="lazy"
          onError={() => setImageFailed(true)}
        />
      ) : (
        <div className="w-full h-40 bg-canvas flex flex-col items-center justify-center gap-1 text-slate-300">
          <ImageOff className="w-6 h-6" />
          <span className="text-xs">No photo</span>
        </div>
      )}

      <div className="p-4 flex flex-col gap-2 flex-1">
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-base font-bold text-slate-900 leading-snug">{listing.title}</h3>
          <span className="shrink-0 text-xs font-medium px-2 py-0.5 rounded-full bg-canvas text-slate-500">
            {SOURCE_LABEL[listing.source]}
          </span>
        </div>

        {listing.vendor_name && <p className="text-sm text-slate-500">{listing.vendor_name}</p>}
        {listing.donor_name && (
          <p className="text-sm text-brand-700">
            {listing.source === 'donated'
              ? `Donated by ${listing.donor_name}`
              : `Sponsored by ${listing.donor_name}${listing.sponsor_pct ? ` (${listing.sponsor_pct}%)` : ''}`}
          </p>
        )}

        <div className="flex items-center justify-between">
          <span className="text-sm text-slate-600">Qty: {listing.qty}</span>
          <span className={`text-sm font-semibold ${listing.is_free ? 'text-success' : 'text-slate-900'}`}>
            {listing.is_free ? 'FREE' : formatPKR(listing.price)}
          </span>
        </div>

        <p className="text-xs text-slate-500 flex items-center gap-1">
          <MapPin className="w-3 h-3 shrink-0" />
          {listing.pickup_location}
        </p>

        <ExpiryTimer expiryTime={listing.expiry_time} className="self-start" />

        {onAction && (
          <Button onClick={onAction} className="w-full mt-1">
            {actionLabel}
          </Button>
        )}
      </div>
    </Card>
  );
};
