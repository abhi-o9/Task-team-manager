import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { Clock } from 'lucide-react';

const signupSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(50),
  email: z.string().email('Invalid email address'),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number')
});

type SignupForm = z.infer<typeof signupSchema>;

export default function Signup() {
  const { signup, isLoading } = useAuthStore();
  const [registered, setRegistered] = useState(false);
  const [registeredName, setRegisteredName] = useState('');

  const { register, handleSubmit, formState: { errors } } = useForm<SignupForm>({
    resolver: zodResolver(signupSchema)
  });

  const onSubmit = async (data: SignupForm) => {
    try {
      await signup(data);
      setRegisteredName(data.name);
      setRegistered(true);
    } catch {
      // Handled in store
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left Branding Panel */}
      <div className="hidden lg:flex w-1/2 bg-surface items-center justify-center p-12 border-r border-border relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-primary/10 to-secondary/10" />
        <div className="relative z-10 max-w-lg text-center">
          <h1 className="text-5xl font-display font-bold text-white mb-6">TaskFlow</h1>
          <p className="text-xl text-textMuted leading-relaxed">
            Join thousands of teams already using TaskFlow to get more done.
          </p>
        </div>
      </div>

      {/* Right Form Panel */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8">
        <div className="max-w-md w-full">

          {/* ─── Pending Approval Banner ─── */}
          {registered && (
            <div className="mb-6 bg-warning/10 border border-warning/30 rounded-xl p-5 flex gap-4 items-start animate-fade-in">
              <div className="w-10 h-10 rounded-full bg-warning/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                <Clock size={20} className="text-warning" />
              </div>
              <div>
                <p className="font-semibold text-white mb-1">Hi {registeredName}, you're registered! 🎉</p>
                <p className="text-sm text-textMuted">
                  Your account is <span className="text-warning font-medium">pending approval</span> by an administrator or manager. You'll be able to log in once approved.
                </p>
                <Link to="/login" className="mt-3 inline-block text-sm text-primary hover:underline font-medium">
                  Go to Login →
                </Link>
              </div>
            </div>
          )}

          <div className="text-center mb-8">
            <h2 className="text-3xl font-display font-bold text-white mb-2">Create an account</h2>
            <p className="text-textMuted text-sm">Your account will require admin approval before you can log in.</p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <Input
              label="Name"
              {...register('name')}
              error={errors.name?.message}
              placeholder="John Doe"
            />
            <Input
              label="Email"
              type="email"
              {...register('email')}
              error={errors.email?.message}
              placeholder="Enter your email"
            />
            <Input
              label="Password"
              type="password"
              {...register('password')}
              error={errors.password?.message}
              placeholder="••••••••"
            />
            <Button type="submit" className="w-full" size="lg" isLoading={isLoading} disabled={registered}>
              {registered ? 'Registered!' : 'Sign Up'}
            </Button>
          </form>

          <p className="mt-8 text-center text-sm text-textMuted">
            Already have an account?{' '}
            <Link to="/login" className="text-primary hover:underline font-medium transition-colors">
              Log in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
