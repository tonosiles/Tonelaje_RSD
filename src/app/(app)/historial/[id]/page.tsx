import { Detail } from "./Detail";

export default async function DetallePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <Detail id={id} />;
}
