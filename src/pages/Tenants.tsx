import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Layout } from '@/components/Layout';
import { useTenants } from '@/hooks/useTenants';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { UserPlus, ChevronRight, Phone, Users } from 'lucide-react';

export default function Tenants() {
  const { tenants, isLoading } = useTenants();
  const [showAll, setShowAll] = useState(false);

  // Filter tenants based on toggle
  const filteredTenants = showAll 
    ? tenants 
    : tenants.filter(t => t.is_active);

  const getPaymentStatus = (pending: number) => {
    if (pending === 0) return { label: 'Paid', variant: 'default' as const };
    if (pending > 0) return { label: 'Pending', variant: 'destructive' as const };
    return { label: 'Unknown', variant: 'secondary' as const };
  };

  const getMemberCount = (tenant: typeof tenants[0]) => {
    if (Array.isArray(tenant.members) && tenant.members.length > 0) {
      // Only count active members
      const activeMembers = tenant.members.filter(
        (member: any) => member.is_active !== false
      );
      return activeMembers.length || 1;
    }
    return 1;
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

  const activeTenantCount = tenants.filter(t => t.is_active).length;
  const inactiveTenantCount = tenants.filter(t => !t.is_active).length;

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Rooms</h1>
            <p className="text-muted-foreground">
              Manage your property rooms ({activeTenantCount} active{inactiveTenantCount > 0 ? `, ${inactiveTenantCount} vacated` : ''})
            </p>
          </div>
          <Button asChild>
            <Link to="/tenants/add">
              <UserPlus className="h-4 w-4 mr-2" />
              Add Room
            </Link>
          </Button>
        </div>

        {/* Toggle for showing all tenants */}
        {inactiveTenantCount > 0 && (
          <div className="flex items-center space-x-2">
            <Switch
              id="show-all"
              checked={showAll}
              onCheckedChange={setShowAll}
            />
            <Label htmlFor="show-all" className="text-sm text-muted-foreground cursor-pointer">
              Show vacated/inactive rooms ({inactiveTenantCount})
            </Label>
          </div>
        )}

        {filteredTenants.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <p className="text-muted-foreground mb-4">
                {showAll ? 'No rooms yet' : 'No active rooms'}
              </p>
              <Button asChild>
                <Link to="/tenants/add">
                  <UserPlus className="h-4 w-4 mr-2" />
                  Add Your First Room
                </Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {filteredTenants.map((tenant) => {
              const status = getPaymentStatus(tenant.pending_amount);
              const memberCount = getMemberCount(tenant);
              
              return (
                <Link key={tenant.id} to={`/tenants/${tenant.id}`}>
                  <Card className={`hover:shadow-md transition-shadow cursor-pointer ${!tenant.is_active ? 'opacity-60' : ''}`}>
                    <CardContent className="flex items-center justify-between py-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-semibold">{tenant.name}</h3>
                          {memberCount > 1 && (
                            <Badge variant="outline" className="text-xs">
                              <Users className="h-3 w-3 mr-1" />
                              {memberCount} members
                            </Badge>
                          )}
                          {!tenant.is_active && (
                            <Badge variant="secondary">Vacated</Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground flex-wrap">
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
