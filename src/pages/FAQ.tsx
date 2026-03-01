import { Section, SectionHeader } from "@/components/shared/Section";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

const faqCategories = [
  {
    category: "Getting Started",
    items: [
      { q: "How do I get a countertop estimate?", a: "Use our online estimator to receive an investment range based on your project dimensions and material choice. For an exact quote, schedule a free in-home consultation." },
      { q: "What areas do you serve?", a: "We serve the greater Sarasota area including Bradenton, Venice, Siesta Key, Longboat Key, Osprey, Nokomis, and surrounding communities." },
      { q: "Do I need an appointment for a quote?", a: "You can get an initial estimate online anytime. For a precise quote, we recommend scheduling a free measurement consultation." },
    ],
  },
  {
    category: "Materials & Selection",
    items: [
      { q: "What materials do you offer?", a: "We offer granite, quartz, marble, quartzite, soapstone, and other natural and engineered stone options." },
      { q: "Can I see slabs before I buy?", a: "Absolutely. Browse our online slab gallery or visit our showroom by appointment to see slabs in person." },
      { q: "Can I reserve a specific slab?", a: "Yes. Place a refundable deposit to hold any available slab while you finalize your project details." },
    ],
  },
  {
    category: "Pricing & Payment",
    items: [
      { q: "What is an 'Estimated Investment Range'?", a: "We provide a transparent range based on your project dimensions and material. Final pricing is confirmed after an in-home measurement." },
      { q: "What's included in the price?", a: "Our pricing includes material, fabrication, installation, and standard edge profiles. Additional cutouts and premium edges may affect the total." },
      { q: "Do you require a deposit?", a: "Yes, a deposit is required to reserve your slab and schedule fabrication. The deposit is applied to your total." },
    ],
  },
  {
    category: "Installation",
    items: [
      { q: "How long does installation take?", a: "Most installations are completed in a single day. The total project timeline from measurement to installation is typically 2-3 weeks." },
      { q: "Are you licensed and insured?", a: "Yes, we are a fully licensed Florida contractor with comprehensive liability and workers' compensation coverage." },
      { q: "Do you offer a warranty?", a: "All installations include a comprehensive warranty covering fabrication and installation workmanship." },
    ],
  },
];

const FAQ = () => {
  return (
    <Section>
      <SectionHeader title="Frequently Asked Questions" subtitle="Find answers to common questions about our countertop services" />

      <div className="max-w-2xl mx-auto space-y-8">
        {faqCategories.map((cat) => (
          <div key={cat.category}>
            <h3 className="font-display text-lg font-semibold mb-3">{cat.category}</h3>
            <Accordion type="single" collapsible>
              {cat.items.map((item, i) => (
                <AccordionItem key={i} value={`${cat.category}-${i}`}>
                  <AccordionTrigger className="text-left text-sm">{item.q}</AccordionTrigger>
                  <AccordionContent className="text-muted-foreground text-sm">{item.a}</AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        ))}

        <div className="text-center pt-8">
          <p className="text-muted-foreground mb-4">Still have questions?</p>
          <Button asChild className="bg-accent text-accent-foreground hover:bg-accent/90">
            <Link to="/book">Contact Us</Link>
          </Button>
        </div>
      </div>
    </Section>
  );
};

export default FAQ;
