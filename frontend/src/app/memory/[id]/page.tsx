import React from 'react';
import MemoryDetail from '../../../components/memory/MemoryDetail';

export default function MemoryDetailPage({ params }: { params: { id: string } }) {
  // Pass the ID to the client component. 
  // In a real app, we would fetch data here (RSC) or pass the ID to the client component.
  return <MemoryDetail memoryId={params.id} />;
}
