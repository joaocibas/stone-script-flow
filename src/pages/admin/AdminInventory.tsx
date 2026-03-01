import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Package, Layers } from "lucide-react";
import { SlabsManager } from "@/components/admin/inventory/SlabsManager";
import { MaterialsManager } from "@/components/admin/inventory/MaterialsManager";

const AdminInventory = () => {
  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl font-semibold">Inventory Management</h1>

      <Tabs defaultValue="slabs" className="space-y-4">
        <TabsList>
          <TabsTrigger value="slabs" className="gap-1.5">
            <Package className="h-4 w-4" />
            Slabs
          </TabsTrigger>
          <TabsTrigger value="materials" className="gap-1.5">
            <Layers className="h-4 w-4" />
            Materials
          </TabsTrigger>
        </TabsList>

        <TabsContent value="slabs">
          <SlabsManager />
        </TabsContent>

        <TabsContent value="materials">
          <MaterialsManager />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminInventory;
