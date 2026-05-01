import { redirect } from "next/navigation";
import { ThemeToggle } from "@/components/theme-toggle";
import { createClient } from "@/lib/supabase/server";
import {
  createFlavor,
  createStep,
  deleteFlavor,
  deleteStep,
  generateCaptionsForFlavor,
  moveStep,
  signOut,
  updateFlavor,
  updateStep,
} from "./actions";

type TableRow = Record<string, unknown>;

function asText(value: unknown, fallback = "") {
  if (value === null || value === undefined) return fallback;
  return String(value);
}

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_superadmin,is_matrix_admin")
    .eq("id", user.id)
    .single();

  const hasAccess = !!(profile?.is_superadmin || profile?.is_matrix_admin);
  if (!hasAccess) {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-lg items-center px-6">
        <div className="w-full rounded-lg border border-red-300 bg-red-50 p-6 text-red-900 dark:border-red-900 dark:bg-red-950 dark:text-red-100">
          <h1 className="text-lg font-semibold">Access denied</h1>
          <p className="mt-2 text-sm">
            This tool only allows users with profiles.is_superadmin or profiles.is_matrix_admin.
          </p>
          <form action={signOut} className="mt-4">
            <button className="rounded-md bg-red-700 px-4 py-2 text-sm text-white" type="submit">
              Sign out
            </button>
          </form>
        </div>
      </main>
    );
  }

  const [{ data: flavors }, { data: steps }, { data: captions }] = await Promise.all([
    supabase.from("humor_flavors").select("*").order("created_at", { ascending: false }),
    supabase.from("humor_flavor_steps").select("*").order("step_order", { ascending: true }),
    supabase.from("captions").select("*").order("created_at", { ascending: false }).limit(30),
  ]);

  const typedFlavors = (flavors ?? []) as TableRow[];
  const typedSteps = (steps ?? []) as TableRow[];
  const typedCaptions = (captions ?? []) as TableRow[];

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-6 md:px-6">
      <header className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Prompt Chain Tool</h1>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Create and test humor flavors and ordered flavor steps.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <form action={signOut}>
            <button
              type="submit"
              className="rounded-md border border-zinc-300 px-3 py-2 text-sm hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
            >
              Sign out
            </button>
          </form>
        </div>
      </header>

      <section className="mb-6 rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
        <h2 className="mb-3 text-lg font-semibold">Create humor flavor</h2>
        <form action={createFlavor} className="grid gap-2 md:grid-cols-3">
          <input
            name="name"
            placeholder="Flavor name"
            required
            className="rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950"
          />
          <input
            name="description"
            placeholder="Description"
            className="rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950"
          />
          <button className="rounded-md bg-zinc-900 px-3 py-2 text-sm text-white dark:bg-zinc-100 dark:text-zinc-900">
            Add flavor
          </button>
        </form>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-4">
          {typedFlavors.map((flavor) => {
            const flavorId = asText(flavor.id);
            const flavorSteps = typedSteps
              .filter((step) => asText(step.humor_flavor_id) === flavorId)
              .sort((a, b) => Number(a.step_order ?? 0) - Number(b.step_order ?? 0));

            return (
              <article
                key={flavorId}
                className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900"
              >
                <form action={updateFlavor} className="space-y-2">
                  <input type="hidden" name="id" value={flavorId} />
                  <input
                    name="name"
                    defaultValue={asText(flavor.name)}
                    className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950"
                  />
                  <textarea
                    name="description"
                    defaultValue={asText(flavor.description)}
                    rows={2}
                    className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950"
                  />
                  <div className="flex gap-2">
                    <button className="rounded-md bg-zinc-900 px-3 py-2 text-xs text-white dark:bg-zinc-100 dark:text-zinc-900">
                      Save flavor
                    </button>
                  </div>
                </form>

                <form action={deleteFlavor} className="mt-2">
                  <input type="hidden" name="id" value={flavorId} />
                  <button
                    type="submit"
                    className="rounded-md border border-red-300 px-3 py-2 text-xs text-red-700 dark:border-red-800 dark:text-red-300"
                  >
                    Delete flavor
                  </button>
                </form>

                <div className="mt-4 space-y-3">
                  <h3 className="text-sm font-semibold">Steps</h3>
                  {flavorSteps.map((step) => {
                    const stepId = asText(step.id);
                    const stepOrder = Number(step.step_order ?? 1);

                    return (
                      <div
                        key={stepId}
                        className="rounded-md border border-zinc-200 p-3 dark:border-zinc-700"
                      >
                        <form action={updateStep} className="space-y-2">
                          <input type="hidden" name="id" value={stepId} />
                          <input
                            name="title"
                            defaultValue={asText(step.title)}
                            placeholder="Step title"
                            className="w-full rounded-md border border-zinc-300 px-3 py-2 text-xs dark:border-zinc-700 dark:bg-zinc-950"
                          />
                          <textarea
                            name="prompt"
                            defaultValue={asText(step.prompt)}
                            placeholder="Step prompt"
                            rows={3}
                            className="w-full rounded-md border border-zinc-300 px-3 py-2 text-xs dark:border-zinc-700 dark:bg-zinc-950"
                          />
                          <input
                            type="number"
                            name="step_order"
                            defaultValue={stepOrder}
                            className="w-24 rounded-md border border-zinc-300 px-3 py-2 text-xs dark:border-zinc-700 dark:bg-zinc-950"
                          />
                          <div className="flex flex-wrap gap-2">
                            <button className="rounded-md bg-zinc-900 px-3 py-1 text-xs text-white dark:bg-zinc-100 dark:text-zinc-900">
                              Save step
                            </button>
                          </div>
                        </form>

                        <div className="mt-2 flex flex-wrap gap-2">
                          <form action={moveStep}>
                            <input type="hidden" name="id" value={stepId} />
                            <input type="hidden" name="humor_flavor_id" value={flavorId} />
                            <input type="hidden" name="step_order" value={stepOrder} />
                            <input type="hidden" name="direction" value="up" />
                            <button className="rounded-md border border-zinc-300 px-2 py-1 text-xs dark:border-zinc-700">
                              Move up
                            </button>
                          </form>
                          <form action={moveStep}>
                            <input type="hidden" name="id" value={stepId} />
                            <input type="hidden" name="humor_flavor_id" value={flavorId} />
                            <input type="hidden" name="step_order" value={stepOrder} />
                            <input type="hidden" name="direction" value="down" />
                            <button className="rounded-md border border-zinc-300 px-2 py-1 text-xs dark:border-zinc-700">
                              Move down
                            </button>
                          </form>
                          <form action={deleteStep}>
                            <input type="hidden" name="id" value={stepId} />
                            <button className="rounded-md border border-red-300 px-2 py-1 text-xs text-red-700 dark:border-red-800 dark:text-red-300">
                              Delete step
                            </button>
                          </form>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <form action={createStep} className="mt-3 space-y-2">
                  <input type="hidden" name="humor_flavor_id" value={flavorId} />
                  <input
                    name="title"
                    placeholder="New step title"
                    className="w-full rounded-md border border-zinc-300 px-3 py-2 text-xs dark:border-zinc-700 dark:bg-zinc-950"
                  />
                  <textarea
                    name="prompt"
                    placeholder="New step prompt"
                    rows={3}
                    className="w-full rounded-md border border-zinc-300 px-3 py-2 text-xs dark:border-zinc-700 dark:bg-zinc-950"
                  />
                  <input
                    name="step_order"
                    type="number"
                    defaultValue={flavorSteps.length + 1}
                    className="w-24 rounded-md border border-zinc-300 px-3 py-2 text-xs dark:border-zinc-700 dark:bg-zinc-950"
                  />
                  <button className="rounded-md bg-zinc-900 px-3 py-2 text-xs text-white dark:bg-zinc-100 dark:text-zinc-900">
                    Add step
                  </button>
                </form>

                <form action={generateCaptionsForFlavor} className="mt-4 space-y-2">
                  <input type="hidden" name="humor_flavor_id" value={flavorId} />
                  <label className="text-xs font-medium">Test image URL</label>
                  <input
                    name="image_url"
                    placeholder="https://..."
                    className="w-full rounded-md border border-zinc-300 px-3 py-2 text-xs dark:border-zinc-700 dark:bg-zinc-950"
                  />
                  <button className="rounded-md bg-emerald-700 px-3 py-2 text-xs text-white">
                    Generate captions for this flavor
                  </button>
                </form>
              </article>
            );
          })}
        </div>

        <aside className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
          <h2 className="text-lg font-semibold">Recent captions</h2>
          <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">
            Read captions produced by your humor flavors.
          </p>
          <div className="mt-3 space-y-2">
            {typedCaptions.length === 0 ? (
              <p className="text-xs text-zinc-600 dark:text-zinc-400">No captions yet.</p>
            ) : (
              typedCaptions.map((caption) => (
                <div
                  key={asText(caption.id)}
                  className="rounded-md border border-zinc-200 p-2 text-xs dark:border-zinc-700"
                >
                  <p className="font-medium">{asText(caption.caption, asText(caption.text, "(no caption text field)"))}</p>
                  <p className="mt-1 text-[11px] text-zinc-500 dark:text-zinc-400">
                    flavor: {asText(caption.humor_flavor_id, "unknown")}
                  </p>
                </div>
              ))
            )}
          </div>
        </aside>
      </section>
    </main>
  );
}
