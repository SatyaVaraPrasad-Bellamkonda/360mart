import { Bike, CarTaxiFront, Motorbike, PlugZap, Scooter, Zap, type LucideIcon } from "lucide-react";
import type { VehicleType } from "@/lib/delivery/types";

// One icon per vehicle, shared by server and client components (a plain
// module: server pages can't read values out of a "use client" file).
// The electric ones get a bolt or plug; a three-wheeler is drawn as an auto (taxi).
export const VEHICLE_ICON: Record<VehicleType, LucideIcon> = {
  BICYCLE: Bike,
  E_BICYCLE: Zap,
  E_SCOOTER: PlugZap,
  SCOOTER: Scooter,
  MOTORCYCLE: Motorbike,
  THREE_WHEELER: CarTaxiFront,
};
