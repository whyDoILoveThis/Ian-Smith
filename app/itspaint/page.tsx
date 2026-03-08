import dynamic from "next/dynamic";

const ItsPaintApp = dynamic(
  () => import("@/components/ItsPaint/components/ItsPaintApp"),
  { ssr: false },
);

export default function ItsPaintPage() {
  return <ItsPaintApp />;
}
