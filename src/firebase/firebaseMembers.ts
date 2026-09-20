import { doc, getDoc, getFirestore } from 'firebase/firestore'
import { normalizeEmail } from '../auth/email'
import { toMember } from '../auth/memberDocument'
import type { MemberRepository } from '../auth/ports'
import { firebaseApp } from './app'

const database = getFirestore(firebaseApp)

export const firebaseMemberRepository: MemberRepository = {
  async find(email) {
    const identifier = normalizeEmail(email)
    const snapshot = await getDoc(doc(database, 'members', identifier))
    return snapshot.exists() ? toMember(identifier, snapshot.data()) : null
  },
}
