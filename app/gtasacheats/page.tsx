import dynamic from "next/dynamic";

const GTASACheatsApp = dynamic(
  () => import("@/components/GTASACheats/GTASACheatsApp"),
  { ssr: false },
);

export default function GTASACheatsPage() {
  return <GTASACheatsApp />;
}
