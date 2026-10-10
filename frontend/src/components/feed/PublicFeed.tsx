import React, { useEffect, useState } from 'react';
import { WifiOff, PackageSearch } from 'lucide-react';
import { listingService } from '../../services/listingService';
import type { Listing } from '../../types';
import { ListingCard } from './ListingCard';
import { ListingCardSkeleton } from '../common/Skeleton';
import { EmptyState } from '../common/EmptyState';
import { Modal } from '../common/Modal';
import { Input } from '../common/Input';
import { Button } from '../common/Button';
import { useToast } from '../../context/ToastContext';

export const PublicFeed: React.FC = () => {
  const { showToast } = useToast();
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [target, setTarget] = useState<Listing | null>(null);
  const [name, setName] = useState('');
  const [qty, setQty] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [nameError, setNameError] = useState<string | null>(null);

  const fetchListings = async (isFirstLoad = false) => {
    if (isFirstLoad) setLoading(true);
    try {
      const data = await listingService.getListings('buyer');
      setListings(data.filter((l) => l.qty > 0));
      setLoadError(null);
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : 'Could not load listings.');
    } finally {
      if (isFirstLoad) setLoading(false);
    }
  };

  useEffect(() => {
    fetchListings(true);
    const i = setInterval(() => fetchListings(false), 60000);
    return () => clearInterval(i);
  }, []);

  const openReserve = (listing: Listing) => {
    setTarget(listing);
    setName('');
    setQty(1);
    setNameError(null);
  };

  const submitReserve = async () => {
    if (!target) return;
    if (!name.trim()) {
      setNameError('Enter your name so we can generate a pickup code.');
      return;
    }
    setSubmitting(true);
    try {
      const res = await listingService.reserveListing(target.id, { role: 'buyer', qty, name: name.trim() });
      showToast('success', `Reserved! Pickup code ${res.pickup_code} — show it at ${res.pickup_location}.`);
      setTarget(null);
      fetchListings(false);
    } catch (e) {
      showToast('error', e instanceof Error ? e.message : 'Could not reserve this item.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-4 p-4">
      <h2 className="text-xl font-bold text-slate-900">Discounted Food</h2>

      {loading ? (
        <div className="grid grid-cols-1 tablet:grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, i) => <ListingCardSkeleton key={i} />)}
        </div>
      ) : loadError ? (
        <EmptyState
          icon={<WifiOff className="w-8 h-8" />}
          title="Couldn't load listings"
          description={loadError}
          action={<Button size="sm" onClick={() => fetchListings(true)}>Retry</Button>}
        />
      ) : listings.length === 0 ? (
        <EmptyState
          icon={<PackageSearch className="w-8 h-8" />}
          title="No discounted food right now"
          description="Check back soon — new listings appear as restaurants post surplus food."
        />
      ) : (
        <div className="grid grid-cols-1 tablet:grid-cols-2 gap-4">
          {listings.map((l) => (
            <ListingCard key={l.id} listing={l} actionLabel="Reserve" onAction={() => openReserve(l)} />
          ))}
        </div>
      )}

      <Modal
        isOpen={!!target}
        onClose={() => setTarget(null)}
        title={target ? `Reserve "${target.title}"` : ''}
        footer={
          <>
            <Button variant="secondary" onClick={() => setTarget(null)}>Cancel</Button>
            <Button onClick={submitReserve} isLoading={submitting}>Reserve</Button>
          </>
        }
      >
        <Input
          label="Your name"
          value={name}
          onChange={(e) => { setName(e.target.value); setNameError(null); }}
          error={nameError ?? undefined}
          placeholder="e.g. Ali"
        />
        <Input
          label="Quantity"
          type="number"
          min={1}
          max={target?.qty ?? 1}
          value={qty}
          onChange={(e) => setQty(Math.max(1, Math.min(target?.qty ?? 1, Number(e.target.value))))}
          hint={target ? `${target.qty} available` : undefined}
        />
      </Modal>
    </div>
  );
};
