import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { PolicyFrame, PolicyPage } from "@/components/legal/PolicyPage";
import { parseVersion } from "@/lib/legal/types";

// Old versions stay readable for people's records, but only the current page is for Google.
export async function generateMetadata({ params }: PageProps<"/privacy/versions/[version]">): Promise<Metadata> {
  const { version } = await params;
  return { title: `Privacy Policy, version ${version}`, robots: { index: false, follow: true }, alternates: { canonical: "/privacy" } };
}

// /privacy/versions/2: an earlier Privacy Policy. The URL is read inside Suspense (cacheComponents).
export default function Page({ params }: PageProps<"/privacy/versions/[version]">) {
  return (
    <Suspense fallback={<PolicyFrame />}>
      <Version params={params} />
    </Suspense>
  );
}

async function Version({ params }: Pick<PageProps<"/privacy/versions/[version]">, "params">) {
  const version = parseVersion((await params).version);
  if (version === null) notFound();
  return <PolicyPage type="PRIVACY" version={version} />;
}
