export type Role =
  | 'SUPERADMIN'
  | 'ADMIN'
  | 'LEADER'
  | 'SALES'
  | 'TELEMARKETING'
  | 'ADMIN SALES'

export type MenuItem = {
  label: string
  href: string
  icon: string
}

export type MenuSection = {
  title: string
  icon: string
  href?: string
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
      title: 'MONITORING',
      icon: 'Activity',
      items: [
        {
          label: 'Instansi No Phone',
          href: '/monitoring-leader',
          icon: 'Phone',
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
      title: 'KONTRAK',
      icon: 'FileSignature',
      items: [
        {
          label: 'Tambah Kontrak',
          href: '/kontrak',
          icon: 'FilePlus',
        },
        {
          label: 'Dokumentasi Project',
          href: '/dokumentasi-project',
          icon: 'FileText',
        },
      ],
    },
    {
      title: 'FINANCE',
      icon: 'Banknote',
      items: [
        {
          label: 'Data Project',
          href: '/data-project',
          icon: 'FolderKanban',
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
      title: 'PRODUCT HUB',
      icon: 'Package',
      items: [
        { label: 'Katalog Produk', href: '/katalog-produk', icon: 'ShoppingBag' },
        { label: 'Kelola Katalog', href: '/katalog-produk/kelola', icon: 'SlidersHorizontal' },
        { label: 'Tambah Produk', href: '/katalog-produk/tambah', icon: 'PlusSquare' },
        { label: 'Dokumen Produk', href: '/produk', icon: 'FileText' },
      ],
    },
    {
      title: 'SUMMARIZE',
      icon: 'Book',
      items: [
        {
          label: 'Tracking Summary Database',
          href: '/tracking-summary',
          icon: 'BookIcon',
        },
      ],
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
    {
      title: 'PRODUCT HUB',
      icon: 'Package',
      items: [
        { label: 'Katalog Produk', href: '/katalog-produk', icon: 'ShoppingBag' },
        { label: 'Dokumen Produk', href: '/produk', icon: 'FileText' },
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
    {
      title: 'KONTRAK',
      icon: 'FileSignature',
      items: [
        {
          label: 'Tambah Kontrak',
          href: '/kontrak',
          icon: 'FilePlus',
        },
        {
          label: 'Dokumentasi Project',
          href: '/dokumentasi-project',
          icon: 'FileText',
        },
      ],
    },
    {
      title: 'FINANCE',
      icon: 'Banknote',
      items: [
        {
          label: 'Data Project',
          href: '/data-project',
          icon: 'FolderKanban',
        },
      ],
    },
    {
      title: 'PRODUCT HUB',
      icon: 'Package',
      items: [
        { label: 'Katalog Produk', href: '/katalog-produk', icon: 'ShoppingBag' },
        { label: 'Kelola Katalog', href: '/katalog-produk/kelola', icon: 'SlidersHorizontal' },
        { label: 'Tambah Produk', href: '/katalog-produk/tambah', icon: 'PlusSquare' },
        { label: 'Dokumen Produk', href: '/produk', icon: 'FileText' },
      ],
    },
  ],

  LEADER: [
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
      title: 'MONITORING',
      icon: 'Activity',
      items: [
        {
          label: 'Instansi No Phone',
          href: '/monitoring-leader',
          icon: 'Phone',
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
    {
      title: 'KONTRAK',
      icon: 'FileSignature',
      items: [
        {
          label: 'Dokumentasi Project',
          href: '/dokumentasi-project',
          icon: 'FileText',
        },
      ],
    },
    {
      title: 'PRODUCT HUB',
      icon: 'Package',
      items: [
        { label: 'Katalog Produk', href: '/katalog-produk', icon: 'ShoppingBag' },
        { label: 'Dokumen Produk', href: '/produk', icon: 'FileText' },
      ],
    },
  ],

  SALES: [
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
      title: 'KONTRAK',
      icon: 'FileSignature',
      items: [
        {
          label: 'Dokumentasi Project',
          href: '/dokumentasi-project',
          icon: 'FileText',
        },
      ],
    },
    {
      title: 'PRODUCT HUB',
      icon: 'Package',
      items: [
        { label: 'Katalog Produk', href: '/katalog-produk', icon: 'ShoppingBag' },
        { label: 'Dokumen Produk', href: '/produk', icon: 'FileText' },
      ],
    },
  ],

  'ADMIN SALES': [
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
      title: 'KONTRAK',
      icon: 'FileSignature',
      items: [
        {
          label: 'Dokumentasi Project',
          href: '/dokumentasi-project',
          icon: 'FileText',
        },
      ],
    },
    {
      title: 'PRODUCT HUB',
      icon: 'Package',
      items: [
        { label: 'Katalog Produk', href: '/katalog-produk', icon: 'ShoppingBag' },
        { label: 'Dokumen Produk', href: '/produk', icon: 'FileText' },
      ],
    },
  ],
}

export function getMenuByRole(role: Role): MenuSection[] {
  return MENUS_BY_ROLE[role] ?? []
}
