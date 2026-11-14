import { MeetingScreen } from "@/components/meeting/MeetingScreen";

export const metadata = { title: "会議中 | ステークホルダー会議室" };

export default async function MeetingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <MeetingScreen id={id} />;
}
