import { useState } from 'react';
import { Layout } from '@/components/Layout';
import { useTenants } from '@/hooks/useTenants';
import { usePayments } from '@/hooks/usePayments';
import { useElectricity } from '@/hooks/useElectricity';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { format } from 'date-fns';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface MonthlyRentEntry {
  id: string;
  tenant_id: string;
  month: number;
  year: number;
  rent_amount: number;
  created_at: string;
}

export default function Ledger() {
  const { tenants, isLoading: tenantsLoading } = useTenants();
  const [selectedTenantId, setSelectedTenantId] = useState<string>('all');
  
  const activeTenants = tenants.filter(t => t.is_active);

  const { data: allRentEntries = [] } = useQuery({
    queryKey: ['rent-entries'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('monthly_rent_entries')
        .select('*')
        .order('year', { ascending: false })
        .order('month', { ascending: false });
      if (error) throw error;
      return data as MonthlyRentEntry[];
    },
  });

  const { payments } = usePayments();
  const { readings } = useElectricity();

  if (tenantsLoading) {
    return (
      <Layout>
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-48 bg-muted rounded"></div>
          <div className="h-64 bg-muted rounded-lg"></div>
        </div>
      </Layout>
    );
  }

  // Filter by tenant
  const filteredTenants = selectedTenantId === 'all' 
    ? activeTenants 
    : activeTenants.filter(t => t.id === selectedTenantId);

  const getMonthName = (month: number) => {
    return new Date(2000, month - 1).toLocaleString('en-IN', { month: 'long' });
  };

  // Build ledger data per tenant
  const getLedgerData = (tenantId: string) => {
    const tenantRentEntries = allRentEntries.filter(e => e.tenant_id === tenantId);
    const tenantPayments = payments.filter(p => p.tenant_id === tenantId);
    const tenantReadings = readings.filter(r => r.tenant_id === tenantId);
    const tenant = tenants.find(t => t.id === tenantId);

    // Group by month/year
    const months = new Map<string, {
      month: number;
      year: number;
      rent: number;
      electricity: number;
      paid: number;
    }>();

    tenantRentEntries.forEach(entry => {
      const key = `${entry.year}-${entry.month}`;
      if (!months.has(key)) {
        months.set(key, { month: entry.month, year: entry.year, rent: 0, electricity: 0, paid: 0 });
      }
      months.get(key)!.rent += entry.rent_amount;
    });

    tenantReadings.forEach(reading => {
      const key = `${reading.year}-${reading.month}`;
      if (!months.has(key)) {
        months.set(key, { month: reading.month, year: reading.year, rent: 0, electricity: 0, paid: 0 });
      }
      months.get(key)!.electricity += reading.bill_amount;
    });

    tenantPayments.forEach(payment => {
      const date = new Date(payment.payment_date);
      const key = `${date.getFullYear()}-${date.getMonth() + 1}`;
      if (!months.has(key)) {
        months.set(key, { month: date.getMonth() + 1, year: date.getFullYear(), rent: 0, electricity: 0, paid: 0 });
      }
      months.get(key)!.paid += payment.amount;
    });

    return {
      tenant,
      months: Array.from(months.values()).sort((a, b) => {
        if (a.year !== b.year) return b.year - a.year;
        return b.month - a.month;
      }),
    };
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Ledger</h1>
            <p className="text-muted-foreground">
              Month-wise payment records
            </p>
          </div>
          <Select value={selectedTenantId} onValueChange={setSelectedTenantId}>
            <SelectTrigger className="w-full sm:w-[200px]">
              <SelectValue placeholder="Select tenant" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Tenants</SelectItem>
              {activeTenants.map((tenant) => (
                <SelectItem key={tenant.id} value={tenant.id}>
                  {tenant.name} (Room {tenant.room_number})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {filteredTenants.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              No active tenants found
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {filteredTenants.map((tenant) => {
              const { months } = getLedgerData(tenant.id);
              
              return (
                <Card key={tenant.id}>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">
                        {tenant.name} - Room {tenant.room_number}
                      </CardTitle>
                      <Badge variant={tenant.pending_amount > 0 ? 'destructive' : 'default'}>
                        Pending: ₹{tenant.pending_amount.toLocaleString('en-IN')}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {months.length === 0 ? (
                      <p className="text-muted-foreground text-center py-4">
                        No records yet
                      </p>
                    ) : (
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Month</TableHead>
                              <TableHead className="text-right">Rent</TableHead>
                              <TableHead className="text-right">Electricity</TableHead>
                              <TableHead className="text-right">Total Due</TableHead>
                              <TableHead className="text-right">Paid</TableHead>
                              <TableHead className="text-right">Balance</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {months.map((m) => {
                              const totalDue = m.rent + m.electricity;
                              const balance = totalDue - m.paid;
                              return (
                                <TableRow key={`${m.year}-${m.month}`}>
                                  <TableCell className="font-medium">
                                    {getMonthName(m.month)} {m.year}
                                  </TableCell>
                                  <TableCell className="text-right">
                                    ₹{m.rent.toLocaleString('en-IN')}
                                  </TableCell>
                                  <TableCell className="text-right">
                                    ₹{m.electricity.toLocaleString('en-IN')}
                                  </TableCell>
                                  <TableCell className="text-right font-medium">
                                    ₹{totalDue.toLocaleString('en-IN')}
                                  </TableCell>
                                  <TableCell className="text-right text-success">
                                    ₹{m.paid.toLocaleString('en-IN')}
                                  </TableCell>
                                  <TableCell className={`text-right font-semibold ${balance > 0 ? 'text-destructive' : 'text-success'}`}>
                                    ₹{balance.toLocaleString('en-IN')}
                                  </TableCell>
                                </TableRow>
                              );
                            })}
                          </TableBody>
                        </Table>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </Layout>
  );
}
