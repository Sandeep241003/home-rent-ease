import { Link } from 'react-router-dom';
import { Layout } from '@/components/Layout';
import { useTenants } from '@/hooks/useTenants';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { UserPlus, ChevronRight, Phone } from 'lucide-react';

export default function Tenants() {
  const { tenants, isLoading } = useTenants();

  const getPaymentStatus = (pending: number) => {
    if (pending === 0) return { label: 'Paid', variant: 'default' as const };
    if (pending > 0) return { label: 'Pending', variant: 'destructive' as const };
    return { label: 'Unknown', variant: 'secondary' as const };
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-48 bg-muted rounded"></div>
          {[1, 2, 3].map(i => (
            <div key={i} className="h-24 bg-muted rounded-lg"></div>
          ))}
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Tenants</h1>
            <p className="text-muted-foreground">
              Manage your property tenants
            </p>
          </div>
          <Button asChild>
            <Link to="/tenants/add">
              <UserPlus className="h-4 w-4 mr-2" />
              Add Tenant
            </Link>
          </Button>
        </div>

        {tenants.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <p className="text-muted-foreground mb-4">No tenants yet</p>
              <Button asChild>
                <Link to="/tenants/add">
                  <UserPlus className="h-4 w-4 mr-2" />
                  Add Your First Tenant
                </Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {tenants.map((tenant) => {
              const status = getPaymentStatus(tenant.pending_amount);
              return (
                <Link key={tenant.id} to={`/tenants/${tenant.id}`}>
                  <Card className="hover:shadow-md transition-shadow cursor-pointer">
                    <CardContent className="flex items-center justify-between py-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold">{tenant.name}</h3>
                          {!tenant.is_active && (
                            <Badge variant="secondary">Inactive</Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                          <span>Room {tenant.room_number}</span>
                          <span className="flex items-center gap-1">
                            <Phone className="h-3 w-3" />
                            {tenant.phone}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="text-sm text-muted-foreground">Pending</p>
                          <p className={`font-semibold ${tenant.pending_amount > 0 ? 'text-destructive' : 'text-success'}`}>
                            ₹{tenant.pending_amount.toLocaleString('en-IN')}
                          </p>
                        </div>
                        <Badge variant={status.variant}>{status.label}</Badge>
                        <ChevronRight className="h-5 w-5 text-muted-foreground" />
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </Layout>
  );
}
