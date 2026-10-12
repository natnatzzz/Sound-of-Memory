import { transaction } from '../../../lib/db';
export const runtime = 'nodejs';
export async function POST(request) {
 try {
  const {sessionId}=await request.json();
  await transaction(async db => {
   // Use the same session lock order as round submission.
   await db.query('SELECT id FROM sessions WHERE id=$1 FOR UPDATE',[sessionId]);
   const completedAt=new Date().toISOString();
   await db.query("UPDATE sessions SET status='abandoned',completed_at=$1 WHERE id=$2 AND status='active'",[completedAt,sessionId]);
   await db.query("UPDATE trials SET status='abandoned',completed_at=$1 WHERE session_id=$2 AND status IN ('pending','active')",[completedAt,sessionId]);
  });
  return Response.json({ok:true});
 } catch {return Response.json({error:'Could not close session.'},{status:500});}
}
