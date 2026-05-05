import { useRouter } from 'next/router';
import { useEffect } from 'react';
import Home from './index';

export default function AgentPage() {
  const router = useRouter();
  const { agentCode } = router.query;

  // Redirect to home if no agent code is provided
  useEffect(() => {
    if (!agentCode && router.isReady) {
      router.push('/');
    }
  }, [agentCode, router]);

  // Reuse the home page component
  return <Home />;
} 