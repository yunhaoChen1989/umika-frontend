import { LocationSettingManager } from "@/components/manager/location-settings/location-setting-manager";
import { ManagerPageHeader } from "@/components/manager/page-header";
import { getDictionary } from "@/lib/i18n";
import { getCurrentLocale } from "@/lib/i18n-server";

export default async function LocationSettingsPage() {
  const locale = await getCurrentLocale();
  const copy = getDictionary(locale).manager.pages.locationSettings;

  return (
    <div className="space-y-6">
      <ManagerPageHeader
        eyebrow={copy.eyebrow}
        title={copy.title}
        description={copy.description}
      />
      <LocationSettingManager />
    </div>
  );
}
