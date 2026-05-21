import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import webPush from 'npm:web-push@3.6.7'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
)

webPush.setVapidDetails(
  'mailto:admin@nursery.com',
  Deno.env.get('VAPID_PUBLIC_KEY')!,
  Deno.env.get('VAPID_PRIVATE_KEY')!
)

Deno.serve(async (req) => {
  try {
    const body = await req.json()
    const record = body.record
    const oldRecord = body.old_record

    if (record.status !== 'ready' || oldRecord?.status === 'ready') {
      return new Response('ok')
    }

    const { data: child } = await supabase
      .from('children')
      .select('full_name, parent_user_id')
      .eq('id', record.child_id)
      .single()

    if (!child?.parent_user_id) return new Response('ok')

    const firstName = child.full_name.split(' ')[0]

    const { data: sub } = await supabase
      .from('push_subscriptions')
      .select('subscription')
      .eq('user_id', child.parent_user_id)
      .maybeSingle()

    if (!sub) return new Response('ok')

    const parsed = JSON.parse(sub.subscription)
    await webPush.sendNotification(parsed, JSON.stringify({
      title: '🌟 Your child is ready!',
      body: `${firstName} is ready and waiting for you — come on over 💛`,
    }))

    console.log('Parent push sent OK')
    return new Response('ok')
  } catch (err) {
    console.error('Function error:', String(err))
    return new Response('error', { status: 500 })
  }
})
