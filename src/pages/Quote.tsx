import { useEffect, useState, useMemo, useCallback } from "react";
import { sendEmail } from "@/lib/send-email";
import { welcomeEmail, newQuoteEmail, quoteReceivedCustomerEmail } from "@/lib/email-templates";
import { Section, SectionHeader } from "@/components/shared/Section";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { PhoneInput } from "@/components/PhoneInput";
import { AddressInput, addressToString, parseAddress, type AddressValue, emptyAddress } from "@/components/AddressInput";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useServices } from "@/hooks/useServices";
import type { Tables } from "@/integrations/supabase/types";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { trackEvent } from "@/lib/tracking";
import { resolveEdgeProfile } from "@/components/admin/orders/estimateDisplay";
import { format } from "date-fns";
import { useQueryClient } from "@tanstack/react-query";
import {
  ArrowRight, ArrowLeft, CheckCircle2, Upload, Ruler, Layers, Scissors,
  DollarSign, UserPlus, Plus, Trash2, Camera, CalendarIcon, CalendarDays, Package, LogIn, Minus,
} from "lucide-react";

const DRAFT_KEY = "estimator_draft_v1";

const steps = [
  { label: "Your Info", icon: UserPlus },
  { label: "Upload Layout", icon: Upload },
  { label: "Material Group", icon: Layers },
  { label: "Select Product", icon: Package },
  { label: "Dimensions", icon: Ruler },
  { label: "Options", icon: Scissors },
  { label: "Account", icon: LogIn },
  { label: "Your Estimate", icon: DollarSign },
  { label: "Schedule", icon: CalendarDays },
];

const edgeProfiles = ["Standard Eased", "Beveled", "Bullnose", "Ogee", "Waterfall"];
const projectTypes = ["Kitchen Countertops", "Bathroom Vanity", "Island", "Bar Top", "Fireplace Surround", "Other"];
const timelines = ["ASAP", "1–2 weeks", "1 month", "2–3 months", "Just exploring"];
const contactMethods = ["Phone", "Email", "Text"];
const sectionNames = ["Kitchen Counter", "Island", "Bathroom Vanity", "Bar Area", "Laundry", "Outdoor Kitchen", "Commercial", "Other"];
const consultationTypes = ["Showroom Visit", "Phone Consultation", "Video Call", "On-Site Measurement"];
const timeSlots = [
  "9:00 AM", "9:30 AM", "10:00 AM", "10:30 AM", "11:00 AM", "11:30 AM",
  "12:00 PM", "12:30 PM", "1:00 PM", "1:30 PM", "2:00 PM", "2:30 PM",
  "3:00 PM", "3:30 PM", "4:00 PM", "4:30 PM", "5:00 PM",
];

interface CountertopSection {
  id: string;
  name: string;
  customName: string;
  length: string;
  depth: string;
  quantity: string;
}

interface CutoutSelection {
  service_id: string;
  name: string;
  price: number;
  quantity: number;
}

interface QuoteResult {
  quote_id: string;
  calculated_sqft: string;
  slabs_needed: number;
  slab_category: string;
  range_min: number;
  range_max: number;
}

interface LinkedEstimate {
  estimate_number: string;
  material: string | null;
  color: string | null;
  finish: string | null;
  edge_profile: string | null;
  measurements_sqft: number | null;
  scope_of_work: string | null;
  labor_cost: number | null;
  material_cost: number | null;
  addons_cost: number | null;
  tax: number | null;
  subtotal: number | null;
  total: number | null;
  deposit_required: number | null;
  notes: string | null;
  terms_conditions: string | null;
  status: string;
}

