import BottomNav from "@/components/BottomNav";
import KitchenHub from "@/components/KitchenHub";
import KitchenRouteGuard from "@/components/KitchenRouteGuard";

export default function KitchenPage() {
  return (
    <KitchenRouteGuard>
      <KitchenHub />
      <BottomNav />
    </KitchenRouteGuard>
  );
}
