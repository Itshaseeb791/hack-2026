import React, { type ReactNode } from 'react';

interface SplitScreenLayoutProps {
  left: ReactNode;
  right: ReactNode;
}

export const SplitScreenLayout: React.FC<SplitScreenLayoutProps> = ({ left, right }) => {
  return (
    <div className="flex flex-col md:flex-row h-screen">
      {/* Left: Chat */}
      <div className="w-full md:w-1/2 border-r border-gray-300 flex flex-col">
        {left}
      </div>
      
      {/* Right: Stream/Listings tabs */}
      <div className="w-full md:w-1/2 flex flex-col">
        {right}
      </div>
    </div>
  );
};
