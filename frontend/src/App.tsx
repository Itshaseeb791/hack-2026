import React from 'react';
import { RoleProvider, useRole } from './context/RoleContext';
import { RoleSelector } from './components/role/RoleSelector';
import { Header } from './components/layout/Header';
import { SplitScreenLayout } from './components/layout/SplitScreenLayout';
import { ChatContainer } from './components/chat/ChatContainer';
import { FeedTabs } from './components/feed/FeedTabs';
import './index.css';

const AppContent: React.FC = () => {
  const { role } = useRole();

  if (!role) {
    return <RoleSelector />;
  }

  return (
    <div className="h-screen flex flex-col">
      <Header />
      <div className="flex-1 overflow-hidden">
        <SplitScreenLayout
          left={<ChatContainer />}
          right={<FeedTabs />}
        />
      </div>
    </div>
  );
};

function App() {
  return (
    <RoleProvider>
      <AppContent />
    </RoleProvider>
  );
}

export default App;
