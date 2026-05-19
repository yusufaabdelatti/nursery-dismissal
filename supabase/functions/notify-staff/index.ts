import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import webpush from 'npm:web-push'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
)

webpush.setVapidDetails(
  'mailto:admin@nursery.com',
  Deno.env.get('VAPID_PUBLIC_KEY')!,
  Deno.env.get('VAPID_PRIVATE_KEY')!
)

Deno.serve(async (req) => {
  const { record } = await req.json()

  const { data: child } = await supabase
    .from('children')
    .select('class_id, full_name')
    .eq('id', record.child_id)
    .single()

  if (!child?.class_id) return new Response('ok')

  const { data: staffSubs } = await supabase
    .from('staff_profiles')
    .select('id, push_subscriptions(subscription)')
    .eq('class_id', child.class_id)

  if (!staffSubs?.length) return new Response('ok')

  const sends = staffSubs.flatMap((staff) =>
    (staff.push_subscriptions || []).map(async (sub: { subscription: string }) => {
      try {
        await webpush.sendNotification(
          JSON.parse(sub.subscription),
          JSON.stringify({
            title: '🔔 New Pickup Request',
            body: `${child.full_name} is ready for pickup`,
            requestId: record.id,
          })
        )
      } catch (e) {
        console.error('Push failed:', e)
      }
    })
  )

  await Promise.all(sends)
  return new Response('ok')
})
