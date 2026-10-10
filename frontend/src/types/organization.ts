export interface Organization {
  id: string;
  name: string;
  type: 'shelter' | 'orphanage';
  area: string;
  daily_need: string;
  dietary_notes?: string;
}
