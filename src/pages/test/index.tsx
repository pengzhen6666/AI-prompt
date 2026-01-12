// import { getRawPrompts } from "@/servers/prompts";
// import React, { useEffect } from "react";

// export default function index() {
//   useEffect(() => {
//     getRawPrompts();
//   }, []);
//   return (
//     <div>
//       <button
//         onClick={() => {
//           let url = "http://10.10.19.176:5173";
//           url = encodeURIComponent(url);
//           window.location.href = `https://open.weixin.qq.com/connect/oauth2/authorize?appid=wx10476136dc6d5d7b&redirect_uri=${url}&response_type=code&scope=snsapi_userinfo&state=STATE#wechat_redirect`;
//         }}
//       >
//         微信登陆
//       </button>
//       除去http
//     </div>
//   );
// }
import { debug } from "@/servers/ai";
import { supabase } from "@/supabase";
import React, { useEffect } from "react";

export default function index() {
  return (
    <div className="h-100 flex items-center justify-center">
      <div onClick={debug} className="bg-[orange]">
        dubug
      </div>
    </div>
  );
}
