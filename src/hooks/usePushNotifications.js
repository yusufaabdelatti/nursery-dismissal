import { useState } from 'react'
import { supabase } from '../supabaseClient'

const urlBase64ToUint8Array = (base64String) => {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  return Uint8Array.from([...rawData].map((char) => char.charCodeAt(0)))
}

export function usePushNotifications(userId) {
  const [permission, setPermission] = useState(
    typeof Notification !== 'undefined' ? Notification.permission : 'default'
  )
  const [subscribed, setSubscribed] = useState(false)
  const [error, setError] = useState(null)

  const subscribe = async () => {
    try {
      setError(null)

      if (!('serviceWorker' in navigator)) {
        setError('Service workers not supported in this browser.')
        return
      }
      if (!('PushManager' in window)) {
        setError('Push notifications not supported in this browser.')
        return
      }

      const result = await Notification.requestPermission()
      setPermission(result)
      if (result !== 'granted') {
        setError('Notification permission denied.')
        return
      }

      const registration = await navigator.serviceWorker.register('/sw.js')
      await navigator.serviceWorker.ready

      const vapidKey = import.meta.env.VITE_VAPID_PUBLIC_KEY
      if (!vapidKey) {
        setError('VAPID key missing from environment.')
        return
      }

      const pushSubscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey),
      })

      const { error: dbError } = await supabase
        .from('push_subscriptions')
        .upsert({
          user_id: userId,
          subscription: JSON.stringify(pushSubscription),
          updated_at: new Date().toISOString(),
        })

      if (dbError) {
        setError('Could not save subscription. Try again.')
        return
      }

      setSubscribed(true)
    } catch (err) {
      console.error('Push subscribe error:', err)
      setError(err.message ?? 'Something went wrong.')
    }
  }

  return { permission, subscribed, error, subscribe }
}
