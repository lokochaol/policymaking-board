import { ResultsScreen } from "@/components/results/ResultsScreen";

export const metadata = { title: "結果 | ステークホルダー会議室" };

export default async function ResultsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ResultsScreen id={id} />;
}
