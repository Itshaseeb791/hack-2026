import React, { useState } from 'react';
import { listingService } from '../../services/listingService';
import { validateFutureTime, validatePhotoFile } from '../../utils/validation';
import { Input } from '../common/Input';
import { Button } from '../common/Button';
import { Card } from '../common/Card';
import { useToast } from '../../context/ToastContext';

interface FormState {
  vendor_name: string;
  title: string;
  qty: number;
  original_price: number;
  current_price: number;
  pickup_location: string;
  expiry_time: string;
  photo: File | null;
}

const EMPTY: FormState = {
  vendor_name: '', title: '', qty: 0, original_price: 0, current_price: 0,
  pickup_location: '', expiry_time: '', photo: null,
};

export const VendorListingForm: React.FC = () => {
  const { showToast } = useToast();
  const [formData, setFormData] = useState<FormState>(EMPTY);
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});
  const [submitting, setSubmitting] = useState(false);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: undefined }));
  };

  const validate = (): boolean => {
    const next: Partial<Record<keyof FormState, string>> = {};
    if (!formData.vendor_name.trim()) next.vendor_name = 'Required';
    if (!formData.title.trim()) next.title = 'Required';
    if (formData.qty <= 0) next.qty = 'Must be greater than 0';
    if (formData.original_price <= 0) next.original_price = 'Must be greater than 0';
    if (formData.current_price <= 0) next.current_price = 'Must be greater than 0';
    else if (formData.current_price > formData.original_price) next.current_price = 'Cannot exceed original price';
    if (!formData.pickup_location.trim()) next.pickup_location = 'Required';
    if (!formData.expiry_time) next.expiry_time = 'Required';
    else if (!validateFutureTime(new Date(formData.expiry_time))) next.expiry_time = 'Must be in the future';
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
    fd.append('source', 'restaurant');
    fd.append('vendor_name', formData.vendor_name);
    fd.append('title', formData.title);
    fd.append('qty', String(formData.qty));
    fd.append('original_price', String(formData.original_price));
    fd.append('current_price', String(formData.current_price));
    fd.append('pickup_location', formData.pickup_location);
    // datetime-local gives a naive local string (e.g. "2026-10-10T21:00");
    // the backend compares expiry_time against UTC, so convert it to a
    // real UTC instant here rather than sending it as-is.
    fd.append('expiry_time', new Date(formData.expiry_time).toISOString());
    if (formData.photo) fd.append('photo', formData.photo);

    setSubmitting(true);
    try {
      await listingService.createListing(fd);
      showToast('success', 'Listing created!');
      setFormData(EMPTY);
    } catch (e) {
      showToast('error', e instanceof Error ? e.message : 'Could not create the listing.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card className="max-w-2xl mx-auto">
      <form onSubmit={handleSubmit} className="space-y-4">
        <h2 className="text-xl font-bold text-slate-900">Post Surplus Food</h2>

        <Input label="Vendor name" value={formData.vendor_name} onChange={(e) => set('vendor_name', e.target.value)} error={errors.vendor_name} />
        <Input label="Title" placeholder="e.g. Chicken Biryani" value={formData.title} onChange={(e) => set('title', e.target.value)} error={errors.title} />
        <Input label="Quantity" type="number" min={1} value={formData.qty || ''} onChange={(e) => set('qty', Number(e.target.value))} error={errors.qty} />
        <div className="grid grid-cols-2 gap-4">
          <Input label="Original price (PKR)" type="number" min={0} value={formData.original_price || ''} onChange={(e) => set('original_price', Number(e.target.value))} error={errors.original_price} />
          <Input label="Discounted price (PKR)" type="number" min={0} value={formData.current_price || ''} onChange={(e) => set('current_price', Number(e.target.value))} error={errors.current_price} />
        </div>
        <Input label="Pickup location" value={formData.pickup_location} onChange={(e) => set('pickup_location', e.target.value)} error={errors.pickup_location} />
        <Input label="Expires at" type="datetime-local" value={formData.expiry_time} onChange={(e) => set('expiry_time', e.target.value)} error={errors.expiry_time} />
        <Input
          label="Photo"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={(e) => set('photo', e.target.files?.[0] ?? null)}
          error={errors.photo}
        />

        <Button type="submit" isLoading={submitting} className="w-full">Create Listing</Button>
      </form>
    </Card>
  );
};
