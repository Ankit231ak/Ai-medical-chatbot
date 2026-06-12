import { onAuthStateChanged, type User } from 'firebase/auth'
import { useEffect, useState } from 'react'
import { auth } from './firebase'

export function useAuth() {
  const [user, setUser] = useState<User | null>(auth.currentUser)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u)
      setLoading(false)
    })
    return () => unsub()
  }, [])

  return { user, loading }
}

