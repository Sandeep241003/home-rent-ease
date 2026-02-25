import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export type EventType = 
  | 'TENANT_CREATED'
  | 'RENT_ADDED'
  | 'ELECTRICITY_ADDED'
  | 'PAYMENT_RECEIVED'
  | 'EXTRA_ADDED'
  | 'EXTRA_ADJUSTED'
  | 'TENANT_DEACTIVATED'
  | 'TENANT_REACTIVATED'
  | 'MEMBER_ADDED'
  | 'MEMBER_DISCONTINUED'
  | 'MEMBER_UPDATED'
  | 'CONCESSION_APPLIED'
  | 'PAYMENT_REVERSED'
  | 'RENT_REVERSED'
  | 'ELECTRICITY_REVERSED'
  | 'CONCESSION_REVERSED'
  | 'TRANSACTION_UNDONE';

export interface ActivityLog {
  id: string;
  tenant_id: string;
  event_type: EventType;
  description: string;
  amount: number | null;
  created_at: string;
}

export function useActivityLog(tenantId?: string) {
  const queryClient = useQueryClient();

  const reversalEventTypes = [
    'PAYMENT_REVERSED',
    'RENT_REVERSED', 
    'ELECTRICITY_REVERSED',
    'CONCESSION_REVERSED',
    'TRANSACTION_UNDONE',
  ];

  const logsQuery = useQuery({
    queryKey: ['activity-logs', tenantId],
    queryFn: async () => {
      let query = supabase
        .from('activity_log')
        .select('*')
        .not('event_type', 'in', `(${reversalEventTypes.join(',')})`)
        .order('created_at', { ascending: false });

      if (tenantId) {
        query = query.eq('tenant_id', tenantId);
      }

      const { data, error } = await query;
      if (error) throw error;
      
      const [paymentsRes, rentRes, electricityRes] = await Promise.all([
        supabase.from('payments').select('id, created_at').eq('is_reversed', true),
        supabase.from('monthly_rent_entries').select('id, created_at').eq('is_reversed', true),
        supabase.from('electricity_readings').select('id, created_at').eq('is_reversed', true),
      ]);

      const reversedPaymentDates = new Set(paymentsRes.data?.map(p => p.created_at) ?? []);
      const reversedRentDates = new Set(rentRes.data?.map(r => r.created_at) ?? []);
      const reversedElectricityDates = new Set(electricityRes.data?.map(e => e.created_at) ?? []);

      const filteredLogs = (data as ActivityLog[]).filter(log => {
        if (log.event_type === 'PAYMENT_RECEIVED') {
          const logTime = new Date(log.created_at).getTime();
          for (const date of reversedPaymentDates) {
            if (date && Math.abs(new Date(date).getTime() - logTime) < 60000) {
              return false;
            }
          }
        }
        
        if (log.event_type === 'RENT_ADDED') {
          const logTime = new Date(log.created_at).getTime();
          for (const date of reversedRentDates) {
            if (date && Math.abs(new Date(date).getTime() - logTime) < 60000) {
              return false;
            }
          }
        }
        
        if (log.event_type === 'ELECTRICITY_ADDED') {
          const logTime = new Date(log.created_at).getTime();
          for (const date of reversedElectricityDates) {
            if (date && Math.abs(new Date(date).getTime() - logTime) < 60000) {
              return false;
            }
          }
        }
        
        return true;
      });

      return filteredLogs;
    },
  });

  const addLog = useMutation({
    mutationFn: async ({
      tenantId,
      eventType,
      description,
      amount,
    }: {
      tenantId: string;
      eventType: EventType;
      description: string;
      amount?: number;
    }) => {
      const { error } = await supabase.from('activity_log').insert({
        tenant_id: tenantId,
        event_type: eventType,
        description,
        amount: amount ?? null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['activity-logs'] });
    },
  });

  return {
    logs: logsQuery.data ?? [],
    isLoading: logsQuery.isLoading,
    addLog,
    refetch: logsQuery.refetch,
  };
}
