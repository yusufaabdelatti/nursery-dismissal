import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  return Uint8Array.from([...rawData].map((char) => char.charCodeAt(0)))
}

export function usePushNotifications(userId) {
  const [status, setStatus] = useState('idle') // idle | requesting | subscribed | unsupported | denied | error
  const [errorMsg, setErrorMsg] = useState(null)

  const isSupported = typeof Notification !== 'undefined'
    && 'serviceWorker' in navigator
    && 'PushManager' in window

  useEffect(() => {
    if (!isSupported) {
      setStatus('unsupported')
      return
    }
    if (Notification.permission === 'granted') {
      setStatus('subscribed')
    } else if (Notification.permission === 'denied') {
      setStatus('denied')
    }
  }, [isSupported])

  const subscribe = async () => {
    try {
      setStatus('requesting')
      setErrorMsg(null)

      if (!isSupported) {
        setStatus('unsupported')
        return
      }

      // Request permission
      const permission = await Notification.requestPermission()
      if (permission !== 'granted') {
        setStatus('denied')
        return
      }

      // Register service worker
      const reg = await navigator.serviceWorker.register('/sw.js', { scope: '/' })
      await navigator.serviceWorker.ready

      // Subscribe to push
      const pushSub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      })

      const subJson = pushSub.toJSON()

      // Save to database
      const { error } = await supabase
        .from('push_subscriptions')
        .upsert({
          user_id: userId,
          subscription: JSON.stringify(subJson),
          endpoint: subJson.endpoint,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'user_id,endpoint' })

      if (error) {
        console.error('DB error:', error)
        setStatus('error')
        setErrorMsg('Could not save. Try again.')
        return
      }

      setStatus('subscribed')
    } catch (err) {
      console.error('Subscribe error:', err)
      setStatus('error')
      setErrorMsg(err.message || 'Something went wrong.')
    }
  }

  return { status, errorMsg, isSupported, subscribe }
}
