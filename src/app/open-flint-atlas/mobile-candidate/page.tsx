import { redirect } from "next/navigation";

export default function MobileCandidatePage() {
  redirect("/open-flint-atlas?mobile=deck");
}
