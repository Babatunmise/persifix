import { redirect } from "next/navigation";

// Ahuva is the companion experience inside Sanctos Kitchen.
// Keep the legacy URL as a compatibility redirect so users enter the
// realigned experience instead of the retired DASH Guardian interface.
export default function KitchenPage() {
  redirect("/ahuva");
}
