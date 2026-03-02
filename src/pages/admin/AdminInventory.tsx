import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Package, Layers, Wrench } from "lucide-react";
import { SlabsManager } from "@/components/admin/inventory/SlabsManager";
import { MaterialsManager } from "@/components/admin/inventory/MaterialsManager";
import { ServicesManager } from "@/components/admin/inventory/ServicesManager";

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
          <TabsTrigger value="services" className="gap-1.5">
            <Wrench className="h-4 w-4" />
            Services
          </TabsTrigger>
        </TabsList>

        <TabsContent value="slabs">
          <SlabsManager />
        </TabsContent>

        <TabsContent value="materials">
          <MaterialsManager />
        </TabsContent>

        <TabsContent value="services">
          <ServicesManager />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminInventory;
