// The backend sends naive UTC timestamps (e.g. "2026-10-10T11:54:35.68"),
// no trailing "Z" or offset. `new Date(...)` on a string like that is parsed
// as LOCAL time by JS, not UTC — on a machine in any timezone other than
// UTC+0 this silently gives a wrong instant. Normalize before parsing.
const toUtcDate = (value: Date | string): Date => {
  if (value instanceof Date) return value;
  const hasTimezone = /Z$|[+-]\d{2}:\d{2}$/.test(value);
  return new Date(hasTimezone ? value : `${value}Z`);
};

export const formatKarachiTime = (date: Date | string): string => {
  const dateObj = toUtcDate(date);
  return dateObj.toLocaleTimeString('en-PK', {
    timeZone: 'Asia/Karachi',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });
};

export const formatTimeRemaining = (expiryTime: Date | string): string => {
  const dateObj = toUtcDate(expiryTime);
  const now = new Date();
  const diff = dateObj.getTime() - now.getTime();

  if (diff <= 0) return 'Expired';

  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

  return `${hours}h ${minutes}m`;
};

export const getUrgencyLevel = (expiryTime: Date | string): 'normal' | 'warning' | 'critical' => {
  const dateObj = toUtcDate(expiryTime);
  const diff = dateObj.getTime() - new Date().getTime();

  if (diff < 30 * 60 * 1000) return 'critical'; // <30 minutes
  if (diff < 2 * 60 * 60 * 1000) return 'warning'; // <2 hours
  return 'normal';
};
