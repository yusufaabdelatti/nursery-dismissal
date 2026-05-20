import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
)

function base64urlToUint8Array(base64url: string): Uint8Array {
  const padding = '='.repeat((4 - (base64url.length % 4)) % 4)
  const base64 = (base64url + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(base64)
  return Uint8Array.from([...raw].map(c => c.charCodeAt(0)))
}

async function sendPush(
  subscription: { endpoint: string; keys: { p256dh: string; auth: string } },
  notificationPayload: { title: string; body: string }
) {
  const vapidPublic = Deno.env.get('VAPID_PUBLIC_KEY')!
  const vapidPrivate = Deno.env.get('VAPID_PRIVATE_KEY')!

  const url = new URL(subscription.endpoint)
  const audience = `${url.protocol}//${url.host}`
  const subject = 'mailto:admin@nursery.com'

  const privateKeyBytes = base64urlToUint8Array(vapidPrivate)
  const publicKeyBytes = base64urlToUint8Array(vapidPublic)

  const privateJwk = {
    kty: 'EC',
    crv: 'P-256',
    x: btoa(String.fromCharCode(...publicKeyBytes.slice(1, 33)))
      .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''),
    y: btoa(String.fromCharCode(...publicKeyBytes.slice(33)))
      .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''),
    d: vapidPrivate,
    key_ops: ['sign'],
    ext: true,
  }

  const privateKey = await crypto.subtle.importKey(
    'jwk', privateJwk,
    { name: 'ECDSA', namedCurve: 'P-256' },
    false, ['sign']
  )

  const now = Math.floor(Date.now() / 1000)
  const header = { typ: 'JWT', alg: 'ES256' }
  const claims = { aud: audience, exp: now + 43200, sub: subject }

  const encode = (obj: object) =>
    btoa(JSON.stringify(obj)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')

  const unsignedToken = `${encode(header)}.${encode(claims)}`
  const sigBytes = await crypto.subtle.sign(
    { name: 'ECDSA', hash: 'SHA-256' },
    privateKey,
    new TextEncoder().encode(unsignedToken)
  )
  const sig = btoa(String.fromCharCode(...new Uint8Array(sigBytes)))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')

  const token = `${unsignedToken}.${sig}`
  const vapidAuth = `vapid t=${token},k=${vapidPublic}`

  const response = await fetch(subscription.endpoint, {
    method: 'POST',
    headers: {
      'Authorization': vapidAuth,
      'Content-Type': 'text/plain;charset=UTF-8',
      'TTL': '60',
    },
    body: JSON.stringify(notificationPayload),
  })

  if (!response.ok) {
    const text = await response.text()
    console.error('Push failed:', response.status, text)
  } else {
    console.log('Parent push sent OK')
  }
}

Deno.serve(async (req) => {
  try {
    const body = await req.json()
    const record = body.record
    const oldRecord = body.old_record

    // Only fire when transitioning into 'ready'
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
    await sendPush(parsed, {
      title: '🌟 Your child is ready!',
      body: `${firstName} is ready and waiting for you — come on over 💛`,
    })

    return new Response('ok')
  } catch (err) {
    console.error('Function error:', err)
    return new Response('error', { status: 500 })
  }
})
