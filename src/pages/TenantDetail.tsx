import { useState, useRef } from 'react';
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
import { Switch } from '@/components/ui/switch';
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { 
  ArrowLeft, 
  Phone, 
  Home, 
  Calendar as CalendarIcon, 
  Zap, 
  IndianRupee,
  UserX,
  PiggyBank,
  History,
  Briefcase,
  User,
  Users,
  Download,
  UserCheck,
  UserPlus,
  Upload,
  Check,
  MoreVertical,
  Percent,
} from 'lucide-react';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { LANDLORD_ID } from '@/lib/constants';
import jsPDF from 'jspdf';

export default function TenantDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { tenants, updateTenant, updateMembers, applyConcession } = useTenants();
  const { payments, addPayment } = usePayments(id);
  const { readings, addReading } = useElectricity(id);
  const { logs } = useActivityLog(id);
  const { toast } = useToast();

  const [showDiscontinuedMembers, setShowDiscontinuedMembers] = useState(false);

  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMode, setPaymentMode] = useState<'Cash' | 'UPI' | 'Bank'>('Cash');
  const [paymentReason, setPaymentReason] = useState<string>('Rent');
  const [paymentReasonNotes, setPaymentReasonNotes] = useState('');
  const [paymentDate, setPaymentDate] = useState<Date>(new Date());
  const [paymentPaidBy, setPaymentPaidBy] = useState<string>('');
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);

  const [meterReading, setMeterReading] = useState('');
  const [electricityDialogOpen, setElectricityDialogOpen] = useState(false);

  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editRoomForm, setEditRoomForm] = useState({
    room_number: '',
    monthly_rent: '',
    electricity_rate: '',
    joining_date: new Date(),
  });

  const [editMemberDialogOpen, setEditMemberDialogOpen] = useState(false);
  const [editMemberIndex, setEditMemberIndex] = useState<number>(-1);
  const [editMemberForm, setEditMemberForm] = useState({
    name: '',
    phone: '',
    gender: '',
    occupation: '',
    aadhaar_pdf_file: null as File | null,
    remove_aadhaar: false,
  });
  const editPdfRef = useRef<HTMLInputElement>(null);

  const [addMemberDialogOpen, setAddMemberDialogOpen] = useState(false);
  const [newMemberForm, setNewMemberForm] = useState({
    name: '',
    phone: '',
    gender: '',
    occupation: '',
    aadhaar_pdf_file: null as File | null,
  });
  const addPdfRef = useRef<HTMLInputElement>(null);

  const [removeAadhaarDialogOpen, setRemoveAadhaarDialogOpen] = useState(false);
  const [removeAadhaarMemberIndex, setRemoveAadhaarMemberIndex] = useState<number>(-1);

  const [discontinueMemberDialogOpen, setDiscontinueMemberDialogOpen] = useState(false);
  const [discontinueMemberIndex, setDiscontinueMemberIndex] = useState<number>(-1);

  const [discontinueDialogOpen, setDiscontinueDialogOpen] = useState(false);
  const [discontinueReason, setDiscontinueReason] = useState('');

  const [concessionDialogOpen, setConcessionDialogOpen] = useState(false);
  const [concessionAmount, setConcessionAmount] = useState('');
  const [concessionReason, setConcessionReason] = useState('');

  const [editTenantDialogOpen, setEditTenantDialogOpen] = useState(false);

  const [aadhaarDialogOpen, setAadhaarDialogOpen] = useState(false);
  const [aadhaarPdfUrl, setAadhaarPdfUrl] = useState<{ url?: string; memberName?: string; roomNumber?: string }>({});

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

  // Parse members - filter active ones
  const allMembers: (Member & { is_active?: boolean })[] = Array.isArray(tenant.members) && tenant.members.length > 0 
    ? tenant.members.map(m => ({ ...m, is_active: m.is_active !== false }))
    : [{
        name: tenant.name,
        phone: tenant.phone,
        gender: tenant.gender || '',
        occupation: tenant.occupation || '',
        aadhaar_pdf_url: undefined,
        is_active: true,
      }];

  const activeMembers = allMembers.filter(m => m.is_active !== false);
  const displayedMembers = showDiscontinuedMembers ? allMembers : activeMembers;

  const uploadAadhaarPdf = async (file: File): Promise<string | undefined> => {
    const fileName = `${LANDLORD_ID}/${Date.now()}-${Math.random().toString(36).substr(2, 9)}.pdf`;
    
    const { error: uploadError } = await supabase.storage
      .from('aadhaar-images')
      .upload(fileName, file, { contentType: 'application/pdf' });

    if (!uploadError) {
      return fileName;
    }
    return undefined;
  };

  const handlePayment = async () => {
    const amount = parseFloat(paymentAmount);
    if (amount <= 0) return;
    if (paymentReason === 'Other' && !paymentReasonNotes.trim()) return;

    // Determine paid_by
    let paidBy: string | undefined;
    if (activeMembers.length === 1) {
      paidBy = activeMembers[0].name;
    } else if (activeMembers.length === 2 && paymentPaidBy) {
      paidBy = paymentPaidBy;
    }

    await addPayment.mutateAsync({
      tenantId: tenant.id,
      amount,
      paymentMode,
      paymentReason,
      reasonNotes: paymentReason === 'Other' ? paymentReasonNotes : undefined,
      paymentDate: paymentDate.toISOString(),
      paidBy,
    });

    setPaymentAmount('');
    setPaymentReason('Rent');
    setPaymentReasonNotes('');
    setPaymentDate(new Date());
    setPaymentPaidBy('');
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

  const handleEditRoom = async () => {
    await updateTenant.mutateAsync({
      id: tenant.id,
      data: {
        room_number: editRoomForm.room_number,
        monthly_rent: parseFloat(editRoomForm.monthly_rent),
        electricity_rate: parseFloat(editRoomForm.electricity_rate),
      },
    });
    setEditDialogOpen(false);
  };

  const openEditRoomDialog = () => {
    setEditRoomForm({
      room_number: tenant.room_number,
      monthly_rent: tenant.monthly_rent.toString(),
      electricity_rate: tenant.electricity_rate.toString(),
      joining_date: new Date(tenant.joining_date),
    });
    setEditDialogOpen(true);
  };

  const openEditMemberDialog = (index: number) => {
    const member = allMembers[index];
    setEditMemberIndex(index);
    setEditMemberForm({
      name: member.name,
      phone: member.phone,
      gender: member.gender || '',
      occupation: member.occupation || '',
      aadhaar_pdf_file: null,
      remove_aadhaar: false,
    });
    setEditMemberDialogOpen(true);
  };

  const handleEditMember = async () => {
    if (!updateMembers) return;
    
    const updatedMembers = [...allMembers];
    let pdfUrl = allMembers[editMemberIndex].aadhaar_pdf_url;
    const previousPdfUrl = pdfUrl;

    // Handle remove aadhaar
    if (editMemberForm.remove_aadhaar) {
      pdfUrl = undefined;
    } else if (editMemberForm.aadhaar_pdf_file) {
      pdfUrl = await uploadAadhaarPdf(editMemberForm.aadhaar_pdf_file);
    }

    updatedMembers[editMemberIndex] = {
      ...updatedMembers[editMemberIndex],
      name: editMemberForm.name,
      phone: editMemberForm.phone,
      gender: editMemberForm.gender,
      occupation: editMemberForm.occupation,
      aadhaar_pdf_url: pdfUrl,
    };

    await updateMembers.mutateAsync({
      tenantId: tenant.id,
      members: updatedMembers,
      action: 'edit',
      memberName: editMemberForm.name,
    });

    // Log Aadhaar changes
    if (editMemberForm.remove_aadhaar && previousPdfUrl) {
      await supabase.from('activity_log').insert({
        tenant_id: tenant.id,
        event_type: 'AADHAAR_REMOVED',
        description: `Aadhaar document removed for ${editMemberForm.name}`,
        amount: null,
      });
    } else if (editMemberForm.aadhaar_pdf_file) {
      const eventType = previousPdfUrl ? 'AADHAAR_REPLACED' : 'AADHAAR_UPLOADED';
      const description = previousPdfUrl 
        ? `Aadhaar document replaced for ${editMemberForm.name}`
        : `Aadhaar document uploaded for ${editMemberForm.name}`;
      await supabase.from('activity_log').insert({
        tenant_id: tenant.id,
        event_type: eventType,
        description,
        amount: null,
      });
    }

    setEditMemberDialogOpen(false);
    setEditMemberForm({
      name: '',
      phone: '',
      gender: '',
      occupation: '',
      aadhaar_pdf_file: null,
      remove_aadhaar: false,
    });
  };

  const handleAddMember = async () => {
    if (!updateMembers) return;
    if (activeMembers.length >= 2) {
      toast({ title: 'Maximum 2 members allowed per room', variant: 'destructive' });
      return;
    }

    let pdfUrl: string | undefined;

    if (newMemberForm.aadhaar_pdf_file) {
      pdfUrl = await uploadAadhaarPdf(newMemberForm.aadhaar_pdf_file);
    }

    const newMember: Member = {
      name: newMemberForm.name,
      phone: newMemberForm.phone,
      gender: newMemberForm.gender,
      occupation: newMemberForm.occupation,
      aadhaar_pdf_url: pdfUrl,
    };

    const updatedMembers = [...allMembers, { ...newMember, is_active: true }];

    await updateMembers.mutateAsync({
      tenantId: tenant.id,
      members: updatedMembers,
      action: 'add',
      memberName: newMemberForm.name,
    });

    // Log Aadhaar upload if uploaded
    if (newMemberForm.aadhaar_pdf_file && pdfUrl) {
      await supabase.from('activity_log').insert({
        tenant_id: tenant.id,
        event_type: 'AADHAAR_UPLOADED',
        description: `Aadhaar document uploaded for ${newMemberForm.name}`,
        amount: null,
      });
    }

    setAddMemberDialogOpen(false);
    setNewMemberForm({
      name: '',
      phone: '',
      gender: '',
      occupation: '',
      aadhaar_pdf_file: null,
    });
  };

  const handleDiscontinueMember = async () => {
    if (!updateMembers) return;
    
    const updatedMembers = [...allMembers];
    const memberName = updatedMembers[discontinueMemberIndex].name;
    updatedMembers[discontinueMemberIndex] = {
      ...updatedMembers[discontinueMemberIndex],
      is_active: false,
    };

    await updateMembers.mutateAsync({
      tenantId: tenant.id,
      members: updatedMembers,
      action: 'discontinue',
      memberName,
    });

    setDiscontinueMemberDialogOpen(false);
    setDiscontinueMemberIndex(-1);
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

  const handleConcession = async () => {
    const amount = parseFloat(concessionAmount);
    if (amount <= 0 || !concessionReason.trim()) return;
    if (amount > tenant.pending_amount) {
      toast({ title: 'Concession cannot exceed pending amount', variant: 'destructive' });
      return;
    }

    if (applyConcession) {
      await applyConcession.mutateAsync({
        tenantId: tenant.id,
        amount,
        reason: concessionReason,
      });
    }

    setConcessionDialogOpen(false);
    setConcessionAmount('');
    setConcessionReason('');
  };

  const viewAadhaar = async (member: Member, memberName: string) => {
    if (member.aadhaar_pdf_url) {
      const { data } = await supabase.storage
        .from('aadhaar-images')
        .createSignedUrl(member.aadhaar_pdf_url, 300);
      if (data?.signedUrl) {
        setAadhaarPdfUrl({ 
          url: data.signedUrl, 
          memberName,
          roomNumber: tenant.room_number 
        });
        setAadhaarDialogOpen(true);
      }
    }
  };

  const downloadAadhaarPdf = async () => {
    if (!aadhaarPdfUrl.url) return;
    
    const memberName = aadhaarPdfUrl.memberName?.replace(/\s+/g, '_') || 'Member';
    const roomNumber = aadhaarPdfUrl.roomNumber || tenant.room_number;
    
    try {
      const response = await fetch(aadhaarPdfUrl.url);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${memberName}_Room${roomNumber}_Aadhaar.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast({ title: 'Aadhaar downloaded successfully' });
    } catch (error) {
      console.error('Error downloading Aadhaar:', error);
      toast({ title: 'Error downloading Aadhaar', variant: 'destructive' });
    }
  };

  const renderMemberEditForm = (
    form: typeof editMemberForm | typeof newMemberForm,
    setForm: React.Dispatch<React.SetStateAction<typeof editMemberForm>> | React.Dispatch<React.SetStateAction<typeof newMemberForm>>,
    pdfRef: React.RefObject<HTMLInputElement>,
    currentAadhaarUrl?: string
  ) => (
    <div className="space-y-4 pt-4 max-h-[70vh] overflow-y-auto">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>Full Name *</Label>
          <Input
            value={form.name}
            onChange={(e) => (setForm as any)({ ...form, name: e.target.value })}
            placeholder="John Doe"
          />
        </div>
        <div className="space-y-2">
          <Label>Gender</Label>
          <Select 
            value={form.gender} 
            onValueChange={(v) => (setForm as any)({ ...form, gender: v })}
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
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>Phone Number *</Label>
          <Input
            value={form.phone}
            onChange={(e) => (setForm as any)({ ...form, phone: e.target.value })}
            placeholder="9876543210"
          />
        </div>
        <div className="space-y-2">
          <Label>Occupation</Label>
          <Input
            value={form.occupation}
            onChange={(e) => (setForm as any)({ ...form, occupation: e.target.value })}
            placeholder="Software Engineer"
          />
        </div>
      </div>

      {/* Aadhaar PDF Upload */}
      <div className="space-y-2">
        <Label>Aadhaar Card (Scanned PDF)</Label>
        {currentAadhaarUrl && !('remove_aadhaar' in form && form.remove_aadhaar) && !form.aadhaar_pdf_file && (
          <div className="p-3 bg-muted rounded-lg flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Aadhaar PDF already uploaded</span>
            {'remove_aadhaar' in form && (
              <Button 
                variant="ghost" 
                size="sm" 
                className="text-destructive hover:text-destructive"
                onClick={() => (setForm as any)({ ...form, remove_aadhaar: true })}
              >
                Remove
              </Button>
            )}
          </div>
        )}
        {'remove_aadhaar' in form && form.remove_aadhaar && (
          <div className="p-3 bg-destructive/10 rounded-lg flex items-center justify-between">
            <span className="text-sm text-destructive">Aadhaar will be removed on save</span>
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => (setForm as any)({ ...form, remove_aadhaar: false })}
            >
              Undo
            </Button>
          </div>
        )}
        {(!currentAadhaarUrl || ('remove_aadhaar' in form && form.remove_aadhaar) || form.aadhaar_pdf_file) && (
          <div 
            className="border-2 border-dashed rounded-lg p-4 text-center cursor-pointer hover:bg-muted/50 transition-colors"
            onClick={() => pdfRef.current?.click()}
          >
            <input
              ref={pdfRef}
              type="file"
              accept="application/pdf"
              onChange={(e) => (setForm as any)({ ...form, aadhaar_pdf_file: e.target.files?.[0] || null })}
              className="hidden"
            />
            {form.aadhaar_pdf_file ? (
              <div className="flex items-center justify-center gap-2 text-primary">
                <Check className="h-5 w-5" />
                <span className="text-sm">{form.aadhaar_pdf_file.name}</span>
              </div>
            ) : (
              <div className="space-y-1">
                <Upload className="h-6 w-6 mx-auto text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  {currentAadhaarUrl ? 'Click to replace PDF' : 'Click to upload PDF (optional)'}
                </p>
              </div>
            )}
          </div>
        )}
        <p className="text-xs text-muted-foreground">
          Scanned PDF recommended. You may use apps like Adobe Scan or Google Drive Scan.
        </p>
      </div>
    </div>
  );

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
          
          {/* 3-dot Menu for all administrative actions */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={() => setEditTenantDialogOpen(true)}>
                <Users className="h-4 w-4 mr-2" />
                Edit Tenant Details
              </DropdownMenuItem>
              <DropdownMenuItem onClick={openEditRoomDialog}>
                <Home className="h-4 w-4 mr-2" />
                Edit Room Details
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              {tenant.is_active && tenant.pending_amount > 0 && (
                <DropdownMenuItem onClick={() => setConcessionDialogOpen(true)}>
                  <Percent className="h-4 w-4 mr-2" />
                  Apply Concession
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              {tenant.is_active ? (
                <DropdownMenuItem 
                  onClick={() => setDiscontinueDialogOpen(true)}
                  className="text-destructive focus:text-destructive"
                >
                  <UserX className="h-4 w-4 mr-2" />
                  Discontinue Room
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem onClick={handleReactivate}>
                  <UserCheck className="h-4 w-4 mr-2" />
                  Reactivate Room
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Members Section */}
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Users className="h-5 w-5" />
                Members ({activeMembers.length})
              </CardTitle>
              <div className="flex items-center gap-4">
                {allMembers.length > activeMembers.length && (
                  <div className="flex items-center gap-2">
                    <Switch
                      id="show-discontinued"
                      checked={showDiscontinuedMembers}
                      onCheckedChange={setShowDiscontinuedMembers}
                    />
                    <Label htmlFor="show-discontinued" className="text-sm text-muted-foreground cursor-pointer">
                      View all members
                    </Label>
                  </div>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2">
              {displayedMembers.map((member, index) => {
                const originalIndex = allMembers.findIndex(m => m.name === member.name && m.phone === member.phone);
                return (
                  <div 
                    key={index} 
                    className={cn(
                      "p-4 border rounded-lg space-y-2",
                      member.is_active === false && "opacity-60 bg-muted/30"
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold">{member.name}</p>
                        {member.is_active === false && <Badge variant="secondary">Discontinued</Badge>}
                      </div>
                      <div className="flex gap-1">
                        {member.aadhaar_pdf_url && (
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
                );
              })}
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

                  {/* Payment Member Selection - Only if 2 active members */}
                  {activeMembers.length === 2 && (
                    <div className="space-y-2">
                      <Label>Payment received from *</Label>
                      <Select value={paymentPaidBy} onValueChange={setPaymentPaidBy}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select member" />
                        </SelectTrigger>
                        <SelectContent>
                          {activeMembers.map((member, idx) => (
                            <SelectItem key={idx} value={member.name}>
                              {member.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
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
                      (paymentReason === 'Other' && !paymentReasonNotes.trim()) ||
                      (activeMembers.length === 2 && !paymentPaidBy)
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
                          {(payment as any).paid_by && ` • Paid by: ${(payment as any).paid_by}`}
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

        {/* Edit Room Dialog */}
        <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Room Details</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4 max-h-[70vh] overflow-y-auto">
              <div className="space-y-2">
                <Label>Room Number</Label>
                <Input
                  value={editRoomForm.room_number}
                  onChange={(e) => setEditRoomForm({ ...editRoomForm, room_number: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Monthly Rent (₹)</Label>
                <Input
                  type="number"
                  value={editRoomForm.monthly_rent}
                  onChange={(e) => setEditRoomForm({ ...editRoomForm, monthly_rent: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Rate per Unit (₹)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={editRoomForm.electricity_rate}
                  onChange={(e) => setEditRoomForm({ ...editRoomForm, electricity_rate: e.target.value })}
                />
              </div>
              <Button 
                onClick={handleEditRoom} 
                disabled={updateTenant.isPending}
                className="w-full"
              >
                {updateTenant.isPending ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Edit Tenant Details Dialog (Member management) */}
        <Dialog open={editTenantDialogOpen} onOpenChange={setEditTenantDialogOpen}>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit Tenant Details</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <p className="text-sm text-muted-foreground">
                Manage members for Room {tenant.room_number}. Edit details, add new members, or discontinue existing ones.
              </p>
              
              {/* Add Member Button */}
              {tenant.is_active && activeMembers.length < 2 && (
                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={() => {
                    setEditTenantDialogOpen(false);
                    setAddMemberDialogOpen(true);
                  }}
                >
                  <UserPlus className="h-4 w-4 mr-2" />
                  Add New Member
                </Button>
              )}
              {tenant.is_active && activeMembers.length >= 2 && (
                <div className="p-3 bg-muted rounded-lg text-center">
                  <p className="text-sm text-muted-foreground">Maximum 2 members allowed per room</p>
                </div>
              )}

              <div className="space-y-3">
                {allMembers.map((member, index) => (
                  <div 
                    key={index}
                    className={cn(
                      "p-4 border rounded-lg",
                      member.is_active === false && "opacity-60 bg-muted/30"
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{member.name}</p>
                        <p className="text-sm text-muted-foreground">{member.phone}</p>
                        {member.is_active === false && <Badge variant="secondary" className="mt-1">Discontinued</Badge>}
                      </div>
                      {member.is_active !== false && (
                        <div className="flex gap-2">
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => {
                              setEditTenantDialogOpen(false);
                              openEditMemberDialog(index);
                            }}
                          >
                            Edit
                          </Button>
                          {activeMembers.length > 1 && (
                            <Button 
                              variant="outline" 
                              size="sm"
                              className="text-destructive hover:text-destructive"
                              onClick={() => {
                                setEditTenantDialogOpen(false);
                                setDiscontinueMemberIndex(index);
                                setDiscontinueMemberDialogOpen(true);
                              }}
                            >
                              <UserX className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Edit Member Dialog */}
        <Dialog open={editMemberDialogOpen} onOpenChange={setEditMemberDialogOpen}>
          <DialogContent className="max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit Member Details</DialogTitle>
            </DialogHeader>
            {renderMemberEditForm(editMemberForm, setEditMemberForm as any, editPdfRef, allMembers[editMemberIndex]?.aadhaar_pdf_url)}
            <Button 
              onClick={handleEditMember} 
              disabled={!editMemberForm.name.trim() || !editMemberForm.phone.trim()}
              className="w-full mt-4"
            >
              Save Member Details
            </Button>
          </DialogContent>
        </Dialog>

        {/* Add Member Dialog */}
        <Dialog open={addMemberDialogOpen} onOpenChange={setAddMemberDialogOpen}>
          <DialogContent className="max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Add New Member</DialogTitle>
            </DialogHeader>
            {renderMemberEditForm(newMemberForm, setNewMemberForm as any, addPdfRef)}
            <Button 
              onClick={handleAddMember} 
              disabled={!newMemberForm.name.trim() || !newMemberForm.phone.trim()}
              className="w-full mt-4"
            >
              Add Member to Room
            </Button>
          </DialogContent>
        </Dialog>

        {/* Discontinue Member Dialog */}
        <Dialog open={discontinueMemberDialogOpen} onOpenChange={setDiscontinueMemberDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Discontinue Member</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <p className="text-sm text-muted-foreground">
                This will mark the member as inactive. The room will remain active with the remaining member(s). 
                All financial data will remain unchanged.
              </p>
              {discontinueMemberIndex >= 0 && allMembers[discontinueMemberIndex] && (
                <p className="font-medium">
                  Member: {allMembers[discontinueMemberIndex].name}
                </p>
              )}
              <div className="flex gap-3">
                <Button 
                  variant="outline" 
                  onClick={() => setDiscontinueMemberDialogOpen(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button 
                  variant="destructive"
                  onClick={handleDiscontinueMember} 
                  className="flex-1"
                >
                  Discontinue Member
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Discontinue Room Dialog */}
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

        {/* Concession Dialog */}
        <Dialog open={concessionDialogOpen} onOpenChange={setConcessionDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Apply Concession</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground">Current Pending Amount</p>
                <p className="text-lg font-semibold">₹{tenant.pending_amount.toLocaleString('en-IN')}</p>
              </div>
              <p className="text-sm text-muted-foreground">
                This will reduce the pending amount. Concession cannot exceed the current pending balance.
              </p>
              <div className="space-y-2">
                <Label>Concession Amount (₹) *</Label>
                <Input
                  type="number"
                  min="1"
                  max={tenant.pending_amount}
                  value={concessionAmount}
                  onChange={(e) => setConcessionAmount(e.target.value)}
                  placeholder="Enter concession amount"
                />
              </div>
              <div className="space-y-2">
                <Label>Reason *</Label>
                <Textarea
                  value={concessionReason}
                  onChange={(e) => setConcessionReason(e.target.value)}
                  placeholder="e.g., Festival discount, Early payment bonus..."
                  rows={2}
                />
              </div>
              <div className="flex gap-3">
                <Button 
                  variant="outline" 
                  onClick={() => setConcessionDialogOpen(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button 
                  onClick={handleConcession}
                  disabled={
                    !concessionAmount || 
                    parseFloat(concessionAmount) <= 0 ||
                    parseFloat(concessionAmount) > tenant.pending_amount ||
                    !concessionReason.trim()
                  }
                  className="flex-1"
                >
                  Apply Concession
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Aadhaar Dialog */}
        <Dialog open={aadhaarDialogOpen} onOpenChange={setAadhaarDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <div className="flex items-center justify-between">
                <DialogTitle>Aadhaar Card - {aadhaarPdfUrl.memberName}</DialogTitle>
                {aadhaarPdfUrl.url && (
                  <Button onClick={downloadAadhaarPdf} variant="outline" size="sm">
                    <Download className="h-4 w-4 mr-2" />
                    Download PDF
                  </Button>
                )}
              </div>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              {aadhaarPdfUrl.url && (
                <div className="w-full h-[60vh]">
                  <iframe
                    src={aadhaarPdfUrl.url}
                    className="w-full h-full rounded-lg border"
                    title="Aadhaar PDF"
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
