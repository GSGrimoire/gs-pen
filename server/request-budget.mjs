export async function budget(db, now) {
  const window=Math.floor(now/60000);
  const r=await db.prepare('INSERT INTO request_budget (scope,window,used) VALUES (?, ?, 1) ON CONFLICT(scope) DO UPDATE SET window=excluded.window, used=CASE WHEN request_budget.window=excluded.window THEN request_budget.used+1 ELSE 1 END RETURNING used').bind('captions',window).first();
  return {allowed:r.used<=10,firstDenied:r.used===11};
}
