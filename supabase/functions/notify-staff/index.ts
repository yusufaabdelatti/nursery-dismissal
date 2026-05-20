import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
)

// Convert base64url to Uint8Array
function base64urlToUint8Array(base64url: string): Uint8Array {
  const padding = '='.repeat((4 - (base64url.length % 4)) % 4)
  const base64 = (base64url + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(base64)
  return Uint8Array.from([...raw].map(c => c.charCodeAt(0)))
}

// Sign a message with ECDSA P-256
async function signMessage(privateKey: CryptoKey, message: Uint8Array): Promise<Uint8Array> {
  const sig = await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, privateKey, message)
  return new Uint8Array(sig)
}

// Build VAPID authorization header
async function buildVapidAuth(
  audience: string,
  subject: string,
  publicKeyB64: string,
  privateKeyB64: string
): Promise<string> {
  const header = { typ: 'JWT', alg: 'ES256' }
  const now = Math.floor(Date.now() / 1000)
  const payload = { aud: audience, exp: now + 43200, sub: subject }

  const encode = (obj: object) =>
    btoa(JSON.stringify(obj)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')

  const unsignedToken = `${encode(header)}.${encode(payload)}`

  const privateKeyBytes = base64urlToUint8Array(privateKeyB64)
  const privateKey = await crypto.subtle.importKey(
    'pkcs8',
    privateKeyBytes,
    { name: 'ECDSA', namedCurve: 'P-256' },
    false,
    ['sign']
  ).catch(async () => {
    // Try raw format
    return await crypto.subtle.importKey(
      'raw',
      privateKeyBytes,
      { name: 'ECDSA', namedCurve: 'P-256' },
      false,
      ['sign']
    )
  })

  const sig = await signMessage(privateKey, new TextEncoder().encode(unsignedToken))
  const sigB64 = btoa(String.fromCharCode(...sig)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
  const token = `${unsignedToken}.${sigB64}`

  return `vapid t=${token},k=${publicKeyB64}`
}

async function sendPush(subscription: { endpoint: string; keys: { p256dh: string; auth: string } }, payload: string) {
  const vapidPublic = Deno.env.get('VAPID_PUBLIC_KEY')!
  const vapidPrivate = Deno.env.get('VAPID_PRIVATE_KEY')!
  const subject = 'mailto:admin@nursery.com'

  const url = new URL(subscription.endpoint)
  const audience = `${url.protocol}//${url.host}`

  const vapidAuth = await buildVapidAuth(audience, subject, vapidPublic, vapidPrivate)

  const response = await fetch(subscription.endpoint, {
    method: 'POST',
    headers: {
      'Authorization': vapidAuth,
      'Content-Type': 'application/octet-stream',
      'TTL': '60',
    },
    body: new TextEncoder().encode(payload),
  })

  if (!response.ok) {
    const text = await response.text()
    console.error('Push failed:', response.status, text)
  } else {
    console.log('Push sent successfully to:', subscription.endpoint)
  }
}

Deno.serve(async (req) => {
  try {
    const body = await req.json()
    console.log('Webhook received:', JSON.stringify(body.record))

    const record = body.record
    if (!record?.child_id) {
      console.log('No child_id in record')
      return new Response('ok')
    }

    // Step 1: get the child's class
    const { data: child, error: childError } = await supabase
      .from('children')
      .select('class_id, full_name')
      .eq('id', record.child_id)
      .single()

    console.log('Child:', child, 'Error:', childError)
    if (!child?.class_id) return new Response('ok')

    // Step 2: get staff IDs assigned to this class
    const { data: staffRows, error: staffError } = await supabase
      .from('staff_profiles')
      .select('id')
      .eq('class_id', child.class_id)

    console.log('Staff rows:', JSON.stringify(staffRows), 'Error:', staffError)
    if (!staffRows?.length) return new Response('ok')

    const staffIds = staffRows.map((s: { id: string }) => s.id)

    // Step 3: get push subscriptions for those staff members
    const { data: subs, error: subsError } = await supabase
      .from('push_subscriptions')
      .select('subscription')
      .in('user_id', staffIds)

    console.log('Subscriptions:', JSON.stringify(subs), 'Error:', subsError)
    if (!subs?.length) return new Response('ok')

    // Step 4: send push to each subscription
    const notification = JSON.stringify({
      title: '🔔 New Pickup Request',
      body: `${child.full_name} needs to be picked up`,
      requestId: record.id,
    })

    for (const sub of subs) {
      try {
        const parsed = JSON.parse(sub.subscription)
        await sendPush(parsed, notification)
      } catch (e) {
        console.error('Send error:', e)
      }
    }

    return new Response('ok')
  } catch (err) {
    console.error('Function error:', err)
    return new Response('error', { status: 500 })
  }
})