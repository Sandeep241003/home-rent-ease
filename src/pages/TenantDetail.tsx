import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Layout } from '@/components/Layout';
import { useTenants, Member } from '@/hooks/useTenants';
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
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
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
  Calendar as CalendarIcon, 
  Zap, 
  IndianRupee,
  Edit,
  UserX,
  PiggyBank,
  History,
  Briefcase,
  User,
  Users,
  Download,
  UserCheck,
} from 'lucide-react';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

export default function TenantDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { tenants, updateTenant } = useTenants();
  const { payments, addPayment } = usePayments(id);
  const { readings, addReading } = useElectricity(id);
  const { logs } = useActivityLog(id);

  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMode, setPaymentMode] = useState<'Cash' | 'UPI' | 'Bank'>('Cash');
  const [paymentReason, setPaymentReason] = useState<string>('Rent');
  const [paymentReasonNotes, setPaymentReasonNotes] = useState('');
  const [paymentDate, setPaymentDate] = useState<Date>(new Date());
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

  const [discontinueDialogOpen, setDiscontinueDialogOpen] = useState(false);
  const [discontinueReason, setDiscontinueReason] = useState('');

  const [aadhaarDialogOpen, setAadhaarDialogOpen] = useState(false);
  const [aadhaarUrls, setAadhaarUrls] = useState<{ front?: string; back?: string; memberName?: string }>({});

  const tenant = tenants.find(t => t.id === id);

  if (!tenant) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center py-12">
          <p className="text-muted-foreground mb-4">Room not found</p>
          <Button asChild>
            <Link to="/tenants">Back to Rooms</Link>
          </Button>
        </div>
      </Layout>
    );
  }

  const members: Member[] = Array.isArray(tenant.members) && tenant.members.length > 0 
    ? tenant.members 
    : [{
        name: tenant.name,
        phone: tenant.phone,
        gender: tenant.gender || '',
        occupation: tenant.occupation || '',
        aadhaar_front_url: tenant.aadhaar_image_url?.split('/aadhaar-images/').pop(),
        aadhaar_back_url: tenant.aadhaar_back_image_url?.split('/aadhaar-images/').pop(),
      }];

  const handlePayment = async () => {
    const amount = parseFloat(paymentAmount);
    if (amount <= 0) return;
    if (paymentReason === 'Other' && !paymentReasonNotes.trim()) return;

    await addPayment.mutateAsync({
      tenantId: tenant.id,
      amount,
      paymentMode,
      paymentReason,
      reasonNotes: paymentReason === 'Other' ? paymentReasonNotes : undefined,
      paymentDate: paymentDate.toISOString(),
    });

    setPaymentAmount('');
    setPaymentReason('Rent');
    setPaymentReasonNotes('');
    setPaymentDate(new Date());
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

  const handleDiscontinue = async () => {
    await updateTenant.mutateAsync({
      id: tenant.id,
      data: { 
        is_active: false,
        discontinued_reason: discontinueReason || undefined,
        discontinued_at: new Date().toISOString(),
      },
    });
    setDiscontinueDialogOpen(false);
    setDiscontinueReason('');
  };

  const handleReactivate = async () => {
    if (!confirm('Are you sure you want to reactivate this room?')) return;
    await updateTenant.mutateAsync({
      id: tenant.id,
      data: { 
        is_active: true,
        discontinued_reason: undefined,
        discontinued_at: undefined,
      },
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

  const viewAadhaar = async (member: Member, memberName: string) => {
    const urls: { front?: string; back?: string; memberName?: string } = { memberName };
    
    if (member.aadhaar_front_url) {
      const { data } = await supabase.storage
        .from('aadhaar-images')
        .createSignedUrl(member.aadhaar_front_url, 300);
      if (data?.signedUrl) {
        urls.front = data.signedUrl;
      }
    }
    
    if (member.aadhaar_back_url) {
      const { data } = await supabase.storage
        .from('aadhaar-images')
        .createSignedUrl(member.aadhaar_back_url, 300);
      if (data?.signedUrl) {
        urls.back = data.signedUrl;
      }
    }

    if (urls.front || urls.back) {
      setAadhaarUrls(urls);
      setAadhaarDialogOpen(true);
    }
  };

  const downloadAadhaar = async (url: string, memberName: string, side: 'front' | 'back') => {
    const response = await fetch(url);
    const blob = await response.blob();
    const downloadUrl = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = downloadUrl;
    a.download = `Aadhaar_${memberName.replace(/\s+/g, '_')}_Room${tenant.room_number}_${side}.jpg`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(downloadUrl);
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
              <h1 className="text-2xl font-bold tracking-tight">Room {tenant.room_number}</h1>
              {!tenant.is_active && <Badge variant="secondary">Vacated</Badge>}
            </div>
            <p className="text-muted-foreground">{tenant.name}</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="icon" onClick={openEditDialog}>
              <Edit className="h-4 w-4" />
            </Button>
            {tenant.is_active ? (
              <Button 
                variant="outline" 
                size="icon" 
                onClick={() => setDiscontinueDialogOpen(true)}
                className="text-destructive hover:text-destructive"
              >
                <UserX className="h-4 w-4" />
              </Button>
            ) : (
              <Button 
                variant="outline" 
                size="icon" 
                onClick={handleReactivate}
                className="text-success hover:text-success"
              >
                <UserCheck className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        {/* Members Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Users className="h-5 w-5" />
              Members ({members.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2">
              {members.map((member, index) => (
                <div key={index} className="p-4 border rounded-lg space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="font-semibold">{member.name}</p>
                    {(member.aadhaar_front_url || member.aadhaar_back_url) && (
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => viewAadhaar(member, member.name)}
                      >
                        <User className="h-4 w-4 mr-1" />
                        Aadhaar
                      </Button>
                    )}
                  </div>
                  <div className="text-sm text-muted-foreground space-y-1">
                    <p className="flex items-center gap-2">
                      <Phone className="h-3 w-3" />
                      {member.phone}
                    </p>
                    {member.gender && (
                      <p>Gender: {member.gender.charAt(0).toUpperCase() + member.gender.slice(1)}</p>
                    )}
                    {member.occupation && (
                      <p className="flex items-center gap-2">
                        <Briefcase className="h-3 w-3" />
                        {member.occupation}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Room Info */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
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
              <CalendarIcon className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Joined</p>
                <p className="font-medium">{format(new Date(tenant.joining_date), 'dd MMM yyyy')}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-3 py-4">
              <Zap className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Meter Reading</p>
                <p className="font-medium">{tenant.current_meter_reading} units</p>
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
        {tenant.is_active && (
          <div className="flex flex-wrap gap-2">
            <Dialog open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <IndianRupee className="h-4 w-4 mr-2" />
                  Record Payment
                </Button>
              </DialogTrigger>
              <DialogContent className="max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Record Payment</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 pt-4">
                  <div className="p-3 bg-muted rounded-lg">
                    <p className="text-sm text-muted-foreground">Current Pending</p>
                    <p className="text-lg font-semibold">₹{tenant.pending_amount.toLocaleString('en-IN')}</p>
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Amount (₹) *</Label>
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
                    <Label>Payment Mode *</Label>
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

                  <div className="space-y-2">
                    <Label>Payment Reason *</Label>
                    <Select value={paymentReason} onValueChange={setPaymentReason}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Rent">Rent</SelectItem>
                        <SelectItem value="Electricity">Electricity</SelectItem>
                        <SelectItem value="Other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {paymentReason === 'Other' && (
                    <div className="space-y-2">
                      <Label>Specify Reason *</Label>
                      <Textarea
                        value={paymentReasonNotes}
                        onChange={(e) => setPaymentReasonNotes(e.target.value)}
                        placeholder="Enter payment reason..."
                        rows={2}
                      />
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label>Payment Date *</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal",
                            !paymentDate && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {paymentDate ? format(paymentDate, "PPP") : <span>Pick a date</span>}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={paymentDate}
                          onSelect={(date) => date && setPaymentDate(date)}
                          initialFocus
                          className={cn("p-3 pointer-events-auto")}
                        />
                      </PopoverContent>
                    </Popover>
                  </div>

                  <Button 
                    onClick={handlePayment} 
                    disabled={
                      addPayment.isPending || 
                      !paymentAmount || 
                      (paymentReason === 'Other' && !paymentReasonNotes.trim())
                    }
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
          </div>
        )}

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
                          {format(new Date(payment.payment_date), 'dd MMM yyyy')} • {payment.payment_reason}
                          {payment.reason_notes && ` (${payment.reason_notes})`}
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
              <DialogTitle>Edit Room</DialogTitle>
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

        {/* Discontinue Dialog */}
        <Dialog open={discontinueDialogOpen} onOpenChange={setDiscontinueDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Discontinue Room</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <p className="text-sm text-muted-foreground">
                This will mark the room as vacated. The data will be preserved for records.
              </p>
              <div className="space-y-2">
                <Label>Reason (Optional)</Label>
                <Textarea
                  value={discontinueReason}
                  onChange={(e) => setDiscontinueReason(e.target.value)}
                  placeholder="e.g., Tenant moved out, Lease ended..."
                  rows={3}
                />
              </div>
              <div className="flex gap-3">
                <Button 
                  variant="outline" 
                  onClick={() => setDiscontinueDialogOpen(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button 
                  variant="destructive"
                  onClick={handleDiscontinue} 
                  disabled={updateTenant.isPending}
                  className="flex-1"
                >
                  {updateTenant.isPending ? 'Processing...' : 'Discontinue'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Aadhaar Dialog */}
        <Dialog open={aadhaarDialogOpen} onOpenChange={setAadhaarDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Aadhaar Card - {aadhaarUrls.memberName}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              {aadhaarUrls.front && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="font-medium">Front Side</p>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => downloadAadhaar(aadhaarUrls.front!, aadhaarUrls.memberName || 'Member', 'front')}
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Download
                    </Button>
                  </div>
                  <img 
                    src={aadhaarUrls.front} 
                    alt="Aadhaar Front" 
                    className="w-full rounded-lg border"
                  />
                </div>
              )}
              {aadhaarUrls.back && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="font-medium">Back Side</p>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => downloadAadhaar(aadhaarUrls.back!, aadhaarUrls.memberName || 'Member', 'back')}
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Download
                    </Button>
                  </div>
                  <img 
                    src={aadhaarUrls.back} 
                    alt="Aadhaar Back" 
                    className="w-full rounded-lg border"
                  />
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}
