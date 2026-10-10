import React, { useEffect, useState } from 'react';
import { WifiOff, PackageSearch } from 'lucide-react';
import { listingService } from '../../services/listingService';
import { organizationService } from '../../services/organizationService';
import type { Listing, Organization } from '../../types';
import { ListingCard } from './ListingCard';
import { ListingCardSkeleton } from '../common/Skeleton';
import { EmptyState } from '../common/EmptyState';
import { Modal } from '../common/Modal';
import { Select } from '../common/Select';
import { Input } from '../common/Input';
import { Button } from '../common/Button';
import { useToast } from '../../context/ToastContext';

export const OrgsFeed: React.FC = () => {
  const { showToast } = useToast();
  const [listings, setListings] = useState<Listing[]>([]);
  const [orgs, setOrgs] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [target, setTarget] = useState<Listing | null>(null);
  const [orgId, setOrgId] = useState('');
  const [qty, setQty] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [orgError, setOrgError] = useState<string | null>(null);

  const fetchAll = async (isFirstLoad = false) => {
    if (isFirstLoad) setLoading(true);
    try {
      const [listingData, orgData] = await Promise.all([
        listingService.getListings('org'),
        organizationService.getOrganizations(),
      ]);
      setListings(listingData.filter((l) => l.qty > 0));
      setOrgs(orgData);
      setLoadError(null);
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : 'Could not load listings.');
    } finally {
      if (isFirstLoad) setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll(true);
    const i = setInterval(() => fetchAll(false), 60000);
    return () => clearInterval(i);
  }, []);

  const openClaim = (listing: Listing) => {
    setTarget(listing);
    setOrgId('');
    setQty(listing.qty);
    setOrgError(null);
  };

  const submitClaim = async () => {
    if (!target) return;
    if (!orgId) {
      setOrgError('Select your organization.');
      return;
    }
    setSubmitting(true);
    try {
      const org = orgs.find((o) => String(o.id) === orgId);
      const res = await listingService.reserveListing(target.id, { role: 'org', qty, org_id: Number(orgId) });
      showToast('success', `Claimed for ${org?.name ?? 'your organization'}! Pickup code ${res.pickup_code} — show it at ${res.pickup_location}.`);
      setTarget(null);
      fetchAll(false);
    } catch (e) {
      showToast('error', e instanceof Error ? e.message : 'Could not claim this item.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-4 p-4">
      <h2 className="text-xl font-bold text-slate-900">Free &amp; Subsidized Food</h2>

      {loading ? (
        <div className="grid grid-cols-1 tablet:grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, i) => <ListingCardSkeleton key={i} />)}
        </div>
      ) : loadError ? (
        <EmptyState
          icon={<WifiOff className="w-8 h-8" />}
          title="Couldn't load listings"
          description={loadError}
          action={<Button size="sm" onClick={() => fetchAll(true)}>Retry</Button>}
        />
      ) : listings.length === 0 ? (
        <EmptyState
          icon={<PackageSearch className="w-8 h-8" />}
          title="Nothing available right now"
          description="Sponsored and donated food will appear here as it's posted."
        />
      ) : (
        <div className="grid grid-cols-1 tablet:grid-cols-2 gap-4">
          {listings.map((l) => (
            <ListingCard key={l.id} listing={l} actionLabel="Claim" onAction={() => openClaim(l)} />
          ))}
        </div>
      )}

      <Modal
        isOpen={!!target}
        onClose={() => setTarget(null)}
        title={target ? `Claim "${target.title}"` : ''}
        footer={
          <>
            <Button variant="secondary" onClick={() => setTarget(null)}>Cancel</Button>
            <Button onClick={submitClaim} isLoading={submitting}>Claim</Button>
          </>
        }
      >
        {orgs.length === 0 ? (
          <p className="text-sm text-slate-500">No registered organizations found. Register one via the API before claiming.</p>
        ) : (
          <>
            <Select
              label="Your organization"
              placeholder="Select an organization"
              options={orgs.map((o) => ({ value: String(o.id), label: o.name }))}
              value={orgId}
              onChange={(e) => { setOrgId(e.target.value); setOrgError(null); }}
              error={orgError ?? undefined}
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
          </>
        )}
      </Modal>
    </div>
  );
};
