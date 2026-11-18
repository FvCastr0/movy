import { redirect } from 'next/navigation';

export default function LeadIdPage({ params }: { params: { id: string } }) {
  redirect(`/crm/${params.id}`);
}
