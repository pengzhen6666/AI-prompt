import { GoogleGenAI, type GenerateContentParameters } from "@google/genai";
import { getRandomExamples } from "@/data/xhs_examples";
import { supabase } from "@/supabase";
import { compressImage } from "@/lib/imageCompression";
import beautyPromptMD from "@/markdown/prompt/beauty-prompt.md?raw";
import beautyPromptPytMD from "@/markdown/prompt/beauty-prompt.pyt.md?raw";
import beautyPromptV1MD from "@/markdown/prompt/beauty-prompt.v1.md?raw";
import beautyPromptFengyunMD from "@/markdown/prompt/beauty-prompt.fengyun.md?raw";
import photoTestMD from "@/markdown/prompt/v3.md?raw";
import facePromptMD from "@/markdown/face/face-prompt.md?raw";
import actionPromptMD from "@/markdown/action/action-prompt.md?raw";
import videoPromptMD from "@/markdown/video/video-prompt.md?raw";
import { encryptData } from "@/lib/crypto";
import { mdVersion } from "@/version";
export interface XHSResult {
  type:
  | "sporty"
  | "campus"
  | "sunny"
  | "daily"
  | "healing"
  | "nature"
  | "street"
  | "charm"
  | "pure"
  | "innocent"
  | "education";
  title: string;
  description: string;
  tags: string[];
}

export interface VideoPromptResult {
  type: "xhs" | "movie" | "daily" | "recording";
  title: string;
  prompt: string;
  negative_prompt: string;
  tips: string;
}

export interface AIAnalysisResult {
  title: string;
  tags: string[];
}

export interface MarketingResponseParams {
  personaName: string;
  personaDescription: string;
}

export interface MarketingPersonaResult {
  name: string;
  bio: string;
  responses: {
    dm: string[]; // 私信
    reply: string[]; // 回复评论
    comment: string[]; // 去别人评论
  };
}

/**
 * 将 Blob 转换为 base64
 */
function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
      } else {
        reject(new Error("Failed to convert blob to base64"));
      }
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/**
 * 将 File 转换为 base64
 */
function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
      } else {
        reject(new Error("Failed to convert file to base64"));
      }
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * 生成小红书风格文案 (从图片生成 4 种风格的 title, description, tag)
 * 支持上传多张图片 (最多4张)
 */
