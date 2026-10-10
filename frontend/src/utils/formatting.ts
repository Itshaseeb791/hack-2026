export const formatPKR = (amount: number): string => {
  return `PKR ${amount.toLocaleString('en-PK')}`;
};

export const formatQuantity = (qty: number): string => {
  return `${qty} unit${qty !== 1 ? 's' : ''}`;
};

export const calculateOrgPrice = (originalPrice: number, sponsorPct: number): number => {
  return originalPrice * (100 - sponsorPct) / 100;
};

export const calculateSponsorCost = (
  units: number,
  originalPrice: number,
  sponsorPct: number
): number => {
  return units * originalPrice * sponsorPct / 100;
};
