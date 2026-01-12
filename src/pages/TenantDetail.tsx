import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Layout } from '@/components/Layout';
import { useTenants } from '@/hooks/useTenants';
import { usePayments } from '@/hooks/usePayments';
import { useElectricity } from '@/hooks/useElectricity';
import { useActivityLog } from '@/hooks/useActivityLog';
import { ActivityTimeline } from '@/components/ActivityTimeline';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { 
  ArrowLeft, 
  Phone, 
  Home, 
  Calendar, 
  Zap, 
  IndianRupee,
  Edit,
  UserX,
  PiggyBank,
  History,
  Briefcase,
  User
} from 'lucide-react';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';

export default function TenantDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { tenants, updateTenant } = useTenants();
  const { payments, addPayment } = usePayments(id);
  const { readings, addReading } = useElectricity(id);
  const { logs } = useActivityLog(id);

  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMode, setPaymentMode] = useState<'Cash' | 'UPI' | 'Bank'>('Cash');
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);

  const [meterReading, setMeterReading] = useState('');
  const [electricityDialogOpen, setElectricityDialogOpen] = useState(false);

  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editForm, setEditForm] = useState({
    name: '',
    phone: '',
    room_number: '',
    monthly_rent: '',
    electricity_rate: '',
    gender: '',
    occupation: '',
  });

  const [aadhaarDialogOpen, setAadhaarDialogOpen] = useState(false);
  const [aadhaarUrl, setAadhaarUrl] = useState<string | null>(null);

  const tenant = tenants.find(t => t.id === id);

  if (!tenant) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center py-12">
          <p className="text-muted-foreground mb-4">Tenant not found</p>
          <Button asChild>
            <Link to="/tenants">Back to Tenants</Link>
          </Button>
        </div>
      </Layout>
    );
  }

  const handlePayment = async () => {
    const amount = parseFloat(paymentAmount);
    if (amount <= 0) return;

    await addPayment.mutateAsync({
      tenantId: tenant.id,
      amount,
      paymentMode,
    });

    setPaymentAmount('');
    setPaymentDialogOpen(false);
  };

  const handleElectricity = async () => {
    const reading = parseFloat(meterReading);
    if (reading < tenant.current_meter_reading) return;

    await addReading.mutateAsync({
      tenantId: tenant.id,
      currentReading: reading,
    });

    setMeterReading('');
    setElectricityDialogOpen(false);
  };

  const handleEdit = async () => {
    await updateTenant.mutateAsync({
      id: tenant.id,
      data: {
        name: editForm.name,
        phone: editForm.phone,
        room_number: editForm.room_number,
        monthly_rent: parseFloat(editForm.monthly_rent),
        electricity_rate: parseFloat(editForm.electricity_rate),
        gender: editForm.gender || undefined,
        occupation: editForm.occupation || undefined,
      },
    });
    setEditDialogOpen(false);
  };

  const handleDeactivate = async () => {
    if (!confirm('Are you sure you want to deactivate this tenant?')) return;
    await updateTenant.mutateAsync({
      id: tenant.id,
      data: { is_active: !tenant.is_active },
    });
  };

  const openEditDialog = () => {
    setEditForm({
      name: tenant.name,
      phone: tenant.phone,
      room_number: tenant.room_number,
      monthly_rent: tenant.monthly_rent.toString(),
      electricity_rate: tenant.electricity_rate.toString(),
      gender: tenant.gender || '',
      occupation: tenant.occupation || '',
    });
    setEditDialogOpen(true);
  };

  const viewAadhaar = async () => {
    if (tenant.aadhaar_image_url) {
      // For private bucket, we need to create a signed URL
      const path = tenant.aadhaar_image_url.split('/aadhaar-images/').pop();
      if (path) {
        const { data } = await supabase.storage
          .from('aadhaar-images')
          .createSignedUrl(path, 300); // 5 minutes
        if (data?.signedUrl) {
          setAadhaarUrl(data.signedUrl);
          setAadhaarDialogOpen(true);
        }
      }
    }
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight">{tenant.name}</h1>
              {!tenant.is_active && <Badge variant="secondary">Inactive</Badge>}
            </div>
            <p className="text-muted-foreground">Room {tenant.room_number}</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="icon" onClick={openEditDialog}>
              <Edit className="h-4 w-4" />
            </Button>
            <Button 
              variant="outline" 
              size="icon" 
              onClick={handleDeactivate}
              className={tenant.is_active ? 'text-destructive hover:text-destructive' : 'text-success hover:text-success'}
            >
              <UserX className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Tenant Info */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <Card>
            <CardContent className="flex items-center gap-3 py-4">
              <Phone className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Phone</p>
                <p className="font-medium">{tenant.phone}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-3 py-4">
              <Home className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Monthly Rent</p>
                <p className="font-medium">₹{tenant.monthly_rent.toLocaleString('en-IN')}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-3 py-4">
              <Zap className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Rate/Unit</p>
                <p className="font-medium">₹{tenant.electricity_rate}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-3 py-4">
              <Calendar className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Joined</p>
                <p className="font-medium">{format(new Date(tenant.joining_date), 'dd MMM yyyy')}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-3 py-4">
              <Briefcase className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Occupation</p>
                <p className="font-medium">{tenant.occupation || 'N/A'}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Balance Cards */}
        <div className="grid gap-4 sm:grid-cols-2">
          <Card>
            <CardContent className="py-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-full bg-destructive/10">
                  <IndianRupee className="h-6 w-6 text-destructive" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Pending Amount</p>
                  <p className={`text-3xl font-bold ${tenant.pending_amount > 0 ? 'text-destructive' : 'text-success'}`}>
                    ₹{tenant.pending_amount.toLocaleString('en-IN')}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="py-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-full bg-primary/10">
                  <PiggyBank className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Extra / Advance Balance</p>
                  <p className="text-3xl font-bold text-primary">
                    ₹{(tenant.extra_balance || 0).toLocaleString('en-IN')}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Actions */}
        <div className="flex flex-wrap gap-2">
          <Dialog open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <IndianRupee className="h-4 w-4 mr-2" />
                Record Payment
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Record Payment</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div className="p-3 bg-muted rounded-lg">
                  <p className="text-sm text-muted-foreground">Current Pending</p>
                  <p className="text-lg font-semibold">₹{tenant.pending_amount.toLocaleString('en-IN')}</p>
                </div>
                <div className="space-y-2">
                  <Label>Amount (₹)</Label>
                  <Input
                    type="number"
                    min="1"
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(e.target.value)}
                    placeholder="Enter amount"
                  />
                </div>
                {paymentAmount && parseFloat(paymentAmount) > tenant.pending_amount && (
                  <div className="p-3 bg-primary/10 rounded-lg">
                    <p className="text-sm text-muted-foreground">Extra balance to be added</p>
                    <p className="text-lg font-semibold text-primary">
                      +₹{(parseFloat(paymentAmount) - tenant.pending_amount).toLocaleString('en-IN')}
                    </p>
                  </div>
                )}
                <div className="space-y-2">
                  <Label>Payment Mode</Label>
                  <Select value={paymentMode} onValueChange={(v) => setPaymentMode(v as any)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Cash">Cash</SelectItem>
                      <SelectItem value="UPI">UPI</SelectItem>
                      <SelectItem value="Bank">Bank Transfer</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button 
                  onClick={handlePayment} 
                  disabled={addPayment.isPending || !paymentAmount}
                  className="w-full"
                >
                  {addPayment.isPending ? 'Recording...' : 'Record Payment'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={electricityDialogOpen} onOpenChange={setElectricityDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Zap className="h-4 w-4 mr-2" />
                Add Electricity
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Record Electricity Reading</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div className="p-3 bg-muted rounded-lg">
                  <p className="text-sm text-muted-foreground">Previous Reading</p>
                  <p className="text-lg font-semibold">{tenant.current_meter_reading} units</p>
                </div>
                <div className="space-y-2">
                  <Label>Current Reading</Label>
                  <Input
                    type="number"
                    min={tenant.current_meter_reading}
                    step="0.01"
                    value={meterReading}
                    onChange={(e) => setMeterReading(e.target.value)}
                    placeholder="Enter current reading"
                  />
                </div>
                {meterReading && parseFloat(meterReading) >= tenant.current_meter_reading && (
                  <div className="p-3 bg-accent/10 rounded-lg">
                    <p className="text-sm text-muted-foreground">Estimated Bill</p>
                    <p className="text-lg font-semibold text-accent">
                      {(parseFloat(meterReading) - tenant.current_meter_reading).toFixed(2)} units × ₹{tenant.electricity_rate} = 
                      ₹{((parseFloat(meterReading) - tenant.current_meter_reading) * tenant.electricity_rate).toFixed(2)}
                    </p>
                  </div>
                )}
                <Button 
                  onClick={handleElectricity} 
                  disabled={addReading.isPending || !meterReading || parseFloat(meterReading) < tenant.current_meter_reading}
                  className="w-full"
                >
                  {addReading.isPending ? 'Recording...' : 'Add to Bill'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          {tenant.aadhaar_image_url && (
            <Button variant="outline" onClick={viewAadhaar}>
              <User className="h-4 w-4 mr-2" />
              View Aadhaar
            </Button>
          )}
        </div>

        {/* History Tabs */}
        <Tabs defaultValue="history">
          <TabsList>
            <TabsTrigger value="history">
              <History className="h-4 w-4 mr-2" />
              Activity Log
            </TabsTrigger>
            <TabsTrigger value="payments">Payments</TabsTrigger>
            <TabsTrigger value="electricity">Electricity</TabsTrigger>
          </TabsList>
          <TabsContent value="history" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Complete History</CardTitle>
              </CardHeader>
              <CardContent>
                <ActivityTimeline logs={logs} />
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="payments" className="mt-4">
            {payments.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground">
                  No payments recorded yet
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-2">
                {payments.map((payment) => (
                  <Card key={payment.id}>
                    <CardContent className="flex items-center justify-between py-4">
                      <div>
                        <p className="font-medium text-success">
                          +₹{payment.amount.toLocaleString('en-IN')}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {format(new Date(payment.payment_date), 'dd MMM yyyy, hh:mm a')}
                        </p>
                      </div>
                      <Badge variant="outline">{payment.payment_mode}</Badge>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
          <TabsContent value="electricity" className="mt-4">
            {readings.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground">
                  No electricity readings recorded yet
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-2">
                {readings.map((reading) => (
                  <Card key={reading.id}>
                    <CardContent className="flex items-center justify-between py-4">
                      <div>
                        <p className="font-medium">
                          {reading.previous_reading} → {reading.current_reading} units
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {reading.units_consumed} units consumed
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-accent">
                          ₹{reading.bill_amount.toLocaleString('en-IN')}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {format(new Date(reading.reading_date), 'dd MMM yyyy')}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Edit Dialog */}
        <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Tenant</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4 max-h-[70vh] overflow-y-auto">
              <div className="space-y-2">
                <Label>Name</Label>
                <Input
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Phone</Label>
                <Input
                  value={editForm.phone}
                  onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Room Number</Label>
                <Input
                  value={editForm.room_number}
                  onChange={(e) => setEditForm({ ...editForm, room_number: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Gender</Label>
                <Select 
                  value={editForm.gender} 
                  onValueChange={(v) => setEditForm({ ...editForm, gender: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select gender" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="male">Male</SelectItem>
                    <SelectItem value="female">Female</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Occupation</Label>
                <Input
                  value={editForm.occupation}
                  onChange={(e) => setEditForm({ ...editForm, occupation: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Monthly Rent (₹)</Label>
                <Input
                  type="number"
                  value={editForm.monthly_rent}
                  onChange={(e) => setEditForm({ ...editForm, monthly_rent: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Rate per Unit (₹)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={editForm.electricity_rate}
                  onChange={(e) => setEditForm({ ...editForm, electricity_rate: e.target.value })}
                />
              </div>
              <Button 
                onClick={handleEdit} 
                disabled={updateTenant.isPending}
                className="w-full"
              >
                {updateTenant.isPending ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Aadhaar Dialog */}
        <Dialog open={aadhaarDialogOpen} onOpenChange={setAadhaarDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Aadhaar Card - {tenant.name}</DialogTitle>
            </DialogHeader>
            {aadhaarUrl && (
              <div className="mt-4">
                <img 
                  src={aadhaarUrl} 
                  alt="Aadhaar Card" 
                  className="w-full rounded-lg"
                />
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}
