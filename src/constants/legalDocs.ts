/**
 * The legal text shown in-app at sign-up.
 *
 * Bundled rather than fetched: this is read at the moment of consent, and a
 * network failure must never be the reason someone agrees to terms they could
 * not see. It is a summary of the authoritative documents on bhojanqr.com,
 * and says so - the website versions remain the binding ones, and Razorpay
 * reviews those URLs.
 *
 * KEEP IN STEP with client/src/pages/{TermsPage,PrivacyPage,RefundPolicyPage}.
 * If the platform fee changes, PricingPage.jsx and this file both need it.
 */
export const PLATFORM_FEE_PERCENT = 1;

export type LegalDocId = "terms" | "privacy" | "refund";

interface LegalSection {
  heading: string;
  paragraphs: string[];
}

interface LegalDoc {
  title: string;
  updated: string;
  sections: LegalSection[];
}

const UPDATED = "16 August 2026";

export const LEGAL_DOCS: Record<LegalDocId, LegalDoc> = {
  terms: {
    title: "Terms & Conditions",
    updated: UPDATED,
    sections: [
      {
        heading: "What BhojanQR is",
        paragraphs: [
          "BhojanQR provides QR-based ordering and payment technology to restaurants. We supply the software; the restaurant prepares and serves the food and is the seller of it.",
          "By registering a restaurant you confirm you are authorised to enter this agreement on its behalf.",
        ],
      },
      {
        heading: "Your account",
        paragraphs: [
          "Every restaurant account is reviewed before activation. We may decline or suspend an account where the details supplied cannot be verified, where required licences are missing, or where the platform is used unlawfully.",
          "You are responsible for your login credentials and for anything done through your account, including by staff accounts you create.",
        ],
      },
      {
        heading: "Platform fee",
        paragraphs: [
          `A platform fee of ${PLATFORM_FEE_PERCENT}% of the order value is charged on every successful order paid through BhojanQR. All amounts are in Indian Rupees.`,
          "No fee is charged on cancelled orders, failed payments or refunded orders. Where an order is refunded after the fee has been charged, the fee is reversed with it.",
          "Payment gateway charges are levied separately by Razorpay under your own agreement with them and are not retained by BhojanQR. GST applies to the platform fee at the prevailing rate where applicable.",
        ],
      },
      {
        heading: "Menu, prices and taxes",
        paragraphs: [
          "You are responsible for the accuracy of your menu, its prices and its tax treatment, and for honouring the price shown to a customer at the time they order.",
          "You must not list items you are not licensed to sell.",
        ],
      },
      {
        heading: "Payments and settlement",
        paragraphs: [
          "Customer payments are collected by Razorpay and settled to your registered bank account on their standard settlement cycle. BhojanQR does not hold customer funds.",
          "You must keep your bank and KYC details current. Settlement delays caused by incorrect details are outside our control.",
        ],
      },
      {
        heading: "Ending the agreement",
        paragraphs: [
          "You may stop using BhojanQR at any time. There is no lock-in and no exit fee.",
          "We may suspend or end an account for breach of these terms, for unlawful use, or where required by a payment partner or by law.",
        ],
      },
      {
        heading: "Liability",
        paragraphs: [
          "BhojanQR is not liable for the quality, safety or legality of food served by a restaurant, which rests with that restaurant.",
          "We provide the platform on a best-efforts basis and do not guarantee uninterrupted service.",
        ],
      },
      {
        heading: "The full terms",
        paragraphs: [
          "This is a summary for use at sign-up. The complete and binding Terms & Conditions are published at bhojanqr.com/terms-and-conditions.",
        ],
      },
    ],
  },

  privacy: {
    title: "Privacy Policy",
    updated: UPDATED,
    sections: [
      {
        heading: "What we collect",
        paragraphs: [
          "From restaurants: business name, owner name, email, mobile number, addresses, government ID documents supplied for verification, and bank details held by our payment partner.",
          "From customers: the name and table number given when ordering, the order itself, and payment references returned by Razorpay. We never see or store full card numbers, UPI PINs or bank passwords.",
          "Technical data such as device type and app version, used to diagnose faults.",
        ],
      },
      {
        heading: "Why we collect it",
        paragraphs: [
          "To create and verify accounts, to route orders to the correct restaurant and table, to take payment and issue refunds, to provide sales reporting, and to answer support requests.",
          "Government ID documents are used solely to verify that a business is genuine before activating its account.",
        ],
      },
      {
        heading: "Who we share it with",
        paragraphs: [
          "Razorpay, to process payments and refunds.",
          "Cloud hosting and storage providers who run the service on our behalf.",
          "The restaurant you ordered from, which receives your order details and table number so it can serve you.",
          "We do not sell personal data, and we do not share it for advertising.",
        ],
      },
      {
        heading: "How long we keep it",
        paragraphs: [
          "Order and payment records are retained for as long as required by tax and accounting law.",
          "Verification documents are retained for the life of the restaurant account and deleted on request after closure, unless we are required to keep them.",
        ],
      },
      {
        heading: "Your rights",
        paragraphs: [
          "You may ask for a copy of the personal data we hold about you, ask us to correct it, or ask us to delete it where we are not required to keep it. Write to support@bhojanqr.com.",
        ],
      },
      {
        heading: "Security",
        paragraphs: [
          "Data is transmitted over encrypted connections. Passwords are stored hashed, never in readable form. Access to production data is restricted to staff who need it.",
        ],
      },
      {
        heading: "The full policy",
        paragraphs: [
          "This is a summary for use at sign-up. The complete Privacy Policy is published at bhojanqr.com/privacy&policy.",
        ],
      },
    ],
  },

  refund: {
    title: "Refund & Cancellation",
    updated: UPDATED,
    sections: [
      {
        heading: "Cancelling an order",
        paragraphs: [
          'A customer may cancel only while the order is still "Order Received" and the restaurant has not confirmed it. Once preparation begins it cannot be cancelled by the customer.',
          "A restaurant may cancel at any stage. Where a restaurant cancels a paid order, a full refund is initiated.",
        ],
      },
      {
        heading: "When a refund is due",
        paragraphs: [
          "In full: where the restaurant cancels a paid order, where payment was taken but no order was created, where a customer was charged twice, or where the items ordered cannot be served.",
          "In part: where some items cannot be served, covering those items only.",
          "No refund is due once food has been prepared and served as ordered.",
        ],
      },
      {
        heading: "Timelines",
        paragraphs: [
          "Approved refunds are initiated within 2 working days.",
          "The amount reaches the original payment method within 5 to 7 working days, depending on the bank or card issuer.",
        ],
      },
      {
        heading: "How refunds are paid",
        paragraphs: [
          "Always to the original payment method, through Razorpay. We do not refund to a different account, and we do not pay cash against an online payment.",
        ],
      },
      {
        heading: "The full policy",
        paragraphs: [
          "This is a summary for use at sign-up. The complete Refund & Cancellation Policy is published at bhojanqr.com/refund-policy.",
        ],
      },
    ],
  },
};
