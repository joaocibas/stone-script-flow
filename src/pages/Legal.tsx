import { useParams } from "react-router-dom";
import { Section } from "@/components/shared/Section";
import { Separator } from "@/components/ui/separator";

const legalContent: Record<string, { title: string; content: string }> = {
  terms: {
    title: "Terms of Service",
    content: `These Terms of Service govern your use of the Altar Stones Countertops website and services. By accessing our website or engaging our services, you agree to these terms.

**Services:** We provide countertop fabrication and installation services in the greater Sarasota, Florida area. All estimates provided online are approximate investment ranges and are subject to change based on final measurements and specifications.

**Deposits & Reservations:** Slab reservations require a deposit. Deposits are applied toward the total project cost. Reservation hold periods are subject to our current business policies.

**Cancellation Policy:** Cancellations made before fabrication begins may be eligible for a deposit refund. Once fabrication has started, deposits are non-refundable.

**Warranty:** All installations are covered by our workmanship warranty. Material warranties are provided by the respective manufacturers.

**Limitation of Liability:** Altar Stones Countertops' liability is limited to the total contract amount for any given project.

For questions, contact us at info@altarstones.com.`,
  },
  privacy: {
    title: "Privacy Policy",
    content: `Your privacy matters to us. This policy explains how Altar Stones Countertops collects, uses, and protects your information.

**Information We Collect:** Name, email, phone, address, and project details when you request estimates, book consultations, or create an account.

**How We Use It:** To provide quotes, schedule appointments, manage orders, and communicate about your project. We never sell your data.

**Data Security:** We use industry-standard security measures to protect your personal information.

**Cookies:** Our website uses cookies to improve your browsing experience and analyze site traffic.

**Your Rights:** You may request access to, correction of, or deletion of your personal data by contacting us.

**Contact:** privacy@altarstones.com`,
  },
  warranty: {
    title: "Warranty Information",
    content: `Altar Stones Countertops stands behind the quality of our work.

**Installation Warranty:** We provide a comprehensive warranty on all fabrication and installation workmanship. If any issue arises due to our workmanship, we will repair or replace the affected area at no charge.

**Material Warranty:** Natural and engineered stone materials carry manufacturer warranties. We will assist you with any manufacturer warranty claims.

**What's Covered:** Fabrication defects, installation issues, seam separation due to workmanship, and structural failures.

**What's Not Covered:** Normal wear and tear, damage from misuse or abuse, staining from improper maintenance, chips or cracks caused by impact, and modifications made by third parties.

**How to File a Claim:** Contact us with photos and a description of the issue. We'll schedule an inspection within 5 business days.

**Contact:** warranty@altarstones.com`,
  },
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
        <div className="prose prose-sm max-w-none text-foreground [&_strong]:font-semibold [&_p]:mb-4 [&_p]:text-muted-foreground whitespace-pre-line">
          {page.content}
        </div>
      </div>
    </Section>
  );
};

export default Legal;
