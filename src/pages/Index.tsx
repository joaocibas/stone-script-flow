import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Section, SectionHeader } from "@/components/shared/Section";
import { Card, CardContent } from "@/components/ui/card";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  ArrowRight,
  BarChart3,
  Users,
  Package,
  CalendarCheck,
  FileText,
  Shield,
  Star,
  CheckCircle2,
  Zap,
  Lock,
  Globe,
  Phone,
  Mail,
  MapPin,
} from "lucide-react";
import { motion } from "framer-motion";

/* ── animation helpers ── */
const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0 },
};

const staggerContainer = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.12 } },
};

/* ── data ── */
const features = [
  {
    icon: Users,
    title: "CRM Completo",
    desc: "Gerencie leads, clientes e oportunidades em um único lugar. Pipeline visual e automações inteligentes.",
    tag: "CRM",
  },
  {
    icon: Package,
    title: "Controle de Estoque",
    desc: "Inventário em tempo real com rastreamento de lotes, alertas de nível mínimo e integração de fornecedores.",
    tag: "ERP",
  },
  {
    icon: FileText,
    title: "Orçamentos & Pedidos",
    desc: "Crie orçamentos profissionais em segundos. Converta para pedidos com um clique e acompanhe cada etapa.",
    tag: "CRM",
  },
  {
    icon: CalendarCheck,
    title: "Agendamentos",
    desc: "Calendário integrado com disponibilidade em tempo real, confirmações automáticas e lembretes.",
    tag: "ERP",
  },
  {
    icon: BarChart3,
    title: "Analytics & IA",
    desc: "Dashboards com KPIs, análise de funil, previsão de receita e insights gerados por inteligência artificial.",
    tag: "CRM",
  },
  {
    icon: Zap,
    title: "Automações",
    desc: "Fluxos automáticos para follow-up, SLA, expiração de reservas e notificações por e-mail.",
    tag: "ERP",
  },
];

const testimonials = [
  {
    name: "Ricardo Mendes",
    role: "CEO, StoneMax",
    quote:
      "Reduzimos 40% do tempo administrativo. O CRM integrado ao estoque mudou completamente nossa operação.",
    avatar: "RM",
  },
  {
    name: "Camila Ferreira",
    role: "Gerente Comercial, Granitos Premium",
    quote:
      "Os orçamentos automáticos e o pipeline visual nos ajudaram a fechar 3x mais negócios no primeiro trimestre.",
    avatar: "CF",
  },
  {
    name: "André Sousa",
    role: "Proprietário, Mármores & Cia",
    quote:
      "Finalmente um sistema que entende o fluxo de marmoraria. Do orçamento à instalação, tudo num só lugar.",
    avatar: "AS",
  },
];

const plans = [
  {
    name: "Basic",
    price: "R$ 197",
    period: "/mês",
    desc: "Ideal para operações pequenas que precisam organizar o básico.",
    features: [
      "Até 100 clientes",
      "Orçamentos ilimitados",
      "Controle de estoque básico",
      "1 usuário",
      "Suporte por e-mail",
    ],
    cta: "Começar Grátis",
    highlight: false,
  },
  {
    name: "Pro",
    price: "R$ 497",
    period: "/mês",
    desc: "Para marmorarias em crescimento que querem escalar com inteligência.",
    features: [
      "Clientes ilimitados",
      "CRM completo + pipeline",
      "Analytics & relatórios",
      "Agendamento integrado",
      "Até 5 usuários",
      "IA para análise de leads",
      "Suporte prioritário",
    ],
    cta: "Teste 14 Dias Grátis",
    highlight: true,
  },
  {
    name: "Enterprise",
    price: "Sob Consulta",
    period: "",
    desc: "Solução completa para operações com múltiplas unidades.",
    features: [
      "Tudo do Pro",
      "Usuários ilimitados",
      "Multi-filial",
      "API & integrações",
      "Onboarding dedicado",
      "SLA garantido",
      "Suporte 24/7",
    ],
    cta: "Falar com Vendas",
    highlight: false,
  },
];

