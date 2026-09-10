export default function TeamHomePage() {
  return (
    <section className="space-y-6">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#22C55E]">
          Overview
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-[#F5F7FA]">
          Team dashboard
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-[#8B949E]">
          Fines, payments and deadlines will live here as your team starts using the app.
        </p>
      </div>

      <div className="rounded-2xl border border-[#252A31] bg-[#15181D] p-6">
        <p className="text-sm font-medium text-[#F5F7FA]">Your team is ready.</p>
        <p className="mt-2 text-sm leading-6 text-[#8B949E]">
          Next, add teammates and define the rules that can generate fines.
        </p>
      </div>
    </section>
  )
}
