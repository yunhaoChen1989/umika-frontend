import { LocationSettingManager } from "@/components/manager/location-settings/location-setting-manager";
import { ManagerPageHeader } from "@/components/manager/page-header";

export default function LocationSettingsPage() {
  return (
    <div className="space-y-6">
      <ManagerPageHeader
        eyebrow="System"
        title="Location settings"
        description="Review the global system defaults and override the values you need for each store."
      />
      <LocationSettingManager />
    </div>
  );
}
