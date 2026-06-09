/** Shared gauge view for Recovery + Cardiovascular featured cards. */
export interface RangeFeaturedMetricView {
  value: number | null;
  scaleMin: number;
  scaleMax: number;
  optimalMin?: number;
  optimalMax?: number;
  targetDisplay?: string | null;
  scaleLeftLabel: string;
  scaleRightLabel: string;
  compactDeltaText?: string | null;
  deltaImproved?: boolean;
  compactExtraText?: string | null;
  extraImproved?: boolean;
}
