import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '@/components/Layout';
import { useTenants, Member } from '@/hooks/useTenants';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ArrowLeft, ArrowRight, Upload, User, Check, Users, Home, CalendarIcon } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Progress } from '@/components/ui/progress';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface MemberData {
  name: string;
  phone: string;
  gender: string;
  occupation: string;
  aadhaar_front_file: File | null;
  aadhaar_back_file: File | null;
}

interface RoomData {
  room_number: string;
  monthly_rent: string;
  electricity_rate: string;
  initial_meter_reading: string;
  joining_date: Date;
}

const emptyMember: MemberData = {
  name: '',
  phone: '',
  gender: '',
  occupation: '',
  aadhaar_front_file: null,
  aadhaar_back_file: null,
};

const emptyRoom: RoomData = {
  room_number: '',
  monthly_rent: '',
  electricity_rate: '',
  initial_meter_reading: '0',
  joining_date: new Date(),
};

type Step = 'count' | 'member1' | 'member2' | 'room';

export default function AddTenant() {
  const navigate = useNavigate();
  const { addTenant } = useTenants();
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [step, setStep] = useState<Step>('count');
  const [memberCount, setMemberCount] = useState<1 | 2>(1);
  const [member1, setMember1] = useState<MemberData>({ ...emptyMember });
  const [member2, setMember2] = useState<MemberData>({ ...emptyMember });
  const [roomData, setRoomData] = useState<RoomData>({ ...emptyRoom });
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const frontFileRef1 = useRef<HTMLInputElement>(null);
  const backFileRef1 = useRef<HTMLInputElement>(null);
  const frontFileRef2 = useRef<HTMLInputElement>(null);
  const backFileRef2 = useRef<HTMLInputElement>(null);

  const uploadAadhaarImage = async (file: File): Promise<string | undefined> => {
    if (!user) return undefined;
    
    const fileExt = file.name.split('.').pop();
    const fileName = `${user.id}/${Date.now()}-${Math.random().toString(36).substr(2, 9)}.${fileExt}`;
    
    const { error: uploadError } = await supabase.storage
      .from('aadhaar-images')
      .upload(fileName, file);

    if (!uploadError) {
      return fileName;
    }
    return undefined;
  };

  const handleCountSubmit = () => {
    setStep('member1');
  };

  const isMemberValid = (member: MemberData) => {
    return member.name.trim() && member.phone.trim();
  };

  const isRoomValid = () => {
    return (
      roomData.room_number.trim() &&
      roomData.monthly_rent &&
      roomData.electricity_rate
    );
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);

    try {
      // Upload Aadhaar images for member 1
      let member1FrontUrl: string | undefined;
      let member1BackUrl: string | undefined;
      
      if (member1.aadhaar_front_file) {
        member1FrontUrl = await uploadAadhaarImage(member1.aadhaar_front_file);
      }
      if (member1.aadhaar_back_file) {
        member1BackUrl = await uploadAadhaarImage(member1.aadhaar_back_file);
      }

      const members: Member[] = [
        {
          name: member1.name.trim(),
          phone: member1.phone.trim(),
          gender: member1.gender,
          occupation: member1.occupation,
          aadhaar_front_url: member1FrontUrl,
          aadhaar_back_url: member1BackUrl,
        }
      ];

      // Upload Aadhaar images for member 2 if exists
      if (memberCount === 2) {
        let member2FrontUrl: string | undefined;
        let member2BackUrl: string | undefined;
        
        if (member2.aadhaar_front_file) {
          member2FrontUrl = await uploadAadhaarImage(member2.aadhaar_front_file);
        }
        if (member2.aadhaar_back_file) {
          member2BackUrl = await uploadAadhaarImage(member2.aadhaar_back_file);
        }

        members.push({
          name: member2.name.trim(),
          phone: member2.phone.trim(),
          gender: member2.gender,
          occupation: member2.occupation,
          aadhaar_front_url: member2FrontUrl,
          aadhaar_back_url: member2BackUrl,
        });
      }

      // Use the selected joining date
      const joiningDateStr = format(roomData.joining_date, 'yyyy-MM-dd');

      // Add tenant with room data and members
      await addTenant.mutateAsync({
        name: members.map(m => m.name).join(' & '),
        phone: member1.phone.trim(),
        room_number: roomData.room_number.trim(),
        monthly_rent: parseFloat(roomData.monthly_rent) || 0,
        electricity_rate: parseFloat(roomData.electricity_rate) || 0,
        initial_meter_reading: parseFloat(roomData.initial_meter_reading) || 0,
        joining_date: joiningDateStr,
        gender: member1.gender || undefined,
        occupation: member1.occupation || undefined,
        aadhaar_image_url: member1FrontUrl,
        aadhaar_back_image_url: member1BackUrl,
        members,
      });

      toast({ 
        title: 'Success!', 
        description: `Room ${roomData.room_number} added with ${memberCount} member(s)` 
      });
      navigate('/tenants');
    } catch (error) {
      console.error('Error adding room:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStepNumber = () => {
    switch (step) {
      case 'count': return 1;
      case 'member1': return 2;
      case 'member2': return 3;
      case 'room': return memberCount === 2 ? 4 : 3;
    }
  };

  const getTotalSteps = () => memberCount === 2 ? 4 : 3;
  const progress = (getStepNumber() / getTotalSteps()) * 100;

  const handleBack = () => {
    switch (step) {
      case 'member1':
        setStep('count');
        break;
      case 'member2':
        setStep('member1');
        break;
      case 'room':
        setStep(memberCount === 2 ? 'member2' : 'member1');
        break;
      default:
        navigate(-1);
    }
  };

  const handleNext = () => {
    switch (step) {
      case 'member1':
        if (memberCount === 2) {
          setStep('member2');
        } else {
          setStep('room');
        }
        break;
      case 'member2':
        setStep('room');
        break;
    }
  };

  const renderMemberForm = (
    member: MemberData, 
    setMember: React.Dispatch<React.SetStateAction<MemberData>>,
    memberNumber: number,
    frontRef: React.RefObject<HTMLInputElement>,
    backRef: React.RefObject<HTMLInputElement>
  ) => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <User className="h-5 w-5" />
          Member {memberNumber} Details
        </CardTitle>
        <CardDescription>
          Enter personal details for member {memberNumber}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor={`name-${memberNumber}`}>Full Name *</Label>
            <Input
              id={`name-${memberNumber}`}
              value={member.name}
              onChange={(e) => setMember({ ...member, name: e.target.value })}
              placeholder="John Doe"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor={`gender-${memberNumber}`}>Gender</Label>
            <Select 
              value={member.gender} 
              onValueChange={(v) => setMember({ ...member, gender: v })}
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
            <Label htmlFor={`phone-${memberNumber}`}>Phone Number *</Label>
            <Input
              id={`phone-${memberNumber}`}
              value={member.phone}
              onChange={(e) => setMember({ ...member, phone: e.target.value })}
              placeholder="9876543210"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor={`occupation-${memberNumber}`}>Occupation</Label>
            <Input
              id={`occupation-${memberNumber}`}
              value={member.occupation}
              onChange={(e) => setMember({ ...member, occupation: e.target.value })}
              placeholder="Software Engineer"
            />
          </div>
        </div>

        {/* Aadhaar Upload - Front */}
        <div className="space-y-2">
          <Label>Aadhaar Card (Front Side)</Label>
          <div 
            className="border-2 border-dashed rounded-lg p-4 text-center cursor-pointer hover:bg-muted/50 transition-colors"
            onClick={() => frontRef.current?.click()}
          >
            <input
              ref={frontRef}
              type="file"
              accept="image/*"
              onChange={(e) => setMember({ ...member, aadhaar_front_file: e.target.files?.[0] || null })}
              className="hidden"
            />
            {member.aadhaar_front_file ? (
              <div className="flex items-center justify-center gap-2 text-primary">
                <Check className="h-5 w-5" />
                <span className="text-sm">{member.aadhaar_front_file.name}</span>
              </div>
            ) : (
              <div className="space-y-1">
                <Upload className="h-6 w-6 mx-auto text-muted-foreground" />
                <p className="text-sm text-muted-foreground">Click to upload (optional)</p>
              </div>
            )}
          </div>
        </div>

        {/* Aadhaar Upload - Back */}
        <div className="space-y-2">
          <Label>Aadhaar Card (Back Side)</Label>
          <div 
            className="border-2 border-dashed rounded-lg p-4 text-center cursor-pointer hover:bg-muted/50 transition-colors"
            onClick={() => backRef.current?.click()}
          >
            <input
              ref={backRef}
              type="file"
              accept="image/*"
              onChange={(e) => setMember({ ...member, aadhaar_back_file: e.target.files?.[0] || null })}
              className="hidden"
            />
            {member.aadhaar_back_file ? (
              <div className="flex items-center justify-center gap-2 text-primary">
                <Check className="h-5 w-5" />
                <span className="text-sm">{member.aadhaar_back_file.name}</span>
              </div>
            ) : (
              <div className="space-y-1">
                <Upload className="h-6 w-6 mx-auto text-muted-foreground" />
                <p className="text-sm text-muted-foreground">Click to upload (optional)</p>
              </div>
            )}
          </div>
        </div>

        <div className="flex gap-3 pt-4">
          <Button type="button" variant="outline" onClick={handleBack}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div className="flex-1" />
          <Button 
            onClick={handleNext} 
            disabled={!isMemberValid(member)}
          >
            Next
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <Layout>
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={handleBack}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold tracking-tight">Add Room</h1>
            <p className="text-muted-foreground">
              {step === 'count' && 'Step 1: How many members?'}
              {step === 'member1' && 'Step 2: Member 1 Details'}
              {step === 'member2' && 'Step 3: Member 2 Details'}
              {step === 'room' && `Step ${memberCount === 2 ? 4 : 3}: Room Details`}
            </p>
          </div>
        </div>

        {step !== 'count' && (
          <div className="space-y-2">
            <Progress value={progress} className="h-2" />
            <p className="text-sm text-muted-foreground text-center">
              Step {getStepNumber()} of {getTotalSteps()}
            </p>
          </div>
        )}

        {step === 'count' && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                How many members are staying in this room?
              </CardTitle>
              <CardDescription>
                A room can have 1 or 2 members
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Button
                  variant={memberCount === 1 ? 'default' : 'outline'}
                  className="h-24 flex flex-col gap-2"
                  onClick={() => setMemberCount(1)}
                >
                  <User className="h-8 w-8" />
                  <span>1 Member</span>
                </Button>
                <Button
                  variant={memberCount === 2 ? 'default' : 'outline'}
                  className="h-24 flex flex-col gap-2"
                  onClick={() => setMemberCount(2)}
                >
                  <Users className="h-8 w-8" />
                  <span>2 Members</span>
                </Button>
              </div>
              <Button onClick={handleCountSubmit} className="w-full">
                Continue <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </CardContent>
          </Card>
        )}

        {step === 'member1' && renderMemberForm(member1, setMember1, 1, frontFileRef1, backFileRef1)}
        {step === 'member2' && renderMemberForm(member2, setMember2, 2, frontFileRef2, backFileRef2)}

        {step === 'room' && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Home className="h-5 w-5" />
                Room Details
              </CardTitle>
              <CardDescription>
                Enter room and financial details
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="room_number">Room Number / ID *</Label>
                <Input
                  id="room_number"
                  value={roomData.room_number}
                  onChange={(e) => setRoomData({ ...roomData, room_number: e.target.value })}
                  placeholder="101"
                  required
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="monthly_rent">Monthly Rent (₹) *</Label>
                  <Input
                    id="monthly_rent"
                    type="number"
                    min="0"
                    step="1"
                    value={roomData.monthly_rent}
                    onChange={(e) => setRoomData({ ...roomData, monthly_rent: e.target.value })}
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
                    value={roomData.electricity_rate}
                    onChange={(e) => setRoomData({ ...roomData, electricity_rate: e.target.value })}
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
                  value={roomData.initial_meter_reading}
                  onChange={(e) => setRoomData({ ...roomData, initial_meter_reading: e.target.value })}
                  placeholder="0"
                />
              </div>

              {/* Joining Date Picker */}
              <div className="space-y-2">
                <Label>Joining Date (Optional)</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !roomData.joining_date && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {roomData.joining_date ? format(roomData.joining_date, "PPP") : <span>Pick a date</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={roomData.joining_date}
                      onSelect={(date) => date && setRoomData({ ...roomData, joining_date: date })}
                      initialFocus
                      className={cn("p-3 pointer-events-auto")}
                    />
                  </PopoverContent>
                </Popover>
                <p className="text-xs text-muted-foreground">
                  Pre-selected to current date. Change only if needed.
                </p>
              </div>

              <div className="flex gap-3 pt-4">
                <Button type="button" variant="outline" onClick={handleBack}>
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back
                </Button>
                <div className="flex-1" />
                <Button 
                  onClick={handleSubmit} 
                  disabled={isSubmitting || !isRoomValid()}
                >
                  {isSubmitting ? 'Adding Room...' : 'Add Room'}
                  <Check className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </Layout>
  );
}
