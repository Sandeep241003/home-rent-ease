import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

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
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const logsQuery = useQuery({
    queryKey: ['activity-logs', tenantId],
    queryFn: async () => {
      let query = supabase
        .from('activity_log')
        .select('*')
        .order('created_at', { ascending: false });

      if (tenantId) {
        query = query.eq('tenant_id', tenantId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as ActivityLog[];
    },
    enabled: !!user,
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
