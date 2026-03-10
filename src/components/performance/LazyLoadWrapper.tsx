import React, { Suspense, lazy, useEffect } from 'react';
import { LoadingState } from '@/components/common/LoadingState';

interface LazyLoadWrapperProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  minHeight?: string;
}

export const LazyLoadWrapper: React.FC<LazyLoadWrapperProps> = ({
  children,
  fallback,
  minHeight = "400px"
}) => {
  return (
    <div style={{ minHeight }}>
      <Suspense fallback={fallback || <LoadingState size="lg" />}>
        {children}
      </Suspense>
    </div>
  );
};

// Fixed HOC for lazy loading components
export const withLazyLoading = <P extends object>(
  importFn: () => Promise<{ default: React.ComponentType<P> }>,
  fallback?: React.ReactNode
) => {
  const LazyComponent = lazy(() => importFn().catch((error) => {
    console.error('Error loading lazy component:', error);
    return { default: () => <div>Error loading component</div> };
  }));
  
  return React.forwardRef<any, P>((props, ref) => (
    <LazyLoadWrapper fallback={fallback}>
      <LazyComponent {...props} ref={ref} />
    </LazyLoadWrapper>
  ));
};

// Lazy loaded route components
export const LazyDashboard = lazy(() => import('@/pages/Dashboard').catch((error) => {
  console.error('Error loading LazyDashboard:', error);
  return { default: () => <div>Error loading Dashboard</div> };
}));
export const LazySurveys = lazy(() => import('@/pages/Surveys').catch((error) => {
  console.error('Error loading LazySurveys:', error);
  return { default: () => <div>Error loading Surveys</div> };
}));
export const LazyContacts = lazy(() => import('@/pages/Contacts').catch((error) => {
  console.error('Error loading LazyContacts:', error);
  return { default: () => <div>Error loading Contacts</div> };
}));
export const LazyCampaignAnalytics = lazy(() => import('@/pages/CampaignAnalytics').catch((error) => {
  console.error('Error loading LazyCampaignAnalytics:', error);
  return { default: () => <div>Error loading CampaignAnalytics</div> };
}));
export const LazySurveyBuilder = lazy(() => import('@/pages/SurveyBuilder').catch((error) => {
  console.error('Error loading LazySurveyBuilder:', error);
  return { default: () => <div>Error loading SurveyBuilder</div> };
}));