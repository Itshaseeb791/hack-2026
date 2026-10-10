export const formatKarachiTime = (date: Date | string): string => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return dateObj.toLocaleTimeString('en-PK', { 
    timeZone: 'Asia/Karachi',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });
};

export const formatTimeRemaining = (expiryTime: Date | string): string => {
  const dateObj = typeof expiryTime === 'string' ? new Date(expiryTime) : expiryTime;
  const now = new Date();
  const diff = dateObj.getTime() - now.getTime();
  
  if (diff <= 0) return 'Expired';
  
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  
  return `${hours}h ${minutes}m`;
};

export const getUrgencyLevel = (expiryTime: Date | string): 'normal' | 'warning' | 'critical' => {
  const dateObj = typeof expiryTime === 'string' ? new Date(expiryTime) : expiryTime;
  const diff = dateObj.getTime() - new Date().getTime();
  
  if (diff < 30 * 60 * 1000) return 'critical'; // <30 minutes
  if (diff < 2 * 60 * 60 * 1000) return 'warning'; // <2 hours
  return 'normal';
};
