import html from "./workspace.html?raw";
import {requireChatGPTUser} from "./chatgpt-auth";

export const dynamic = "force-dynamic";

export async function GET() {
  await requireChatGPTUser("/");
  return new Response(html, { headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store", "Referrer-Policy": "no-referrer" } });
}
