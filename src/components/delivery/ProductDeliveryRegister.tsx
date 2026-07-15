import { Card, CardHeader } from '@/components/ui/Card'
import { getDeliveryRegister } from '@/lib/delivery-register'
import { DELIVERY_CHANNELS } from '@/lib/channel-gates'

function gateBadgeStyle(gateLevel: number): string {
  if (gateLevel === 10) return 'text-green-700 bg-green-50 border-green-200'
  if (gateLevel === 0) return 'text-gray-400 bg-gray-50 border-gray-200'
  return 'text-indigo-700 bg-indigo-50 border-indigo-200'
}

export function ProductDeliveryRegister() {
  const register = getDeliveryRegister()

  return (
    <Card padded={false}>
      <CardHeader title="Enterprise Product Delivery Register" />
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100">
              <th className="text-left font-semibold text-gray-700 px-5 py-3 whitespace-nowrap">Product</th>
              {DELIVERY_CHANNELS.map(channel => (
                <th key={channel} className="text-left font-semibold text-gray-700 px-3 py-3 whitespace-nowrap">
                  {channel}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {register.map(record => (
              <tr key={record.slug} className="border-b border-gray-50 last:border-0">
                <td className="px-5 py-3 whitespace-nowrap text-gray-800 font-medium">{record.businessName}</td>
                {record.channels.map(status => (
                  <td key={status.channel} className="px-3 py-3 whitespace-nowrap">
                    <span
                      title={status.assessmentBasis}
                      className={`text-xs px-2 py-0.5 rounded-full border font-medium ${gateBadgeStyle(status.gateLevel)}`}
                    >
                      ECG-{status.gateLevel}
                    </span>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  )
}
