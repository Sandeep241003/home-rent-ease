import { format } from 'date-fns';
import { 
  UserPlus, 
  Home, 
  Zap, 
  Banknote, 
  PiggyBank, 
  ArrowDownUp,
  UserX,
  UserCheck
} from 'lucide-react';
import type { ActivityLog } from '@/hooks/useActivityLog';

const eventIcons: Record<string, React.ReactNode> = {
  TENANT_CREATED: <UserPlus className="h-4 w-4" />,
  RENT_ADDED: <Home className="h-4 w-4" />,
  ELECTRICITY_ADDED: <Zap className="h-4 w-4" />,
  PAYMENT_RECEIVED: <Banknote className="h-4 w-4" />,
  EXTRA_ADDED: <PiggyBank className="h-4 w-4" />,
  EXTRA_ADJUSTED: <ArrowDownUp className="h-4 w-4" />,
  TENANT_DEACTIVATED: <UserX className="h-4 w-4" />,
  TENANT_REACTIVATED: <UserCheck className="h-4 w-4" />,
};

const eventColors: Record<string, string> = {
  TENANT_CREATED: 'bg-blue-500',
  RENT_ADDED: 'bg-orange-500',
  ELECTRICITY_ADDED: 'bg-yellow-500',
  PAYMENT_RECEIVED: 'bg-green-500',
  EXTRA_ADDED: 'bg-purple-500',
  EXTRA_ADJUSTED: 'bg-indigo-500',
  TENANT_DEACTIVATED: 'bg-red-500',
  TENANT_REACTIVATED: 'bg-teal-500',
};

interface ActivityTimelineProps {
  logs: ActivityLog[];
  showTenantName?: boolean;
  tenantNames?: Record<string, string>;
}

export function ActivityTimeline({ logs, showTenantName, tenantNames }: ActivityTimelineProps) {
  if (logs.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No activity recorded yet
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {logs.map((log, index) => (
        <div key={log.id} className="flex gap-4">
          {/* Timeline line and dot */}
          <div className="flex flex-col items-center">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white ${eventColors[log.event_type] || 'bg-gray-500'}`}>
              {eventIcons[log.event_type] || <Home className="h-4 w-4" />}
            </div>
            {index < logs.length - 1 && (
              <div className="w-0.5 flex-1 bg-border mt-2" />
            )}
          </div>

          {/* Content */}
          <div className="flex-1 pb-4">
            <div className="flex flex-wrap items-center gap-2">
              {showTenantName && tenantNames && tenantNames[log.tenant_id] && (
                <span className="font-semibold text-primary">
                  {tenantNames[log.tenant_id]}
                </span>
              )}
              <span className="text-sm text-muted-foreground">
                {format(new Date(log.created_at), 'dd MMM yyyy, hh:mm a')}
              </span>
            </div>
            <p className="mt-1">{log.description}</p>
            {log.amount !== null && (
              <p className={`font-semibold mt-1 ${log.amount >= 0 ? (log.event_type === 'PAYMENT_RECEIVED' ? 'text-success' : 'text-destructive') : 'text-success'}`}>
                {log.amount >= 0 ? (log.event_type === 'PAYMENT_RECEIVED' ? '+' : '+') : ''}₹{Math.abs(log.amount).toLocaleString('en-IN')}
              </p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
