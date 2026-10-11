import { database } from '../../../lib/db';
export async function POST(request) {
 try { const { sessionId } = await request.json(); database().prepare("UPDATE sessions SET status='abandoned',completed_at=? WHERE id=? AND status='active'").run(new Date().toISOString(),sessionId); return Response.json({ ok:true }); }
 catch { return Response.json({ error:'Could not close session.' }, { status:500 }); }
}
