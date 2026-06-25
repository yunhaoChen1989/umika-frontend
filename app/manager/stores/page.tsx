import { LocationManager } from "@/components/manager/locations/location-manager";
import { ManagerPageHeader } from "@/components/manager/page-header";

export default function ManagerStoresPage() {
  return (
    <div className="space-y-6">
      <ManagerPageHeader
        eyebrow="Stores"
        title="Locations"
        description="Create and maintain Umika Sushi store records. These locations are used as store scope for managers, staff, menus, orders, and reports."
      />
      <LocationManager />
    </div>
  );
}
