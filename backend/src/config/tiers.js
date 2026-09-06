// Default subscription tiers configuration (Indian Rupee pricing)
const DEFAULT_TIERS = [
  {
    tierKey: 'starter',
    name: 'Starter Plan',
    description: 'Perfect for solo practitioners starting their private practice',
    priceMonthly: 0,
    priceAnnually: 0,
    currency: 'INR',
    caps: {
      activeClients: 10,
      monthlyBookings: 30,
      packagesCount: 1,
    },
    features: {
      noteTemplates: ['standard'],
      analyticsDepth: 'basic', // basic vs advanced
      customBranding: false,
      chatEnabled: true,
      chatAttachments: false,
      automatedReminders: false,
      gstInvoicing: true,
      publicBookingPage: true,
    },
    isDefault: true,
  },
  {
    tierKey: 'professional',
    name: 'Professional Practice',
    description: 'For growing practitioners with active caseloads',
    priceMonthly: 1499,
    priceAnnually: 14990,
    currency: 'INR',
    caps: {
      activeClients: 50,
      monthlyBookings: 150,
      packagesCount: 5,
    },
    features: {
      noteTemplates: ['standard', 'soap', 'dap'],
      analyticsDepth: 'advanced',
      customBranding: true,
      chatEnabled: true,
      chatAttachments: true,
      automatedReminders: true,
      gstInvoicing: true,
      publicBookingPage: true,
    },
    isDefault: false,
  },
  {
    tierKey: 'enterprise',
    name: 'Enterprise / Clinic',
    description: 'Unlimited capacity with VIP practice management controls',
    priceMonthly: 3999,
    priceAnnually: 39990,
    currency: 'INR',
    caps: {
      activeClients: 999999,
      monthlyBookings: 999999,
      packagesCount: 999999,
    },
    features: {
      noteTemplates: ['standard', 'soap', 'dap', 'custom'],
      analyticsDepth: 'advanced',
      customBranding: true,
      chatEnabled: true,
      chatAttachments: true,
      automatedReminders: true,
      gstInvoicing: true,
      publicBookingPage: true,
    },
    isDefault: false,
  }
];

module.exports = { DEFAULT_TIERS };
