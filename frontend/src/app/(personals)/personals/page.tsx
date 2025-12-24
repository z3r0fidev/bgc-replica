import { redirect } from "next/navigation";

export default function PersonalsPage() {
  // Default to TransX category as requested in the research
  redirect("/personals/transx");
}
