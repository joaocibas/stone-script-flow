import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { sendEmail } from "@/lib/send-email";
import { appointmentScheduledEmail } from "@/lib/email-templates";
import { Section, SectionHeader } from "@/components/shared/Section";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { CheckCircle2, Clock, CalendarDays } from "lucide-react";
import { format, addHours, isBefore, parseISO } from "date-fns";
import { trackEvent } from "@/lib/tracking";

const TIME_SLOTS = [
  "09:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00",
];

const Schedule = () => {
  const { reservationId } = useParams<{ reservationId: string }>();
  const navigate = useNavigate();
  const [date, setDate] = useState<Date | undefined>();
  const [time, setTime] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [availableDays, setAvailableDays] = useState<number[]>([]);
  const [blockedDates, setBlockedDates] = useState<string[]>([]);
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [reservation, setReservation] = useState<any>(null);
  const [existingAppointment, setExistingAppointment] = useState<any>(null);
  const [rescheduleMode, setRescheduleMode] = useState(false);
  const [minRescheduleHours, setMinRescheduleHours] = useState(24);

  useEffect(() => {
    const load = async () => {
      // Load reservation
      if (reservationId) {
        const { data: res } = await supabase
          .from("reservations")
          .select("*, slabs(*, materials(name))")
          .eq("id", reservationId)
          .single();
        setReservation(res);

        // Check for existing appointment
        const { data: appt } = await supabase
          .from("appointments")
          .select("*")
          .eq("reservation_id", reservationId)
          .in("status", ["requested", "confirmed"])
          .limit(1)
          .single();
        if (appt) setExistingAppointment(appt);
      }

      // Load availability
      const { data: avail } = await supabase
        .from("admin_availability")
        .select("*");

      if (avail) {
        const openDays = avail.filter((a) => a.is_available && !a.specific_date).map((a) => a.day_of_week);
        setAvailableDays(openDays);
        const blocked = avail.filter((a) => !a.is_available && a.specific_date).map((a) => a.specific_date!);
        setBlockedDates(blocked);
      }

      // Load reschedule setting
      const { data: setting } = await supabase
        .from("business_settings")
        .select("value")
        .eq("key", "min_reschedule_hours")
        .single();
      if (setting) setMinRescheduleHours(Number(setting.value));

      setLoading(false);
    };
    load();
  }, [reservationId]);

  useEffect(() => {
    if (!date) return;
    // Filter time slots based on availability windows for the selected day
    const dayOfWeek = date.getDay();
    // For now use static slots filtered by available days
    if (availableDays.includes(dayOfWeek)) {
      setAvailableSlots(TIME_SLOTS);
    } else {
      setAvailableSlots([]);
    }
    setTime("");
  }, [date, availableDays]);

  const isDateDisabled = (d: Date) => {
    if (isBefore(d, new Date())) return true;
    if (!availableDays.includes(d.getDay())) return true;
    if (blockedDates.includes(format(d, "yyyy-MM-dd"))) return true;
    return false;
  };

  const canReschedule = () => {
    if (!existingAppointment?.preferred_date) return false;
    const apptDate = parseISO(existingAppointment.preferred_date);
    return isBefore(new Date(), addHours(apptDate, -minRescheduleHours));
  };

  const handleSubmit = async () => {
    if (!date || !time || !reservationId) return;
    setSubmitting(true);

    const { data: session } = await supabase.auth.getSession();
    const userId = session?.session?.user?.id;
    if (!userId) {
      toast.error("Please log in to schedule.");
      setSubmitting(false);
      return;
    }

    const { data: customer } = await supabase
      .from("customers")
      .select("*")
      .eq("user_id", userId)
      .single();

    if (!customer) {
      toast.error("Customer profile not found.");
      setSubmitting(false);
      return;
    }

    if (rescheduleMode && existingAppointment) {
      // Update existing appointment
      const { error } = await supabase
        .from("appointments")
        .update({
          preferred_date: format(date, "yyyy-MM-dd"),
          preferred_time: time,
          status: "confirmed",
        })
        .eq("id", existingAppointment.id);

      if (error) {
        toast.error("Failed to reschedule.");
        setSubmitting(false);
        return;
      }
    } else {
      // Create new appointment
      const { error } = await supabase.from("appointments").insert({
        customer_name: customer.full_name,
        customer_email: customer.email,
        customer_phone: customer.phone,
        address: customer.address || "",
        zip_code: "",
        preferred_date: format(date, "yyyy-MM-dd"),
        preferred_time: time,
        reservation_id: reservationId,
        customer_id: customer.id,
        status: "confirmed",
      });

      if (error) {
        toast.error("Failed to schedule appointment.");
        setSubmitting(false);
        return;
      }
    }

    setSubmitting(false);
    setSubmitted(true);
    trackEvent("schedule_confirmed", {
      reservation_id: reservationId,
      date: format(date, "yyyy-MM-dd"),
    });

    // Send appointment confirmation email
    try {
      const emailPayload = appointmentScheduledEmail({
        customerName: customer.full_name,
        date: format(date, "EEEE, MMMM d, yyyy"),
        time,
        address: customer.address || "",
      });
      sendEmail({ ...emailPayload, to: customer.email });
    } catch {}

    toast.success(rescheduleMode ? "Appointment rescheduled!" : "Appointment scheduled!");
  };

  if (loading) {
    return (
      <Section>
        <div className="h-96 bg-muted rounded-lg animate-pulse" />
      </Section>
    );
  }

  if (submitted) {
    return (
      <Section>
        <div className="max-w-md mx-auto text-center py-12">
          <CheckCircle2 className="h-16 w-16 text-accent mx-auto mb-4" />
          <h2 className="font-display text-2xl font-semibold mb-2">
            {rescheduleMode ? "Appointment Rescheduled!" : "Appointment Scheduled!"}
          </h2>
          <p className="text-muted-foreground mb-2">
            {date && time && `${format(date, "EEEE, MMMM d, yyyy")} at ${time}`}
          </p>
          <p className="text-sm text-muted-foreground">
            You'll receive a confirmation email shortly.
          </p>
          <Button
            className="mt-6 bg-accent text-accent-foreground hover:bg-accent/90"
            onClick={() => navigate("/dashboard")}
          >
            Go to Dashboard
          </Button>
        </div>
      </Section>
    );
  }

  // Show existing appointment with reschedule option
  if (existingAppointment && !rescheduleMode) {
    return (
      <Section>
        <SectionHeader
          title="Your Appointment"
          subtitle="Measurement consultation is scheduled"
        />
        <Card className="max-w-lg mx-auto border-0 shadow-sm">
          <CardContent className="p-6 text-center space-y-4">
            <CalendarDays className="h-12 w-12 text-accent mx-auto" />
            <div>
              <p className="font-display text-xl font-semibold">
                {existingAppointment.preferred_date &&
                  format(parseISO(existingAppointment.preferred_date), "EEEE, MMMM d, yyyy")}
              </p>
              {existingAppointment.preferred_time && (
                <p className="text-muted-foreground">{existingAppointment.preferred_time}</p>
              )}
            </div>
            <div className="flex gap-3 justify-center pt-2">
              {canReschedule() && (
                <Button
                  variant="outline"
                  onClick={() => setRescheduleMode(true)}
                >
                  <Clock className="mr-2 h-4 w-4" />
                  Reschedule
                </Button>
              )}
              <Button
                className="bg-accent text-accent-foreground hover:bg-accent/90"
                onClick={() => navigate("/dashboard")}
              >
                Go to Dashboard
              </Button>
            </div>
            {!canReschedule() && (
              <p className="text-xs text-muted-foreground">
                Reschedule must be at least {minRescheduleHours}h before appointment.
              </p>
            )}
          </CardContent>
        </Card>
      </Section>
    );
  }

  return (
    <Section>
      <SectionHeader
        title={rescheduleMode ? "Reschedule Appointment" : "Schedule Your Consultation"}
        subtitle={
          reservation
            ? `Measurement visit for ${reservation.slabs?.materials?.name || "your slab"}`
            : "Select a date and time for your in-home measurement"
        }
      />

      <Card className="max-w-2xl mx-auto border-0 shadow-sm">
        <CardContent className="p-6 md:p-8 space-y-6">
          <div>
            <p className="text-sm font-medium mb-3">Select a Date</p>
            <Calendar
              mode="single"
              selected={date}
              onSelect={setDate}
              disabled={isDateDisabled}
              className="rounded-md border mx-auto pointer-events-auto"
            />
          </div>

          {date && availableSlots.length > 0 && (
            <div>
              <p className="text-sm font-medium mb-3">Select a Time</p>
              <div className="grid grid-cols-4 gap-2">
                {availableSlots.map((slot) => (
                  <Button
                    key={slot}
                    variant={time === slot ? "default" : "outline"}
                    size="sm"
                    className={
                      time === slot
                        ? "bg-accent text-accent-foreground hover:bg-accent/90"
                        : ""
                    }
                    onClick={() => setTime(slot)}
                  >
                    {slot}
                  </Button>
                ))}
              </div>
            </div>
          )}

          {date && availableSlots.length === 0 && (
            <p className="text-sm text-muted-foreground text-center">
              No available slots on this date.
            </p>
          )}

          <Button
            className="w-full bg-accent text-accent-foreground hover:bg-accent/90"
            disabled={!date || !time || submitting}
            onClick={handleSubmit}
          >
            <CalendarDays className="mr-2 h-4 w-4" />
            {submitting
              ? "Scheduling..."
              : rescheduleMode
              ? "Confirm Reschedule"
              : "Confirm Appointment"}
          </Button>

          {rescheduleMode && (
            <Button
              variant="ghost"
              className="w-full"
              onClick={() => setRescheduleMode(false)}
            >
              Cancel Reschedule
            </Button>
          )}
        </CardContent>
      </Card>
    </Section>
  );
};

export default Schedule;
