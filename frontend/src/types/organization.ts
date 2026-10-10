export interface Organization {
  id: number;
  name: string;
  type: 'shelter' | 'orphanage';
  area: string;
  daily_need: string;
  dietary_notes?: string | null;
}