const Quote = () => {
  const { user, loading: authLoading } = useAuth();
  const queryClient = useQueryClient();
  const { data: allServices } = useServices();
  const [step, setStep] = useState(0);

  // Cutout selections state
  const [cutoutSelections, setCutoutSelections] = useState<CutoutSelection[]>([]);

  // Inline auth step state (step 6)
  const [inlineAuthPassword, setInlineAuthPassword] = useState("");
  const [inlineAuthConfirmPassword, setInlineAuthConfirmPassword] = useState("");
  const [inlineAuthError, setInlineAuthError] = useState("");
  const [inlineAuthLoading, setInlineAuthLoading] = useState(false);
  const [inlineAuthTab, setInlineAuthTab] = useState<"login" | "signup">("signup");

  const handleInlineLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setInlineAuthLoading(true);
    setInlineAuthError("");
    const { data, error: authErr } = await supabase.auth.signInWithPassword({
      email: leadForm.email,
      password: inlineAuthPassword,
    });
    if (authErr) {
      setInlineAuthLoading(false);
      if (authErr.message?.toLowerCase().includes("email not confirmed")) {
        setInlineAuthError("Please verify your email first. Check your inbox.");
      } else {
        setInlineAuthError(authErr.message);
      }
      return;
    }
    let custId: string | undefined;
    if (data.user) {
      const { data: cust } = await supabase.from("customers").select("*").eq("user_id", data.user.id).single();
      if (cust) { setLoggedInCustomer(cust); custId = cust.id; }
    }
    setInlineAuthLoading(false);
    handleSubmit(custId);
  };

  const handleInlineSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (inlineAuthPassword !== inlineAuthConfirmPassword) {
      setInlineAuthError("Passwords don't match.");
      return;
    }
    if (inlineAuthPassword.length < 6) {
      setInlineAuthError("Password must be at least 6 characters.");
      return;
    }
    setInlineAuthLoading(true);
    setInlineAuthError("");
    const { data, error: authErr } = await supabase.auth.signUp({
      email: leadForm.email,
      password: inlineAuthPassword,
      options: { data: { full_name: leadForm.full_name } },
    });
    if (authErr) {
      setInlineAuthLoading(false);
      setInlineAuthError(authErr.message);
      return;
    }
    if (data.session) {
      await new Promise((r) => setTimeout(r, 800));
      let custId: string | undefined;
      if (data.user) {
        const { data: cust } = await supabase.from("customers").select("*").eq("user_id", data.user.id).single();
        if (cust) {
          await supabase.from("customers").update({
            phone: leadForm.phone.trim() || null,
            address: leadForm.city.trim() || null,
          }).eq("id", cust.id);
          setLoggedInCustomer({ ...cust, full_name: leadForm.full_name, phone: leadForm.phone.trim(), address: leadForm.city.trim() });
          custId = cust.id;
        }
      }
      setInlineAuthLoading(false);
      try { sendEmail({ ...welcomeEmail({ customerName: leadForm.full_name || "Customer" }), to: leadForm.email }); } catch {}
      handleSubmit(custId);
    } else {
      setInlineAuthLoading(false);
      setInlineAuthError("Account created! Please check your email for a verification link, then sign in below.");
      setInlineAuthTab("login");
    }
  };

  const handleSkipAuth = () => {
    handleSubmit();
  };
  const [materials, setMaterials] = useState<Tables<"materials">[]>([]);
  const [slabsForMaterial, setSlabsForMaterial] = useState<any[]>([]);
  const [slabsLoading, setSlabsLoading] = useState(false);
  const [leadForm, setLeadForm] = useState({
    full_name: "", phone: "", email: "", city: "", project_type: "",
    company_name: "", timeline: "", preferred_contact_method: "", notes: "",
  });
  const [leadId, setLeadId] = useState<string | null>(null);

  // Logged-in customer state
  const [loggedInCustomer, setLoggedInCustomer] = useState<Tables<"customers"> | null>(null);
  const [customerLoading, setCustomerLoading] = useState(true);
  const [profileSaving, setProfileSaving] = useState(false);
  const [form, setForm] = useState({
    material_id: "", slab_id: "", length_inches: "", width_inches: "",
    edge_profile: "", num_cutouts: "0", reference_measurement_inches: "",
  });
  const [layoutFile, setLayoutFile] = useState<File | null>(null);
  const [layoutPreview, setLayoutPreview] = useState<string | null>(null);
  const [layoutUrl, setLayoutUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<QuoteResult | null>(null);
  const [linkedEstimate, setLinkedEstimate] = useState<LinkedEstimate | null>(null);
  const [error, setError] = useState("");
  const [bookingSuccess, setBookingSuccess] = useState(false);

  // Scheduling form
  const [scheduleForm, setScheduleForm] = useState({
    preferred_date: null as Date | null,
    preferred_time: "",
    full_name: "",
    phone: "",
    email: "",
    consultation_type: "",
    notes: "",
  });
  const [scheduleAddress, setScheduleAddress] = useState<AddressValue>(emptyAddress);

  const createSection = (): CountertopSection => ({
    id: crypto.randomUUID(), name: "Kitchen Counter", customName: "",
    length: "", depth: "", quantity: "1",
  });

  const [sections, setSections] = useState<CountertopSection[]>([createSection()]);
  const [additionalInfo, setAdditionalInfo] = useState("");
  const [spacePhotos, setSpacePhotos] = useState<File[]>([]);
  const [spacePhotoPreviews, setSpacePhotoPreviews] = useState<string[]>([]);

  const totalSqft = useMemo(() => {
    return sections.reduce((sum, s) => {
      const l = Number(s.length) || 0;
      const d = Number(s.depth) || 0;
      const q = Number(s.quantity) || 1;
      return sum + (l * d * q) / 144;
    }, 0);
  }, [sections]);

  // --- Draft persistence ---
  const saveDraft = useCallback(() => {
    try {
      const draft = {
        step: step === 6 ? 5 : step, leadForm, leadId, form, sections, additionalInfo,
        result, layoutUrl, scheduleAddress,
        scheduleForm: { ...scheduleForm, preferred_date: scheduleForm.preferred_date?.toISOString() || null },
      };
      localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
    } catch {}
  }, [step, leadForm, leadId, form, sections, additionalInfo, result, layoutUrl, scheduleForm, scheduleAddress]);

  // Save draft after each step change
  useEffect(() => { saveDraft(); }, [step, saveDraft]);

  // Restore draft on mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (!raw) return;
      const d = JSON.parse(raw);
      if (d.leadId) {
        setStep(d.step || 0);
        setLeadForm(d.leadForm || leadForm);
        setLeadId(d.leadId);
        setForm(d.form || form);
        setSections(d.sections?.length ? d.sections : [createSection()]);
        setAdditionalInfo(d.additionalInfo || "");
        setResult(d.result || null);
        setLayoutUrl(d.layoutUrl || null);
        if (d.scheduleForm) {
          setScheduleForm({
            ...d.scheduleForm,
            preferred_date: d.scheduleForm.preferred_date ? new Date(d.scheduleForm.preferred_date) : null,
          });
        }
        if (d.scheduleAddress) setScheduleAddress(d.scheduleAddress);
      }
    } catch {}
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const clearDraft = () => { localStorage.removeItem(DRAFT_KEY); };

  const updateSection = (id: string, field: keyof CountertopSection, value: string) => {
    setSections((prev) => prev.map((s) => (s.id === id ? { ...s, [field]: value } : s)));
  };

  const removeSection = (id: string) => {
    if (sections.length <= 1) return;
    setSections((prev) => prev.filter((s) => s.id !== id));
  };

  const handleSpacePhotos = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const validTypes = ["application/pdf", "image/jpeg", "image/png"];
    const valid = files.filter((f) => validTypes.includes(f.type) && f.size <= 10 * 1024 * 1024);
    if (valid.length === 0) return;
    setSpacePhotos((prev) => [...prev, ...valid]);
    valid.forEach((file) => {
      if (file.type.startsWith("image/")) {
        const reader = new FileReader();
        reader.onload = (ev) => setSpacePhotoPreviews((prev) => [...prev, ev.target?.result as string]);
        reader.readAsDataURL(file);
      } else {
        setSpacePhotoPreviews((prev) => [...prev, ""]);
      }
    });
  };

  const removeSpacePhoto = (index: number) => {
    setSpacePhotos((prev) => prev.filter((_, i) => i !== index));
    setSpacePhotoPreviews((prev) => prev.filter((_, i) => i !== index));
  };

  useEffect(() => {
    supabase.from("materials").select("*").eq("is_active", true).order("name")
      .then(({ data }) => setMaterials(data || []));
  }, []);

  // Initialize cutout selections from services
  const cutoutServices = useMemo(() => 
    (allServices || []).filter((s) => s.category === "cutout"), 
    [allServices]
  );

  useEffect(() => {
    if (cutoutServices.length > 0 && cutoutSelections.length === 0) {
      setCutoutSelections(
        cutoutServices.map((s) => ({
          service_id: s.id,
          name: s.name,
          price: Number(s.cost_value) || 0,
          quantity: 0,
        }))
      );
    }
  }, [cutoutServices, cutoutSelections.length]);

  // Detect logged-in customer and pre-fill form
  useEffect(() => {
    if (!user) { setCustomerLoading(false); return; }
    const loadCustomer = async () => {
      // Check if user has customer role
      const { data: roles } = await supabase
        .from("user_roles").select("role").eq("user_id", user.id);
      const isCustomer = (roles || []).some((r) => r.role === "customer");
      if (!isCustomer) { setCustomerLoading(false); return; }
      // Fetch customer profile
      const { data: cust } = await supabase
        .from("customers").select("*").eq("user_id", user.id).single();
      if (cust) {
        setLoggedInCustomer(cust);
        // Pre-fill lead form from customer profile
        setLeadForm((prev) => ({
          ...prev,
          full_name: prev.full_name || cust.full_name || "",
          phone: prev.phone || cust.phone || "",
          email: prev.email || cust.email || "",
          city: prev.city || cust.address || "",
        }));
      }
      setCustomerLoading(false);
    };
    loadCustomer();
  }, [user]);

  const selectedMaterial = materials.find((m) => m.id === form.material_id);
  const selectedSlab = slabsForMaterial.find((s) => s.id === form.slab_id);

  // Refresh quote + linked estimate from DB when viewing result (step 6)
  useEffect(() => {
    if (step !== 7 || !result?.quote_id) return;
    const refreshQuoteData = async () => {
      try {
        // Fetch latest quote values
        const { data: q } = await supabase
          .from("quotes")
          .select("range_min, range_max, calculated_sqft, slabs_needed, slab_category, estimated_total")
          .eq("id", result.quote_id)
          .maybeSingle();
        if (q) {
          setResult((prev) => prev ? {
            ...prev,
            range_min: q.range_min ?? prev.range_min,
            range_max: q.range_max ?? prev.range_max,
            calculated_sqft: q.calculated_sqft?.toString() ?? prev.calculated_sqft,
            slabs_needed: q.slabs_needed ?? prev.slabs_needed,
            slab_category: q.slab_category ?? prev.slab_category,
          } : prev);
        }
        // Check if there's an order linked to this quote, then fetch estimate
        const { data: order } = await supabase
          .from("orders")
          .select("id")
          .eq("quote_id", result.quote_id)
          .maybeSingle();
        if (order) {
          const { data: est } = await supabase
            .from("estimates")
            .select("estimate_number, material, color, finish, edge_profile, measurements_sqft, scope_of_work, labor_cost, material_cost, addons_cost, tax, subtotal, total, deposit_required, notes, terms_conditions, status")
            .eq("order_id", order.id)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();
          setLinkedEstimate(est || null);
        } else {
          setLinkedEstimate(null);
        }
      } catch (err) {
        console.error("Failed to refresh quote data:", err);
      }
    };
    refreshQuoteData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, result?.quote_id]);

  // Fetch slabs when material group changes
  useEffect(() => {
    if (!form.material_id) { setSlabsForMaterial([]); return; }
    setSlabsLoading(true);
    setForm((prev) => ({ ...prev, slab_id: "" }));
    supabase
      .from("slabs")
      .select("id, name, description, lot_number, thickness, length_inches, width_inches, image_urls, notes, materials(name)")
      .eq("material_id", form.material_id)
      .eq("status", "available")
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        setSlabsForMaterial(data || []);
        setSlabsLoading(false);
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.material_id]);

  const isLeadValid = () =>
    leadForm.full_name.trim() !== "" && leadForm.phone.trim() !== "" &&
    leadForm.email.trim() !== "" && leadForm.city.trim() !== "" &&
    leadForm.project_type !== "";

  const saveLead = async () => {
    setSubmitting(true);
    setError("");
    try {
      // Double-check auth state to prevent RLS violations on leads table
      const { data: { session } } = await supabase.auth.getSession();
      const isAuthenticatedCustomer = loggedInCustomer || (session && await (async () => {
        const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", session.user.id);
        return (roles || []).some((r) => r.role === "customer");
      })());

      // If logged-in customer, save profile updates and skip lead creation
      if (isAuthenticatedCustomer && session) {
        setProfileSaving(true);
        if (loggedInCustomer) {
          const { error: updateErr } = await supabase.from("customers").update({
            full_name: leadForm.full_name.trim(),
            phone: leadForm.phone.trim() || null,
            address: leadForm.city.trim() || null,
          }).eq("id", loggedInCustomer.id);
          if (updateErr) throw updateErr;
          setLoggedInCustomer({ ...loggedInCustomer, full_name: leadForm.full_name.trim(), phone: leadForm.phone.trim() || null, address: leadForm.city.trim() || null });
        }
        setProfileSaving(false);
        trackEvent("estimator_start", { customer_id: loggedInCustomer?.id, project_type: leadForm.project_type });
        setStep(1);
        return;
      }

      // Non-logged-in: create lead (no select needed for anon RLS)
      const { error: insertErr } = await supabase.from("leads").insert({
        full_name: leadForm.full_name.trim(), phone: leadForm.phone.trim(),
        email: leadForm.email.trim(), city: leadForm.city.trim(),
        project_type: leadForm.project_type,
        company_name: leadForm.company_name.trim() || null,
        timeline: leadForm.timeline || null,
        preferred_contact_method: leadForm.preferred_contact_method || null,
        notes: leadForm.notes.trim() || null, status: "new_lead",
      });
      if (insertErr) throw insertErr;
      trackEvent("lead_captured", { email: leadForm.email, project_type: leadForm.project_type });
      setStep(1);
    } catch (err: any) {
      setError(err.message || "Failed to save your info. Please try again.");
      setProfileSaving(false);
    } finally {
      setSubmitting(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const validTypes = ["application/pdf", "image/jpeg", "image/png", "image/webp"];
    if (!validTypes.includes(file.type)) { setError("Please upload a PDF, JPG, or PNG file."); return; }
    if (file.size > 10 * 1024 * 1024) { setError("File must be under 10MB."); return; }
    setLayoutFile(file);
    setError("");
    if (file.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onload = (ev) => setLayoutPreview(ev.target?.result as string);
      reader.readAsDataURL(file);
    } else { setLayoutPreview(null); }
  };

  const uploadLayout = async () => {
    if (!layoutFile) return null;
    setUploading(true);
    const { data: { user } } = await supabase.auth.getUser();
    const folder = user?.id || "anonymous";
    const fileName = `${folder}/${Date.now()}-${layoutFile.name}`;
    const { data, error: uploadErr } = await supabase.storage.from("layout-uploads").upload(fileName, layoutFile);
    setUploading(false);
    if (uploadErr) { console.error("Upload error:", uploadErr); return null; }
    const url = data?.path || null;
    setLayoutUrl(url);
    return url;
  };

  const canNext = () => {
    if (step === 0) return isLeadValid();
    if (step === 1) return true;
    if (step === 2) return !!form.material_id;
    if (step === 3) return !!form.slab_id;
    if (step === 4) return sections.some((s) => Number(s.length) > 0 && Number(s.depth) > 0);
    if (step === 5) return true;
    if (step === 6) return true;
    return false;
  };

  const [estimatorStarted, setEstimatorStarted] = useState(false);
  const handleEstimatorStart = () => {
    if (!estimatorStarted) {
      trackEvent("estimator_start", { material_id: form.material_id || undefined });
      setEstimatorStarted(true);
    }
  };

  const handleNext = () => {
    if (step === 0) { saveLead(); return; }
    setStep(step + 1);
  };

  const handleSubmit = async (overrideCustomerId?: string) => {
    setSubmitting(true);
    setError("");
    try {
      let uploadedUrl = layoutUrl;
      if (layoutFile && !layoutUrl) { uploadedUrl = await uploadLayout(); }
      const totalLength = sections.reduce((sum, s) => sum + (Number(s.length) || 0) * (Number(s.quantity) || 1), 0);
      const avgDepth = sections.length > 0
        ? sections.reduce((sum, s) => sum + (Number(s.depth) || 0), 0) / sections.length : 0;

      const effectiveCustomerId = overrideCustomerId || loggedInCustomer?.id;

      const { data, error: fnError } = await supabase.functions.invoke("calculate-quote", {
        body: {
          material_id: form.material_id,
          slab_id: form.slab_id || undefined,
          length_inches: totalLength || 1,
          width_inches: Math.round(avgDepth) || 1,
          edge_profile: form.edge_profile || undefined,
          num_cutouts: Number(form.num_cutouts),
          layout_url: uploadedUrl,
          reference_measurement_inches: Number(form.reference_measurement_inches) || undefined,
          calculated_sqft: totalSqft > 0 ? totalSqft : undefined,
          customer_id: effectiveCustomerId || undefined,
        },
      });
      if (fnError) throw fnError;
      const quoteResult = data as QuoteResult;
      setResult(quoteResult);

      // Link quote to customer
      if (effectiveCustomerId && quoteResult.quote_id) {
        await supabase.from("quotes").update({ customer_id: effectiveCustomerId }).eq("id", quoteResult.quote_id);
      }

      if (!effectiveCustomerId && leadId && quoteResult.quote_id) {
        await supabase.from("leads").update({ quote_id: quoteResult.quote_id, status: "quoted" }).eq("id", leadId);
      }
      queryClient.invalidateQueries({ queryKey: ["quotes"] });
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      trackEvent("sqft_calculated", {
        sqft: quoteResult.calculated_sqft, material: selectedMaterial?.name,
        range_min: quoteResult.range_min, range_max: quoteResult.range_max,
      });

      // Send email notifications for new quote
      try {
        // Admin notification
        const adminEmail = newQuoteEmail({
          customerName: leadForm.full_name || "Customer",
          email: leadForm.email || "",
          phone: leadForm.phone || "",
          material: selectedMaterial?.name || "N/A",
          sqft: Number(quoteResult.calculated_sqft) || 0,
          rangeMin: quoteResult.range_min || 0,
          rangeMax: quoteResult.range_max || 0,
          quoteId: quoteResult.quote_id || "",
        });
        sendEmail(adminEmail);

        // Customer confirmation
        if (leadForm.email) {
          const customerEmail = quoteReceivedCustomerEmail({
            customerName: leadForm.full_name || "Customer",
            quoteId: quoteResult.quote_id || "",
            material: selectedMaterial?.name || "N/A",
            sqft: Number(quoteResult.calculated_sqft) || 0,
            rangeMin: quoteResult.range_min || 0,
            rangeMax: quoteResult.range_max || 0,
          });
          sendEmail({ ...customerEmail, to: leadForm.email });
        }
      } catch {}

      setStep(7);
    } catch (err: any) {
      setError(err.message || "Failed to calculate estimate. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  // --- Book consultation: go to step 6 ---
  const handleBookConsultation = () => {
    // Pre-fill scheduling form from lead data
    setScheduleForm((prev) => ({
      ...prev,
      full_name: prev.full_name || leadForm.full_name,
      phone: prev.phone || leadForm.phone,
      email: prev.email || leadForm.email,
    }));
    if (!scheduleAddress.city) {
      setScheduleAddress((prev) => ({ ...prev, city: leadForm.city }));
    }
    setStep(8);
  };

  const isScheduleValid = () =>
    scheduleForm.preferred_date && scheduleForm.preferred_time &&
    scheduleForm.full_name.trim() && scheduleForm.phone.trim() &&
    scheduleForm.email.trim() && scheduleAddress.street.trim() &&
    scheduleAddress.city.trim() && scheduleForm.consultation_type;

  const handleConfirmAppointment = async () => {
    if (!isScheduleValid()) return;
    setSubmitting(true);
    setError("");
    try {
      const fullAddress = addressToString(scheduleAddress);
      const { error: apptErr } = await supabase.from("appointments").insert({
        customer_name: scheduleForm.full_name.trim(),
        customer_email: scheduleForm.email.trim(),
        customer_phone: scheduleForm.phone.trim() || null,
        address: fullAddress,
        zip_code: scheduleAddress.zip || scheduleAddress.city.trim(),
        preferred_date: scheduleForm.preferred_date ? format(scheduleForm.preferred_date, "yyyy-MM-dd") : null,
        preferred_time: scheduleForm.preferred_time || null,
        notes: [
          `Consultation Type: ${scheduleForm.consultation_type}`,
          `Project Type: ${leadForm.project_type}`,
          `City: ${scheduleAddress.city}`,
          scheduleForm.notes ? `Notes: ${scheduleForm.notes}` : "",
        ].filter(Boolean).join("\n"),
        status: "requested" as const,
      });
      if (apptErr) throw apptErr;

      // Update lead status (only for non-logged-in users who created a lead)
      if (!loggedInCustomer && leadId) {
        await supabase.from("leads").update({ status: "appointment_scheduled" }).eq("id", leadId);
      }

      trackEvent("appointment_booked", { consultation_type: scheduleForm.consultation_type });
      setBookingSuccess(true);
      clearDraft();
    } catch (err: any) {
      setError(err.message || "Failed to schedule appointment. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(val);

  const totalSteps = steps.length;
  const progressPct = Math.round((step / (totalSteps - 1)) * 100);

  if (authLoading) {
    return (
      <Section>
        <div className="flex items-center justify-center py-12">
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </Section>
    );
  }


  // Success screen
  if (bookingSuccess) {
    return (
      <Section>
        <Card className="max-w-xl mx-auto border-0 shadow-sm">
          <CardContent className="p-8 md:p-12 text-center">
            <CheckCircle2 className="h-16 w-16 text-accent mx-auto mb-6" />
            <h2 className="font-display text-2xl font-semibold mb-3">Consultation Scheduled!</h2>
            <p className="text-muted-foreground leading-relaxed mb-6">
              Your consultation has been scheduled successfully. Our team will contact you shortly to confirm the details.
            </p>
            <div className="bg-accent/5 rounded-lg p-4 text-left space-y-1 mb-8">
              <p className="text-sm"><span className="text-muted-foreground">Date:</span> {scheduleForm.preferred_date ? format(scheduleForm.preferred_date, "MMMM d, yyyy") : ""}</p>
              <p className="text-sm"><span className="text-muted-foreground">Time:</span> {scheduleForm.preferred_time}</p>
              <p className="text-sm"><span className="text-muted-foreground">Type:</span> {scheduleForm.consultation_type}</p>
            </div>
            <Button
              onClick={() => {
                setBookingSuccess(false);
                setStep(0);
                setResult(null);
                setLayoutFile(null);
                setLayoutPreview(null);
                setLayoutUrl(null);
                setLeadId(null);
                setLeadForm((prev) => ({ ...prev, full_name: "", phone: "", email: "", city: "", project_type: "", company_name: "", timeline: "", preferred_contact_method: "", notes: "" }));
                setForm((prev) => ({ ...prev, material_id: "", slab_id: "", length_inches: "", width_inches: "", edge_profile: "", num_cutouts: "0", reference_measurement_inches: "" }));
                setSections([createSection()]);
                setScheduleForm((prev) => ({ ...prev, preferred_date: null, preferred_time: "", full_name: "", phone: "", email: "", consultation_type: "", notes: "" }));
                setScheduleAddress(emptyAddress);
              }}
              variant="outline"
            >
              Start New Estimate
            </Button>
          </CardContent>
        </Card>
      </Section>
    );
  }

  return (
    <Section>
      <SectionHeader
        title="Get Your Estimated Investment"
        subtitle="Start by entering your contact details, then upload your layout and dimensions so we can prepare a transparent investment range."
      />

      {/* Progress bar */}
      <div className="max-w-xl mx-auto mb-2">
        <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
          <div className="h-full bg-accent transition-all duration-500 ease-out rounded-full" style={{ width: `${progressPct}%` }} />
        </div>
      </div>

      {/* Step indicators */}
      <div className="flex items-center justify-center gap-1 sm:gap-2 mb-8 overflow-x-auto pb-2">
        {steps.map((s, i) => (
          <div key={s.label} className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
            <div className={cn(
              "w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center text-sm font-medium transition-colors",
              i < step ? "bg-accent text-accent-foreground" :
              i === step ? "bg-accent text-accent-foreground ring-2 ring-accent/30 ring-offset-2 ring-offset-background" :
              "bg-muted text-muted-foreground"
            )}>
              {i < step ? <CheckCircle2 className="h-4 w-4" /> : <s.icon className="h-4 w-4" />}
            </div>
            <span className={cn("text-xs sm:text-sm hidden md:block", i <= step ? "text-foreground" : "text-muted-foreground")}>
              {s.label}
            </span>
            {i < steps.length - 1 && <div className="w-4 sm:w-8 h-px bg-border mx-0.5" />}
          </div>
        ))}
      </div>

      <Card className="max-w-xl mx-auto border-0 shadow-sm">
        <CardContent className="p-6 md:p-8">
          {/* Step 0: Lead Info / Customer Confirm */}
          {step === 0 && (
            <div className="space-y-4">
              {customerLoading ? (
                <div className="h-32 flex items-center justify-center">
                  <p className="text-sm text-muted-foreground">Loading your profile...</p>
                </div>
              ) : (
              <>
              <Label className="text-base font-display">
                {loggedInCustomer ? "Confirm or Update Your Information" : "Tell Us About You & Your Project"}
              </Label>
              <p className="text-sm text-muted-foreground">
                {loggedInCustomer
                  ? "We've loaded your profile. Review your details below and update anything that's changed before continuing."
                  : "We'll use this to prepare your personalized estimate and follow up with you."}
              </p>
              {loggedInCustomer && (
                <div className="bg-accent/5 border border-accent/20 rounded-lg p-3 flex items-center gap-2 text-sm">
                  <CheckCircle2 className="h-4 w-4 text-accent flex-shrink-0" />
                  <span>Signed in as <strong>{loggedInCustomer.email}</strong> — your estimate will be linked to your account.</span>
                </div>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="lead_name" className="text-sm">Full Name *</Label>
                  <Input id="lead_name" placeholder="Jane Smith" value={leadForm.full_name} onChange={(e) => setLeadForm((prev) => ({ ...prev, full_name: e.target.value }))} />
                </div>
                 <div>
                   <Label htmlFor="lead_phone" className="text-sm">Phone Number *</Label>
                   <PhoneInput value={leadForm.phone} onChange={(v) => setLeadForm((prev) => ({ ...prev, phone: v }))} />
                 </div>
              </div>
              <div>
                <Label htmlFor="lead_email" className="text-sm">Email Address *</Label>
                  <Input id="lead_email" type="email" placeholder="jane@example.com" value={leadForm.email} onChange={(e) => setLeadForm((prev) => ({ ...prev, email: e.target.value }))} disabled={!!loggedInCustomer} className={loggedInCustomer ? "bg-muted" : ""} />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="lead_city" className="text-sm">City *</Label>
                  <Input id="lead_city" placeholder="Austin" value={leadForm.city} onChange={(e) => setLeadForm((prev) => ({ ...prev, city: e.target.value }))} />
                </div>
                <div>
                  <Label htmlFor="lead_project_type" className="text-sm">Project Type *</Label>
                    <Select value={leadForm.project_type} onValueChange={(v) => setLeadForm((prev) => ({ ...prev, project_type: v }))}>
                    <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                    <SelectContent>
                      {projectTypes.map((t) => (<SelectItem key={t} value={t}>{t}</SelectItem>))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              {!loggedInCustomer && (
              <div className="border-t border-border pt-4 mt-2">
                <p className="text-xs text-muted-foreground mb-3">Optional — helps us serve you better</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="lead_company" className="text-sm">Company Name</Label>
                    <Input id="lead_company" placeholder="Optional" value={leadForm.company_name} onChange={(e) => setLeadForm((prev) => ({ ...prev, company_name: e.target.value }))} />
                  </div>
                  <div>
                    <Label htmlFor="lead_timeline" className="text-sm">Timeline</Label>
                    <Select value={leadForm.timeline} onValueChange={(v) => setLeadForm((prev) => ({ ...prev, timeline: v }))}>
                      <SelectTrigger><SelectValue placeholder="When do you need this?" /></SelectTrigger>
                      <SelectContent>
                        {timelines.map((t) => (<SelectItem key={t} value={t}>{t}</SelectItem>))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                  <div>
                    <Label htmlFor="lead_contact_method" className="text-sm">Preferred Contact Method</Label>
                    <Select value={leadForm.preferred_contact_method} onValueChange={(v) => setLeadForm((prev) => ({ ...prev, preferred_contact_method: v }))}>
                      <SelectTrigger><SelectValue placeholder="How should we reach you?" /></SelectTrigger>
                      <SelectContent>
                        {contactMethods.map((m) => (<SelectItem key={m} value={m}>{m}</SelectItem>))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="mt-4">
                  <Label htmlFor="lead_notes" className="text-sm">Notes</Label>
                  <Textarea id="lead_notes" placeholder="Anything else we should know?" rows={2} value={leadForm.notes} onChange={(e) => setLeadForm((prev) => ({ ...prev, notes: e.target.value }))} />
                </div>
              </div>
              )}
              </>
              )}
            </div>
          )}

          {/* Step 1: Upload Layout */}
          {step === 1 && (
            <div className="space-y-4">
              <Label className="text-base font-display">Upload Your Layout (Optional)</Label>
              <p className="text-sm text-muted-foreground">Upload a photo or PDF of your countertop layout.</p>
              <div className="border-2 border-dashed border-border rounded-lg p-8 text-center">
                {layoutPreview ? (
                  <div className="space-y-3">
                    <img src={layoutPreview} alt="Layout preview" className="max-h-48 mx-auto rounded" />
                    <p className="text-sm text-muted-foreground">{layoutFile?.name}</p>
                    <Button variant="ghost" size="sm" onClick={() => { setLayoutFile(null); setLayoutPreview(null); setLayoutUrl(null); }}>Remove</Button>
                  </div>
                ) : layoutFile ? (
                  <div className="space-y-3">
                    <Upload className="h-10 w-10 text-accent mx-auto" />
                    <p className="text-sm font-medium">{layoutFile.name}</p>
                    <p className="text-xs text-muted-foreground">PDF uploaded</p>
                    <Button variant="ghost" size="sm" onClick={() => { setLayoutFile(null); setLayoutUrl(null); }}>Remove</Button>
                  </div>
                ) : (
                  <label className="cursor-pointer block">
                    <Upload className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                    <p className="text-sm font-medium">Click to upload or drag & drop</p>
                    <p className="text-xs text-muted-foreground mt-1">PDF, JPG, or PNG (max 10MB)</p>
                    <input type="file" accept=".pdf,.jpg,.jpeg,.png,.webp" className="hidden" onChange={handleFileSelect} />
                  </label>
                )}
              </div>
              {layoutFile && (
                <div>
                  <Label htmlFor="ref" className="text-sm">Reference Measurement (inches)</Label>
                  <p className="text-xs text-muted-foreground mb-2">Enter one known measurement from your layout.</p>
                  <Input id="ref" type="number" placeholder="e.g. 96" value={form.reference_measurement_inches} onChange={(e) => setForm({ ...form, reference_measurement_inches: e.target.value })} />
                </div>
              )}
            </div>
          )}

          {/* Step 2: Material */}
          {step === 2 && (
            <div className="space-y-4">
              <Label className="text-base font-display">Select Material Group</Label>
              <p className="text-sm text-muted-foreground">Choose a material category to see available products.</p>
              <div className="grid grid-cols-1 gap-2">
                {materials.map((mat) => (
                  <button key={mat.id} onClick={() => { setForm({ ...form, material_id: mat.id, slab_id: "" }); handleEstimatorStart(); }}
                    className={cn("p-4 rounded-lg border text-left transition-all",
                      form.material_id === mat.id ? "border-accent bg-accent/5" : "border-border hover:border-accent/50"
                    )}>
                    <p className="font-medium">{mat.name}</p>
                    <p className="text-sm text-muted-foreground capitalize">{mat.category}</p>
                  </button>
                ))}
                {materials.length === 0 && <p className="text-muted-foreground text-sm">Loading materials...</p>}
              </div>
            </div>
          )}

          {/* Step 3: Select Product (Slab) */}
          {step === 3 && (
            <div className="space-y-4">
              <Label className="text-base font-display">Select Your Product</Label>
              <p className="text-sm text-muted-foreground">
                Choose a slab from <strong>{selectedMaterial?.name}</strong> to continue.
              </p>
              {slabsLoading ? (
                <div className="flex items-center justify-center h-32">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : slabsForMaterial.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  No available slabs in this group. Please go back and choose a different material.
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-3">
                  {slabsForMaterial.map((slab) => {
                    const sqft = ((slab.length_inches * slab.width_inches) / 144).toFixed(1);
                    const mainImg = slab.image_urls?.[0];
                    const slabDisplayName = slab.name || slab.materials?.name || "Slab";
                    return (
                      <button key={slab.id} onClick={() => setForm({ ...form, slab_id: slab.id })}
                        className={cn("p-4 rounded-lg border text-left transition-all flex gap-4",
                          form.slab_id === slab.id ? "border-accent bg-accent/5" : "border-border hover:border-accent/50"
                        )}>
                        {mainImg ? (
                          <img src={mainImg} alt={slabDisplayName} className="w-20 h-20 rounded object-cover flex-shrink-0" />
                        ) : (
                          <div className="w-20 h-20 rounded bg-secondary flex items-center justify-center flex-shrink-0">
                            <Package className="h-6 w-6 text-muted-foreground" />
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-base">{slabDisplayName}</p>
                          {slab.description && (
                            <p className="text-sm text-muted-foreground mt-0.5 line-clamp-2">{slab.description}</p>
                          )}
                          <p className="text-sm text-muted-foreground mt-1">
                            {slab.length_inches}″ × {slab.width_inches}″ · {slab.thickness} · {sqft} sqft
                          </p>
                          {slab.lot_number && (
                            <p className="text-xs text-muted-foreground mt-0.5">Lot #{slab.lot_number}</p>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Step 4: Dimensions */}
          {step === 4 && (
            <div className="space-y-6">
              <div>
                <Label className="text-base font-display">Enter Your Countertop Dimensions</Label>
                <p className="text-sm text-muted-foreground mt-1">Approximate measurements are fine — we'll confirm during your consultation.</p>
              </div>
              <div className="space-y-4">
                {sections.map((section, idx) => {
                  const sectionSqft = ((Number(section.length) || 0) * (Number(section.depth) || 0) * (Number(section.quantity) || 1)) / 144;
                  return (
                    <div key={section.id} className="border border-border rounded-lg p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-foreground">Section {idx + 1}</span>
                        {sections.length > 1 && (
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => removeSection(section.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                      <div>
                        <Label className="text-sm">Section Name</Label>
                        <Select value={section.name} onValueChange={(v) => updateSection(section.id, "name", v)}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {sectionNames.map((n) => (<SelectItem key={n} value={n}>{n}</SelectItem>))}
                          </SelectContent>
                        </Select>
                      </div>
                      {section.name === "Other" && (
                        <div>
                          <Label className="text-sm">Describe the section</Label>
                          <Input placeholder="e.g. Wet bar top" value={section.customName} onChange={(e) => updateSection(section.id, "customName", e.target.value)} />
                        </div>
                      )}
                      <div className="grid grid-cols-3 gap-3">
                        <div>
                          <Label className="text-sm">Length (in)</Label>
                          <Input type="number" placeholder="96" value={section.length} onChange={(e) => updateSection(section.id, "length", e.target.value)} className="h-11 text-base" />
                        </div>
                        <div>
                          <Label className="text-sm">Depth (in)</Label>
                          <Input type="number" placeholder="26" value={section.depth} onChange={(e) => updateSection(section.id, "depth", e.target.value)} className="h-11 text-base" />
                        </div>
                        <div>
                          <Label className="text-sm">Qty</Label>
                          <Input type="number" min="1" placeholder="1" value={section.quantity} onChange={(e) => updateSection(section.id, "quantity", e.target.value)} className="h-11 text-base" />
                        </div>
                      </div>
                      {sectionSqft > 0 && <p className="text-xs text-muted-foreground">≈ {sectionSqft.toFixed(1)} sq ft</p>}
                    </div>
                  );
                })}
                <Button variant="outline" size="sm" className="w-full" onClick={() => setSections((prev) => [...prev, createSection()])}>
                  <Plus className="h-4 w-4 mr-1" /> Add Another Section
                </Button>
              </div>
              <div className="border-t border-border pt-5">
                <Label className="text-sm font-medium">Additional Information (Optional)</Label>
                <Textarea
                  className="mt-2 min-h-[100px] text-base"
                  placeholder={"Example:\n• Island overhang\n• Backsplash height\n• Number of sinks\n• Waterfall edge\n• Special cutouts\n• Any additional notes about the project"}
                  value={additionalInfo} onChange={(e) => setAdditionalInfo(e.target.value)}
                />
              </div>
              <div className="border-t border-border pt-5">
                <Label className="text-sm font-medium">Upload Photos of the Space (Optional)</Label>
                <p className="text-xs text-muted-foreground mt-1 mb-3">Kitchen photos, layout drawing, or measurements sketch · JPG, PNG, PDF</p>
                <div className="flex flex-wrap gap-3">
                  {spacePhotoPreviews.map((preview, i) => (
                    <div key={i} className="relative w-20 h-20 rounded-md border border-border overflow-hidden bg-muted">
                      {preview ? <img src={preview} alt="" className="w-full h-full object-cover" /> : <div className="flex items-center justify-center w-full h-full text-xs text-muted-foreground">PDF</div>}
                      <button className="absolute top-0.5 right-0.5 bg-background/80 rounded-full p-0.5" onClick={() => removeSpacePhoto(i)}>
                        <Trash2 className="h-3 w-3 text-destructive" />
                      </button>
                    </div>
                  ))}
                  <label className="w-20 h-20 rounded-md border-2 border-dashed border-border flex flex-col items-center justify-center cursor-pointer hover:border-accent/50 transition-colors">
                    <Camera className="h-5 w-5 text-muted-foreground" />
                    <span className="text-[10px] text-muted-foreground mt-1">Add</span>
                    <input type="file" accept=".jpg,.jpeg,.png,.pdf" multiple className="hidden" onChange={handleSpacePhotos} />
                  </label>
                </div>
              </div>
              <p className="text-xs text-muted-foreground italic">You can enter approximate measurements. Our team will confirm everything during the consultation.</p>
              {totalSqft > 0 && (
                <div className="bg-accent/5 border border-accent/20 rounded-lg p-4 text-center">
                  <p className="text-xs text-muted-foreground mb-1">Estimated Total Square Footage</p>
                  <p className="text-2xl font-display font-bold text-accent">{totalSqft.toFixed(1)} sq ft</p>
                </div>
              )}
            </div>
          )}

          {/* Step 5: Options */}
          {step === 5 && (
            <div className="space-y-4">
              <Label className="text-base font-display">Customize Your Project</Label>
              <div>
                <Label htmlFor="edge" className="text-sm">Edge Profile</Label>
                <Select value={form.edge_profile} onValueChange={(v) => setForm({ ...form, edge_profile: v })}>
                  <SelectTrigger><SelectValue placeholder="Select edge profile (optional)" /></SelectTrigger>
                  <SelectContent>
                    {edgeProfiles.map((e) => (<SelectItem key={e} value={e}>{e}</SelectItem>))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="cutouts" className="text-sm">Number of Cutouts (sink, cooktop, etc.)</Label>
                <Input id="cutouts" type="number" min="0" value={form.num_cutouts} onChange={(e) => setForm({ ...form, num_cutouts: e.target.value })} />
              </div>
            </div>
          )}

          {/* Step 6: Account (Auth) */}
          {step === 6 && !user && (
            <div className="space-y-5">
              <div className="text-center">
                <LogIn className="h-10 w-10 text-accent mx-auto mb-3" />
                <h3 className="font-display text-xl font-semibold mb-1">
                  {inlineAuthTab === "login" ? "Sign In to Continue" : "Save Your Estimate"}
                </h3>
                <p className="text-sm text-muted-foreground">Your estimate will appear in your personal dashboard</p>
              </div>

              <Tabs value={inlineAuthTab} onValueChange={(v) => { setInlineAuthTab(v as "login" | "signup"); setInlineAuthError(""); }}>
                <TabsList className="grid w-full grid-cols-2 mb-4">
                  <TabsTrigger value="login">Sign In</TabsTrigger>
                  <TabsTrigger value="signup">Create Account</TabsTrigger>
                </TabsList>
                <TabsContent value="login">
                  <form onSubmit={handleInlineLogin} className="space-y-4">
                    <div>
                      <Label className="text-sm">Email</Label>
                      <Input type="email" value={leadForm.email} readOnly className="bg-muted" />
                    </div>
                    <div>
                      <Label className="text-sm">Password</Label>
                      <Input type="password" required value={inlineAuthPassword} onChange={(e) => setInlineAuthPassword(e.target.value)} placeholder="Enter your password" />
                    </div>
                    {inlineAuthError && <p className="text-destructive text-sm">{inlineAuthError}</p>}
                    <Button type="submit" disabled={inlineAuthLoading} className="w-full bg-accent text-accent-foreground hover:bg-accent/90">
                      {inlineAuthLoading ? "Signing in..." : "Sign In & Submit Estimate"}
                    </Button>
                  </form>
                </TabsContent>
                <TabsContent value="signup">
                  <form onSubmit={handleInlineSignup} className="space-y-4">
                    <div>
                      <Label className="text-sm">Email</Label>
                      <Input type="email" value={leadForm.email} readOnly className="bg-muted" />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <Label className="text-sm">Full Name</Label>
                        <Input value={leadForm.full_name} readOnly className="bg-muted" />
                      </div>
                      <div>
                        <Label className="text-sm">Phone</Label>
                        <Input value={leadForm.phone} readOnly className="bg-muted" />
                      </div>
                    </div>
                    <div>
                      <Label className="text-sm">City</Label>
                      <Input value={leadForm.city} readOnly className="bg-muted" />
                    </div>
                    <div>
                      <Label className="text-sm">Password</Label>
                      <Input type="password" required minLength={6} value={inlineAuthPassword} onChange={(e) => setInlineAuthPassword(e.target.value)} placeholder="Create a password (min. 6 chars)" />
                    </div>
                    <div>
                      <Label className="text-sm">Confirm Password</Label>
                      <Input type="password" required minLength={6} value={inlineAuthConfirmPassword} onChange={(e) => setInlineAuthConfirmPassword(e.target.value)} placeholder="Confirm your password" />
                    </div>
                    {inlineAuthError && <p className="text-destructive text-sm">{inlineAuthError}</p>}
                    <Button type="submit" disabled={inlineAuthLoading} className="w-full bg-accent text-accent-foreground hover:bg-accent/90">
                      {inlineAuthLoading ? "Creating account..." : "Create Account & Submit Estimate"}
                    </Button>
                  </form>
                </TabsContent>
              </Tabs>

              <div className="text-center pt-2 border-t border-border">
                <button onClick={handleSkipAuth} className="text-sm text-muted-foreground hover:text-accent underline">
                  Continue without account →
                </button>
              </div>

              <div className="flex justify-start mt-2">
                <Button variant="ghost" onClick={() => setStep(5)}>
                  <ArrowLeft className="mr-1 h-4 w-4" /> Back
                </Button>
              </div>
            </div>
          )}

          {/* Step 6: Account — auto-proceed if already logged in */}
          {step === 6 && user && (
            <div className="text-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-accent mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">Calculating your estimate...</p>
            </div>
          )}

          {/* Step 7: Result */}
          {step === 7 && result && (
            <div className="text-center py-4">
              <CheckCircle2 className="h-12 w-12 text-accent mx-auto mb-4" />
              <h3 className="font-display text-2xl font-semibold mb-2">
                {linkedEstimate ? "Your Detailed Estimate" : "Your Preliminary Estimate"}
              </h3>

              {/* Show detailed estimate if admin has created one */}
              {linkedEstimate && linkedEstimate.total ? (
                <div className="bg-accent/5 rounded-lg p-6 my-6">
                  <p className="font-display text-3xl font-bold text-accent">{formatCurrency(Number(linkedEstimate.total))}</p>
                  <p className="text-xs text-muted-foreground mt-2">
                    {linkedEstimate.estimate_number && `Estimate ${linkedEstimate.estimate_number} · `}
                    Status: {linkedEstimate.status}
                  </p>
                </div>
              ) : (
                <div className="bg-accent/5 rounded-lg p-6 my-6">
                  <p className="font-display text-3xl font-bold text-accent">{formatCurrency(result.range_min)} — {formatCurrency(result.range_max)}</p>
                  <p className="text-xs text-muted-foreground mt-2">Includes material, fabrication & installation</p>
                </div>
              )}

              {/* Detailed pricing breakdown from admin estimate */}
              {linkedEstimate && (
                <div className="text-left bg-secondary/50 rounded-lg p-4 mb-4 space-y-2">
                  {linkedEstimate.material && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Material</span>
                      <span className="font-medium">{linkedEstimate.material}{linkedEstimate.color ? ` — ${linkedEstimate.color}` : ""}{linkedEstimate.finish ? ` (${linkedEstimate.finish})` : ""}</span>
                    </div>
                  )}
                  {resolveEdgeProfile(linkedEstimate.edge_profile, form.edge_profile) && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Edge Profile</span>
                      <span className="font-medium">{resolveEdgeProfile(linkedEstimate.edge_profile, form.edge_profile)}</span>
                    </div>
                  )}
                  {linkedEstimate.measurements_sqft != null && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Measurements</span>
                      <span className="font-medium">{Number(linkedEstimate.measurements_sqft).toFixed(1)} sq ft</span>
                    </div>
                  )}
                  {linkedEstimate.scope_of_work && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Scope of Work</span>
                      <span className="font-medium">{linkedEstimate.scope_of_work}</span>
                    </div>
                  )}
                  <div className="border-t border-border pt-2 mt-2 space-y-1">
                    {linkedEstimate.material_cost != null && Number(linkedEstimate.material_cost) > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Material / Slab Cost</span>
                        <span className="font-medium">{formatCurrency(Number(linkedEstimate.material_cost))}</span>
                      </div>
                    )}
                    {linkedEstimate.labor_cost != null && Number(linkedEstimate.labor_cost) > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Labor Cost</span>
                        <span className="font-medium">{formatCurrency(Number(linkedEstimate.labor_cost))}</span>
                      </div>
                    )}
                    {linkedEstimate.addons_cost != null && Number(linkedEstimate.addons_cost) > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Add-ons</span>
                        <span className="font-medium">{formatCurrency(Number(linkedEstimate.addons_cost))}</span>
                      </div>
                    )}
                    {linkedEstimate.subtotal != null && Number(linkedEstimate.subtotal) > 0 && (
                      <div className="flex justify-between text-sm font-medium border-t border-border pt-1 mt-1">
                        <span>Subtotal</span>
                        <span>{formatCurrency(Number(linkedEstimate.subtotal))}</span>
                      </div>
                    )}
                    {linkedEstimate.tax != null && Number(linkedEstimate.tax) > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Tax</span>
                        <span className="font-medium">{formatCurrency(Number(linkedEstimate.tax))}</span>
                      </div>
                    )}
                    {linkedEstimate.total != null && (
                      <div className="flex justify-between text-sm font-semibold border-t border-border pt-1 mt-1">
                        <span>Total</span>
                        <span>{formatCurrency(Number(linkedEstimate.total))}</span>
                      </div>
                    )}
                    {linkedEstimate.deposit_required != null && Number(linkedEstimate.deposit_required) > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Deposit Required</span>
                        <span className="font-medium">{formatCurrency(Number(linkedEstimate.deposit_required))}</span>
                      </div>
                    )}
                    {linkedEstimate.total != null && linkedEstimate.deposit_required != null && (
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Remaining Balance</span>
                        <span className="font-medium">{formatCurrency(Number(linkedEstimate.total) - Number(linkedEstimate.deposit_required))}</span>
                      </div>
                    )}
                  </div>
                  {linkedEstimate.notes && (
                    <div className="border-t border-border pt-2 mt-2">
                      <p className="text-xs text-muted-foreground">{linkedEstimate.notes}</p>
                    </div>
                  )}
                  {linkedEstimate.terms_conditions && (
                    <div className="border-t border-border pt-2 mt-2">
                      <p className="text-xs text-muted-foreground whitespace-pre-wrap">{linkedEstimate.terms_conditions}</p>
                    </div>
                  )}
                </div>
              )}

              <div className="text-left bg-secondary/50 rounded-lg p-4 mb-6 space-y-3">
                {selectedSlab && (
                  <div className="flex gap-3">
                    {selectedSlab.image_urls?.[0] && (
                      <img src={selectedSlab.image_urls[0]} alt={selectedSlab.name || "Slab"} className="w-14 h-14 rounded object-cover flex-shrink-0" />
                    )}
                    <div>
                      <p className="text-xs text-muted-foreground">Selected Product</p>
                      <p className="text-sm font-medium">{selectedSlab.name || selectedMaterial?.name || "Slab"}</p>
                      {selectedSlab.description && (
                        <p className="text-xs text-muted-foreground mt-0.5">{selectedSlab.description}</p>
                      )}
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {selectedSlab.length_inches}″ × {selectedSlab.width_inches}″ · {selectedSlab.thickness}
                      </p>
                    </div>
                  </div>
                )}
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <p className="text-xs text-muted-foreground">Project Area</p>
                    <p className="text-sm font-medium">{linkedEstimate?.measurements_sqft ? Number(linkedEstimate.measurements_sqft).toFixed(1) : result.calculated_sqft} sq ft</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Slab Category</p>
                    <p className="text-sm font-medium">{result.slab_category}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Slabs Needed</p>
                    <p className="text-sm font-medium">{result.slabs_needed}</p>
                  </div>
                </div>
              </div>
              <div className="bg-muted/50 rounded-lg p-4 mb-6 text-left">
                <p className="text-sm text-muted-foreground leading-relaxed">
                  <strong>Please note:</strong> {linkedEstimate ? "This estimate reflects the latest pricing from our team." : "This is a preliminary estimate based on the information provided. Final pricing will depend on exact measurements taken during your in-home consultation, final material selection, edge profile details, number and complexity of cutouts, and installation conditions."}
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Button onClick={handleBookConsultation} className="bg-accent text-accent-foreground hover:bg-accent/90">
                  Book Free Consultation <ArrowRight className="ml-1 h-4 w-4" />
                </Button>
                <Button variant="outline" onClick={() => {
                  clearDraft();
                  setStep(0); setResult(null); setLinkedEstimate(null); setLayoutFile(null); setLayoutPreview(null); setLayoutUrl(null); setLeadId(null);
                  setLeadForm((prev) => ({ ...prev, full_name: "", phone: "", email: "", city: "", project_type: "", company_name: "", timeline: "", preferred_contact_method: "", notes: "" }));
                  setForm((prev) => ({ ...prev, material_id: "", slab_id: "", length_inches: "", width_inches: "", edge_profile: "", num_cutouts: "0", reference_measurement_inches: "" }));
                  setSections([createSection()]);
                }}>
                  Start New Estimate
                </Button>
              </div>
            </div>
          )}

          {/* Step 8: Schedule Consultation */}
          {step === 8 && (
            <div className="space-y-5">
              <div>
                <Label className="text-base font-display">Schedule Your Free Consultation</Label>
                <p className="text-sm text-muted-foreground mt-1">Choose a time that works for you. We'll confirm within 24 hours.</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm">Preferred Date *</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className={cn("w-full justify-start text-left font-normal h-11", !scheduleForm.preferred_date && "text-muted-foreground")}>
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {scheduleForm.preferred_date ? format(scheduleForm.preferred_date, "MMM d, yyyy") : "Pick a date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar mode="single" selected={scheduleForm.preferred_date || undefined}
                        onSelect={(d) => setScheduleForm({ ...scheduleForm, preferred_date: d || null })}
                        disabled={(date) => date < new Date()}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                <div>
                  <Label className="text-sm">Preferred Time *</Label>
                  <Select value={scheduleForm.preferred_time} onValueChange={(v) => setScheduleForm({ ...scheduleForm, preferred_time: v })}>
                    <SelectTrigger className="h-11"><SelectValue placeholder="Select time" /></SelectTrigger>
                    <SelectContent>
                      {timeSlots.map((t) => (<SelectItem key={t} value={t}>{t}</SelectItem>))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm">Full Name *</Label>
                  <Input value={scheduleForm.full_name} onChange={(e) => setScheduleForm({ ...scheduleForm, full_name: e.target.value })} className="h-11" />
                </div>
                 <div>
                   <Label className="text-sm">Phone *</Label>
                   <PhoneInput value={scheduleForm.phone} onChange={(v) => setScheduleForm({ ...scheduleForm, phone: v })} />
                 </div>
              </div>

              <div>
                <Label className="text-sm">Email *</Label>
                <Input type="email" value={scheduleForm.email} onChange={(e) => setScheduleForm({ ...scheduleForm, email: e.target.value })} className="h-11" />
              </div>

              <div>
                <Label className="text-sm font-medium">Project Address *</Label>
                <AddressInput
                  value={scheduleAddress}
                  onChange={setScheduleAddress}
                />
              </div>

              <div>
                <Label className="text-sm">Consultation Type *</Label>
                <Select value={scheduleForm.consultation_type} onValueChange={(v) => setScheduleForm({ ...scheduleForm, consultation_type: v })}>
                  <SelectTrigger className="h-11"><SelectValue placeholder="Choose consultation type" /></SelectTrigger>
                  <SelectContent>
                    {consultationTypes.map((t) => (<SelectItem key={t} value={t}>{t}</SelectItem>))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-sm">Additional Notes (Optional)</Label>
                <Textarea placeholder="Anything specific you'd like to discuss?" rows={3} value={scheduleForm.notes} onChange={(e) => setScheduleForm({ ...scheduleForm, notes: e.target.value })} />
              </div>
            </div>
          )}

          {/* Error */}
          {error && <p className="text-destructive text-sm mt-3">{error}</p>}

          {/* Navigation */}
          {step < 6 && (
            <div className="flex justify-between mt-8">
              <Button variant="ghost" onClick={() => setStep(step - 1)} disabled={step === 0}>
                <ArrowLeft className="mr-1 h-4 w-4" /> Back
              </Button>
              {step === 0 ? (
                <Button onClick={handleNext} disabled={!canNext() || submitting || customerLoading} className="bg-accent text-accent-foreground hover:bg-accent/90">
                  {submitting ? "Saving..." : loggedInCustomer ? "Confirm & Continue" : "Continue Your Estimate"} <ArrowRight className="ml-1 h-4 w-4" />
                </Button>
              ) : step < 5 ? (
                <Button onClick={() => setStep(step + 1)} disabled={!canNext()} className="bg-accent text-accent-foreground hover:bg-accent/90">
                  Next <ArrowRight className="ml-1 h-4 w-4" />
                </Button>
              ) : (
                <Button onClick={() => user ? handleSubmit() : setStep(6)} disabled={submitting} className="bg-accent text-accent-foreground hover:bg-accent/90">
                  {submitting ? "Calculating..." : "Get Estimate"} <ArrowRight className="ml-1 h-4 w-4" />
                </Button>
              )}
            </div>
          )}

          {/* Step 8 navigation */}
          {step === 8 && (
            <div className="flex justify-between mt-8">
              <Button variant="ghost" onClick={() => setStep(7)}>
                <ArrowLeft className="mr-1 h-4 w-4" /> Back
              </Button>
              <Button onClick={handleConfirmAppointment} disabled={!isScheduleValid() || submitting} className="bg-accent text-accent-foreground hover:bg-accent/90">
                {submitting ? "Scheduling..." : "Confirm Appointment"} <CheckCircle2 className="ml-1 h-4 w-4" />
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </Section>
  );
};

export default Quote;
