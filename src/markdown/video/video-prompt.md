请仔细分析我上传的图片,并基于这些图片的视觉信息,为我生成 5 种不同风格的 AI 视频生视频/文生视频提示词。
这些提示词需要适配 Sora, Kling, Luma, Runway 等主流视频生成模型。

**请根据图片内容生成以下 5 种风格的视频提示词：**

1. **xhs (小红书风格)**: 强调顶级氛围感，使用柔光滤镜、糖果色调或高级莫兰迪色系。构图精致，强调精致的生活方式感，色彩饱满且通透。
2. **movie (电影风格)**: 模仿电影大片，使用宽屏画幅，强调深刻的影调、丁达尔效应、冷暖对比色调以及史诗感的氛围。
3. **daily (日常风格)**: 这种风格追求极致的真实，像是由高性能手机手持拍摄。光影自然，不刻意修饰，展现出温馨、生活化、随意的动态美感。
4. **recording (记录风格)**: 专业纪实摄影质感，8K 超高清画质，强调纹理细节与真实的色彩还原。光影平实且细腻，没有任何滤镜痕迹，捕捉最为严谨的画面细节。

**人物表现规范 (重要)：**
若画面涉及东亚女性主体，请务必参考以下描述以确保顶级审美：

- **形象基础**: detailed portrait of a beautiful young East Asian woman, delicate features, fair skin, oval face shape, natural soft makeup, slightly arched eyebrows, large bright brown eyes, gentle double eyelids, small defined nose, full and naturally tinted coral-pink lips (matte finish), soft natural expression, **head either upright or slightly tilted**, smooth shoulder line visible.
- **身材比例**: 严格遵循上下身 3:7 比例，视觉上突出大长腿；体型苗条且富有健康曲线，展现优雅质感。

**动作与动态规范 (重要)：**

1. **人物稳态 (Living Photo 效果)**: 人物主体应保持如同“活照片”般的极度静止。严禁肢体摆动或大幅度动作，仅保留最基础的生理性微动（如：自然呼吸带来的微弱起伏、生理性眨眼、极细微的眼神流转）。人物主体的状态应接近“凝固”，没有任何明显的动作。
2. **环境动态与光效稳定**: 动态感由环境物体提供，但必须保持整体光影的物理一致性。
   - 树叶、花瓣、发丝末端应随风产生明显的、有节奏的摆动。
   - 若有流水或云雾，应有持续流畅的运动感。
   - **光影稳定性 (重要)**: 严禁出现剧烈的光线闪烁或无意义的光影剧变（No obvious lighting changes or flickering lights）。光照应保持柔和且恒定，仅允许随物体运动产生的自然细微阴影变化。
   - **视觉重心**: 将所有的“动”赋予物理实体的环境，让观众通过背景的流动感和稳定的光影氛围，感知画面的高级感与宁静感。

每种风格的要求:

- **type**: 风格类型（xhs/movie/daily/recording）
- **title**: 一个贴切的展示名称（如：电影级运镜、皮克斯奇幻、赛博霓虹等），5-15 个字
- **prompt**: 核心英文提示词，必须详细，包含：[主体描述], [动作/动态 (强调人物近乎凝固，仅环境产生流动动态，光影保持恒定稳定)], [环境细节 (强化全场景动态流动)], [镜头语言/运镜], [艺术风格], [光影/氛围 (Constant and stable lighting, no flickering)]。
- **negative_prompt**: 视频生成中需要避免的负面词，如：变形、闪烁、低画质、多余肢体等，英文形式。
- **tips**: 给用户的操作建议，描述该风格的特点以及如何通过步数(Steps)或引导值(CFG)获得更好效果。

请直接返回 JSON 数组格式,不要包含 markdown 标记:
[
{
"type": "cinematic",
"title": "电影史诗感",
"prompt": "Full cinematic shot of...",
"negative_prompt": "blurry, low quality...",
"tips": "建议使用较大的运动幅度..."
},
... (其他 4 种风格)
]
