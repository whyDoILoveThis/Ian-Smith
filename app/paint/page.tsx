//rerouts to /itspaint route
import { redirect } from "next/navigation";

export default function PaintPage() {
  redirect("/itspaint");
}
