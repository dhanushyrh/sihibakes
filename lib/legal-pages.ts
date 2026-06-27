import { BRAND } from "@/lib/constants";
import { formatDisplayPhone } from "@/lib/storefront";
import type { StorefrontDetails } from "@/lib/storefront";

export type LegalPageSlug =
  | "terms"
  | "privacy"
  | "refunds"
  | "delivery-policy"
  | "food-safety";

export type LegalSection = {
  heading: string;
  paragraphs: string[];
};

export type LegalPage = {
  slug: LegalPageSlug;
  title: string;
  shortLabel: string;
  href: string;
  sections: LegalSection[];
};

export const LEGAL_LAST_UPDATED = "27 June 2026";

export const LEGAL_PAGES: LegalPage[] = [
  {
    slug: "terms",
    title: "Terms & Conditions",
    shortLabel: "Terms",
    href: "/orders/terms",
    sections: [],
  },
  {
    slug: "privacy",
    title: "Privacy Policy",
    shortLabel: "Privacy",
    href: "/orders/privacy",
    sections: [],
  },
  {
    slug: "refunds",
    title: "Cancellation & Refund Policy",
    shortLabel: "Refunds",
    href: "/orders/refunds",
    sections: [],
  },
  {
    slug: "delivery-policy",
    title: "Delivery Policy",
    shortLabel: "Delivery",
    href: "/orders/delivery-policy",
    sections: [],
  },
  {
    slug: "food-safety",
    title: "Allergen & Food Safety",
    shortLabel: "Food Safety",
    href: "/orders/food-safety",
    sections: [],
  },
];

export type LegalContext = {
  businessName: string;
  address: string;
  fssai: string;
  phone: string;
  lastUpdated: string;
};

export function buildLegalContext(store: StorefrontDetails): LegalContext {
  return {
    businessName: BRAND.name,
    address: store.store_address || "Address available on request",
    fssai: store.fssai_license_no || "Not yet published",
    phone: formatDisplayPhone(store.phone) || store.phone,
    lastUpdated: LEGAL_LAST_UPDATED,
  };
}

function termsSections(ctx: LegalContext): LegalSection[] {
  return [
    {
      heading: "1. About us",
      paragraphs: [
        `These Terms & Conditions govern your use of the ${ctx.businessName} website and your purchase of desserts and baked goods from us.`,
        `Business name: ${ctx.businessName}. Address: ${ctx.address}. FSSAI license: ${ctx.fssai}. Contact: ${ctx.phone}.`,
      ],
    },
    {
      heading: "2. Products",
      paragraphs: [
        "Our desserts are freshly prepared, perishable food items. Product images on the website are for illustration; actual appearance may vary slightly.",
        "Availability, daily order limits, and sold-out status may change without notice. We reserve the right to refuse or cancel orders if items are unavailable.",
        "Allergen information is displayed on product pages. You are responsible for checking allergens before ordering. See our Allergen & Food Safety policy for details.",
      ],
    },
    {
      heading: "3. Placing an order",
      paragraphs: [
        "You must provide accurate name, WhatsApp number, email, delivery address, pincode, and map location. Orders require successful phone verification via OTP before payment.",
        "An order is confirmed only after successful payment (or explicit confirmation from us for enquiry-based orders). Prices, delivery fees, and applicable taxes/discounts are shown at checkout.",
        "Coupons are subject to eligibility rules including minimum order value, validity dates, and first-order-only restrictions. We may modify or withdraw offers at any time.",
      ],
    },
    {
      heading: "4. Payments",
      paragraphs: [
        "Online payments are processed securely through Razorpay. We do not store your card, UPI, or banking credentials.",
        "If payment fails or is interrupted, your order may remain unpaid. Contact us with your order number if you believe payment was deducted incorrectly.",
      ],
    },
    {
      heading: "5. Delivery",
      paragraphs: [
        "Delivery is available only within our serviceable area as shown on the map at checkout. Orders outside the delivery fence may be rejected.",
        "You must select an available delivery slot. Slots are estimates, not guaranteed arrival times. See our Delivery Policy for full details.",
      ],
    },
    {
      heading: "6. Cancellations and refunds",
      paragraphs: [
        "Because our products are perishable and often prepared to order, cancellations may not be accepted once preparation has begun.",
        "Refunds are handled as described in our Cancellation & Refund Policy. By placing an order, you agree to those terms.",
      ],
    },
    {
      heading: "7. Enquiries and custom orders",
      paragraphs: [
        "Kitty party, bulk, and general enquiries submitted through the website are requests only until we confirm availability, pricing, and delivery arrangements with you.",
      ],
    },
    {
      heading: "8. Reviews and content",
      paragraphs: [
        "Customer reviews, names, areas, and submitted images may be displayed on our website with your consent. We may moderate or remove content at our discretion.",
      ],
    },
    {
      heading: "9. Limitation of liability",
      paragraphs: [
        "To the extent permitted by law, we are not liable for allergic reactions where allergen information was provided, improper storage after delivery, delays caused by third-party delivery partners, traffic, weather, or incorrect address details provided by you.",
        "Our total liability for any order shall not exceed the amount you paid for that order.",
      ],
    },
    {
      heading: "10. Governing law",
      paragraphs: [
        "These terms are governed by the laws of India. Disputes shall be subject to the courts at Bangalore, Karnataka, unless otherwise required by applicable law.",
        `Last updated: ${ctx.lastUpdated}.`,
      ],
    },
  ];
}

