import { useParams } from "react-router-dom";
import { Section } from "@/components/shared/Section";
import { Separator } from "@/components/ui/separator";

const legalContent: Record<string, { title: string; content: string }> = {
  terms: {
    title: "Terms of Service",
    content: `These Terms of Service ("Terms") govern your use of the Altar Stones Countertops website and services. By accessing our website, requesting an estimate, or engaging our services, you agree to be bound by these Terms. If you do not agree, please do not use our services.

**Company Information**
Altar Stones Countertops is a countertop fabrication and installation company operating in the State of Florida. All services are provided subject to these Terms and any written contract executed between you and Altar Stones Countertops.

**Scope of Services**
We provide countertop measurement, fabrication, and installation services for residential and commercial properties in our designated service areas within Florida. All online estimates are approximate investment ranges based on the information you provide and are subject to change based on final in-home measurements, material selection, and project specifications.

**Deposit & Reservation Policy**
• A minimum deposit of 20% of the estimated project total is required to reserve a slab and secure your place in our fabrication schedule.
• You have 48 hours from the time of deposit to request a full refund for any reason.
• Slab reservations are held for 7 calendar days from the date the deposit is received. If the project does not proceed within that period, the reservation may be released and the deposit forfeited.
• Your deposit is applied in full toward the final project invoice. The remaining balance is due upon completion of installation.
• Once fabrication has commenced, deposits are non-refundable.

**Payment Terms**
Final payment is due upon completion of installation unless otherwise agreed upon in writing. We accept major credit cards, checks, and bank transfers. A 1.5% monthly finance charge may apply to overdue balances.

**Project Changes & Delays**
Any changes requested after fabrication has begun may result in additional charges and extended timelines. Altar Stones Countertops is not liable for delays caused by material availability, supplier issues, or circumstances beyond our reasonable control.

**Intellectual Property**
All content on our website—including text, images, graphics, and logos—is the property of Altar Stones Countertops and may not be reproduced without written permission.

**Dispute Resolution**
Any disputes arising from these Terms shall be resolved through mediation in Sarasota County, Florida, prior to any legal action. These Terms are governed by the laws of the State of Florida.

**Contact**
For questions about these Terms, contact us at info@altarstones.com.`,
  },
  privacy: {
    title: "Privacy Policy",
    content: `This Privacy Policy describes how Altar Stones Countertops ("we," "us," or "our") collects, uses, and protects your personal information when you visit our website or use our services.

**Information We Collect**
• Personal identifiers: name, email address, phone number, and mailing address.
• Project details: measurements, material preferences, photos, and layout information you submit for estimates.
• Account data: login credentials and communication preferences if you create an account.
• Usage data: pages visited, time spent on site, browser type, device information, and referring URLs collected automatically through cookies and analytics tools.

**How We Use Your Information**
• To provide quotes, schedule consultations, and manage your project from estimate through installation.
• To communicate with you about your project status, appointment confirmations, and service updates.
• To improve our website, services, and customer experience.
• To comply with legal obligations and protect our rights.
We do not sell, rent, or trade your personal information to third parties.

**Third-Party Services**
We may share limited information with trusted service providers who assist us in operating our website, processing payments, or delivering services. These providers are contractually obligated to protect your information.

**Data Security**
We implement industry-standard security measures including encryption, secure servers, and access controls to protect your personal data. However, no method of electronic transmission or storage is 100% secure.

**Data Retention**
We retain your personal information for as long as necessary to fulfill the purposes outlined in this policy, or as required by law. Project records are maintained for a minimum of 5 years for warranty and legal purposes.

**Your Rights**
You have the right to:
• Access the personal data we hold about you.
• Request correction of inaccurate information.
• Request deletion of your data, subject to legal retention requirements.
• Opt out of marketing communications at any time.

**Children's Privacy**
Our services are not directed at individuals under 18 years of age. We do not knowingly collect personal information from children.

**Changes to This Policy**
We may update this Privacy Policy from time to time. Changes will be posted on this page with an updated revision date.

**Contact**
For privacy inquiries, contact us at privacy@altarstones.com.`,
  },
  warranty: {
    title: "Warranty & Disclaimers",
    content: `Altar Stones Countertops stands behind the quality of our work. This page outlines our warranty coverage and important disclaimers regarding natural stone and fabrication.

**Installation Warranty**
We provide a comprehensive warranty on all fabrication and installation workmanship. If any issue arises due to our workmanship within the warranty period, we will repair or replace the affected area at no additional charge.

**Material Warranty**
Natural and engineered stone materials carry manufacturer warranties that vary by brand and product. We will assist you with any manufacturer warranty claims.

**What's Covered**
• Fabrication defects attributable to our workmanship.
• Installation issues including improper leveling, inadequate support, or faulty adhesion.
• Seam separation caused by workmanship errors.
• Structural failures resulting from fabrication or installation.

**What's Not Covered**
• Normal wear and tear, including minor surface scratching.
• Damage from misuse, abuse, or impact (chips, cracks from dropped objects).
• Staining resulting from improper sealing maintenance or exposure to harsh chemicals.
• Modifications, repairs, or alterations performed by third parties.
• Damage caused by structural movement, settling, or plumbing/appliance failures.

**Natural Stone Variation Disclaimer**
Natural stone is a product of nature. Every slab is unique. Variations in color, veining, pattern, mineral deposits, and surface texture—including natural pitting, fissures, and crystalline formations—are inherent characteristics, not defects. Showroom samples, digital images, and small swatches represent general appearance only and cannot guarantee an exact match to the installed material. By selecting a natural stone product, you acknowledge and accept these natural variations.

**Fabrication Disclaimer**
Countertop fabrication involves precision cutting and finishing of stone slabs. Please be aware:
• Seams may be necessary depending on your layout, slab size, and design. Our fabricators will place seams in the least conspicuous locations possible, but seams are a normal part of countertop installation and may be visible.
• Existing conditions in your home—including out-of-level cabinets, walls, or floors—may affect the final fit and appearance. Minor shimming, scribing, or caulking may be required.
• Edge profiles are fabricated to industry standards. Slight variations in hand-finished edges are normal.
• Cutouts for sinks, cooktops, and faucets are fabricated based on manufacturer templates. Proper templates must be provided or available prior to fabrication.

**Limitation of Liability**
To the fullest extent permitted by Florida law, Altar Stones Countertops' total liability for any claim arising from our services—whether in contract, tort, or otherwise—shall not exceed the total amount paid by the customer under the applicable project contract. We are not liable for indirect, incidental, consequential, or punitive damages, including but not limited to loss of use, lost profits, or damage to other property.

**How to File a Warranty Claim**
Contact us with photographs and a written description of the issue. We will schedule an on-site inspection within 5 business days of receiving your claim.

**Contact**
warranty@altarstones.com`,
  },
  deposit: {
    title: "Deposit Policy",
    content: `This Deposit Policy outlines the terms governing deposits paid to Altar Stones Countertops for slab reservations and project commitments.

**Deposit Amount**
A minimum deposit of 20% of the estimated project total is required to reserve your selected slab and secure your position in our fabrication schedule. The exact deposit amount will be confirmed at the time of your reservation.

**48-Hour Refund Window**
You may cancel your reservation and receive a full deposit refund within 48 hours of payment, for any reason, no questions asked. Refund requests must be submitted in writing via email to info@altarstones.com.

**7-Day Slab Hold**
Your deposit secures a hold on your selected slab for 7 calendar days. During this period, the slab is removed from public availability and reserved exclusively for your project. If the project does not move forward within the 7-day hold period, the reservation may be released and the deposit forfeited unless an extension has been agreed upon in writing.

**Deposit Applied to Invoice**
Your deposit is credited in full toward your final project invoice. The remaining balance is due upon satisfactory completion of installation.

**Non-Refundable After Fabrication**
Once fabrication of your countertops has commenced, the deposit becomes non-refundable, as materials have been cut to your specific project dimensions and cannot be reused.

**Extensions & Special Circumstances**
If you need additional time beyond the 7-day hold period, please contact us. Extensions may be granted on a case-by-case basis at our discretion, and may require an additional deposit.

**Contact**
For questions about your deposit or reservation status, email info@altarstones.com.`,
  },
};

const parseContent = (text: string) => {
  return text.split("\n").map((line, i) => {
    // Parse **bold** markers into <strong> elements
    const parts = line.split(/\*\*(.*?)\*\*/g);
    const rendered = parts.map((part, j) =>
      j % 2 === 1 ? <strong key={j} className="font-semibold text-foreground">{part}</strong> : part
    );
    return (
      <span key={i}>
        {rendered}
        {"\n"}
      </span>
    );
  });
};

const Legal = () => {
  const { type } = useParams<{ type: string }>();
  const page = legalContent[type || "terms"];

  if (!page) {
    return (
      <Section>
        <p className="text-center text-muted-foreground">Page not found.</p>
      </Section>
    );
  }

  return (
    <Section>
      <div className="max-w-2xl mx-auto">
        <h1 className="font-display text-3xl font-bold mb-2">{page.title}</h1>
        <p className="text-sm text-muted-foreground mb-6">Last updated: March 2026</p>
        <Separator className="mb-6" />
        <div className="prose prose-sm max-w-none text-muted-foreground whitespace-pre-line leading-relaxed">
          {parseContent(page.content)}
        </div>
      </div>
    </Section>
  );
};

export default Legal;
