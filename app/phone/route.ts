import html from './phone.html?raw';
import {requireChatGPTUser} from '../chatgpt-auth';

export const dynamic = 'force-dynamic';

export async function GET(request:Request) {
 const url=new URL(request.url);
 await requireChatGPTUser(url.pathname+url.search);
 return new Response(html,{headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store','Referrer-Policy':'no-referrer'}});
}
