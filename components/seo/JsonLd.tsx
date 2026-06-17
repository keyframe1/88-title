/**
 * Renders a JSON-LD <script> for structured data (schema.org). The payload is
 * already a plain object we control, so serializing it is safe; we still guard
 * the closing-tag sequence so a stray "</script>" in any string can't break out.
 */
export function JsonLd({ data }: { data: Record<string, unknown> }) {
  const json = JSON.stringify(data).replace(/</g, "\\u003c");
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: json }}
    />
  );
}
