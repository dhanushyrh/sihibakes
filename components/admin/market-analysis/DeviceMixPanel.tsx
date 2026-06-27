import type { DeviceMixMetric } from "@/lib/market-analysis";

interface DeviceMixPanelProps {
  devices: DeviceMixMetric[];
  mobileConversionRate: number;
}

export function DeviceMixPanel({
  devices,
  mobileConversionRate,
}: DeviceMixPanelProps) {
  const max = Math.max(...devices.map((d) => d.sessions), 1);

  return (
    <div className="rounded-2xl bg-white p-5 ring-1 ring-[#4B2C20]/10">
      <h3 className="text-sm font-semibold text-[#4B2C20]">Device mix</h3>
      <p className="mt-0.5 text-xs text-[#4B2C20]/50">
        Where customers browse from · mobile conversion {mobileConversionRate}%
      </p>
      {devices.length === 0 ? (
        <p className="mt-6 text-sm text-[#4B2C20]/45">No device data yet.</p>
      ) : (
        <ul className="mt-4 space-y-3">
          {devices.map((device) => (
            <li key={device.deviceType}>
              <div className="mb-1 flex items-center justify-between text-xs">
                <span className="font-medium capitalize text-[#4B2C20]">
                  {device.label}
                </span>
                <span className="tabular-nums text-[#4B2C20]/60">
                  {device.sessions} · {device.conversionRate}% convert
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-[#F5E6D3]">
                <div
                  className="h-full rounded-full bg-[#4B2C20]"
                  style={{ width: `${Math.max((device.sessions / max) * 100, 4)}%` }}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
