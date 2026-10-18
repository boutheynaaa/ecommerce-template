
export const storeDefaults = {
  name: "My Store",
  tagline: "Everything you need, in one place.",
  logoUrl: null as string | null,
  contact: {
    email: "",
    phone: "",
    address: "",
  },
  language: "ar" as "ar" | "fr",
  currency: "DZD" as const,
  theme: {
    primaryColor: "#2563EB",
    secondaryColor: "#F3F4F6",
    accentColor: "#F59E0B",
    font: "Cairo" as "Cairo" | "Tajawal" | "Inter",
  },
  features: {
    coupons: true,
    reviews: false,
    wishlist: false,
  },
} as const;
