import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { Board } from "@/components/board";
import { listClips } from "@/lib/clips";
import { isPhoneUserAgent } from "@/lib/phone";
import { getCurrentSession } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function BoardPage() {
  const session = await getCurrentSession();
  if (!session) {
    redirect("/sign-in");
  }

  const headerList = await headers();
  const phone = isPhoneUserAgent(headerList.get("user-agent") ?? "");
  const { clips } = await listClips();
  return <Board email={session.user.email} initialClips={clips} phone={phone} />;
}
