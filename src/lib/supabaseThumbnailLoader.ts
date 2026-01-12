/**
 * @description Supabase 图片优化
 * @returns
 */
export const supabaseThumbnailLoader = ({
  src,
  width,
  height,
  quality = 100, // 设置默认质量
}: {
  src: string;
  width: number;
  height?: number;
  quality?: number;
}) => {
  // 1. 基础校验：非 Supabase 存储链接直接返回原图
  if (!src.includes("/storage/v1/object/public/")) {
    return src;
  }

  // 2. 转换 URL 路径：从下载链接转为渲染（变换）链接
  // 替换 /object/public 为 /render/image/public
  const baseUrl = src.replace("/object/public/", "/render/image/public/");

  // 3. 构建参数对象
  const params = new URLSearchParams();
  params.set("width", width.toString());
  params.set("quality", quality.toString());

  if (height) {
    params.set("height", height.toString());
    // 如果同时有宽高，通常使用 cover 模式（裁剪填充）
    params.set("resize", "cover");
  } else {
    // 【关键】如果没有高度，显式设置 resize 为 contain
    // 这样变换引擎会锁定宽度，并根据原图比例自动计算高度
    params.set("resize", "contain");
  }

  return `${baseUrl}?${params.toString()}`;
};

/**
 * 仅针对 "全部" 标签中的前 50 项进行图片优化（使用 Supabase Image Transformation）
 * 这是一个收费较高的功能，因此需要严格控制使用范围。
 */
export const getMasonryOptimizedUrl = (
  src: string,
  index: number,
  activeCategory: string
) => {
  if (activeCategory === "全部" && index < 50) {
    const optimizedUrl = supabaseThumbnailLoader({
      src,
      width: 600,
      quality: 80,
    });
    return optimizedUrl;
  }
  return src;
};
