import type { RailNavItem } from "./Rail";
import { IconBook, IconGrid, IconInbox, IconPerson } from "../icons/Icons";

export const FACULTY_RAIL_ITEMS: RailNavItem[] = [
  { id: "dashboard", label: "Dashboard", icon: IconGrid, href: "/faculty/dashboard" },
  { id: "allocations", label: "Allocations", icon: IconBook, href: "/faculty/allocations" },
  { id: "requests", label: "Requests", icon: IconInbox, href: "/faculty/requests" },
  { id: "profile", label: "Profile", icon: IconPerson, href: "/faculty/profile" },
];
