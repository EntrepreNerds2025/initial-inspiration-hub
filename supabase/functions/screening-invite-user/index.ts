import { createClient } from 'npm:@supabase/supabase-js@2';
Deno.serve(async (req: Request) => {
 const origin = Deno.env.get('APP_ORIGIN') || '';
 const headers = { 'Access-Control-Allow-Origin': origin, 'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info', 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Vary': 'Origin' };
 const reply = (body: unknown, status = 200) => new Response(JSON.stringify(body), {status, headers: {...headers, 'Content-Type':'application/json'}});
 if (!origin || req.headers.get('Origin') !== origin) return reply({error:'Origin not allowed'},403);
 if (req.method === 'OPTIONS') return new Response(null,{status:204,headers});
 if (req.method !== 'POST') return reply({error:'Method not allowed'},405);
 const url = Deno.env.get('SUPABASE_URL')!;
 const caller = createClient(url,Deno.env.get('SUPABASE_ANON_KEY')!,{global:{headers:{Authorization:req.headers.get('Authorization') || ''}}});
 const {data:{user},error} = await caller.auth.getUser();
 if(error || !user) return reply({error:'Sign in required'},401);
 const {data:allowed} = await caller.rpc('is_admin');
 if(!allowed) return reply({error:'Administrator access required'},403);
 try {
  const {email} = await req.json();
  if(typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length>254) return reply({error:'Valid email required'},400);
  const admin = createClient(url,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,{auth:{persistSession:false,autoRefreshToken:false}});
  const {error:inviteError} = await admin.auth.admin.inviteUserByEmail(email,{redirectTo:origin + '/screening-room/callback'});
  if(inviteError) return reply({error:inviteError.message},400);
  return reply({success:true});
 } catch { return reply({error:'Invalid invitation request'},400); }
});