function privacySections(ctx: LegalContext): LegalSection[] {
  return [
    {
      heading: "1. Who we are",
      paragraphs: [
        `${ctx.businessName} ("we", "us") operates this website to sell desserts and accept customer enquiries. This Privacy Policy explains how we collect and use personal data.`,
        `Contact: ${ctx.phone}. Address: ${ctx.address}.`,
      ],
    },
    {
      heading: "2. Data we collect",
      paragraphs: [
        "Identity and contact: name, WhatsApp/phone number, alternate phone, and email address.",
        "Delivery: house/flat, street, landmark, pincode, and map coordinates used to calculate delivery distance and fees.",
        "Orders: cart items, coupons used, order totals, payment status, and Razorpay order/payment identifiers.",
        "Verification: OTP codes and verification status for WhatsApp phone verification at checkout.",
        "Enquiries: event details, messages, and product selections for party or custom orders.",
        "Reviews: name, area, product, rating, quote, and optional image if you submit a review.",
        "Technical: basic logs, session/cart data, and cookies or local storage needed to run the site securely.",
      ],
    },
    {
      heading: "3. How we use your data",
      paragraphs: [
        "To process orders, payments, deliveries, refunds, and customer support.",
        "To send WhatsApp OTPs, order confirmations, and service-related messages.",
        "To prefill checkout details for returning customers (based on verified phone number).",
        "To manage coupons, inventory, analytics, and internal business operations.",
        "To respond to enquiries and display customer reviews on our website.",
        "For security, fraud prevention, and legal compliance.",
      ],
    },
    {
      heading: "4. Legal basis and consent",
      paragraphs: [
        "We process your data to fulfil orders and enquiries you request, and with your consent where required (for example, marketing messages or displaying reviews).",
        "You may withdraw consent for non-essential processing by contacting us, though this may limit our ability to serve you.",
      ],
    },
    {
      heading: "5. Sharing with third parties",
      paragraphs: [
        "We share data only as needed to operate our service:",
        "Razorpay — payment processing.",
        "Supabase and our hosting provider — database and application hosting.",
        "WhatsApp / messaging provider — OTP and order notifications.",
        "Delivery partners — fulfilment of deliveries when applicable.",
        "We do not sell your personal data. We may disclose information if required by law or to protect our rights.",
      ],
    },
    {
      heading: "6. Retention",
      paragraphs: [
        "We retain order and customer records as needed for business operations, accounting, and legal obligations. OTP verification data is kept only as long as necessary for security.",
      ],
    },
    {
      heading: "7. Your rights",
      paragraphs: [
        "Under applicable Indian law, including the Digital Personal Data Protection Act, 2023, you may request access to, correction of, or deletion of your personal data, subject to legal and operational requirements.",
        `To exercise your rights or raise a grievance, contact us at ${ctx.phone}. We will respond within a reasonable timeframe.`,
      ],
    },
    {
      heading: "8. Security",
      paragraphs: [
        "We use industry-standard measures to protect your data. No online system is completely secure; please use strong practices when sharing information with us.",
        `Last updated: ${ctx.lastUpdated}.`,
      ],
    },
  ];
}

function refundsSections(ctx: LegalContext): LegalSection[] {
  return [
    {
      heading: "1. Overview",
      paragraphs: [
        `${ctx.businessName} prepares fresh, perishable desserts. This policy explains when cancellations and refunds apply.`,
      ],
    },
    {
      heading: "2. Customer-initiated cancellation",
      paragraphs: [
        "You may request cancellation before we begin preparing your order by contacting us on WhatsApp or phone as soon as possible.",
        "Once an order is confirmed and preparation has started, cancellation may not be possible and no refund will be issued.",
        "If you selected an incorrect address, delivery slot, or items, contact us immediately. We will try to help but cannot guarantee changes after confirmation.",
      ],
    },
    {
      heading: "3. Shop-initiated cancellation",
      paragraphs: [
        "We may cancel orders due to item unavailability, delivery area restrictions, store closure, or operational issues. In such cases, a full refund will be issued for any amount paid.",
      ],
    },
    {
      heading: "4. Refund eligibility",
      paragraphs: [
        "Refunds may be issued for: failed or duplicate payments, shop-side cancellations, unavailable products after payment, or approved customer cancellations before preparation.",
        "Refunds are generally not issued if: preparation has begun, you provided an incorrect or incomplete address, you were unreachable at delivery time, or you refused delivery without a valid reason.",
      ],
    },
    {
      heading: "5. Refund process and timeline",
      paragraphs: [
        "Approved refunds are processed back to the original payment method via Razorpay where possible.",
        "Refunds typically reflect within 5–10 business days depending on your bank or payment provider.",
        "For refund status, contact us with your order number and registered phone number.",
      ],
    },
    {
      heading: "6. Partial refunds",
      paragraphs: [
        "If only part of an order cannot be fulfilled, we may offer a partial refund or replacement at our discretion.",
        `For questions, reach us at ${ctx.phone}. Last updated: ${ctx.lastUpdated}.`,
      ],
    },
  ];
}

