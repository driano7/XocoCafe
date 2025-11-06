'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import CompleteProfileForm from '@/components/Auth/CompleteProfileForm';
import type { CompleteProfileInput } from '@/lib/validations/auth';

export default function CompleteProfilePage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

  const handleComplete = async (data: CompleteProfileInput) => {
    try {
      const response = await fetch('/api/auth/complete-profile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (result.success) {
        router.push('/onboarding/favorites');
      } else {
        alert(result.message);
      }
    } catch (error) {
      alert('Error completando perfil');
    }
  };

  const handleSkip = () => {
    router.push('/onboarding/favorites');
  };

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!session?.user?.email) {
    return null;
  }

  return (
    <CompleteProfileForm
      onComplete={handleComplete}
      onSkip={handleSkip}
      userEmail={session.user.email}
    />
  );
}