export async function generateXHSCopywriting(
  imageFiles: File[],
  persona?: { name: string; bio: string }
): Promise<XHSResult[]> {
  try {
    // 压缩图片
    const compressedFiles = await Promise.all(
      imageFiles.map((file) => compressImage(file, 150 / 1024, 1280))
    );

    // 将所有图片转换为 base64
    const imagesParts = await Promise.all(
      compressedFiles.map(async (file) => {
        const base64Data = await blobToBase64(file);
        const base64String = base64Data.split(",")[1];
        return {
          inlineData: {
            mimeType: file.type,
            data: base64String,
          },
        };
      })
    );

    // 获取参考范例
    const examples = getRandomExamples(3);
    const examplesText = examples
      .map(
        (ex, i) => `
范例 ${i + 1}:
Title: ${ex.title}
Description: ${ex.description}
Tags: ${JSON.stringify(ex.tag)}
`
      )
      .join("\n");

    const prompt = `请仔细分析我上传的 ${imageFiles.length
      } 张图片,整合它们的所有信息,生成6种不同风格的健康活泼、阳光少女感的小红书文案。

**注意：你需要观察所有图片之间的联系、共同的主题、环境以及细节，将它们看作是一个整体系列进行描述。所有的文案必须保持健康、阳光、符合现代审美，严禁涉及任何低俗、过度诱惑或负面的内容。**

我为你提供了一些参考范例，请你仔细分析这些范例的语调、用词风格、Emoji的使用习惯以及标签的选取方式。

参考范例风格：
${examplesText}

${persona
        ? `**当前人设信息：**
- 名字：${persona.name}
- 简介：${persona.bio}
请务必结合以上人设主页简介的背景和调性，用该人设的口吻进行创作。`
        : ""
      }

**请针对这组图片生成以下6种风格的文案：**

1. **sporty（运动少女）**: 充满活力、热爱运动、健康自信。多用积极向上的词汇，展现生命力。
2. **campus（清纯校园）**: 青春、温婉、书卷气。像学姐/学妹一样的亲切感，清新自然。
3. **sunny（元气阳光）**: 灿烂、开朗、爱笑。充满感染力，让人看完心情大好，色彩感强。
4. **daily（生活碎片）**: 真实、随性、精致。捕捉生活中的小确幸，文艺气息浓厚。
5. **healing（治愈邻家）**: 温暖、柔和、亲切。像邻家女孩一样给人安慰和力量，语气亲昵。
6. **street（个性街头）**: 酷飒、自信、有态度。展现新时代少女的独立精神，语言简练有力。

每种风格的要求:
- **type**: 风格类型（sporty/campus/sunny/daily/healing/street）
- **title**: 吸引眼球的标题，符合该风格，可以包含 emoji，5-20个字
- **description**: 详细的描述文案，50-150字，要有情感、有画面感、有互动性，符合该风格的语言特点
- **tag**: 3-5个标签，描述风格、主题、情绪等关键词

请直接返回 JSON 数组格式,不要包含 markdown 标记:
[
  {
    "type": "sporty",
    "title": "标题",
    "description": "内容",
    "tag": ["标签1", "标签2", "标签3"]
  },
  {
    "type": "campus",
    "title": "标题",
    "description": "内容",
    "tag": ["标签1", "标签2", "标签3"]
  },
  {
    "type": "sunny",
    "title": "标题",
    "description": "内容",
    "tag": ["标签1", "标签2", "标签3"]
  },
  {
    "type": "daily",
    "title": "标题",
    "description": "内容",
    "tag": ["标签1", "标签2", "标签3"]
  },
  {
    "type": "healing",
    "title": "标题",
    "description": "内容",
    "tag": ["标签1", "标签2", "标签3"]
  },
  {
    "type": "nature",
    "title": "标题",
    "description": "内容",
    "tag": ["标签1", "标签2", "标签3"]
  },
  {
    "type": "street",
    "title": "标题",
    "description": "内容",
    "tag": ["标签1", "标签2", "标签3"]
  }
]`;

    // 使用 Gemini 模型
    const response = await gptsapiProxy({
      contents: [
        {
          parts: [{ text: prompt }, ...imagesParts],
        },
      ],
      config: {
        responseMimeType: "application/json",
      },
    });

    let result = response.data || [];

    if (!result) {
      throw new Error("AI 未返回有效的数据");
    }

    try {
      // 鲁棒性处理：如果 result 已经是对象（由 supabase invoke 自动解析），则直接使用
      const parsed = typeof result === "string" ? JSON.parse(result) : result;
      // 兼容 { data: [...] } 包装
      const finalArray = parsed.data || parsed;

      // 确保返回的是数组格式
      if (Array.isArray(finalArray)) {
        return finalArray.map((item) => ({
          type: item.type || "pure",
          title: item.title || "",
          description: item.description || "",
          tags: Array.isArray(item.tag) ? item.tag : [],
        }));
      } else {
        throw new Error("AI 返回的不是数组格式");
      }
    } catch {
      console.error("Failed to parse AI response:", result);
      throw new Error("AI 返回数据格式错误");
    }
  } catch (error) {
    console.error("Error in generateXHSCopywriting:", error);
    throw new Error(
      `生成小红书文案失败: ${error instanceof Error ? error.message : "未知错误"
      }`
    );
  }
}

/**
 * 生成 AI 视频提示词 (从图片生成 5 种不同风格的视频提示词)
 * 支持基于图片的视觉线索生成适配 Sora, Kling, RunWay 等模型的提示词
 */
