import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Sparkles, AlertTriangle, X } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router";

interface GenerationGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface Platform {
  name: string;
  url: string;
  domain: string;
  logo: string;
}

const platforms: Platform[] = [
  {
    name: "即梦 (Jimeng)",
    url: "https://jimeng.jianying.com/",
    domain: "jimeng.jianying.com",
    logo: "https://lf3-lv-buz.vlabstatic.com/obj/image-lvweb-buz/common/images/dreamina-v5.ico",
  },
  {
    name: "通义万相",
    url: "https://wanxiang.aliyun.com/",
    domain: "wanxiang.aliyun.com",
    logo: "https://g.alicdn.com/sail-web/wan-static-resources/0.0.30/images/favicon.ico",
  },
  {
    name: "腾讯混元",
    url: "https://hunyuan.tencent.com/",
    domain: "hunyuan.tencent.com",
    logo: "https://cdn-portal.hunyuan.tencent.com/public/static/logo/favicon.png",
  },
  {
    name: "可灵 (Keling)",
    url: "https://kling.kuaishou.com/",
    domain: "kling.kuaishou.com",
    logo: "https://p2-kling.klingai.com/kcdn/cdn-kcdn112452/kling-web-prod/favicon.ico",
  },
];

export function GenerationGuideModal({
  isOpen,
  onClose,
}: GenerationGuideModalProps) {
  const navigate = useNavigate();
  const [showNotice, setShowNotice] = useState(false);

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent
          className="sm:max-w-[600px] p-0 overflow-hidden bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800"
          showCloseButton={true}
        >
          <DialogHeader className="px-6 pt-8 pb-2">
            <DialogTitle className="text-xl flex items-center justify-center gap-2">
              <Sparkles className="w-5 h-5 text-indigo-500" />
              AI生图指引
            </DialogTitle>
            <DialogDescription className="text-center">
              推荐使用以下国内优质AI生图工具
            </DialogDescription>
          </DialogHeader>

          <div className="px-6 pb-8 flex flex-col gap-6">
            {/* Strong Recommendation: Nano Banana */}
            <div
              onClick={() => setShowNotice(true)}
              className="flex items-center gap-4 p-4 rounded-xl bg-gradient-to-r from-amber-50 to-yellow-50 dark:from-amber-900/10 dark:to-yellow-900/10 border border-amber-200 dark:border-amber-800/30 cursor-pointer hover:shadow-md transition-all group"
            >
              <div className="p-3 rounded-2xl bg-white dark:bg-zinc-900 shadow-sm border border-amber-100 dark:border-amber-800 group-hover:scale-110 transition-transform duration-300">
                <img
                  src="/favicon.svg"
                  alt="Nano Banana"
                  className="w-10 h-10 object-contain"
                />
              </div>
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-amber-900 dark:text-amber-100 text-lg">
                    Nano Banana
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-amber-500 text-white text-[10px] font-bold">
                    强力推荐
                  </span>
                </div>
                <p className="text-sm text-amber-700 dark:text-amber-300/80">
                  本站指定官方生图工具，专为Prompt优化设计，简单易用。
                </p>
              </div>
              <div className="ml-auto">
                <Sparkles className="w-5 h-5 text-amber-500 animate-pulse" />
              </div>
            </div>

            <div className="grid grid-cols-3 sm:grid-cols-4 gap-4">
              {platforms.map((platform, index) => (
                <a
                  key={index}
                  href={platform.url}
                  target="_blank"
                  rel="noreferrer"
                  className="flex flex-col items-center justify-center gap-3 p-4 rounded-xl hover:bg-zinc-50 dark:hover:bg-zinc-900 border border-transparent hover:border-zinc-200 dark:hover:border-zinc-800 transition-all cursor-pointer group"
                >
                  <div className="relative p-2 rounded-2xl bg-white dark:bg-zinc-900 group-hover:scale-110 transition-transform duration-300 shadow-sm border border-zinc-100 dark:border-zinc-800 overflow-hidden">
                    <img
                      src={platform.logo}
                      alt={platform.name}
                      className="w-10 h-10 object-contain rounded-full"
                    />
                  </div>
                  <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300 text-center">
                    {platform.name}
                  </span>
                </a>
              ))}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={showNotice} onOpenChange={setShowNotice}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <div className="flex justify-between items-center">
              <AlertDialogTitle className="flex items-center gap-2 text-amber-600">
                <AlertTriangle className="w-5 h-5" />
                使用提示
              </AlertDialogTitle>
              <AlertDialogCancel>
                <X />
              </AlertDialogCancel>
            </div>

            <AlertDialogDescription className="flex flex-col gap-2 pt-2 text-base">
              <span className="font-semibold text-zinc-700 dark:text-zinc-300">
                使用 Nano Banana 需要满足以下条件：
              </span>
              <ul className="list-disc list-inside space-y-1 text-zinc-600 dark:text-zinc-400">
                <li>需要购买独立账号</li>
                <li>需要开启科学上网 (魔法)</li>
                <li
                  className="text-[blue] cursor-pointer"
                  onClick={() => {
                    window.open("https://www.goofish.com/");
                  }}
                >
                  可自行前往咸鱼搜索nano banana进行购买（¥0.01）
                </li>
              </ul>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={() => {
                window.open("https://labs.google/fx/tools/flow", "_blank");
              }}
            >
              我已拥有
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-amber-500 hover:bg-amber-600"
              onClick={() => {
                window.open(
                  "https://m.tb.cn/h.78jQbn1?tk=MIwhU1SwTwG",
                  "_blank"
                );
                setShowNotice(false);
              }}
            >
              前往获取/购买
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
