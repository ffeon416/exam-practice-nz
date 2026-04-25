import { SignUp } from "@clerk/nextjs";

export default function SignUpPage() {
  return (
    <div className="min-h-[calc(100vh-3rem)] flex items-center justify-center px-5 py-12">
      <SignUp
        signInUrl="/sign-in"
        forceRedirectUrl="/welcome"
        fallbackRedirectUrl="/welcome"
      />
    </div>
  );
}
