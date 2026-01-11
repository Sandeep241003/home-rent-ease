import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '@/components/Layout';
import { useTenants } from '@/hooks/useTenants';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowLeft } from 'lucide-react';

export default function AddTenant() {
  const navigate = useNavigate();
  const { addTenant } = useTenants();
  
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    room_number: '',
    monthly_rent: '',
    electricity_rate: '',
    initial_meter_reading: '0',
    joining_date: new Date().toISOString().split('T')[0],
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    await addTenant.mutateAsync({
      name: formData.name.trim(),
      phone: formData.phone.trim(),
      room_number: formData.room_number.trim(),
      monthly_rent: parseFloat(formData.monthly_rent) || 0,
      electricity_rate: parseFloat(formData.electricity_rate) || 0,
      initial_meter_reading: parseFloat(formData.initial_meter_reading) || 0,
      joining_date: formData.joining_date,
    });

    navigate('/tenants');
  };

  return (
    <Layout>
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Add Tenant</h1>
            <p className="text-muted-foreground">Add a new tenant to your property</p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Tenant Details</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="name">Full Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="John Doe"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number *</Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="9876543210"
                    required
                  />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="room">Room Number *</Label>
                  <Input
                    id="room"
                    value={formData.room_number}
                    onChange={(e) => setFormData({ ...formData, room_number: e.target.value })}
                    placeholder="101"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="joining_date">Joining Date *</Label>
                  <Input
                    id="joining_date"
                    type="date"
                    value={formData.joining_date}
                    onChange={(e) => setFormData({ ...formData, joining_date: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="monthly_rent">Monthly Rent (₹) *</Label>
                  <Input
                    id="monthly_rent"
                    type="number"
                    min="0"
                    step="1"
                    value={formData.monthly_rent}
                    onChange={(e) => setFormData({ ...formData, monthly_rent: e.target.value })}
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
                    value={formData.electricity_rate}
                    onChange={(e) => setFormData({ ...formData, electricity_rate: e.target.value })}
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
                  value={formData.initial_meter_reading}
                  onChange={(e) => setFormData({ ...formData, initial_meter_reading: e.target.value })}
                  placeholder="0"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <Button type="button" variant="outline" onClick={() => navigate(-1)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={addTenant.isPending}>
                  {addTenant.isPending ? 'Adding...' : 'Add Tenant'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
