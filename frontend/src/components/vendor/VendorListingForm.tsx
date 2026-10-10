import React, { useState } from 'react';
import { listingService } from '../../services/listingService';

export const VendorListingForm: React.FC = () => {
  const [formData, setFormData] = useState({ vendor_name: '', title: '', qty: 0, original_price: 0, current_price: 0, pickup_location: '', expiry_time: '', photo: null as File | null });
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const fd = new FormData();
    Object.entries(formData).forEach(([k, v]) => { if (v) fd.append(k, k === 'photo' ? v : String(v)); });
    fd.append('source', 'restaurant');
    try { await listingService.createListing(fd); alert('Listing created!'); } catch (e) { alert('Error creating listing'); }
  };
  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-w-2xl mx-auto bg-white p-6 rounded shadow">
      <h2 className="text-2xl font-bold">Post Surplus Food</h2>
      <input placeholder="Vendor Name" className="w-full border p-2 rounded" onChange={e => setFormData({...formData, vendor_name: e.target.value})} required />
      <input placeholder="Title (e.g., Chicken Biryani)" className="w-full border p-2 rounded" onChange={e => setFormData({...formData, title: e.target.value})} required />
      <input type="number" placeholder="Quantity" className="w-full border p-2 rounded" onChange={e => setFormData({...formData, qty: +e.target.value})} required />
      <input type="number" placeholder="Original Price (PKR)" className="w-full border p-2 rounded" onChange={e => setFormData({...formData, original_price: +e.target.value})} required />
      <input type="number" placeholder="Discounted Price (PKR)" className="w-full border p-2 rounded" onChange={e => setFormData({...formData, current_price: +e.target.value})} required />
      <input placeholder="Pickup Location" className="w-full border p-2 rounded" onChange={e => setFormData({...formData, pickup_location: e.target.value})} required />
      <input type="datetime-local" className="w-full border p-2 rounded" onChange={e => setFormData({...formData, expiry_time: e.target.value})} required />
      <input type="file" accept="image/*" className="w-full border p-2 rounded" onChange={e => setFormData({...formData, photo: e.target.files?.[0] || null})} required />
      <button type="submit" className="w-full bg-green-600 text-white py-2 rounded hover:bg-green-700">Create Listing</button>
    </form>
  );
};
