import { env } from 'cloudflare:workers';
import { handlePhotoTransfer } from '../../../../lib/photo-transfer';
const handle = (request: Request) => handlePhotoTransfer(request, {DB: env.DB!, BUCKET: env.BUCKET!});
export const GET = handle;
export const POST = handle;
export const DELETE = handle;
