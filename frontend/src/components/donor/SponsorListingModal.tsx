import React, { useEffect, useState } from 'react';
import { WifiOff, PackageSearch } from 'lucide-react';
import { listingService } from '../../services/listingService';
import type { Listing } from '../../types';
import { ListingCard } from '../feed/ListingCard';
import { ListingCardSkeleton } from '../common/Skeleton';
import { EmptyState } from '../common/EmptyState';
import { Modal } from '../common/Modal';
import { Input } from '../common/Input';
import { Button } from '../common/Button';
import { formatPKR, calculateOrgPrice, calculateSponsorCost } from '../../utils/formatting';
import { useToast } from '../../context/ToastContext';

interface Props {
  donorName: string;
  onDonorNameChange: (name: string) => void;
}

export const SponsorListingModal: React.FC<Props> = ({ donorName, onDonorNameChange }) => {
  const { showToast } = useToast();
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [target, setTarget] = useState<Listing | null>(null);
  const [qty, setQty] = useState(1);
  const [sponsorPct, setSponsorPct] = useState(100);
  const [submitting, setSubmitting] = useState(false);
  const [nameError, setNameError] = useState<string | null>(null);

  const fetchListings = async (isFirstLoad = false) => {
    if (isFirstLoad) setLoading(true);
    try {
      const data = await listingService.getListings('buyer');
      setListings(data.filter((l) => l.source === 'restaurant' && l.qty > 0));
      setLoadError(null);
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : 'Could not load listings.');
    } finally {
      if (isFirstLoad) setLoading(false);
    }
  };

  useEffect(() => { fetchListings(true); }, []);

  const openSponsor = (listing: Listing) => {
    setTarget(listing);
    setQty(listing.qty);
    setSponsorPct(100);
    setNameError(null);
  };

  const submitSponsor = async () => {
    if (!target) return;
    if (!donorName.trim()) {
      setNameError('Enter your name so organizations know who sponsored this.');
      return;
    }
    setSubmitting(true);
    try {
      await listingService.sponsorListing(target.id, { donor_name: donorName.trim(), qty, sponsor_pct: sponsorPct });
      showToast('success', `Sponsored ${qty} x "${target.title}" for organizations.`);
      setTarget(null);
      fetchListings(false);
    } catch (e) {
      showToast('error', e instanceof Error ? e.message : 'Could not sponsor this listing.');
    } finally {
      setSubmitting(false);
    }
  };

  const orgPrice = target ? calculateOrgPrice(target.price, sponsorPct) : 0;
  const donorCost = target ? calculateSponsorCost(qty, target.price, sponsorPct) : 0;

  return (
    <div className="space-y-4">
      <Input
        label="Your name"
        value={donorName}
        onChange={(e) => onDonorNameChange(e.target.value)}
        placeholder="e.g. Ahmed"
        error={nameError ?? undefined}
      />

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
        <EmptyState icon={<PackageSearch className="w-8 h-8" />} title="No restaurant listings to sponsor right now" />
      ) : (
        <div className="grid grid-cols-1 tablet:grid-cols-2 gap-4">
          {listings.map((l) => (
            <ListingCard key={l.id} listing={l} actionLabel="Sponsor" onAction={() => openSponsor(l)} />
          ))}
        </div>
      )}

      <Modal
        isOpen={!!target}
        onClose={() => setTarget(null)}
        title={target ? `Sponsor "${target.title}"` : ''}
        footer={
          <>
            <Button variant="secondary" onClick={() => setTarget(null)}>Cancel</Button>
            <Button onClick={submitSponsor} isLoading={submitting}>Sponsor</Button>
          </>
        }
      >
        <Input
          label="Quantity"
          type="number"
          min={1}
          max={target?.qty ?? 1}
          value={qty}
          onChange={(e) => setQty(Math.max(1, Math.min(target?.qty ?? 1, Number(e.target.value))))}
          hint={target ? `${target.qty} available` : undefined}
        />
        <Input
          label="Sponsor percentage"
          type="number"
          min={1}
          max={100}
          value={sponsorPct}
          onChange={(e) => setSponsorPct(Math.max(1, Math.min(100, Number(e.target.value))))}
        />
        <div className="rounded-md bg-canvas p-3 text-sm space-y-1">
          <p className="flex justify-between"><span>You pay</span><span className="font-semibold">{formatPKR(donorCost)}</span></p>
          <p className="flex justify-between text-slate-500"><span>Organization pays (per unit)</span><span>{orgPrice === 0 ? 'FREE' : formatPKR(orgPrice)}</span></p>
        </div>
      </Modal>
    </div>
  );
};
