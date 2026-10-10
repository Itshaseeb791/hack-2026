// Matches GET /donors/{name}/impact exactly (backend/app/donors.py:donor_impact).
export interface ImpactData {
  donor_name: string;
  meals_delivered: number;
  amount_sponsored_pkr: number;
  organizations_helped: { name: string; type: 'shelter' | 'orphanage'; meals: number }[];
}