function deliveryPolicySections(ctx: LegalContext): LegalSection[] {
  return [
    {
      heading: "1. Service area",
      paragraphs: [
        "We deliver within a defined service area around our kitchen. Your delivery location must fall within our map fence at checkout.",
        "If your pin is outside the serviceable zone, you will not be able to complete checkout for delivery.",
      ],
    },
    {
      heading: "2. Delivery slots",
      paragraphs: [
        "You must choose an available delivery date and time window. Slots may have capacity limits and booking lead times.",
        "Delivery is typically available for today and the next few days, subject to store hours and closed dates.",
        "Selected slots are estimated windows, not guaranteed exact arrival times.",
      ],
    },
    {
      heading: "3. Delivery fees",
      paragraphs: [
        "Delivery fees are calculated based on distance from our kitchen and shown before you pay. Coupons may reduce or waive delivery charges where applicable.",
      ],
    },
    {
      heading: "4. Address and contact",
      paragraphs: [
        "Provide complete and accurate address details including house/flat number, street, landmark, and pincode. Pin your exact location on the map.",
        "Keep your WhatsApp/phone reachable during the delivery window. An alternate contact number is recommended.",
        "If we or our delivery partner cannot reach you, delivery may be delayed or cancelled without refund.",
      ],
    },
    {
      heading: "5. Delays and force majeure",
      paragraphs: [
        "Delays may occur due to traffic, weather, high order volume, rider availability, or events beyond our control. We will make reasonable efforts to deliver within your slot.",
      ],
    },
    {
      heading: "6. Receipt and storage",
      paragraphs: [
        "Inspect your order upon receipt. Desserts are perishable — refrigerate as needed and consume within the recommended timeframe.",
        `Questions about delivery? Contact ${ctx.phone}. Last updated: ${ctx.lastUpdated}.`,
      ],
    },
  ];
}

function foodSafetySections(ctx: LegalContext): LegalSection[] {
  return [
    {
      heading: "1. Fresh, perishable products",
      paragraphs: [
        `${ctx.businessName} prepares desserts fresh for order. Our products are best consumed soon after delivery and should be stored as directed.`,
      ],
    },
    {
      heading: "2. Allergen information",
      paragraphs: [
        "Products may contain or come into contact with common allergens including egg, dairy, gluten, nuts, and soy. Allergen flags are shown on product pages.",
        "Our kitchen handles multiple ingredients. While we take care to label allergens accurately, cross-contact may occur. If you have a severe allergy, contact us before ordering.",
      ],
    },
    {
      heading: "3. Your responsibility",
      paragraphs: [
        "Please review allergen information and product descriptions before placing an order. Inform us of serious allergies or dietary requirements when enquiring about custom orders.",
        "We are not responsible for reactions if allergen information was provided and you did not review it, or if products are improperly stored after delivery.",
      ],
    },
    {
      heading: "4. FSSAI compliance",
      paragraphs: [
        `We operate under applicable food safety regulations. FSSAI license: ${ctx.fssai}.`,
        "If you have concerns about food safety or quality, contact us promptly with your order details.",
        `Contact: ${ctx.phone}. Last updated: ${ctx.lastUpdated}.`,
      ],
    },
  ];
}

const SECTION_BUILDERS: Record<
  LegalPageSlug,
  (ctx: LegalContext) => LegalSection[]
> = {
  terms: termsSections,
  privacy: privacySections,
  refunds: refundsSections,
  "delivery-policy": deliveryPolicySections,
  "food-safety": foodSafetySections,
};

export function getLegalPage(
  slug: LegalPageSlug,
  store: StorefrontDetails
): LegalPage & { sections: LegalSection[] } {
  const meta = LEGAL_PAGES.find((p) => p.slug === slug);
  if (!meta) throw new Error(`Unknown legal page: ${slug}`);
  const ctx = buildLegalContext(store);
  return {
    ...meta,
    sections: SECTION_BUILDERS[slug](ctx),
  };
}
