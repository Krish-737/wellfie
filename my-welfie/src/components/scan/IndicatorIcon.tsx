import React from 'react';
import {
  Activity,
  AlertTriangle,
  Apple,
  BarChart3,
  Brain,
  Cog,
  Droplets,
  FlaskConical,
  Gauge,
  Heart,
  HeartPulse,
  Leaf,
  Link2,
  Microscope,
  Moon,
  RefreshCw,
  Scale,
  Syringe,
  TrendingDown,
  TrendingUp,
  Waves,
  Wind,
  Zap,
  type LucideIcon,
} from 'lucide-react';

const INDICATOR_ICONS: Record<string, LucideIcon> = {
  pulse: Heart,
  bp: Activity,
  pulse_pressure: BarChart3,
  map: Gauge,
  cardiac_workload: Cog,
  heart_age: HeartPulse,
  resp_rate: Wind,
  spo2: Droplets,
  sdnn: TrendingUp,
  rmssd: Waves,
  mean_rri: RefreshCw,
  lfhf: Scale,
  prq: Link2,
  pns: Moon,
  sns: Zap,
  stress_level: Brain,
  stress_index: TrendingDown,
  normalized_stress_index: Gauge,
  wellness: Leaf,
  wellness_level: Leaf,
  hba1c: FlaskConical,
  hemoglobin: Syringe,
  ascvd: HeartPulse,
  bp_risk: AlertTriangle,
  glucose_risk: Apple,
  cholesterol_risk: Microscope,
};

const FallbackIcon = Activity;

const IndicatorIcon: React.FC<{
  id: string;
  color?: string;
  size?: number;
  strokeWidth?: number;
}> = ({ id, color = '#0f766e', size = 20, strokeWidth = 2.2 }) => {
  const Icon = INDICATOR_ICONS[id] ?? FallbackIcon;
  return <Icon size={size} color={color} strokeWidth={strokeWidth} aria-hidden />;
};

export default IndicatorIcon;
