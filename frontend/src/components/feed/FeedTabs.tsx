import React, { useState } from 'react';
import { useRole } from '../../context/RoleContext';
import { PublicFeed } from './PublicFeed';
import { OrgsFeed } from './OrgsFeed';
import { VendorDashboard } from '../vendor/VendorDashboard';
import { DonorDashboard } from '../donor/DonorDashboard';

export const FeedTabs: React.FC = () => {
  const { role } = useRole();
  const [activeTab, setActiveTab] = useState<'stream' | 'listings'>('listings');

  const renderContent = () => {
    if (activeTab === 'stream') {
      return <div className="text-gray-500 text-center mt-8">AI responses will stream here...</div>;
    }
    if (role === 'buyer') return <PublicFeed />;
    if (role === 'org') return <OrgsFeed />;
    if (role === 'vendor') return <VendorDashboard />;
    if (role === 'donor') return <DonorDashboard />;
    return null;
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex border-b">
        <button onClick={() => setActiveTab('stream')} className={`flex-1 p-3 font-semibold ${activeTab === 'stream' ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-700'}`}>Stream</button>
        <button onClick={() => setActiveTab('listings')} className={`flex-1 p-3 font-semibold ${activeTab === 'listings' ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-700'}`}>Listings</button>
      </div>
      <div className="flex-1 overflow-y-auto p-4">{renderContent()}</div>
    </div>
  );
};