export async function generateVideoPrompts(
  imageFiles: File[]
): Promise<VideoPromptResult[]> {
  try {
    // 压缩图片
    const compressedFiles = await Promise.all(
      imageFiles.map((file) => compressImage(file, 150 / 1024, 1280))
    );

    // 将所有图片转换为 base64
    const imagesParts = await Promise.all(
      compressedFiles.map(async (file) => {
        const base64Data = await blobToBase64(file);
        const base64String = base64Data.split(",")[1];
        return {
          inlineData: {
            mimeType: file.type,
            data: base64String,
          },
        };
      })
    );

    // 生成视频提示词的 Prompt
    const prompt = videoPromptMD;

    // 使用 Gemini 模型
    const response = await gptsapiProxy({
      contents: [
        {
          parts: [{ text: prompt }, ...imagesParts],
        },
      ],
      config: {
        responseMimeType: "application/json",
      },
    });

    let result = response.data || [];
    if (!result) {
      throw new Error("AI 未返回有效的数据");
    }
    try {
      const parsed = typeof result === "string" ? JSON.parse(result) : result;
      const finalArray = parsed.data || parsed;

      if (Array.isArray(finalArray)) {
        return finalArray.map((item) => ({
          type: item.type || "cinematic",
          title: item.title || "",
          prompt: item.prompt || "",
          negative_prompt: item.negative_prompt || "",
          tips: item.tips || "",
        }));
      } else {
        throw new Error("AI 返回的不是数组格式");
      }
    } catch {
      console.error("Failed to parse AI response:", result);
      throw new Error("AI 返回数据格式错误");
    }
  } catch (error) {
    console.error("Error in generateVideoPrompts:", error);
    throw new Error(
      `生成视频提示词失败: ${error instanceof Error ? error.message : "未知错误"
      }`
    );
  }
}

/**
 * 生成自媒体互动话术
 * 支持：评论别人、回复粉丝、回复私信
 */
export async function generateMarketingResponse(
  params: MarketingResponseParams
): Promise<MarketingPersonaResult> {
  const { personaName, personaDescription } = params;

  const prompt = `你是一个顶级的自媒体运营专家。请基于以下信息构建一个充满“真人感”的营销人设全案。

人设基础名称/代号: ${personaName}
人设核心特征描述: ${personaDescription}

**关键准则（必须严格遵守以消除“AI味”）：**
1. **口语化，不要书面语**：话术必须像真实的人在打字聊天，夹杂语气助词如“呀”、“哦”、“哒”、“哈”、“滴”、“呢”。
2. **长短错落**：不要所有句子都一样长。要有短至“好滴呀”、“收到哦”的秒回感，也要有50字左右的真诚互动。
3. **拒绝模版化**：严禁出现“亲爱的”、“欢迎来到我的主页”这种死板的AI客服词汇。
4. **强人设立场**：所有的回复必须坚决符合${personaName}的性格。如果是高冷，就多用短句，少用语气词；如果是可爱，就多用表情和叠词。

**任务要求：**
1. **名字 (name)**: 生成1个极具辨识度、符合该人设调性、容易吸引粉丝关注的博主名字。
2. **简介 (bio)**: 编写1个极具吸引力的个人主页简介（100字左右），包含人设标签、核心理念及 Emoji。
3. **全场景通用话术库 (responses)**: 针对以下三个场景，每个场景生成整整 100 条高质量的不同通用型话术（总计 300 条）：
   - **reply (回复评论)**: 用于在自己作品下回复粉丝评论。要像发朋友圈一样亲切、调侃或接梗。
   - **dm (私信)**: 用于私信回复。亲切但有边界感，多用“好滴呢”、“稍等哈”。
   - **comment (去别人评论)**: 用于去别人作品评论区进行互动引流。要有神评论感，自然夸赞，严禁像广告。

请直接返回 JSON 格式，务必移除任何 markdown 标记或额外解释：
{
  "name": "博主名字",
  "bio": "个人简介文案",
  "responses": {
    "dm": ["私信1", ..., "私信100"],
    "reply": ["回复1", ..., "回复100"],
    "comment": ["评论1", ..., "评论100"]
  }
}`;

  try {
    const response = await gptsapiProxy({
      contents: [
        {
          parts: [{ text: prompt }],
        },
      ],
      config: {
        responseMimeType: "application/json",
      },
    });

    let result = response.data || "";
    if (!result) {
      throw new Error("AI 未返回有效数据");
    }

    try {
      // 增强解析逻辑：支持字符串和已解析的对象
      const parsed = typeof result === "string" ? JSON.parse(result) : result;

      // 兼容您提供的 result.json 结构：{ data: { name, bio, responses } }
      const actualData = parsed.data || parsed;
      const res = actualData.responses || {};

      return {
        name: actualData.name || "",
        bio: actualData.bio || "",
        responses: {
          dm: Array.isArray(res.dm) ? res.dm : [],
          reply: Array.isArray(res.reply) ? res.reply : [],
          comment: Array.isArray(res.comment) ? res.comment : [],
        },
      };
    } catch (err) {
      console.error("Parse Error:", err, "Raw Result:", result);
      throw new Error("AI 返回数据解析失败");
    }
  } catch (error) {
    console.error("Error in generateMarketingResponse:", error);
    throw new Error(
      `生成营销方案失败: ${error instanceof Error ? error.message : "未知错误"}`
    );
  }
}

