import { headers } from 'next/headers';

type JsonLdValue = Record<string, unknown> | Array<Record<string, unknown>>;

function serialize(value: JsonLdValue) {
  return JSON.stringify(value).replace(/</g, '\\u003c');
}

export default async function StructuredData({ data }: { data: JsonLdValue }) {
  const nonce = (await headers()).get('x-nonce') ?? undefined;
  return (
    <script
      type="application/ld+json"
      nonce={nonce}
      suppressHydrationWarning
      dangerouslySetInnerHTML={{ __html: serialize(data) }}
    />
  );
}
