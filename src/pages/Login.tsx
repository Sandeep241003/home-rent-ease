import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { LogIn, UserPlus, KeyRound } from 'lucide-react';
import { Navigate } from 'react-router-dom';

const isNetworkAuthError = (error: unknown): boolean => {
  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    const name = error.name.toLowerCase();
    return (
      message.includes('failed to fetch') ||
      message.includes('timeout') ||
      name.includes('abort') ||
      name.includes('network')
    );
  }

  if (typeof error === 'object' && error !== null && 'status' in error) {
    return Number((error as { status?: number }).status) === 0;
  }

  return false;
};

export default function Login() {
  const { session, loading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isForgotPassword, setIsForgotPassword] = useState(false);

  const backendUrl = import.meta.env.VITE_SUPABASE_URL;
  const publishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  const authTokenEndpoint = backendUrl
    ? `${backendUrl}/auth/v1/token?grant_type=password`
    : 'undefined';

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (session) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      toast({ title: 'Please enter your email', variant: 'destructive' });
      return;
    }

    if (!backendUrl || !publishableKey) {
      console.error('[Auth] Missing backend configuration for password reset', {
        hasBackendUrl: Boolean(backendUrl),
        hasPublishableKey: Boolean(publishableKey),
      });
      toast({
        title: 'Backend configuration missing',
        description: 'Authentication service is not configured correctly.',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      console.info('[Auth] resetPasswordForEmail request', {
        backendUrl,
        endpoint: `${backendUrl}/auth/v1/recover`,
        email,
      });

      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
      toast({ title: 'Password reset email sent', description: 'Check your inbox for the reset link.' });
      setIsForgotPassword(false);
    } catch (error: unknown) {
      const networkError = isNetworkAuthError(error);
      const message = error instanceof Error ? error.message : 'Unknown error';

      console.error('[Auth] resetPasswordForEmail failed', {
        backendUrl,
        endpoint: `${backendUrl}/auth/v1/recover`,
        message,
        error,
      });

      toast({
        title: networkError ? 'Backend connection timeout' : 'Error',
        description: networkError
          ? 'Cannot reach authentication service. Check your network and try again.'
          : message,
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!backendUrl || !publishableKey) {
      console.error('[Auth] Missing backend configuration for login/signup', {
        hasBackendUrl: Boolean(backendUrl),
        hasPublishableKey: Boolean(publishableKey),
      });
      toast({
        title: 'Backend configuration missing',
        description: 'Authentication service is not configured correctly.',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);

    try {
      if (isSignUp) {
        console.info('[Auth] signUp request', {
          backendUrl,
          endpoint: `${backendUrl}/auth/v1/signup`,
          email,
        });

        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: window.location.origin },
        });
        if (error) throw error;
        toast({
          title: 'Account created!',
          description: 'Please check your email to verify your account before signing in.',
        });
      } else {
        console.info('[Auth] signInWithPassword request', {
          backendUrl,
          endpoint: authTokenEndpoint,
          email,
        });

        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        navigate('/dashboard');
      }
    } catch (error: unknown) {
      const networkError = isNetworkAuthError(error);
      const message = error instanceof Error ? error.message : 'Unknown error';

      console.error('[Auth] authentication request failed', {
        backendUrl,
        endpoint: isSignUp ? `${backendUrl}/auth/v1/signup` : authTokenEndpoint,
        message,
        error,
      });

      toast({
        title: networkError ? 'Backend connection timeout' : 'Error',
        description: networkError
          ? 'Cannot reach authentication service. Check your network/VPN/ad blocker and try again.'
          : message,
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isForgotPassword) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
              <KeyRound className="h-6 w-6 text-primary" />
            </div>
            <CardTitle className="text-2xl">Reset Password</CardTitle>
            <CardDescription>Enter your email to receive a password reset link</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleForgotPassword} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="reset-email">Email</Label>
                <Input
                  id="reset-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                />
              </div>
              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? 'Sending...' : 'Send Reset Link'}
              </Button>
              <Button
                type="button"
                variant="ghost"
                className="w-full"
                onClick={() => setIsForgotPassword(false)}
              >
                Back to Login
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex items-center gap-2">
            <img src="/favicon.png" alt="RentEase" className="h-8 w-8" />
            <span className="font-bold text-xl">RentEase</span>
          </div>
          <CardTitle className="text-2xl">
            {isSignUp ? 'Create Account' : 'Welcome Back'}
          </CardTitle>
          <CardDescription>
            {isSignUp
              ? 'Sign up to manage your property'
              : 'Sign in to your property management dashboard'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                minLength={6}
              />
            </div>
            {!isSignUp && (
              <div className="text-right">
                <Button
                  type="button"
                  variant="link"
                  className="px-0 text-sm"
                  onClick={() => setIsForgotPassword(true)}
                >
                  Forgot password?
                </Button>
              </div>
            )}
            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? (
                'Please wait...'
              ) : isSignUp ? (
                <>
                  <UserPlus className="h-4 w-4 mr-2" />
                  Sign Up
                </>
              ) : (
                <>
                  <LogIn className="h-4 w-4 mr-2" />
                  Sign In
                </>
              )}
            </Button>
            <div className="text-center text-sm text-muted-foreground">
              {isSignUp ? 'Already have an account?' : "Don't have an account?"}{' '}
              <Button
                type="button"
                variant="link"
                className="px-0"
                onClick={() => setIsSignUp(!isSignUp)}
              >
                {isSignUp ? 'Sign In' : 'Sign Up'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

