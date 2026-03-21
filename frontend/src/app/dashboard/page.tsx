import { redirect } from 'next/navigation'

export default function DashboardRootPage() {
  // Guard route so accidental /dashboard navigation does not show a 404.
  redirect('/')
}
