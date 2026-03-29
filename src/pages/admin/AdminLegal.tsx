import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";
import { Save, FileDown, Mail, FileText, Shield, ScrollText, AlertTriangle, Scale, RefreshCw } from "lucide-react";

type LegalDocument = {
  id: string;
  type: string;
  title: string;
  content: string;
  updated_at: string;
};

const DOC_TABS = [
  { type: "terms_conditions", label: "Terms & Conditions", icon: ScrollText },
  { type: "privacy_policy", label: "Privacy Policy", icon: Shield },
  { type: "installation_agreement", label: "Installation Agreement", icon: FileText },
  { type: "warranty_policy", label: "Warranty Policy", icon: Scale },
  { type: "cancellation_refund", label: "Cancellation & Refund", icon: AlertTriangle },
  { type: "lien_waiver", label: "Lien Waiver", icon: Scale },
];

const AdminLegal = () => {
  const [documents, setDocuments] = useState<LegalDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editedContent, setEditedContent] = useState<Record<string, string>>({});
  const [activeTab, setActiveTab] = useState("terms_conditions");

  const fetchDocuments = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("legal_documents")
      .select("*")
      .order("type");
    if (error) {
      toast.error("Failed to load legal documents");
    } else {
      setDocuments(data || []);
      const contentMap: Record<string, string> = {};
      (data || []).forEach((d: any) => { contentMap[d.type] = d.content; });
      setEditedContent(contentMap);
    }
    setLoading(false);
  };

  useEffect(() => { fetchDocuments(); }, []);

  const handleSave = async (type: string) => {
    setSaving(true);
    const { error } = await supabase
      .from("legal_documents")
      .update({ content: editedContent[type] })
      .eq("type", type);
    if (error) {
      toast.error("Failed to save document");
    } else {
      toast.success("Document saved successfully");
      fetchDocuments();
    }
    setSaving(false);
  };

  const handleDownloadPdf = (doc: LegalDocument) => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    const htmlContent = markdownToHtml(editedContent[doc.type] || doc.content);
    const html = `<!DOCTYPE html>
<html>
<head>
  <title>${doc.title} - Altar Stone Countertops</title>
  <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700&family=Inter:wght@300;400;500;600&display=swap" rel="stylesheet">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Inter', sans-serif; color: #2d2a26; background: #fff; padding: 40px; max-width: 800px; margin: 0 auto; line-height: 1.6; }
    h1 { font-family: 'Playfair Display', Georgia, serif; font-size: 26px; font-weight: 700; color: #2d2a26; margin-bottom: 4px; }
    h2 { font-family: 'Playfair Display', Georgia, serif; font-size: 18px; color: #6b6560; margin-bottom: 16px; }
    h3 { font-family: 'Playfair Display', Georgia, serif; font-size: 15px; color: #2d2a26; margin: 24px 0 10px; padding-bottom: 6px; border-bottom: 2px solid #c8973e; display: inline-block; }
    p { font-size: 13px; margin-bottom: 10px; color: #3d3a36; }
    ul, ol { font-size: 13px; margin: 8px 0 16px 24px; color: #3d3a36; }
    li { margin-bottom: 4px; }
    strong { font-weight: 600; }
    hr { border: none; border-top: 1px solid #e5e2dc; margin: 20px 0; }
    table { width: 100%; border-collapse: collapse; margin: 12px 0; }
    th, td { padding: 8px 12px; border: 1px solid #e5e2dc; font-size: 13px; text-align: left; }
    th { background: #f9f7f4; font-weight: 600; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 32px; padding-bottom: 20px; border-bottom: 3px solid #c8973e; }
    .no-print { margin-top: 32px; text-align: center; }
    @media print {
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; padding: 0; }
      .no-print { display: none !important; }
      @page { margin: 0.6in; size: letter; }
    }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <h1>Altar Stone Countertops</h1>
      <p style="font-size:12px;color:#6b6560;">Florida, USA · info@altarstonecountertops.com</p>
    </div>
    <div style="text-align:right;">
      <p style="font-family:'Playfair Display',Georgia,serif;font-size:16px;font-weight:600;color:#c8973e;text-transform:uppercase;letter-spacing:1px;">${doc.title}</p>
      <p style="font-size:12px;color:#6b6560;">${format(new Date(), "MMMM dd, yyyy")}</p>
    </div>
  </div>
  ${htmlContent}
  <div class="no-print">
    <button onclick="window.print()" style="padding:10px 28px;background:#2d2a26;color:#f5f0e8;border:none;border-radius:6px;font-size:14px;cursor:pointer;font-family:'Inter',sans-serif;font-weight:500;">
      Download PDF / Print
    </button>
  </div>
</body>
</html>`;
    printWindow.document.write(html);
    printWindow.document.close();
  };

  const handleSendEmail = async (doc: LegalDocument) => {
    const email = prompt("Enter customer email address:");
    if (!email) return;

    try {
      const { error } = await supabase.functions.invoke("send-email", {
        body: {
          to: email,
          subject: `${doc.title} - Altar Stone Countertops`,
          html: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;">
            <h2 style="color:#2d2a26;border-bottom:2px solid #c8973e;padding-bottom:8px;">${doc.title}</h2>
            <div style="font-size:14px;color:#3d3a36;line-height:1.6;white-space:pre-wrap;">${editedContent[doc.type] || doc.content}</div>
            <hr style="border:none;border-top:1px solid #e5e2dc;margin:24px 0;"/>
            <p style="font-size:12px;color:#6b6560;">Altar Stone Countertops · Florida, USA · info@altarstonecountertops.com</p>
          </div>`,
        },
      });
      if (error) throw error;
      toast.success(`Document sent to ${email}`);
    } catch {
      toast.error("Failed to send email");
    }
  };

  const currentDoc = documents.find((d) => d.type === activeTab);
  const hasChanges = currentDoc && editedContent[activeTab] !== currentDoc.content;

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold tracking-tight">Legal Management</h1>
        <div className="flex items-center justify-center py-20 text-muted-foreground">
          <RefreshCw className="h-5 w-5 animate-spin mr-2" /> Loading documents...
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Legal Management</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage legal documents for Altar Stone Countertops — Florida compliant
          </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="flex flex-wrap h-auto gap-1 bg-muted/50 p-1">
          {DOC_TABS.map((tab) => {
            const Icon = tab.icon;
            return (
              <TabsTrigger key={tab.type} value={tab.type} className="text-xs sm:text-sm gap-1.5 data-[state=active]:bg-background">
                <Icon className="h-3.5 w-3.5 hidden sm:inline" />
                {tab.label}
              </TabsTrigger>
            );
          })}
        </TabsList>

        {DOC_TABS.map((tab) => {
          const doc = documents.find((d) => d.type === tab.type);
          return (
            <TabsContent key={tab.type} value={tab.type}>
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <tab.icon className="h-5 w-5 text-[#c8973e]" />
                        {tab.label}
                      </CardTitle>
                      {doc && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Last updated: {format(new Date(doc.updated_at), "MMM dd, yyyy 'at' h:mm a")}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      {hasChanges && activeTab === tab.type && (
                        <Badge variant="outline" className="text-amber-600 border-amber-300 bg-amber-50 text-xs">
                          Unsaved changes
                        </Badge>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => doc && handleDownloadPdf(doc)}
                        disabled={!doc}
                      >
                        <FileDown className="h-4 w-4 mr-1" /> PDF
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => doc && handleSendEmail(doc)}
                        disabled={!doc}
                      >
                        <Mail className="h-4 w-4 mr-1" /> Send
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => handleSave(tab.type)}
                        disabled={saving || !hasChanges || activeTab !== tab.type}
                        className="bg-[#c8973e] hover:bg-[#b8872e] text-white"
                      >
                        <Save className="h-4 w-4 mr-1" /> Save
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <Textarea
                    value={editedContent[tab.type] || ""}
                    onChange={(e) =>
                      setEditedContent((prev) => ({ ...prev, [tab.type]: e.target.value }))
                    }
                    className="min-h-[500px] font-mono text-sm leading-relaxed resize-y"
                    placeholder="Enter document content (Markdown supported)..."
                  />
                  <p className="text-xs text-muted-foreground mt-2">
                    Tip: Use Markdown formatting — # for headings, **bold**, - for lists, | for tables.
                    {tab.type === "installation_agreement" && (
                      <span className="block mt-1 text-amber-600">
                        Use placeholders like {"{{customer_name}}"}, {"{{material}}"}, {"{{total}}"} for auto-fill with order data.
                      </span>
                    )}
                    {tab.type === "lien_waiver" && (
                      <span className="block mt-1 text-amber-600">
                        Use placeholders like {"{{customer_name}}"}, {"{{property_address}}"}, {"{{amount_paid}}"} for auto-fill.
                      </span>
                    )}
                  </p>
                </CardContent>
              </Card>
            </TabsContent>
          );
        })}
      </Tabs>
    </div>
  );
};

/** Simple markdown-to-HTML converter for legal docs */
function markdownToHtml(md: string): string {
  return md
    .replace(/^### (.+)$/gm, "<h3>$1</h3>")
    .replace(/^## (.+)$/gm, "<h2>$1</h2>")
    .replace(/^# (.+)$/gm, "<h1>$1</h1>")
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/^---$/gm, "<hr/>")
    .replace(/^- (.+)$/gm, "<li>$1</li>")
    .replace(/(<li>.*<\/li>\n?)+/g, (m) => `<ul>${m}</ul>`)
    .replace(/^\d+\. (.+)$/gm, "<li>$1</li>")
    .replace(/\n{2,}/g, "</p><p>")
    .replace(/\|(.+)\|/g, (match) => {
      const cells = match.split("|").filter(Boolean).map((c) => c.trim());
      if (cells.every((c) => /^[-]+$/.test(c))) return "";
      const tag = cells.some((c) => c.startsWith("**")) ? "th" : "td";
      return `<tr>${cells.map((c) => `<${tag}>${c.replace(/\*\*/g, "")}</${tag}>`).join("")}</tr>`;
    })
    .replace(/(<tr>.*<\/tr>\n?)+/g, (m) => `<table>${m}</table>`)
    .replace(/^(?!<[hultpo])/gm, "<p>")
    .replace(/\n/g, "<br/>");
}

export default AdminLegal;
