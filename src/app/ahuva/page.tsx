import AhuvaHome from "@/components/AhuvaHome";
import BottomNav from "@/components/BottomNav";
import KitchenRouteGuard from "@/components/KitchenRouteGuard";

export default function AhuvaPage() {
  return (
    <KitchenRouteGuard>
      <AhuvaHome />
      <BottomNav />
    </KitchenRouteGuard>
  );
}
