import AddDeviceClient from "./ui/add-device-client";

export const dynamic = "force-dynamic";

export default function AddDevicePage() {
  return (
    <div className="space-y-6">
      <div className="hi5-panel p-5">
        <div className="max-w-4xl">
          <div className="text-xs uppercase tracking-[0.22em] opacity-60">
            Control onboarding
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold mt-2">
            Add Device
          </h1>

          <p className="text-sm opacity-75 mt-2 leading-relaxed">
            Choose a platform, device type and target group. Hi5Tech will use an existing
            provisioned installer where available, or prepare a new one for that group.
          </p>
        </div>
      </div>

      <AddDeviceClient />
    </div>
  );
}
