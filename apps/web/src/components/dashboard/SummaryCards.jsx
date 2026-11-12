import {
  Activity,
  AlertTriangle,
  Cpu,
  HardDrive,
  MemoryStick,
  Server,
  Siren,
} from 'lucide-react';
import { Card, CardContent } from '../../design-system';
import { cn } from '../../utils/cn';

const items = [
  { key: 'totalServers', label: 'Total Servers', icon: Server, format: (v) => v },
  { key: 'healthyServers', label: 'Healthy', icon: Activity, tone: 'success', format: (v) => v },
  { key: 'warningServers', label: 'Warning', icon: AlertTriangle, tone: 'warning', format: (v) => v },
  { key: 'criticalServers', label: 'Critical', icon: Siren, tone: 'critical', format: (v) => v },
  { key: 'activeIncidents', label: 'Active Incidents', icon: AlertTriangle, tone: 'danger', format: (v) => v },
  { key: 'avgCpu', label: 'Avg CPU', icon: Cpu, format: (v) => `${v}%` },
  { key: 'avgMemory', label: 'Avg Memory', icon: MemoryStick, format: (v) => `${v}%` },
  { key: 'monitoredApps', label: 'Monitored Apps', icon: HardDrive, format: (v) => v },
];

const toneText = {
  success: 'text-success',
  warning: 'text-warning',
  danger: 'text-danger',
  critical: 'text-critical',
};

export function SummaryCards({ summary }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {items.map((item) => {
        const Icon = item.icon;
        return (
          <Card key={item.key} className="overflow-hidden">
            <CardContent className="pt-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs text-text-subtle">{item.label}</p>
                  <p
                    className={cn(
                      'mt-1 font-display text-2xl font-semibold tracking-tight',
                      item.tone ? toneText[item.tone] : 'text-text',
                    )}
                  >
                    {item.format(summary[item.key])}
                  </p>
                </div>
                <div className="rounded-md bg-accent-soft p-2 text-accent">
                  <Icon className="h-4 w-4" />
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
