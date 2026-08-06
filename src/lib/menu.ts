export type Role = 'SUPERADMIN' | 'ADMIN' | 'LEADER' | 'SALES' | 'TELEMARKETING'

export type MenuItem = {
  label: string
  href: string
  icon: string
}

export type MenuSection = {
  title: string
  icon: string
  items: MenuItem[]
}

export const MENUS_BY_ROLE: Record<Role, MenuSection[]> = {
  SUPERADMIN: [
    {
      title: 'TELEMARKETING',
      icon: 'Bot',
      items: [
        { label: 'Input Database', href: '/input-database', icon: 'Bot' },
        {
          label: 'Tracking Database',
          href: '/tracking-database',
          icon: 'Database',
        },
        {
          label: 'Tracking Broadcast',
          href: '/tracking-broadcast',
          icon: 'MessageCircleCode',
        },
        { label: 'Tracking Call', href: '/tracking-call', icon: 'Phone' },
        { label: 'Report Progres', href: '/report-progres', icon: 'FileText' },
      ],
    },
    {
      title: 'SALES',
      icon: 'User',
      items: [
        { label: 'Validasi Sales', href: '/validasi-sales', icon: 'User' },
        {
          label: 'Sales Report System',
          href: '/sales-report-system',
          icon: 'FileText',
        },
      ],
    },
    {
      title: 'VISIT',
      icon: 'CalendarCheck',
      items: [
        {
          label: 'Dashboard Visit',
          href: '/dashboard-request',
          icon: 'LayoutDashboard',
        },
        { label: 'Plan Activity', href: '/plan-activity', icon: 'MapPin' },
        {
          label: 'Visit Dashboard',
          href: '/rekapitulasi-visit',
          icon: 'BarChart3',
        },
        {
          label: 'Tracking Satuan Kerja',
          href: '/tracking-satker',
          icon: 'Building2',
        },
        {
          label: 'Tracking Visit B2G',
          href: '/tracking-b2g',
          icon: 'Building',
        },
        {
          label: 'Tracking Visit B2B',
          href: '/tracking-b2b',
          icon: 'Building',
        },
      ],
    },
    {
      title: 'DATABASE',
      icon: 'Database',
      items: [
        {
          label: 'Database Prospek',
          href: '/database-prospek',
          icon: 'DatabaseZap',
        },
        {
          label: 'Database Tracking',
          href: '/database-tracking',
          icon: 'Database',
        },
      ],
    },
    {
      title: 'PRODUCT HUB',
      icon: 'Package',
      items: [{ label: 'Data Produk', href: '/produk', icon: 'CheckSquare' }],
    },
    {
      title: 'E-PROCUREMENT',
      icon: 'ShoppingCart',
      items: [
        {
          label: 'Form E-Procurement',
          href: '/e-procurement',
          icon: 'FilePlus',
        },
        {
          label: 'Tracking E-Procurement',
          href: '/rekapitulasi-Eproc',
          icon: 'PieChart',
        },
      ],
    },
    {
      title: 'ADMIN',
      icon: 'UserCog',
      items: [
        {
          label: 'Dashboard Admin',
          href: '/dashboard-response',
          icon: 'CheckSquare',
        },
        {
          label: 'Request E-Procurement',
          href: '/e-procurement-response',
          icon: 'ClipboardList',
        },
        {
          label: 'Tracking Admin',
          href: '/rekapitulasi-response',
          icon: 'BarChart',
        },
      ],
    },
    {
      title: 'INSTANSI',
      icon: 'Building2',
      items: [
        { label: 'Daftar Instansi', href: '/instansi', icon: 'Building2' },
        {
          label: 'Tambah Instansi',
          href: '/tambah-instansi',
          icon: 'PlusSquare',
        },
      ],
    },
    {
      title: 'KONTRAK',
      icon: 'FileSignature',
      items: [],
    },
    {
      title: 'FINANCE',
      icon: 'Banknote',
      items: [],
    },
    {
      title: 'MANAJEMEN',
      icon: 'ShieldCheck',
      items: [
        { label: 'Add User', href: '/add-user', icon: 'UserPlus' },
        { label: 'Teams', href: '/teams', icon: 'Users' },
        { label: 'Parameter', href: '/parameters', icon: 'Settings' },
      ],
    },
  ],

  TELEMARKETING: [
    {
      title: 'TELEMARKETING',
      icon: 'Bot',
      items: [
        { label: 'Input Database', href: '/input-database', icon: 'Bot' },
        {
          label: 'Tracking Database',
          href: '/tracking-database',
          icon: 'Database',
        },
        {
          label: 'Tracking Broadcast',
          href: '/tracking-broadcast',
          icon: 'MessageCircleCode',
        },
        { label: 'Tracking Call', href: '/tracking-call', icon: 'Phone' },
        { label: 'Report Progres', href: '/report-progres', icon: 'FileText' },
      ],
    },
    {
      title: 'DATABASE',
      icon: 'Database',
      items: [
        {
          label: 'Database Prospek',
          href: '/database-prospek',
          icon: 'DatabaseZap',
        },
      ],
    },
  ],

  ADMIN: [
    // {
    //   title: "VISIT",
    //   icon: "CalendarCheck",
    //   items: [
    //     { label: "Dashboard Visit", href: "/dashboard-request", icon: "LayoutDashboard" },
    //     { label: "Plan Activity", href: "/plan-activity", icon: "MapPin" },
    //   ],
    // },
    // {
    //   title: "PRODUCT",
    //   icon: "Package",
    //   items: [
    //   ],
    // },
    {
      title: 'E-PROCUREMENT',
      icon: 'ShoppingCart',
      items: [
        {
          label: 'Form E-Procurement',
          href: '/e-procurement',
          icon: 'FilePlus',
        },
      ],
    },
    {
      title: 'ADMIN',
      icon: 'UserCog',
      items: [
        {
          label: 'Dashboard Admin',
          href: '/dashboard-response',
          icon: 'CheckSquare',
        },
        {
          label: 'Request E-Procurement',
          href: '/e-procurement-response',
          icon: 'ClipboardList',
        },
        {
          label: 'Tracking Admin',
          href: '/rekapitulasi-response',
          icon: 'BarChart',
        },
      ],
    },
    // {
    //   title: "INSTANSI",
    //   icon: "Building2",
    //   items: [
    //     { label: "Daftar Instansi", href: "/instansi", icon: "Building2" },
    //     { label: "Tambah Instansi", href: "/tambah-instansi", icon: "PlusSquare" },
    //   ],
    // },
    {
      title: 'KONTRAK',
      icon: 'FileSignature',
      items: [],
    },
    {
      title: 'FINANCE',
      icon: 'Banknote',
      items: [],
    },
  ],

  LEADER: [
    {
      title: 'VISIT',
      icon: 'CalendarCheck',
      items: [
        {
          label: 'Dashboard Visit',
          href: '/dashboard-request',
          icon: 'LayoutDashboard',
        },
        { label: 'Plan Activity', href: '/plan-activity', icon: 'MapPin' },
        {
          label: 'Visit Dashboard',
          href: '/rekapitulasi-visit',
          icon: 'BarChart3',
        },
        {
          label: 'Sales Report System',
          href: '/sales-report-system',
          icon: 'FileText',
        },
      ],
    },
    {
      title: 'E-PROCUREMENT',
      icon: 'ShoppingCart',
      items: [
        {
          label: 'Form E-Procurement',
          href: '/e-procurement',
          icon: 'FilePlus',
        },
        {
          label: 'Tracking E-Procurement',
          href: '/rekapitulasi-Eproc',
          icon: 'PieChart',
        },
      ],
    },
  ],

  SALES: [
    {
      title: 'VISIT',
      icon: 'CalendarCheck',
      items: [
        {
          label: 'Dashboard Visit',
          href: '/dashboard-request',
          icon: 'LayoutDashboard',
        },
        { label: 'Plan Activity', href: '/plan-activity', icon: 'MapPin' },
        {
          label: 'Visit Dashboard',
          href: '/rekapitulasi-visit',
          icon: 'BarChart3',
        },
        {
          label: 'Tracking Satuan Kerja',
          href: '/tracking-satker',
          icon: 'Building2',
        },
        {
          label: 'Tracking Visit B2G',
          href: '/tracking-b2g',
          icon: 'Building',
        },
        {
          label: 'Tracking Visit B2B',
          href: '/tracking-b2b',
          icon: 'Building',
        },
      ],
    },
    {
      title: 'DATABASE',
      icon: 'Database',
      items: [
        {
          label: 'Database Prospek',
          href: '/database-prospek',
          icon: 'DatabaseZap',
        },
      ],
    },
    {
      title: 'E-PROCUREMENT',
      icon: 'ShoppingCart',
      items: [
        {
          label: 'Form E-Procurement',
          href: '/e-procurement',
          icon: 'FilePlus',
        },
        {
          label: 'Tracking E-Procurement',
          href: '/rekapitulasi-Eproc',
          icon: 'PieChart',
        },
      ],
    },
  ],
}

export function getMenuByRole(role: Role): MenuSection[] {
  return MENUS_BY_ROLE[role] ?? []
}
