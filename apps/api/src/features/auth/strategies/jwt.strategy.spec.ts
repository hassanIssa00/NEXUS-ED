import { isOnboardingRouteAllowed } from './jwt.strategy';

describe('onboarding JWT route restrictions', () => {
  it('allows only the profile and onboarding endpoints', () => {
    expect(isOnboardingRouteAllowed('GET', '/api/auth/profile')).toBe(true);
    expect(isOnboardingRouteAllowed('GET', '/api/users/me/student-profile')).toBe(true);
    expect(isOnboardingRouteAllowed('PUT', '/api/users/me/student-profile')).toBe(true);
    expect(isOnboardingRouteAllowed('POST', '/api/users/parent-survey')).toBe(true);
    expect(isOnboardingRouteAllowed('POST', '/api/assessments/placement/submit')).toBe(true);
  });

  it('rejects dashboards and similarly named non-onboarding endpoints', () => {
    expect(isOnboardingRouteAllowed('GET', '/api/dashboard')).toBe(false);
    expect(isOnboardingRouteAllowed('GET', '/api/users')).toBe(false);
    expect(isOnboardingRouteAllowed('GET', '/api/assessments/placement/reports')).toBe(false);
    expect(isOnboardingRouteAllowed('GET', '/api/auth/profile/')).toBe(false);
  });
});
