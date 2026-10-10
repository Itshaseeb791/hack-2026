import React, { useState } from 'react';
import { SponsorListingModal } from './SponsorListingModal';
import { DonorDonationForm } from './DonorDonationForm';
import { ImpactView } from './ImpactView';
import { Button } from '../common/Button';

type Tab = 'sponsor' | 'donate' | 'impact';

const TABS: { id: Tab; label: string }[] = [
  { id: 'sponsor', label: 'Sponsor existing food' },
  { id: 'donate', label: 'Donate your own food' },
  { id: 'impact', label: 'My impact' },
];

export const DonorDashboard: React.FC = () => {
  const [tab, setTab] = useState<Tab>('sponsor');
  const [donorName, setDonorName] = useState('');

  return (
    <div className="p-4 space-y-4">
      <h2 className="text-xl font-bold text-slate-900">Donor Dashboard</h2>

      <div className="flex gap-2 flex-wrap">
        {TABS.map((t) => (
          <Button
            key={t.id}
            size="sm"
            variant={tab === t.id ? 'primary' : 'secondary'}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </Button>
        ))}
      </div>

      {tab === 'sponsor' && (
        <SponsorListingModal donorName={donorName} onDonorNameChange={setDonorName} />
      )}
      {tab === 'donate' && (
        <DonorDonationForm donorName={donorName} onDonorNameChange={setDonorName} />
      )}
      {tab === 'impact' && (
        <ImpactView donorName={donorName} onDonorNameChange={setDonorName} />
      )}
    </div>
  );
};
