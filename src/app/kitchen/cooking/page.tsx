import BottomNav from "@/components/BottomNav";
import AhuvaKitchen from "@/components/AhuvaKitchen";
import KitchenRouteGuard from "@/components/KitchenRouteGuard";

export default function KitchenCookingPage() {
  return (
    <KitchenRouteGuard>
      <AhuvaKitchen />
      <BottomNav />
    </KitchenRouteGuard>
  );
}
