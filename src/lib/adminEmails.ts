// Emails that can access the /admin dashboard.
// Add more here if/when you bring on business partners or staff.
export const ADMIN_EMAILS = [
  "rowanclifford1@gmail.com",
];

export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return ADMIN_EMAILS.includes(email.trim().toLowerCase());
}
