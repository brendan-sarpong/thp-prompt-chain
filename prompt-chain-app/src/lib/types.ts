export type ProfileRole = {
  is_superadmin: boolean | null;
  is_matrix_admin: boolean | null;
};

export type HumorFlavor = {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
};

export type HumorFlavorStep = {
  id: string;
  humor_flavor_id: string;
  step_order: number;
  title: string;
  prompt: string;
  created_at: string;
};
