import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Section, SectionHeader } from "@/components/shared/Section";
import { Card, CardContent } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Shield, Award, MapPin, Star, ArrowRight, Ruler, Calendar, Eye } from "lucide-react";

const featuredMaterials = [
  { name: "Granite", desc: "Timeless durability with natural beauty", img: null },
  { name: "Quartz", desc: "Engineered elegance with low maintenance", img: null },
  { name: "Marble", desc: "Classic luxury for refined spaces", img: null },
];

const processSteps = [
  { icon: Eye, title: "Browse & Select", desc: "Explore our curated collection of premium stone slabs" },
  { icon: Ruler, title: "Get Your Estimate", desc: "Receive an estimated investment range — no commitment required" },
  { icon: Calendar, title: "Schedule Consultation", desc: "Book a free in-home measurement with our experts" },
  { icon: Shield, title: "Relax & Enjoy", desc: "Professional fabrication and installation, fully insured" },
];

const faqs = [
  { q: "What areas do you serve?", a: "We proudly serve the greater Sarasota, FL area including Bradenton, Venice, Siesta Key, Longboat Key, and surrounding communities." },
  { q: "How long does a typical project take?", a: "Most countertop projects are completed within 2-3 weeks from measurement to installation, depending on material availability and project complexity." },
  { q: "Do you offer warranties?", a: "Yes — all our installations come with a comprehensive warranty covering fabrication and installation workmanship." },
  { q: "Can I reserve a specific slab?", a: "Absolutely. You can reserve any available slab with a refundable deposit to hold it while you finalize your project details." },
  { q: "What is an 'Estimated Investment Range'?", a: "We provide a transparent range based on your project dimensions and material selection. Final pricing is confirmed after an in-home measurement to account for exact specifications." },
];

const Index = () => {
  return (
    <>
      {/* Hero */}
      <section className="relative bg-primary text-primary-foreground overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary via-primary to-stone-dark opacity-90" />
        <div className="container relative py-24 md:py-36 lg:py-44">
          <div className="max-w-2xl">
            <p className="text-accent font-medium text-sm uppercase tracking-widest mb-4">Premium Countertops · Sarasota, FL</p>
            <h1 className="font-display text-4xl md:text-5xl lg:text-6xl font-bold leading-tight mb-6">
              Transform Your Space with Natural Stone
            </h1>
            <p className="text-primary-foreground/75 text-lg md:text-xl mb-8 max-w-lg">
              Hand-selected granite, quartz, and marble — expertly fabricated and installed by licensed professionals.
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <Button asChild size="lg" className="bg-accent text-accent-foreground hover:bg-accent/90 text-base">
                <Link to="/quote">Get Your Estimate <ArrowRight className="ml-1 h-4 w-4" /></Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="border-primary-foreground/20 text-primary-foreground hover:bg-primary-foreground/10">
                <Link to="/slabs">Browse Slabs</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Materials */}
      <Section>
        <SectionHeader title="Our Materials" subtitle="Choose from the finest natural and engineered stone for your project" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {featuredMaterials.map((mat) => (
            <Card key={mat.name} className="group border-0 shadow-sm hover:shadow-md transition-all overflow-hidden">
              <div className="aspect-[4/3] bg-secondary flex items-center justify-center">
                <span className="text-muted-foreground font-display text-2xl">{mat.name}</span>
              </div>
              <CardContent className="p-5">
                <h3 className="font-display text-lg font-semibold">{mat.name}</h3>
                <p className="text-sm text-muted-foreground mt-1">{mat.desc}</p>
                <Link to="/materials" className="text-accent text-sm font-medium mt-3 inline-flex items-center gap-1 hover:gap-2 transition-all">
                  Explore <ArrowRight className="h-3 w-3" />
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>
      </Section>

      {/* Process */}
      <Section className="bg-secondary/50">
        <SectionHeader title="How It Works" subtitle="From selection to installation, we make it effortless" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {processSteps.map((step, i) => (
            <div key={step.title} className="text-center">
              <div className="w-14 h-14 rounded-full bg-accent/10 flex items-center justify-center mx-auto mb-4">
                <step.icon className="h-6 w-6 text-accent" />
              </div>
              <p className="text-xs text-accent font-semibold mb-1">Step {i + 1}</p>
              <h3 className="font-display text-lg font-semibold mb-2">{step.title}</h3>
              <p className="text-sm text-muted-foreground">{step.desc}</p>
            </div>
          ))}
        </div>
      </Section>

      {/* Trust */}
      <Section>
        <SectionHeader title="Why Altar Stones" subtitle="Your project deserves the best in craftsmanship and service" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="text-center p-6">
            <Shield className="h-10 w-10 text-accent mx-auto mb-4" />
            <h3 className="font-display text-lg font-semibold mb-2">Licensed & Insured</h3>
            <p className="text-sm text-muted-foreground">Fully licensed Florida contractor with comprehensive liability and workers' comp coverage.</p>
          </div>
          <div className="text-center p-6">
            <Star className="h-10 w-10 text-accent mx-auto mb-4" />
            <h3 className="font-display text-lg font-semibold mb-2">5-Star Reviews</h3>
            <p className="text-sm text-muted-foreground">Consistently rated 5 stars by homeowners throughout the Sarasota area.</p>
          </div>
          <div className="text-center p-6">
            <MapPin className="h-10 w-10 text-accent mx-auto mb-4" />
            <h3 className="font-display text-lg font-semibold mb-2">Local Experts</h3>
            <p className="text-sm text-muted-foreground">Proudly serving Sarasota, Bradenton, Venice, and surrounding communities.</p>
          </div>
        </div>
      </Section>

      {/* Testimonials placeholder */}
      <Section className="bg-primary text-primary-foreground">
        <SectionHeader title="What Our Clients Say" className="[&_h2]:text-primary-foreground [&_p]:text-primary-foreground/60" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {["Amazing quality and service. Our kitchen looks incredible!", "Professional from start to finish. Highly recommend.", "The slab selection process was so easy. Love our new countertops!"].map((review, i) => (
            <Card key={i} className="bg-primary-foreground/5 border-primary-foreground/10">
              <CardContent className="p-6">
                <div className="flex gap-1 mb-3">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <Star key={s} className="h-4 w-4 fill-accent text-accent" />
                  ))}
                </div>
                <p className="text-primary-foreground/80 text-sm italic">"{review}"</p>
                <p className="text-primary-foreground/50 text-xs mt-3">— Satisfied Homeowner</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </Section>

      {/* FAQ */}
      <Section>
        <SectionHeader title="Frequently Asked Questions" subtitle="Everything you need to know about your countertop project" />
        <div className="max-w-2xl mx-auto">
          <Accordion type="single" collapsible>
            {faqs.map((faq, i) => (
              <AccordionItem key={i} value={`faq-${i}`}>
                <AccordionTrigger className="text-left font-display">{faq.q}</AccordionTrigger>
                <AccordionContent className="text-muted-foreground">{faq.a}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </Section>

      {/* CTA */}
      <Section className="bg-accent/5">
        <div className="text-center max-w-xl mx-auto">
          <h2 className="font-display text-3xl md:text-4xl font-semibold mb-4">Ready to Get Started?</h2>
          <p className="text-muted-foreground mb-6">Get your estimated investment range in minutes — or schedule a free in-home consultation.</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button asChild size="lg" className="bg-accent text-accent-foreground hover:bg-accent/90">
              <Link to="/quote">Get Your Estimate</Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link to="/book">Book Consultation</Link>
            </Button>
          </div>
        </div>
      </Section>
    </>
  );
};

export default Index;
