import { SignIn } from "@clerk/nextjs";

export default function SignInPage() {
  return (
    <div className="min-h-[calc(100vh-3rem)] flex items-center justify-center px-5 py-12">
      <SignIn
        signUpUrl="/sign-up"
        forceRedirectUrl="/dashboard"
        fallbackRedirectUrl="/dashboard"
        // A NEW user who clicks a social button here gets transferred to
        // sign-up — send them through /welcome (onboarding + referral claim),
        // not straight to the dashboard.
        signUpForceRedirectUrl="/welcome"
        signUpFallbackRedirectUrl="/welcome"
      />
    </div>
  );
}
