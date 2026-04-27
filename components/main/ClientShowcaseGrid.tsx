"use client";

import ClientShowcaseCard, {
  type ClientShowcaseCardDetails,
} from "./ClientShowcaseCard";

interface ClientShowcaseGridProps {
  items: ClientShowcaseCardDetails[];
}

export default function ClientShowcaseGrid({ items }: ClientShowcaseGridProps) {
  return (
    <section className="flex flex-col gap-6 w-full max-w-5xl mx-auto px-4 py-8">
      {items.map((item, i) => (
        <ClientShowcaseCard key={`${item.url}-${i}`} {...item} />
      ))}
    </section>
  );
}
