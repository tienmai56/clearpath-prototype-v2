import {env} from 'cloudflare:workers';
import {handleStudentIntake} from '../../../../lib/student-intake';
const handle=(request:Request)=>handleStudentIntake(request,{DB:env.DB!,BUCKET:env.BUCKET!});
export const GET=handle;
export const POST=handle;
export const DELETE=handle;
