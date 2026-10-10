import React, { useState } from 'react';
import { Award, Utensils } from 'lucide-react';
import { donorService } from '../../services/donorService';
import type { ImpactData } from '../../types';
import { formatPKR } from '../../utils/formatting';
import { Input } from '../common/Input';
import { Button } from '../common/Button';
import { Card } from '../common/Card';
import { EmptyState } from '../common/EmptyState';
import { useToast } from '../../context/ToastContext';

interface Props {
  donorName: string;
  onDonorNameChange: (name: string) => void;
}

export const ImpactView: React.FC<Props> = ({ donorName, onDonorNameChange }) => {
  const { showToast } = useToast();
  const [impact, setImpact] = useState<ImpactData | null>(null);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    if (!donorName.trim()) {
      showToast('error', 'Enter your name to view your impact.');
      return;
    }
    setLoading(true);
    try {
      const data = await donorService.getImpact(donorName.trim());
      setImpact(data);
    } catch (e) {
      showToast('error', e instanceof Error ? e.message : 'Could not load impact.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2 items-end">
        <div className="flex-1">
          <Input label="Your name" value={donorName} onChange={(e) => onDonorNameChange(e.target.value)} placeholder="e.g. Ahmed" />
        </div>
        <Button onClick={load} isLoading={loading}>View Impact</Button>
      </div>

      {impact && (
        impact.meals_delivered === 0 ? (
          <EmptyState icon={<Award className="w-8 h-8" />} title="No impact yet" description="Once your sponsored or donated food is picked up, it'll show up here." />
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Card className="text-center">
                <Utensils className="w-5 h-5 text-brand-600 mx-auto mb-1" />
                <p className="text-2xl font-bold text-brand-600">{impact.meals_delivered}</p>
                <p className="text-xs text-slate-500 mt-1">Meals delivered</p>
              </Card>
              <Card className="text-center">
                <p className="text-2xl font-bold text-brand-600">{formatPKR(impact.amount_sponsored_pkr)}</p>
                <p className="text-xs text-slate-500 mt-1">Amount sponsored</p>
              </Card>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-slate-700 mb-2">Organizations helped</h3>
              <div className="space-y-2">
                {impact.organizations_helped.map((org) => (
                  <Card key={org.name} padding="sm" className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-slate-900">{org.name}</p>
                      <span className="text-xs text-slate-500 capitalize">{org.type}</span>
                    </div>
                    <span className="text-sm font-semibold text-brand-600">{org.meals} meals</span>
                  </Card>
                ))}
              </div>
            </div>
          </div>
        )
      )}
    </div>
  );
};
