// OpenNext config for Cloudflare Workers deployment.
// 默认配置即可,所有路由跑在 Workers 上。
// docs: https://opennext.js.org/cloudflare

import { defineCloudflareConfig } from "@opennextjs/cloudflare";

export default defineCloudflareConfig({
  // 所有 Next.js 缓存(包括 prompt-cache、ISR 等)在 Cloudflare 侧暂用 in-memory;
  // 后续若要持久缓存,可配 KV / R2 incrementalCache。
  // incrementalCache: ...
});
