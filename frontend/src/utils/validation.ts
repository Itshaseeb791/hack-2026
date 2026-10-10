export const validatePhotoFile = (file: File): string | null => {
  const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
  if (!validTypes.includes(file.type)) {
    return 'Photo must be jpg, png, or webp';
  }
  
  const maxSize = 5 * 1024 * 1024; // 5 MB
  if (file.size > maxSize) {
    return 'Photo must be under 5 MB';
  }
  
  return null;
};

export const validatePickupCode = (code: string): boolean => {
  return /^[A-Za-z0-9]{6}$/.test(code);
};

export const validateFutureTime = (time: Date): boolean => {
  return time > new Date();
};

export const validatePreparedAt = (time: Date): boolean => {
  const now = new Date();
  const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  return time <= now && time >= twentyFourHoursAgo;
};
