import { useContext } from 'react'
import { AuthContext, type AuthContextValue } from './AuthContext'

export function useAuth(): AuthContextValue {
  const value = useContext(AuthContext)
  if (value === null) {
    throw new Error("useAuth doit être appelé à l'intérieur d'un AuthProvider.")
  }
  return value
}
