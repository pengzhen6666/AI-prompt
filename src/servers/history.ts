import { supabase } from "@/supabase";

export interface PaginationParams {
  page: number;
  pageSize: number;
}

export interface UserHistoryPrompt {
  id: string;
  user_id: string;
  image_url: string;
  prompt_result: string;
  title: string | null;
  created_at: string;
  is_submitted?: boolean;
}

export interface UserHistoryCopywriting {
  id: string;
  user_id: string;
  title: string | null;
  description: string | null;
  tags: string[] | null;
  image_url: string | null;
  image_urls: string[] | null;
  results: any;
  created_at: string;
}

/**
 * Fetch user's generated prompts history
 */
export async function getUserPromptHistory(
  userId: string,
  { page, pageSize }: PaginationParams
) {
  const from = page * pageSize;
  const to = from + pageSize - 1;

  const { data, error, count } = await supabase
    .from("generated_prompts")
    .select("*", { count: "exact" })
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .range(from, to);

  if (error) {
    console.error("Error fetching prompt history:", error);
    throw error;
  }

  return { data: data as UserHistoryPrompt[], count };
}

/**
 * Fetch user's generated copywriting history
 */
export async function getUserCopywritingHistory(
  userId: string,
  { page, pageSize }: PaginationParams
) {
  const from = page * pageSize;
  const to = from + pageSize - 1;

  const { data, error, count } = await supabase
    .from("generated_copywriting")
    .select("*", { count: "exact" })
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .range(from, to);

  if (error) {
    console.error("Error fetching copywriting history:", error);
    throw error;
  }

  return { data: data as UserHistoryCopywriting[], count };
}

/**
 * Delete a specific prompt history record
 */
export async function deleteUserPromptHistory(id: string) {
  const { error } = await supabase
    .from("generated_prompts")
    .delete()
    .eq("id", id);
  if (error) {
    console.error("Error deleting prompt record:", error);
    throw error;
  }
}

/**
 * Delete a specific copywriting history record
 */
export async function deleteUserCopywritingHistory(id: string) {
  const { error } = await supabase
    .from("generated_copywriting")
    .delete()
    .eq("id", id);
  if (error) {
    console.error("Error deleting copywriting record:", error);
    throw error;
  }
}

/**
 * Batch delete prompt history records
 */
export async function batchDeleteUserPromptHistory(ids: string[]) {
  const { error } = await supabase
    .from("generated_prompts")
    .delete()
    .in("id", ids);
  if (error) {
    console.error("Error batch deleting prompt records:", error);
    throw error;
  }
}

/**
 * Batch delete copywriting history records
 */
export async function batchDeleteUserCopywritingHistory(ids: string[]) {
  const { error } = await supabase
    .from("generated_copywriting")
    .delete()
    .in("id", ids);
  if (error) {
    console.error("Error batch deleting copywriting records:", error);
    throw error;
  }
}

/**
 * Batch submit prompts to audit/community
 */
export async function batchSubmitPrompts(
  items: {
    user_id: string;
    image_url: string;
    prompt_result: string;
    id: string;
  }[]
) {
  // 1. Insert into prompt_submissions
  const submissions = items.map((item) => ({
    user_id: item.user_id,
    image_url: item.image_url,
    prompt_result: item.prompt_result,
    status: "pending",
  }));

  const { error: subError } = await supabase
    .from("prompt_submissions")
    .insert(submissions);
  if (subError) {
    console.error("Error batch submitting prompts:", subError);
    throw subError;
  }

  // 2. Update is_submitted in generated_prompts
  const ids = items.map((item) => item.id);
  const { error: updError } = await supabase
    .from("generated_prompts")
    .update({ is_submitted: true })
    .in("id", ids);

  if (updError) {
    console.error("Error updating submission status:", updError);
    throw updError;
  }
}