// ai测试,输入文本123
export async function testAI() {
  const response = await gptsapiProxy({
    contents: "123",
  });
  console.log(response.text);
}

type ImagePreviewParams = {
  prompt: string;
};
/**
 * models/gemini-3-pro-image-preview
 */
export const imagePreview = async ({ prompt }: ImagePreviewParams) => {
  const response = await gptsapiProxy({
    contents: [
      {
        parts: [{ text: prompt }],
      },
    ],
    config: {
      responseModalities: ["IMAGE"],
      imageConfig: {
        imageSize: "1K",
      },
      tools: [
        {
          googleSearch: {},
        },
      ],
    },
  });
  console.log(response);
  return response;
};

/**
 * 根据上传的单张图片反向生成 AI 提示词 (遵循 prompt.md 规则)
 */
export const reversingPromptFromImages = async (
  imageFile: File,
  style?: string,
  personStyle?: string,
  customFaceDescription?: string,
  actionDescription?: string,
  isRefined?: boolean
) => {
  if (!imageFile) {
    throw new Error("请上传图片");
  }

  // 压缩图片
  const compressedFile = await compressImage(imageFile, 150 / 1024, 1280);

  const base64Data = await blobToBase64(compressedFile);
  const base64String = base64Data.split(",")[1];

  let styleInstruction = style
    ? `**[用户指定视觉风格：${style}]** 
在生成提示词时，请务必深度融合“${style}”风格特征。
1. 在 quality_and_style.style 中包含该风格名称。
2. 在 core_prompt 中加入与该风格对应的光影、色调和环境描述。
3. 确保最终输出仍符合原图的基本构图。

`
    : "";

  const versions = mdVersion();
  const matchedVersion = versions.find((v) => v.key === personStyle);
  let baseInstruction =
    matchedVersion?.md || versions.find((v) => v.default)?.md || versions[0].md;
  // 默认人脸
  let defaultFaceDescription =
    "detailed portrait of a beautiful young East Asian woman, delicate features, fair skin, oval face shape, natural soft makeup, slightly arched eyebrows, large bright brown eyes, gentle double eyelids, small defined nose, full and naturally tinted coral-pink lips (matte finish), soft natural expression, smooth shoulder line visible.";
  // 精炼模式
  if (isRefined) {
    baseInstruction = baseInstruction.replace(
      "{{CONTROL}}",
      `
***
**[CRITICAL: STRICT LENGTH CONSTRAINT - REFINE MODE ACTIVE]**
- YOUR RESPONSE MUST BE SHORT.
- THE TOTAL JSON STRING LENGTH **ABSULTELY MUST NOT EXCEED 800 CHARACTERS**.
- DELETE ALL NON-ESSENTIAL ADJECTIVES AND FILLER WORDS.
- ONLY PROVIDE THE MOST IMPORTANT VISUAL DATA.
- THIS IS A HARD LIMIT. IF YOU EXCEED 800 CHARACTERS, THE TASK FAILS.
***`
    );
  } else {
    baseInstruction = baseInstruction.replace("{{CONTROL}}", "");
  }
  if (customFaceDescription) {
    baseInstruction = baseInstruction.replace(
      "{{HEAD_POST}}",
      `**必须使用**： ${customFaceDescription}`
    );
  } else {
    // 默认脸
    baseInstruction = baseInstruction.replace(
      "{{HEAD_POST}}",
      `**必须使用**： ${defaultFaceDescription}`
    );
  }

  // 动作注入
  if (actionDescription) {
    baseInstruction = baseInstruction.replace(
      "{{ACTION_POST}}",
      `**必须使用**：${actionDescription}`
    );
  } else {
    baseInstruction = baseInstruction.replace(
      "{{ACTION_POST}}",
      "**参考图片**"
    );
  }
  // 主题 + 基础提示词
  const systemInstruction = styleInstruction + baseInstruction;
  const body = {
    contents: [
      {
        role: "user",
        parts: [
          { text: systemInstruction },
          {
            inlineData: {
              mimeType: imageFile.type,
              data: base64String,
            },
          },
        ],
      },
    ],
  };

  return await gptsapiProxy(body);
};

