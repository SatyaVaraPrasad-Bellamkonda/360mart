import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { PolicyFrame, PolicyPage } from "@/components/legal/PolicyPage";
import { parseVersion } from "@/lib/legal/types";

// Old versions stay readable for people's records, but only the current page is for Google.
export async function generateMetadata({ params }: PageProps<"/seller-agreement/versions/[version]">): Promise<Metadata> {
  const { version } = await params;
  return { title: `Seller Agreement, version ${version}`, robots: { index: false, follow: true }, alternates: { canonical: "/seller-agreement" } };
}

// /seller-agreement/versions/2: an earlier Seller Agreement. The URL is read inside Suspense (cacheComponents).
export default function Page({ params }: PageProps<"/seller-agreement/versions/[version]">) {
  return (
    <Suspense fallback={<PolicyFrame />}>
      <Version params={params} />
    </Suspense>
  );
}

async function Version({ params }: Pick<PageProps<"/seller-agreement/versions/[version]">, "params">) {
  const version = parseVersion((await params).version);
  if (version === null) notFound();
  return <PolicyPage type="SELLER_AGREEMENT" version={version} />;
}
