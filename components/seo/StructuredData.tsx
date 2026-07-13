type StructuredDataProps = {
  data: Record<string, unknown> | Record<string, unknown>[];
};

export function StructuredData({ data }: StructuredDataProps) {
  const graphs = Array.isArray(data) ? data : [data];

  return (
    <>
      {graphs.map((graph, index) => (
        <script
          key={index}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(graph) }}
        />
      ))}
    </>
  );
}
