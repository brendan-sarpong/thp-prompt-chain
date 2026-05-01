"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

async function ensureAdminAccess() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_superadmin,is_matrix_admin")
    .eq("id", user.id)
    .single();

  const hasAccess = !!(profile?.is_superadmin || profile?.is_matrix_admin);
  if (!hasAccess) {
    throw new Error("You must be a superadmin or matrix admin.");
  }

  return { supabase, user };
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

export async function createFlavor(formData: FormData) {
  const { supabase } = await ensureAdminAccess();

  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();

  if (!name) throw new Error("Flavor name is required.");

  const { error } = await supabase.from("humor_flavors").insert({
    name,
    description: description || null,
  });

  if (error) throw new Error(error.message);
  revalidatePath("/");
}

export async function updateFlavor(formData: FormData) {
  const { supabase } = await ensureAdminAccess();

  const id = String(formData.get("id") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();

  if (!id || !name) throw new Error("Flavor id and name are required.");

  const { error } = await supabase
    .from("humor_flavors")
    .update({ name, description: description || null })
    .eq("id", id);

  if (error) throw new Error(error.message);
  revalidatePath("/");
}

export async function deleteFlavor(formData: FormData) {
  const { supabase } = await ensureAdminAccess();
  const id = String(formData.get("id") ?? "");
  if (!id) throw new Error("Flavor id is required.");

  const { error } = await supabase.from("humor_flavors").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/");
}

export async function createStep(formData: FormData) {
  const { supabase } = await ensureAdminAccess();

  const humorFlavorId = String(formData.get("humor_flavor_id") ?? "");
  const title = String(formData.get("title") ?? "").trim();
  const prompt = String(formData.get("prompt") ?? "").trim();
  const stepOrder = Number(formData.get("step_order") ?? 1);

  if (!humorFlavorId || !title || !prompt) {
    throw new Error("Flavor, title, and prompt are required.");
  }

  const { error } = await supabase.from("humor_flavor_steps").insert({
    humor_flavor_id: humorFlavorId,
    title,
    prompt,
    step_order: Number.isNaN(stepOrder) ? 1 : stepOrder,
  });

  if (error) throw new Error(error.message);
  revalidatePath("/");
}

export async function updateStep(formData: FormData) {
  const { supabase } = await ensureAdminAccess();

  const id = String(formData.get("id") ?? "");
  const title = String(formData.get("title") ?? "").trim();
  const prompt = String(formData.get("prompt") ?? "").trim();
  const stepOrder = Number(formData.get("step_order") ?? 1);

  if (!id || !title || !prompt) throw new Error("Step id, title, and prompt are required.");

  const { error } = await supabase
    .from("humor_flavor_steps")
    .update({
      title,
      prompt,
      step_order: Number.isNaN(stepOrder) ? 1 : stepOrder,
    })
    .eq("id", id);

  if (error) throw new Error(error.message);
  revalidatePath("/");
}

export async function deleteStep(formData: FormData) {
  const { supabase } = await ensureAdminAccess();
  const id = String(formData.get("id") ?? "");
  if (!id) throw new Error("Step id is required.");

  const { error } = await supabase.from("humor_flavor_steps").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/");
}

export async function moveStep(formData: FormData) {
  const { supabase } = await ensureAdminAccess();
  const id = String(formData.get("id") ?? "");
  const direction = String(formData.get("direction") ?? "");
  const flavorId = String(formData.get("humor_flavor_id") ?? "");
  const currentOrder = Number(formData.get("step_order") ?? 0);

  if (!id || !flavorId || !currentOrder) throw new Error("Missing step reorder fields.");

  const targetOrder = direction === "up" ? currentOrder - 1 : currentOrder + 1;
  if (targetOrder < 1) return;

  const { data: targetStep, error: targetError } = await supabase
    .from("humor_flavor_steps")
    .select("id,step_order")
    .eq("humor_flavor_id", flavorId)
    .eq("step_order", targetOrder)
    .single();

  if (targetError) return;

  const { error: firstError } = await supabase
    .from("humor_flavor_steps")
    .update({ step_order: targetOrder })
    .eq("id", id);
  if (firstError) throw new Error(firstError.message);

  const { error: secondError } = await supabase
    .from("humor_flavor_steps")
    .update({ step_order: currentOrder })
    .eq("id", targetStep.id);
  if (secondError) throw new Error(secondError.message);

  revalidatePath("/");
}

export async function generateCaptionsForFlavor(formData: FormData) {
  const { supabase } = await ensureAdminAccess();
  const imageUrl = String(formData.get("image_url") ?? "").trim();
  const humorFlavorId = String(formData.get("humor_flavor_id") ?? "");

  if (!imageUrl || !humorFlavorId) {
    throw new Error("Image URL and humor flavor are required.");
  }

  const {
    data: { session },
  } = await supabase.auth.getSession();

  const accessToken = session?.access_token;
  if (!accessToken) throw new Error("No access token available.");

  const registerResponse = await fetch("https://api.almostcrackd.ai/pipeline/upload-image-from-url", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      imageUrl,
      isCommonUse: false,
    }),
  });

  if (!registerResponse.ok) {
    throw new Error(`Register image failed: ${registerResponse.statusText}`);
  }

  const registerBody = (await registerResponse.json()) as { imageId: string };

  const captionResponse = await fetch("https://api.almostcrackd.ai/pipeline/generate-captions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      imageId: registerBody.imageId,
      humorFlavorId,
    }),
  });

  if (!captionResponse.ok) {
    throw new Error(`Generate captions failed: ${captionResponse.statusText}`);
  }

  revalidatePath("/");
}