const faqs = [
  {
    q: "Preciso instalar algum software?",
    a: "Não. A plataforma é 100% web e funciona em qualquer navegador. Também oferecemos acesso otimizado para dispositivos móveis.",
  },
  {
    q: "Posso importar meus dados existentes?",
    a: "Sim! Oferecemos ferramentas de importação para clientes, produtos e histórico de pedidos via planilha CSV ou integração direta.",
  },
  {
    q: "Como funciona o período de teste?",
    a: "Você tem 14 dias para testar todas as funcionalidades do plano Pro sem precisar de cartão de crédito. Cancele a qualquer momento.",
  },
  {
    q: "O sistema é seguro?",
    a: "Absolutamente. Utilizamos criptografia de ponta a ponta, backups automáticos e infraestrutura em nuvem com certificação SOC 2.",
  },
  {
    q: "Consigo gerar relatórios financeiros?",
    a: "Sim. O módulo de Analytics oferece dashboards de receita, margem por material, funil de conversão e tendências mensais.",
  },
  {
    q: "Vocês oferecem treinamento?",
    a: "Todos os planos incluem acesso à base de conhecimento. Planos Pro e Enterprise contam com sessões de onboarding ao vivo.",
  },
];

/* ── page ── */
const Index = () => {
  return (
    <>
      {/* ═══════════════ HERO ═══════════════ */}
      <section className="relative bg-primary text-primary-foreground overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary via-primary to-stone-dark opacity-90" />
        {/* subtle decorative circles */}
        <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full bg-accent/10 blur-3xl" />
        <div className="absolute bottom-0 left-0 w-72 h-72 rounded-full bg-accent/5 blur-2xl" />

        <div className="container relative py-28 md:py-40 lg:py-48">
          <motion.div
            className="max-w-2xl"
            initial="hidden"
            animate="visible"
            variants={staggerContainer}
          >
            <motion.p
              variants={fadeUp}
              className="text-accent font-semibold text-sm uppercase tracking-widest mb-4"
            >
              CRM & ERP para Marmorarias
            </motion.p>
            <motion.h1
              variants={fadeUp}
              className="font-display text-4xl md:text-5xl lg:text-6xl font-bold leading-tight mb-6"
            >
              Gerencie sua marmoraria do{" "}
              <span className="text-accent">orçamento à instalação</span>
            </motion.h1>
            <motion.p
              variants={fadeUp}
              className="text-primary-foreground/75 text-lg md:text-xl mb-8 max-w-lg"
            >
              Estoque, clientes, orçamentos, agendamentos e analytics —
              tudo integrado em uma plataforma inteligente feita para o seu
              negócio.
            </motion.p>
            <motion.div
              variants={fadeUp}
              className="flex flex-col sm:flex-row gap-3"
            >
              <Button
                asChild
                size="lg"
                className="bg-accent text-accent-foreground hover:bg-accent/90 text-base"
              >
                <Link to="/login">
                  Começar Agora <ArrowRight className="ml-1 h-4 w-4" />
                </Link>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="border-primary-foreground/20 text-foreground hover:bg-primary-foreground/10"
              >
                <a href="#pricing">Ver Planos</a>
              </Button>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* ═══════════════ FEATURES ═══════════════ */}
      <Section id="features">
        <SectionHeader
          title="Tudo que sua marmoraria precisa"
          subtitle="CRM e ERP integrados em uma única plataforma — sem complicação, sem planilhas."
        />
        <motion.div
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-80px" }}
        >
          {features.map((f) => (
            <motion.div key={f.title} variants={fadeUp}>
              <Card className="h-full border-0 shadow-sm hover:shadow-md transition-shadow group">
                <CardContent className="p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center group-hover:bg-accent/20 transition-colors">
                      <f.icon className="h-5 w-5 text-accent" />
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-accent bg-accent/10 px-2 py-0.5 rounded-full">
                      {f.tag}
                    </span>
                  </div>
                  <h3 className="font-display text-lg font-semibold mb-2">
                    {f.title}
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {f.desc}
                  </p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </motion.div>
      </Section>

      {/* ═══════════════ SOCIAL PROOF / NUMBERS ═══════════════ */}
      <Section className="bg-secondary/50">
        <motion.div
          className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center"
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-60px" }}
        >
          {[
            { value: "500+", label: "Marmorarias" },
            { value: "50k+", label: "Orçamentos Gerados" },
            { value: "99.9%", label: "Uptime" },
            { value: "4.9★", label: "Avaliação Média" },
          ].map((stat) => (
            <motion.div key={stat.label} variants={fadeUp}>
              <p className="font-display text-3xl md:text-4xl font-bold text-accent">
                {stat.value}
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                {stat.label}
              </p>
            </motion.div>
          ))}
        </motion.div>
      </Section>

      {/* ═══════════════ TESTIMONIALS ═══════════════ */}
      <Section>
        <SectionHeader
          title="O que nossos clientes dizem"
          subtitle="Marmorarias de todo o Brasil já transformaram suas operações"
        />
        <motion.div
          className="grid grid-cols-1 md:grid-cols-3 gap-6"
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-80px" }}
        >
          {testimonials.map((t) => (
            <motion.div key={t.name} variants={fadeUp}>
              <Card className="h-full border-0 shadow-sm">
                <CardContent className="p-6">
                  <div className="flex gap-1 mb-4">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star
                        key={s}
                        className="h-4 w-4 fill-accent text-accent"
                      />
                    ))}
                  </div>
                  <p className="text-sm text-muted-foreground italic leading-relaxed mb-6">
                    "{t.quote}"
                  </p>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-accent/15 flex items-center justify-center text-accent font-semibold text-sm">
                      {t.avatar}
                    </div>
                    <div>
                      <p className="text-sm font-semibold">{t.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {t.role}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </motion.div>
      </Section>

      {/* ═══════════════ PRICING ═══════════════ */}
      <Section className="bg-primary text-primary-foreground" id="pricing">
        <SectionHeader
          title="Planos & Preços"
          subtitle="Escolha o plano ideal para o tamanho da sua operação"
          className="[&_h2]:text-primary-foreground [&_p]:text-primary-foreground/60"
        />
        <motion.div
          className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto"
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-80px" }}
        >
          {plans.map((plan) => (
            <motion.div key={plan.name} variants={fadeUp}>
              <Card
                className={`h-full flex flex-col ${
                  plan.highlight
                    ? "bg-accent text-accent-foreground ring-2 ring-accent shadow-lg scale-[1.03]"
                    : "bg-primary-foreground/5 border-primary-foreground/10 text-primary-foreground"
                }`}
              >
                <CardContent className="p-6 flex flex-col flex-1">
                  {plan.highlight && (
                    <span className="text-[10px] font-bold uppercase tracking-wider bg-accent-foreground/20 text-accent-foreground self-start px-2 py-0.5 rounded-full mb-3">
                      Mais Popular
                    </span>
                  )}
                  <h3 className="font-display text-xl font-semibold">
                    {plan.name}
                  </h3>
                  <div className="mt-3 mb-4">
                    <span className="font-display text-3xl font-bold">
                      {plan.price}
                    </span>
                    <span className="text-sm opacity-70">{plan.period}</span>
                  </div>
                  <p
                    className={`text-sm mb-6 ${
                      plan.highlight
                        ? "text-accent-foreground/80"
                        : "text-primary-foreground/60"
                    }`}
                  >
                    {plan.desc}
                  </p>
                  <ul className="space-y-2 mb-6 flex-1">
                    {plan.features.map((feat) => (
                      <li key={feat} className="flex items-start gap-2 text-sm">
                        <CheckCircle2
                          className={`h-4 w-4 mt-0.5 shrink-0 ${
                            plan.highlight
                              ? "text-accent-foreground"
                              : "text-accent"
                          }`}
                        />
                        <span
                          className={
                            plan.highlight ? "" : "text-primary-foreground/80"
                          }
                        >
                          {feat}
                        </span>
                      </li>
                    ))}
                  </ul>
                  <Button
                    asChild
                    className={`w-full ${
                      plan.highlight
                        ? "bg-accent-foreground text-accent hover:bg-accent-foreground/90"
                        : "bg-accent text-accent-foreground hover:bg-accent/90"
                    }`}
                  >
                    <Link to="/login">{plan.cta}</Link>
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </motion.div>
      </Section>

      {/* ═══════════════ TRUST BADGES ═══════════════ */}
      <Section>
        <motion.div
          className="grid grid-cols-1 sm:grid-cols-3 gap-8 text-center"
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-60px" }}
        >
          {[
            {
              icon: Shield,
              title: "Dados Protegidos",
              desc: "Criptografia de ponta a ponta e backups automáticos diários.",
            },
            {
              icon: Lock,
              title: "Acesso Seguro",
              desc: "Autenticação segura, controle de permissões e auditoria de acessos.",
            },
            {
              icon: Globe,
              title: "100% na Nuvem",
              desc: "Acesse de qualquer lugar, a qualquer momento, em qualquer dispositivo.",
            },
          ].map((item) => (
            <motion.div key={item.title} variants={fadeUp} className="p-6">
              <item.icon className="h-10 w-10 text-accent mx-auto mb-4" />
              <h3 className="font-display text-lg font-semibold mb-2">
                {item.title}
              </h3>
              <p className="text-sm text-muted-foreground">{item.desc}</p>
            </motion.div>
          ))}
        </motion.div>
      </Section>

      {/* ═══════════════ FAQ ═══════════════ */}
      <Section className="bg-secondary/50" id="faq">
        <SectionHeader
          title="Perguntas Frequentes"
          subtitle="Tire suas dúvidas sobre a plataforma"
        />
        <div className="max-w-2xl mx-auto">
          <Accordion type="single" collapsible>
            {faqs.map((faq, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.05 }}
              >
                <AccordionItem value={`faq-${i}`}>
                  <AccordionTrigger className="text-left font-display">
                    {faq.q}
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground">
                    {faq.a}
                  </AccordionContent>
                </AccordionItem>
              </motion.div>
            ))}
          </Accordion>
        </div>
      </Section>

      {/* ═══════════════ CTA FINAL ═══════════════ */}
      <Section>
        <motion.div
          className="text-center max-w-xl mx-auto"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={staggerContainer}
        >
          <motion.h2
            variants={fadeUp}
            className="font-display text-3xl md:text-4xl font-semibold mb-4"
          >
            Pronto para transformar sua operação?
          </motion.h2>
          <motion.p
            variants={fadeUp}
            className="text-muted-foreground mb-6"
          >
            Comece seu teste gratuito de 14 dias — sem cartão de crédito, sem
            compromisso.
          </motion.p>
          <motion.div
            variants={fadeUp}
            className="flex flex-col sm:flex-row gap-3 justify-center"
          >
            <Button
              asChild
              size="lg"
              className="bg-accent text-accent-foreground hover:bg-accent/90"
            >
              <Link to="/login">
                Criar Conta Grátis <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <a href="#pricing">Ver Planos</a>
            </Button>
          </motion.div>
        </motion.div>
      </Section>

      {/* ═══════════════ FOOTER ═══════════════ */}
      <footer className="bg-primary text-primary-foreground">
        <div className="container py-12 md:py-16">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {/* Brand */}
            <div className="md:col-span-2">
              <h3 className="font-display text-xl font-semibold mb-3">
                Stone<span className="text-accent">CRM</span>
              </h3>
              <p className="text-primary-foreground/70 text-sm max-w-sm">
                A plataforma completa de CRM e ERP para marmorarias. Gerencie
                clientes, estoque, orçamentos e instalações em um só lugar.
              </p>
              <div className="mt-4 space-y-1 text-sm text-primary-foreground/70">
                <a
                  href="tel:+5511999999999"
                  className="flex items-center gap-2 hover:text-accent transition-colors"
                >
                  <Phone className="h-3.5 w-3.5" /> (11) 99999-9999
                </a>
                <a
                  href="mailto:contato@stonecrm.com.br"
                  className="flex items-center gap-2 hover:text-accent transition-colors"
                >
                  <Mail className="h-3.5 w-3.5" /> contato@stonecrm.com.br
                </a>
                <p className="flex items-center gap-2">
                  <MapPin className="h-3.5 w-3.5" /> São Paulo, SP — Brasil
                </p>
              </div>
            </div>

            {/* Product */}
            <div>
              <h4 className="font-semibold text-sm uppercase tracking-wider mb-3 text-accent">
                Produto
              </h4>
              <ul className="space-y-2 text-sm text-primary-foreground/70">
                <li>
                  <a href="#features" className="hover:text-accent transition-colors">
                    Funcionalidades
                  </a>
                </li>
                <li>
                  <a href="#pricing" className="hover:text-accent transition-colors">
                    Preços
                  </a>
                </li>
                <li>
                  <a href="#faq" className="hover:text-accent transition-colors">
                    FAQ
                  </a>
                </li>
                <li>
                  <Link to="/login" className="hover:text-accent transition-colors">
                    Entrar
                  </Link>
                </li>
              </ul>
            </div>

            {/* Legal */}
            <div>
              <h4 className="font-semibold text-sm uppercase tracking-wider mb-3 text-accent">
                Legal
              </h4>
              <ul className="space-y-2 text-sm text-primary-foreground/70">
                <li>
                  <Link to="/legal/terms" className="hover:text-accent transition-colors">
                    Termos de Uso
                  </Link>
                </li>
                <li>
                  <Link to="/legal/privacy" className="hover:text-accent transition-colors">
                    Política de Privacidade
                  </Link>
                </li>
                <li>
                  <Link to="/legal/warranty" className="hover:text-accent transition-colors">
                    Garantia
                  </Link>
                </li>
              </ul>
            </div>
          </div>

          <div className="border-t border-primary-foreground/10 mt-8 pt-6 text-xs text-primary-foreground/50 text-center">
            © {new Date().getFullYear()} StoneCRM. Todos os direitos
            reservados.
          </div>
        </div>
      </footer>
    </>
  );
};

export default Index;