export const gptsapiProxy = async (
  body: Omit<GenerateContentParameters, "model">
) => {
  const encryptionKey = import.meta.env.VITE_API_ENCRYPTION_KEY;

  let finalBody: any = body;

  // 如果配置了加密密钥，则对整个 Body 进行加密
  if (encryptionKey) {
    const encryptedPayload = await encryptData(
      JSON.stringify(body),
      encryptionKey
    );
    finalBody = { payload: encryptedPayload };
  }

  const { data, error } = await supabase.functions.invoke("hyper-service", {
    body: finalBody,
  });

  if (error) throw error;

  // 核心修复逻辑：优先尝试标准 OpenAI 结构
  const content = data.choices?.[0]?.message?.content;
  if (content !== undefined && content !== null) {
    return content;
  }

  // 如果没有 choices (比如 hyper-service 直接返回了 { data: "..." })，则返回整个 data 对象供业务层处理
  return data;
};

/**
 * 调试接口
 * @returns
 */
export const debug = async () => {
  const { data, error } = await supabase.functions.invoke("debug", {
    body: {
      name: "pdd",
    },
  });
  console.log(data, error);
};

/**
 * 人脸深度解析接口
 * 使用 face-prompt.md 模板从解剖学角度反推人脸特征
 */
export const analyzeFaceFromImage = async (
  imageFile: File
): Promise<string> => {
  const base64Data = await fileToBase64(imageFile);
  const base64String = base64Data.split(",")[1];
  const systemInstruction = facePromptMD;

  let response = await gptsapiProxy({
    contents: [
      {
        parts: [
          { text: systemInstruction },
          {
            inlineData: {
              mimeType: imageFile.type,
              data: base64String,
            },
          },
        ],
      },
    ],
  });
  let result = "";
  if (typeof response === "string") {
    result = response;
  } else if (response && typeof response === "object") {
    // 兼容 { data: "..." }、{ choices: [...] } 或直接就是字符串内容的情况
    result = response.data || response.choices?.[0]?.message?.content || "";
  }

  if (!result) {
    console.error(
      "AI Response structure details:",
      JSON.stringify(response, null, 2)
    );
    throw new Error("AI 未返回有效数据，请检查网络请求及后端响应格式");
  }

  console.log("Analyzed Result:", result);
  return result;
};

/**
 * 动作特征解析
 */
