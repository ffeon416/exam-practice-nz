import { redirect } from "next/navigation";

// The single-question drill used to flat-map ALL_EXAMS from the static catalog.
// That catalog has been removed in favour of AI-generated custom papers, so
// /practice now redirects students to /subjects to build a custom paper.
export default function PracticeRedirect() {
  redirect("/subjects");
}
