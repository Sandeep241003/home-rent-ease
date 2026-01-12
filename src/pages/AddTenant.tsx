import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '@/components/Layout';
import { useTenants } from '@/hooks/useTenants';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ArrowLeft, ArrowRight, Upload, User, Check } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Progress } from '@/components/ui/progress';

interface TenantData {
  name: string;
  phone: string;
  room_number: string;
  gender: string;
  occupation: string;
  monthly_rent: string;
  electricity_rate: string;
  initial_meter_reading: string;
  joining_date: string;
  aadhaar_file: File | null;
}

const emptyTenant: TenantData = {
  name: '',
  phone: '',
  room_number: '',
  gender: '',
  occupation: '',
  monthly_rent: '',
  electricity_rate: '',
  initial_meter_reading: '0',
  joining_date: new Date().toISOString().split('T')[0],
  aadhaar_file: null,
};

export default function AddTenant() {
  const navigate = useNavigate();
  const { addTenant } = useTenants();
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [step, setStep] = useState<'count' | 'form'>('count');
  const [tenantCount, setTenantCount] = useState('1');
  const [currentTenantIndex, setCurrentTenantIndex] = useState(0);
  const [tenantsData, setTenantsData] = useState<TenantData[]>([{ ...emptyTenant }]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleCountSubmit = () => {
    const count = parseInt(tenantCount) || 1;
    const newTenantsData = Array(count).fill(null).map(() => ({ ...emptyTenant }));
    setTenantsData(newTenantsData);
    setStep('form');
  };

  const updateCurrentTenant = (field: keyof TenantData, value: string | File | null) => {
    const updated = [...tenantsData];
    updated[currentTenantIndex] = { ...updated[currentTenantIndex], [field]: value };
    setTenantsData(updated);
  };

  const currentTenant = tenantsData[currentTenantIndex];

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    updateCurrentTenant('aadhaar_file', file);
  };

  const isCurrentFormValid = () => {
    return (
      currentTenant.name.trim() &&
      currentTenant.phone.trim() &&
      currentTenant.room_number.trim() &&
      currentTenant.monthly_rent &&
      currentTenant.electricity_rate
    );
  };

  const handleNext = () => {
    if (currentTenantIndex < tenantsData.length - 1) {
      setCurrentTenantIndex(currentTenantIndex + 1);
    }
  };

  const handlePrev = () => {
    if (currentTenantIndex > 0) {
      setCurrentTenantIndex(currentTenantIndex - 1);
    }
  };

  const handleSubmitAll = async () => {
    setIsSubmitting(true);

    try {
      for (const tenant of tenantsData) {
        let aadhaarUrl: string | undefined;

        // Upload Aadhaar image if provided
        if (tenant.aadhaar_file && user) {
          const fileExt = tenant.aadhaar_file.name.split('.').pop();
          const fileName = `${user.id}/${Date.now()}-${Math.random().toString(36).substr(2, 9)}.${fileExt}`;
          
          const { error: uploadError } = await supabase.storage
            .from('aadhaar-images')
            .upload(fileName, tenant.aadhaar_file);

          if (!uploadError) {
            const { data: urlData } = supabase.storage
              .from('aadhaar-images')
              .getPublicUrl(fileName);
            aadhaarUrl = urlData.publicUrl;
          }
        }

        await addTenant.mutateAsync({
          name: tenant.name.trim(),
          phone: tenant.phone.trim(),
          room_number: tenant.room_number.trim(),
          monthly_rent: parseFloat(tenant.monthly_rent) || 0,
          electricity_rate: parseFloat(tenant.electricity_rate) || 0,
          initial_meter_reading: parseFloat(tenant.initial_meter_reading) || 0,
          joining_date: tenant.joining_date,
          gender: tenant.gender || undefined,
          occupation: tenant.occupation || undefined,
          aadhaar_image_url: aadhaarUrl,
        });
      }

      toast({ 
        title: 'Success!', 
        description: `${tenantsData.length} tenant(s) added successfully` 
      });
      navigate('/tenants');
    } catch (error) {
      console.error('Error adding tenants:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const progress = ((currentTenantIndex + 1) / tenantsData.length) * 100;

  return (
    <Layout>
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => {
            if (step === 'form' && currentTenantIndex > 0) {
              handlePrev();
            } else if (step === 'form') {
              setStep('count');
            } else {
              navigate(-1);
            }
          }}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold tracking-tight">Add Tenants</h1>
            <p className="text-muted-foreground">
              {step === 'count' ? 'Step 1: How many tenants?' : `Tenant ${currentTenantIndex + 1} of ${tenantsData.length}`}
            </p>
          </div>
        </div>

        {step === 'count' ? (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                How many tenants do you want to add?
              </CardTitle>
              <CardDescription>
                You'll fill in details for each tenant one by one
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="count">Number of Tenants</Label>
                <Input
                  id="count"
                  type="number"
                  min="1"
                  max="10"
                  value={tenantCount}
                  onChange={(e) => setTenantCount(e.target.value)}
                  placeholder="1"
                />
              </div>
              <Button onClick={handleCountSubmit} className="w-full">
                Continue <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="space-y-2">
              <Progress value={progress} className="h-2" />
              <p className="text-sm text-muted-foreground text-center">
                {currentTenantIndex + 1} of {tenantsData.length} tenants
              </p>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Tenant {currentTenantIndex + 1} Details</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Personal Info */}
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="name">Full Name *</Label>
                      <Input
                        id="name"
                        value={currentTenant.name}
                        onChange={(e) => updateCurrentTenant('name', e.target.value)}
                        placeholder="John Doe"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="gender">Gender</Label>
                      <Select 
                        value={currentTenant.gender} 
                        onValueChange={(v) => updateCurrentTenant('gender', v)}
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
                      <Label htmlFor="phone">Phone Number *</Label>
                      <Input
                        id="phone"
                        value={currentTenant.phone}
                        onChange={(e) => updateCurrentTenant('phone', e.target.value)}
                        placeholder="9876543210"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="occupation">Occupation</Label>
                      <Input
                        id="occupation"
                        value={currentTenant.occupation}
                        onChange={(e) => updateCurrentTenant('occupation', e.target.value)}
                        placeholder="Software Engineer"
                      />
                    </div>
                  </div>

                  {/* Room & Date */}
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="room">Room Number *</Label>
                      <Input
                        id="room"
                        value={currentTenant.room_number}
                        onChange={(e) => updateCurrentTenant('room_number', e.target.value)}
                        placeholder="101"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="joining_date">Joining Date *</Label>
                      <Input
                        id="joining_date"
                        type="date"
                        value={currentTenant.joining_date}
                        onChange={(e) => updateCurrentTenant('joining_date', e.target.value)}
                        required
                      />
                    </div>
                  </div>

                  {/* Financial Info */}
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="monthly_rent">Monthly Rent (₹) *</Label>
                      <Input
                        id="monthly_rent"
                        type="number"
                        min="0"
                        step="1"
                        value={currentTenant.monthly_rent}
                        onChange={(e) => updateCurrentTenant('monthly_rent', e.target.value)}
                        placeholder="5000"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="electricity_rate">Rate per Unit (₹) *</Label>
                      <Input
                        id="electricity_rate"
                        type="number"
                        min="0"
                        step="0.01"
                        value={currentTenant.electricity_rate}
                        onChange={(e) => updateCurrentTenant('electricity_rate', e.target.value)}
                        placeholder="8.50"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="initial_meter">Initial Meter Reading</Label>
                    <Input
                      id="initial_meter"
                      type="number"
                      min="0"
                      step="0.01"
                      value={currentTenant.initial_meter_reading}
                      onChange={(e) => updateCurrentTenant('initial_meter_reading', e.target.value)}
                      placeholder="0"
                    />
                  </div>

                  {/* Aadhaar Upload */}
                  <div className="space-y-2">
                    <Label>Aadhaar Card (Front Side)</Label>
                    <div 
                      className="border-2 border-dashed rounded-lg p-6 text-center cursor-pointer hover:bg-muted/50 transition-colors"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleFileChange}
                        className="hidden"
                      />
                      {currentTenant.aadhaar_file ? (
                        <div className="flex items-center justify-center gap-2 text-primary">
                          <Check className="h-5 w-5" />
                          <span>{currentTenant.aadhaar_file.name}</span>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <Upload className="h-8 w-8 mx-auto text-muted-foreground" />
                          <p className="text-sm text-muted-foreground">
                            Click to upload Aadhaar image (optional)
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Navigation Buttons */}
                  <div className="flex gap-3 pt-4">
                    {currentTenantIndex > 0 && (
                      <Button type="button" variant="outline" onClick={handlePrev}>
                        <ArrowLeft className="h-4 w-4 mr-2" />
                        Previous
                      </Button>
                    )}
                    <div className="flex-1" />
                    {currentTenantIndex < tenantsData.length - 1 ? (
                      <Button 
                        onClick={handleNext} 
                        disabled={!isCurrentFormValid()}
                      >
                        Next Tenant
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Button>
                    ) : (
                      <Button 
                        onClick={handleSubmitAll} 
                        disabled={isSubmitting || !isCurrentFormValid()}
                      >
                        {isSubmitting ? 'Adding Tenants...' : `Add ${tenantsData.length} Tenant${tenantsData.length > 1 ? 's' : ''}`}
                        <Check className="ml-2 h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </Layout>
  );
}