export const analyzeActionFromImage = async (
  imageFile: File
): Promise<string> => {
  const base64Data = await fileToBase64(imageFile);
  const base64String = base64Data.split(",")[1];
  const systemInstruction = actionPromptMD;

  let response = await gptsapiProxy({
    contents: [
      {
        parts: [
          { text: systemInstruction },
          {
            inlineData: {
              mimeType: imageFile.type,
              data: base64String,
            },
          },
        ],
      },
    ],
  });

  let result = "";
  if (typeof response === "string") {
    result = response;
  } else if (response && typeof response === "object") {
    result = response.data || response.choices?.[0]?.message?.content || "";
  }

  if (!result) {
    throw new Error("AI 未返回有效数据，请检查网络请求及后端响应格式");
  }

  return result;
};

export interface GenerateImageParams {
  prompt: string;
  model?: string;
  ratio?: string;
  resolution?: string;
}

export interface GenerateImageResponse {
  code: number;
  msg: string;
  data: {
    created: number;
    data: {
      url: string;
      b64Json: string | null;
      revisedPrompt: string | null;
    }[];
    message: string;
    historyId: string;
    success: boolean;
  };
}

/**
 * 调用自定义生图接口
 */
export const generateImage = async (
  params: GenerateImageParams
): Promise<GenerateImageResponse> => {
  const {
    prompt,
    model = "nanobananapro",
    ratio = "16:9",
    resolution = "1k",
  } = params;

  const encryptionKey = import.meta.env.VITE_API_ENCRYPTION_KEY;
  const body = { model, prompt, ratio, resolution };
  let finalBody: any = body;

  // 如果配置了加密密钥，则对 Payload 进行加密
  if (encryptionKey) {
    const encryptedPayload = await encryptData(
      JSON.stringify(body),
      encryptionKey
    );
    finalBody = { payload: encryptedPayload };
  }

  const { data, error } = await supabase.functions.invoke("image-service", {
    body: finalBody,
  });

  if (error) {
    console.error("Generate Image Edge Function Error:", error);
    throw error;
  }

  return data;
};

export interface SaveGeneratedImageParams {
  user_id: string;
  prompt: string;
  model: string;
  aspect_ratio: string;
  resolution?: string;
  image_url: string;
  history_id?: string;
}

export const saveGeneratedImage = async (
  params: SaveGeneratedImageParams[]
) => {
  const { data, error } = await supabase
    .from("generated_images")
    .insert(params)
    .select();

  if (error) {
    console.error("Error saving generated image:", error);
    throw error;
  }

  return data;
};

export const getGeneratedHistory = async (
  userId: string,
  page: number = 0,
  pageSize: number = 20
) => {
  const from = page * pageSize;
  const to = from + pageSize - 1;

  const { data, error } = await supabase
    .from("generated_images")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .range(from, to);

  if (error) {
    console.error("Error fetching generated history:", error);
    throw error;
  }

  return data;
};
export const deleteGeneratedImage = async (id: string) => {
  const { error } = await supabase
    .from("generated_images")
    .delete()
    .eq("id", id);
  if (error) {
    console.error("Error deleting image:", error);
    throw error;
  }
};

export const toggleLikeGeneratedImage = async (
  id: string,
  isLiked: boolean
) => {
  const { error } = await supabase
    .from("generated_images")
    .update({ is_liked: isLiked })
    .eq("id", id);
  if (error) {
    console.error("Error toggling like:", error);
    throw error;
  }
};

export interface GenerateVideoParams {
  prompt: string;
  model?: string;
  ratio?: string;
  img1?: string;
  img2?: string;
  mode: string;
}

export const generateVideo = async (params: GenerateVideoParams) => {
  const encryptionKey = import.meta.env.VITE_API_ENCRYPTION_KEY;
  let finalBody: any = params;

  if (encryptionKey) {
    const encryptedPayload = await encryptData(
      JSON.stringify(params),
      encryptionKey
    );
    finalBody = { payload: encryptedPayload };
  }

  const { data, error } = await supabase.functions.invoke("video-service", {
    body: finalBody,
  });

  if (error) {
    console.error("Generate Video Edge Function Error:", error);
    throw error;
  }

  return data;
};

