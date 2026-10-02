import { redirect } from 'next/navigation'

export default function TestLoginPage(): never {
  redirect('/login')
}
