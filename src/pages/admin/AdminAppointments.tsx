import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const AdminAppointments = () => (
  <div className="space-y-6">
    <h1 className="text-2xl font-bold tracking-tight">Appointments</h1>
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Coming Soon</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground">Appointment scheduling management will be available here.</p>
      </CardContent>
    </Card>
  </div>
);

export default AdminAppointments;
