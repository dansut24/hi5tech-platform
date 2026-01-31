export default function Page() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Problems</h1>
        <p className="opacity-80">Problem management (root cause analysis, known errors, linking incidents).</p>
      </div>

      <div className="hi5-card p-4">
        <div className="text-sm opacity-70">Scaffold ready ✅</div>
        <div className="text-sm opacity-80 mt-2">
          Next: build database tables + list/detail pages + workflows.
        </div>
      </div>
    </div>
  );
}