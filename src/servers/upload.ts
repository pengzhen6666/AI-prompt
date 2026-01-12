import { supabase } from "@/supabase";
// siteweb1 , siteweb3
export const defaultBucket = "siteweb";
// 上传
export const uploadFileServerAPI = async ({
  file,
  bucket = defaultBucket,
  name,
}: {
  file: File;
  bucket?: string;
  name?: string;
}) => {
  // 清理文件名中的特殊字符和非 ASCII 字符，避免 InvalidKey 错误
  const safeName = file.name.replace(/[^\x00-\x7F]/g, "_").replace(/\s+/g, "_");
  const fileName = name || `public/${Date.now()}_${safeName}`;
  const { data, error } = await supabase.storage
    .from(bucket)
    .upload(fileName, file);
  return { data, error };
};
// 获取上传文件列表
export const getUploadFileServerAPI = async ({
  path = "public",
  bucket = defaultBucket,
}) => {
  const { data, error } = await supabase.storage.from(bucket).list(path);
  return { data, error };
};
