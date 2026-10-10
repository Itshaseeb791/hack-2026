export interface ImpactData {
  total_units_collected: number;
  total_value_pkr: number;
  organizations_served: number;
  breakdown: {
    vendor_name: string;
    title: string;
    organization: string;
    qty: number;
  }[];
}
