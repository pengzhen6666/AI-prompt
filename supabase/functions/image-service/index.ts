import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { decode } from "https://deno.land/std@0.168.0/encoding/base64.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers":
        "authorization, x-client-info, apikey, content-type, x-goog-api-key",
};

// --- 解密工具函数 ---
const ALGORITHM = "AES-GCM";
const IV_LENGTH = 12;

async function deriveKey(password: string): Promise<CryptoKey> {
    const enc = new TextEncoder();
    const hash = await crypto.subtle.digest("SHA-256", enc.encode(password));
    return await crypto.subtle.importKey(
        "raw",
        hash,
        { name: ALGORITHM },
        false,
        ["decrypt"]
    );
}

async function decryptPayload(base64Data: string, password: string) {
    const combined = decode(base64Data);
    const iv = combined.slice(0, IV_LENGTH);
    const ciphertext = combined.slice(IV_LENGTH);
    const key = await deriveKey(password);

    const decrypted = await crypto.subtle.decrypt(
        { name: ALGORITHM, iv },
        key,
        ciphertext
    );

    return new TextDecoder().decode(decrypted);
}
// ------------------

interface ImageServicePayload {
    payload?: string;
    [key: string]: any;
}

serve(async (req: Request) => {
    // 处理 CORS 预检请求
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders });
    }

    try {
        // 1. 初始化 Supabase 客户端 (使用服务角色凭据)
        const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
        const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
        const supabase = createClient(supabaseUrl, supabaseServiceKey);

        // 2. 身份验证
        const authHeader = req.headers.get("Authorization");
        let userId = null;
        let currentBalance = null;

        if (authHeader) {
            const token = authHeader.replace("Bearer ", "");
            const { data: { user } } = await supabase.auth.getUser(token);
            if (user) {
                userId = user.id;
            }
        }

        // 3. 解析请求体
        const body: ImageServicePayload = await req.json();
        let finalBody = body;

        // 4. 如果请求体包含加密 payload，则进行解密
        if (body.payload) {
            const encryptionKey = Deno.env.get("API_ENCRYPTION_KEY");
            if (!encryptionKey) {
                throw new Error("服务端 API_ENCRYPTION_KEY 未设置");
            }
            try {
                const decrypted = await decryptPayload(body.payload, encryptionKey);
                finalBody = JSON.parse(decrypted);
            } catch (err) {
                console.error("解密荷载失败:", err);
                throw new Error("解密失败：密文错误或 Key 不匹配");
            }
        }

        // 5. 对登录用户调用 RPC 执行计费 (消耗积分)
        if (userId) {
            const { data: rpcResult, error: rpcError } = await supabase.rpc(
                "consume_points",
                {
                    p_user_id: userId,
                    p_description: "AI 生图消耗",
                }
            );

            if (rpcError) {
                console.error("计费 RPC 错误:", rpcError);
                throw new Error(`计费系统异常: ${rpcError.message}`);
            }

            if (rpcResult.success === false) {
                return new Response(JSON.stringify({ error: rpcResult.error }), {
                    headers: { ...corsHeaders, "Content-Type": "application/json" },
                    status: rpcResult.error === "积分不足" ? 402 : 500,
                });
            }

            currentBalance = rpcResult.new_balance;
        }

        // 6. 准备外部生图 API 请求
        const apiKey = Deno.env.get("IMAGE_API_KEY");
        const tenantId = "000000";
        const url = "http://124.156.230.187:8080/v3/images/generations";

        console.log("[image-service] 发起 API 请求:", url);

        const res = await fetch(url, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": apiKey || "",
                "TenantId": tenantId,
            },
            body: JSON.stringify(finalBody),
        });

        if (!res.ok) {
            const errorText = await res.text();
            console.error("[image-service] API 错误:", res.status, errorText);
            throw new Error(`API 外部请求失败: ${res.status} ${errorText}`);
        }

        const data = await res.json();

        // 7. 返回结果，包含最新余额
        return new Response(
            JSON.stringify({
                ...data,
                balance: currentBalance,
            }),
            {
                headers: { ...corsHeaders, "Content-Type": "application/json" },
                status: 200,
            }
        );
    } catch (error: any) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error("[image-service] 函数执行异常:", errorMessage);
        return new Response(JSON.stringify({ error: errorMessage }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 500,
        });
    }
});