export interface RemoveBackgroundParams {
  image: string; // Base64 or URL
}

export const removeBackground = async (params: RemoveBackgroundParams) => {
  const encryptionKey = import.meta.env.VITE_API_ENCRYPTION_KEY;
  let finalBody: any = params;

  if (encryptionKey) {
    const encryptedPayload = await encryptData(
      JSON.stringify(params),
      encryptionKey
    );
    finalBody = { payload: encryptedPayload };
  }

  const { data, error } = await supabase.functions.invoke("background-service", {
    body: finalBody,
  });

  if (error) {
    console.error("Remove Background Edge Function Error:", error);
    throw error;
  }

  return data;
};

export interface SaveGeneratedVideoParams {
  user_id: string;
  prompt: string;
  model: string;
  aspect_ratio: string;
  video_url: string;
  mode: string;
  cover_url?: string;
}

export const saveGeneratedVideo = async (params: SaveGeneratedVideoParams) => {
  const { data, error } = await supabase
    .from("generated_videos")
    .insert([params])
    .select();

  if (error) {
    console.error("Error saving generated video:", error);
    throw error;
  }

  return data;
};

export const getGeneratedVideoHistory = async (
  userId: string,
  page: number = 0,
  pageSize: number = 20
) => {
  const from = page * pageSize;
  const to = from + pageSize - 1;

  const { data, error } = await supabase
    .from("generated_videos")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .range(from, to);

  if (error) {
    console.error("Error fetching video history:", error);
    throw error;
  }

  return data;
};

export const deleteGeneratedVideo = async (id: string) => {
  const { error } = await supabase
    .from("generated_videos")
    .delete()
    .eq("id", id);
  if (error) {
    console.error("Error deleting video:", error);
    throw error;
  }
};

export interface GenerateProPromptParams {
  prompt: string;
  format: "text" | "json";
  language?: string;
  style?: string;
}

export const generateProPrompt = async (params: GenerateProPromptParams) => {
  const { prompt, format, language = "English", style = "Professional" } = params;

  const systemInstruction = `You are a professional AI prompt engineer. 
Your task is to convert the user's creative idea into a high-quality, professional-level AI drawing/generation prompt.
The output should be optimized for models like Midjourney, DALL-E 3, or Stable Diffusion.

Output Language: ${language}
Prompt Style: ${style}
Format requested: ${format}

If format is "json", return a JSON object with:
{
  "core_prompt": "the main description",
  "style": "the artistic style",
  "lighting": "lighting details",
  "composition": "composition details",
  "parameters": "technical parameters like --ar, --v, etc."
}

If format is "text", return a detailed, comma-separated descriptive prompt string.

USER IDEA: ${prompt}`;

  const response = await gptsapiProxy({
    contents: [
      {
        parts: [{ text: systemInstruction }],
      },
    ],
    config: {
      responseMimeType: format === "json" ? "application/json" : "text/plain",
    },
  });

  let result = response.data || response;
  if (typeof result === "string" && format === "json") {
    try {
      result = JSON.parse(result);
    } catch (e) {
      console.error("Failed to parse JSON result:", e);
    }
  }

  return result;
};

export interface SaveProPromptParams {
  user_id: string;
  input_prompt: string;
  output_result: any;
  format: "text" | "json";
}

export const saveProPrompt = async (params: SaveProPromptParams) => {
  const { data, error } = await supabase
    .from("pzcreated")
    .insert([params])
    .select();

  if (error) {
    console.error("Error saving pro prompt:", error);
    throw error;
  }

  return data;
};

export const getProPromptHistory = async (
  userId: string,
  page: number = 0,
  pageSize: number = 20
) => {
  const from = page * pageSize;
  const to = from + pageSize - 1;

  const { data, error } = await supabase
    .from("pzcreated")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .range(from, to);

  if (error) {
    console.error("Error fetching pro prompt history:", error);
    throw error;
  }

  return data;
};
