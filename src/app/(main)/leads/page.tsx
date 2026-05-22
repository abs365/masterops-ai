export default function LeadsPage() {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold text-gray-900">Lead Generation</h2>
        <p className="text-sm text-gray-500 mt-0.5">Aggregated lead stats from all lead-gen platforms</p>
      </div>
      <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
        <p className="text-gray-400 text-sm">Lead data will appear here once projects are connected via health-check URLs.</p>
      </div>
    </div>
  )
}
