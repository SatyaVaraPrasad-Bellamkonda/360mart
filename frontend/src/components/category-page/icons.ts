import {
  Apple, BadgeCheck, Beef, Calendar, Carrot, Clock, Coffee, Drumstick, Droplet, Egg, Fish, Flame, Gift, Heart, Leaf,
  MapPin, Milk, Package, Percent, Scale, Shirt, ShieldCheck, Snowflake, Sparkles, Star, Store, Tag, ThumbsUp, Truck, Wheat,
  type LucideIcon,
} from "lucide-react";
import type { TrustIcon } from "@/lib/category-page/types";

// The backend's trust-point icon names and the icons we draw for them.
export const TRUST_ICON: Record<TrustIcon, LucideIcon> = {
  store: Store, scale: Scale, "badge-check": BadgeCheck, leaf: Leaf, sparkles: Sparkles, truck: Truck, clock: Clock,
  "shield-check": ShieldCheck, heart: Heart, star: Star, "thumbs-up": ThumbsUp, snowflake: Snowflake, calendar: Calendar,
  "map-pin": MapPin, package: Package, tag: Tag, percent: Percent, flame: Flame, droplet: Droplet, fish: Fish, beef: Beef,
  drumstick: Drumstick, egg: Egg, apple: Apple, carrot: Carrot, wheat: Wheat, milk: Milk, coffee: Coffee, shirt: Shirt, gift: Gift,
};
