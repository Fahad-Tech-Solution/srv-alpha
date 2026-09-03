import * as React from "react"
import {
  LayoutDashboard,
  Users,
  Truck,
  FileText,
  Calendar,
  Settings,
  Briefcase,
  CreditCard,
  User,
  Mail,
} from "lucide-react"
import { useLocation } from "react-router-dom"
import { useAuth } from "@/hooks/useAuth"
import { NavMain } from "@/components/nav-main"
import { NavUser } from "@/components/nav-user"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from "@/components/ui/sidebar"
import { TeamSwitcher } from "@/components/team-switcher"

interface MovingVanSidebarProps extends React.ComponentProps<typeof Sidebar> {
  role?: 'admin' | 'customer' | 'driver'
}

export function MovingVanSidebar({ role = 'customer', ...props }: MovingVanSidebarProps) {
  const location = useLocation()
  const { user } = useAuth()

  // Get navigation items based on role
  const getNavItems = () => {
    const baseItems = [
      {
        title: "Dashboard",
        url: `/${role}`,
        icon: LayoutDashboard,
        isActive: location.pathname === `/${role}`,
        items: [],
      },
    ]

    if (role === 'admin') {
      return [
        ...baseItems,
        {
          title: "Users",
          url: "/admin/users",
          icon: Users,
          isActive: location.pathname === "/admin/users",
          items: [],
        },
        {
          title: "Drivers",
          url: "/admin/drivers",
          icon: Truck,
          isActive: location.pathname === "/admin/drivers",
          items: [],
        },
        {
          title: "Applications",
          url: "/admin/driver-applications",
          icon: Briefcase,
          isActive: location.pathname === "/admin/driver-applications",
          items: [],
        },
        {
          title: "Bookings",
          url: "/admin/bookings",
          icon: FileText,
          isActive: location.pathname === "/admin/bookings",
          items: [],
        },
        {
          title: "Settings",
          url: "/admin/settings",
          icon: Settings,
          isActive: location.pathname === "/admin/settings",
          items: [],
        },
      ]
    }

    if (role === 'driver') {
      return [
        ...baseItems,
        {
          title: "My Jobs",
          url: "/driver/jobs",
          icon: FileText,
          isActive: location.pathname === "/driver/jobs",
          items: [],
        },
        {
          title: "Available Jobs",
          url: "/driver/available-jobs",
          icon: Briefcase,
          isActive: location.pathname === "/driver/available-jobs",
          items: [],
        },
        {
          title: "Vehicles",
          url: "/driver/vehicles",
          icon: Truck,
          isActive: location.pathname.startsWith("/driver/vehicles"),
          items: [],
        },
        {
          title: "Bank Details",
          url: "/driver/bank-details",
          icon: CreditCard,
          isActive: location.pathname === "/driver/bank-details",
          items: [],
        },
        {
          title: "Profile",
          url: "/driver/profile",
          icon: User,
          isActive: location.pathname === "/driver/profile",
          items: [],
        },
        {
          title: "Message",
          url: "/driver/message",
          icon: Mail,
          isActive: location.pathname === "/driver/message",
          items: [],
        },
        {
          title: "Settings",
          url: "/driver/settings",
          icon: Settings,
          isActive: location.pathname === "/driver/settings",
          items: [],
        },
      ]
    }

    // Customer
    return [
      ...baseItems,
      {
        title: "My Bookings",
        url: "/customer/bookings",
        icon: FileText,
        isActive: location.pathname === "/customer/bookings",
        items: [],
      },
      {
        title: "Book Service",
        url: "/customer/book",
        icon: Calendar,
        isActive: location.pathname === "/customer/book",
        items: [],
      },
      {
        title: "Box Shop",
        url: "https://local-van.com/box-shop/",
        icon: FileText,
        isActive: false,
        items: [],
        external: true,
      },
      {
        title: "Message",
        url: "/customer/message",
        icon: Mail,
        isActive: location.pathname === "/customer/message",
        items: [],
      },
      {
        title: "Settings",
        url: "/customer/settings",
        icon: Settings,
        isActive: location.pathname === "/customer/settings",
        items: [],
      },
    ]
  }

  const navItems = getNavItems()

  // Transform nav items to use Link instead of href
  const navItemsWithLinks = navItems.map(item => ({
    ...item,
    url: item.url,
  }))

  const userData = {
    name: user?.name || "User",
    email: user?.email || "admin@localvan.com",
    avatar: "",
  }

  const teams = [
    {
      name: "Local Van",
      logo: Truck,
      plan: role === 'admin' ? 'Admin' : role === 'driver' ? 'Driver' : 'Customer',
    },
  ]

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <TeamSwitcher teams={teams} />
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={navItemsWithLinks} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={userData} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}

