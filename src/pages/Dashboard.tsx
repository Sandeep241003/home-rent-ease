import { Link } from 'react-router-dom';
import { Layout } from '@/components/Layout';
import { useTenants } from '@/hooks/useTenants';
import { useMonthlyRentSync } from '@/hooks/useMonthlyRent';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  IndianRupee, 
  AlertCircle, 
  Users, 
  UserPlus,
  List,
  FileText,
  TrendingUp,
  PiggyBank
} from 'lucide-react';

export default function Dashboard() {
  useMonthlyRentSync();
  const { tenants, isLoading } = useTenants();

  const activeTenants = tenants.filter(t => t.is_active);
  const totalPending = activeTenants.reduce((sum, t) => sum + (t.pending_amount || 0), 0);
  const totalExtraBalance = activeTenants.reduce((sum, t) => sum + (t.extra_balance || 0), 0);
  const defaulters = activeTenants.filter(t => (t.pending_amount || 0) > 0);
  
  // Total collected
  const totalCollected = activeTenants.reduce((sum, t) => sum + (t.total_paid || 0), 0);

  if (isLoading) {
    return (
      <Layout>
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-48 bg-muted rounded"></div>
          <div className="grid gap-4 md:grid-cols-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-32 bg-muted rounded-lg"></div>
            ))}
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">
            Overview of your property management
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Collected
              </CardTitle>
              <TrendingUp className="h-4 w-4 text-success" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-success">
                ₹{totalCollected.toLocaleString('en-IN')}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                All time collection
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Pending
              </CardTitle>
              <IndianRupee className="h-4 w-4 text-warning" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-warning">
                ₹{totalPending.toLocaleString('en-IN')}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Outstanding amount
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Extra Balance
              </CardTitle>
              <PiggyBank className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">
                ₹{totalExtraBalance.toLocaleString('en-IN')}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Advance payments
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Defaulters
              </CardTitle>
              <AlertCircle className="h-4 w-4 text-destructive" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-destructive">
                {defaulters.length}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Tenants with pending dues
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Quick Stats */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Active Tenants
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{activeTenants.length}</div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <div>
          <h2 className="text-lg font-semibold mb-3">Quick Actions</h2>
          <div className="grid gap-3 sm:grid-cols-3">
            <Button asChild className="h-auto py-4" variant="outline">
              <Link to="/tenants/add" className="flex flex-col items-center gap-2">
                <UserPlus className="h-6 w-6" />
                <span>Add Tenant</span>
              </Link>
            </Button>
            <Button asChild className="h-auto py-4" variant="outline">
              <Link to="/tenants" className="flex flex-col items-center gap-2">
                <List className="h-6 w-6" />
                <span>Tenant List</span>
              </Link>
            </Button>
            <Button asChild className="h-auto py-4" variant="outline">
              <Link to="/ledger" className="flex flex-col items-center gap-2">
                <FileText className="h-6 w-6" />
                <span>View Ledger</span>
              </Link>
            </Button>
          </div>
        </div>

        {/* Defaulters List */}
        {defaulters.length > 0 && (
          <div>
            <h2 className="text-lg font-semibold mb-3 text-destructive">
              Defaulters
            </h2>
            <div className="space-y-2">
              {defaulters.map((tenant) => (
                <Card key={tenant.id}>
                  <CardContent className="flex items-center justify-between py-4">
                    <div>
                      <p className="font-medium">{tenant.name}</p>
                      <p className="text-sm text-muted-foreground">
                        Room {tenant.room_number}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-destructive">
                        ₹{tenant.pending_amount.toLocaleString('en-IN')}
                      </p>
                      <Link 
                        to={`/tenants/${tenant.id}`}
                        className="text-sm text-primary hover:underline"
                      >
                        View Details
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
