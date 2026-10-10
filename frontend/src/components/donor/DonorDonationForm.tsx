import React, { useState } from 'react';
import { listingService } from '../../services/listingService';
import { validateFutureTime, validatePreparedAt, validatePhotoFile } from '../../utils/validation';
import { Input } from '../common/Input';
import { Button } from '../common/Button';
import { useToast } from '../../context/ToastContext';

interface FormState {
  donor_name: string;
  title: string;
  description: string;
  qty: number;
  pickup_location: string;
  prepared_at: string;
  expiry_time: string;
  photo: File | null;
}

const EMPTY: Omit<FormState, 'donor_name'> = {
  title: '', description: '', qty: 0, pickup_location: '', prepared_at: '', expiry_time: '', photo: null,
};

interface Props {
  donorName: string;
  onDonorNameChange: (name: string) => void;
}

export const DonorDonationForm: React.FC<Props> = ({ donorName, onDonorNameChange }) => {
  const { showToast } = useToast();
  const [formData, setFormData] = useState<Omit<FormState, 'donor_name'>>(EMPTY);
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});
  const [submitting, setSubmitting] = useState(false);

  const set = <K extends keyof typeof formData>(key: K, value: (typeof formData)[K]) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: undefined }));
  };

  const validate = (): boolean => {
    const next: Partial<Record<keyof FormState, string>> = {};
    if (!donorName.trim()) next.donor_name = 'Required';
    if (!formData.title.trim()) next.title = 'Required';
    if (formData.qty <= 0) next.qty = 'Must be greater than 0';
    if (!formData.pickup_location.trim()) next.pickup_location = 'Required';
    if (!formData.prepared_at) next.prepared_at = 'Required';
    else if (!validatePreparedAt(new Date(formData.prepared_at))) next.prepared_at = 'Must be within the last 24 hours, not in the future';
    if (!formData.expiry_time) next.expiry_time = 'Required';
    else if (!validateFutureTime(new Date(formData.expiry_time))) next.expiry_time = 'Must be in the future';
    if (formData.prepared_at && formData.expiry_time && new Date(formData.prepared_at) >= new Date(formData.expiry_time)) {
      next.expiry_time = 'Must be after the prepared time';
    }
    if (!formData.photo) next.photo = 'Add a photo of the food';
    else {
      const photoError = validatePhotoFile(formData.photo);
      if (photoError) next.photo = photoError;
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    const fd = new FormData();
    fd.append('source', 'donated');
    fd.append('donor_name', donorName.trim());
    fd.append('title', formData.title);
    if (formData.description.trim()) fd.append('description', formData.description.trim());
    fd.append('qty', String(formData.qty));
    fd.append('pickup_location', formData.pickup_location);
    fd.append('prepared_at', new Date(formData.prepared_at).toISOString());
    fd.append('expiry_time', new Date(formData.expiry_time).toISOString());
    if (formData.photo) fd.append('photo', formData.photo);

    setSubmitting(true);
    try {
      await listingService.createListing(fd);
      showToast('success', 'Thank you — your donation is live for organizations to claim!');
      setFormData(EMPTY);
    } catch (e) {
      showToast('error', e instanceof Error ? e.message : 'Could not post this donation.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Input label="Your name" value={donorName} onChange={(e) => onDonorNameChange(e.target.value)} error={errors.donor_name} placeholder="e.g. Sana" />
      <Input label="Title" placeholder="e.g. Homemade chicken karahi + roti" value={formData.title} onChange={(e) => set('title', e.target.value)} error={errors.title} />
      <Input label="Description (optional)" value={formData.description} onChange={(e) => set('description', e.target.value)} />
      <Input label="Quantity" type="number" min={1} value={formData.qty || ''} onChange={(e) => set('qty', Number(e.target.value))} error={errors.qty} />
      <Input label="Pickup location" value={formData.pickup_location} onChange={(e) => set('pickup_location', e.target.value)} error={errors.pickup_location} />
      <Input label="Prepared at" type="datetime-local" value={formData.prepared_at} onChange={(e) => set('prepared_at', e.target.value)} error={errors.prepared_at} hint="Within the last 24 hours" />
      <Input label="Expires at" type="datetime-local" value={formData.expiry_time} onChange={(e) => set('expiry_time', e.target.value)} error={errors.expiry_time} />
      <Input
        label="Photo"
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={(e) => set('photo', e.target.files?.[0] ?? null)}
        error={errors.photo}
      />
      <Button type="submit" isLoading={submitting} className="w-full">Donate Food</Button>
    </form>
  );
};
