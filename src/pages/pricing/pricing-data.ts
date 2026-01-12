export interface PricingTier {
    id: string;
    name: string;
    description: string;
    isPopular?: boolean;
    pricing: {
        monthly?: number;
        continuous?: number;
        yearly?: number;
    };
    features: string[];
    benefits: {
        promptGen: string;
        imageQuota: string;
        resolution: string;
        speed: string;
        addonDiscount?: string;
        estimatedImages: string;
        useCase: string;
        creditConsumption: string;
        seats?: string;
        seatPurchase?: string;
    };
}

export interface AddonTierInfo {
    credits: string;
    images: string;
    label?: string;
}

export interface AddonPackage {
    id: string;
    name: string;
    price: number;
    tiers: {
        freeLite: AddonTierInfo;
        pro: AddonTierInfo;
        ultra: AddonTierInfo;
    };
    capacity?: string; // For enterprise
    unitPrice?: string; // For enterprise
    useCase?: string; // For enterprise
}

export const PERSONAL_TIERS: PricingTier[] = [
    {
        id: "free",
        name: "免费版",
        description: "个人学习",
        pricing: {
            monthly: 0,
            continuous: 0,
            yearly: 0,
        },
        features: ["每日免费使用 10 次", "标准生成速度"],
        benefits: {
            promptGen: "20次/天",
            imageQuota: "10点/天 (次日刷新)",
            resolution: "1K",
            speed: "普通",
            addonDiscount: "无折扣",
            estimatedImages: "/",
            useCase: "个人学习",
            creditConsumption: "1K/点",
        },
    },
    {
        id: "lite",
        name: "基础版",
        description: "个人尝鲜",
        pricing: {
            monthly: 9.9,
        },
        features: ["50次/天", "200点/周"],
        benefits: {
            promptGen: "50次/天",
            imageQuota: "200点/周",
            resolution: "2K",
            speed: "标准",
            addonDiscount: "无折扣",
            estimatedImages: "200张",
            useCase: "个人尝鲜",
            creditConsumption: "1K/1点, 2K/1点",
        },
    },
    {
        id: "pro",
        name: "专业版",
        description: "专业创作",
        isPopular: true,
        pricing: {
            monthly: 29.9,
            continuous: 24.9,
            yearly: 299,
        },
        features: ["无限制提示词生成", "660点/月"],
        benefits: {
            promptGen: "无限",
            imageQuota: "660点/月",
            resolution: "1K/2K/4K",
            speed: "极速",
            addonDiscount: "95折",
            estimatedImages: "660张 (2K) / 330张 (4K)",
            useCase: "商用",
            creditConsumption: "1K/1点, 2K/1点, 4K/2点",
        },
    },
    {
        id: "ultra",
        name: "旗舰版",
        description: "深度创作",
        pricing: {
            monthly: 129,
            continuous: 99.9,
            yearly: 999,
        },
        features: ["深度版 (无限+可选模型)", "3300点/月"],
        benefits: {
            promptGen: "深度版 (无限+可选模型)",
            imageQuota: "3300点/月",
            resolution: "1K/2K/4K",
            speed: "光速",
            addonDiscount: "85折",
            estimatedImages: "3300张 (2K) / 1650张 (4K)",
            useCase: "企业级",
            creditConsumption: "1K/1点, 2K/1点, 4K/2点",
        },
    },
];

export const ENTERPRISE_TIERS: PricingTier[] = [
    {
        id: "business",
        name: "企业版",
        description: "企业团队",
        pricing: {
            monthly: 499,
            yearly: 4990,
        },
        features: ["深度版 (无限+可选模型)", "13000点/月", "5个共享席位"],
        benefits: {
            promptGen: "深度版 (无限+可选模型)",
            imageQuota: "13000点/月",
            resolution: "1K/2K/4K",
            speed: "光速",
            estimatedImages: "6500张 (4K)",
            useCase: "企业级",
            creditConsumption: "详见说明",
            seats: "5个共享席位",
            seatPurchase: "99/人/月",
        },
    },
    {
        id: "business_ultra",
        name: "企业旗舰版",
        description: "顶尖企业",
        pricing: {
            yearly: 16990,
        },
        features: ["深度版 (无限+可选模型)", "36000点/月", "15个席位"],
        benefits: {
            promptGen: "深度版 (无限+可选模型)",
            imageQuota: "36000点/月",
            resolution: "1K/2K/4K",
            speed: "光速",
            estimatedImages: "18000张 (4K)",
            useCase: "企业级",
            creditConsumption: "详见说明",
            seats: "15个席位",
        },
    },
];

export const PERSONAL_ADDONS: AddonPackage[] = [
    {
        id: "addon_mini",
        name: "迷你包",
        price: 9.9,
        tiers: {
            freeLite: { credits: "200点", images: "200张" },
            pro: { credits: "230点", images: "115张", label: "约95折" },
            ultra: { credits: "260点", images: "130张", label: "约85折" },
        },
    },
    {
        id: "addon_standard",
        name: "标准包",
        price: 49,
        tiers: {
            freeLite: { credits: "1100点", images: "1100张" },
            pro: { credits: "1265点", images: "632张", label: "约95折" },
            ultra: { credits: "1450点", images: "725张", label: "约85折" },
        },
    },
    {
        id: "addon_pro",
        name: "专业包",
        price: 129,
        tiers: {
            freeLite: { credits: "3000点", images: "3000张" },
            pro: { credits: "3450点", images: "1725张", label: "约95折" },
            ultra: { credits: "4000点", images: "2000张", label: "约85折" },
        },
    },
    {
        id: "addon_giant",
        name: "巨量包",
        price: 299,
        tiers: {
            freeLite: { credits: "7800点", images: "7800张" },
            pro: { credits: "9000点", images: "4500张", label: "约95折" },
            ultra: { credits: "9600点", images: "4800张", label: "约85折" },
        },
    },
];

export const ENTERPRISE_ADDONS: AddonPackage[] = [
    {
        id: "addon_project",
        name: "项目包",
        price: 999,
        tiers: {
            freeLite: { credits: "25000点", images: "12500张" },
            pro: { credits: "25000点", images: "12500张" },
            ultra: { credits: "25000点", images: "12500张" },
        },
        capacity: "12,500张",
        unitPrice: "¥0.079",
        useCase: "单个中型营销战役",
    },
    {
        id: "addon_quarterly",
        name: "季度包",
        price: 4999,
        tiers: {
            freeLite: { credits: "130000点", images: "65000张" },
            pro: { credits: "130000点", images: "65000张" },
            ultra: { credits: "130000点", images: "65000张" },
        },
        capacity: "65,000张",
        unitPrice: "¥0.076",
        useCase: "广告公司季度物料",
    },
    {
        id: "addon_group",
        name: "集团包",
        price: 19999,
        tiers: {
            freeLite: { credits: "550000点", images: "275000张" },
            pro: { credits: "550000点", images: "275000张" },
            ultra: { credits: "550000点", images: "275000张" },
        },
        capacity: "275,000张",
        unitPrice: "¥0.072",
        useCase: "垂直模型训练/批量生产",
    },
];
