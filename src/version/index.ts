import beautyPromptMD from "@/markdown/prompt/beauty-prompt.md?raw";
import beautyPromptPytMD from "@/markdown/prompt/beauty-prompt.pyt.md?raw";
import beautyPromptV1MD from "@/markdown/prompt/beauty-prompt.v1.md?raw";
import beautyPromptFengyunMD from "@/markdown/prompt/beauty-prompt.fengyun.md?raw";
import v3MD from "@/markdown/prompt/v3.md?raw";
import v4MD from "@/markdown/prompt/v4.md?raw";
export const mdVersion = () => {
  return [
    {
      title: "Lumina 4",
      md: v4MD,
      key: "lumina4",
      description: "提升图片光影和质感，图片效果接近物理世界",
      default: true,
    },
    {
      title: "Lumina 3",
      md: v3MD,
      key: "lumina3",
      description:
        "对于图片的掌控力大幅上升，控制人脸，动作，风格，保证自定义功能的一致性",
    },
    {
      title: "Lumina 2",
      md: beautyPromptMD,
      key: "lumina2",
      description: "Lumina 2",
      more: true,
    },
    {
      title: "Lumina 1",
      md: beautyPromptV1MD,
      key: "Lumina1",
      description: "原始机，风格不能固定",
      more: true,
    },
    {
      title: "少女娇羞感",
      md: beautyPromptPytMD,
      key: "pyt",
      description: "生成风格偏向抖音少女化",
    },
    {
      title: "极致丰韵",
      md: beautyPromptFengyunMD,
      key: "fengyun",
      description: "人物偏向丰韵",
      more: true,
    },
  ];
};
