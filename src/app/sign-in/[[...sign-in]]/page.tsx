import { SignIn } from "@clerk/nextjs";

export default function SignInPage() {
  return (
    <div className="min-h-[calc(100vh-3rem)] flex items-center justify-center px-5 py-12">
      <SignIn
        // There is no sign-up page: accounts are created on /start after
        // paying. Anyone without one belongs on pricing.
        signUpUrl="/pricing"
        forceRedirectUrl="/today"
        fallbackRedirectUrl="/today"
        signUpForceRedirectUrl="/start"
        signUpFallbackRedirectUrl="/start"
      />
    </div>
  );
}
