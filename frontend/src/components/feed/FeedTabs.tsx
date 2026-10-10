import React from 'react';
import { useRole } from '../../context/RoleContext';
import { PublicFeed } from './PublicFeed';
import { OrgsFeed } from './OrgsFeed';
import { VendorDashboard } from '../vendor/VendorDashboard';
import { DonorDashboard } from '../donor/DonorDashboard';

// Chat already lives permanently in the left pane (ChatContainer) — this just
// renders the role-specific right-pane content, no tabs needed.
export const FeedTabs: React.FC = () => {
  const { role } = useRole();

  if (role === 'buyer') return <PublicFeed />;
  if (role === 'org') return <OrgsFeed />;
  if (role === 'vendor') return <VendorDashboard />;
  if (role === 'donor') return <DonorDashboard />;
  return null;
};
