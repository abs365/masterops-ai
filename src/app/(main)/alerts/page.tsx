import { AlertsTable } from '@/components/alerts/AlertsTable'

export default function AlertsPage() {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold text-gray-900">Alerts</h2>
        <p className="text-sm text-gray-500 mt-0.5">All system alerts across every project</p>
      </div>
      <AlertsTable />
    </div>
  )
}
