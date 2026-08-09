"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { DayPicker } from "react-day-picker";
import "react-day-picker/style.css";
import type { Service } from "@/generated/prisma";
import type { GeocodeResult } from "@/domain/geocoding/types";
import { AddressAutocomplete } from "@/components/AddressAutocomplete";
import { searchAddressAction, checkZoneAction, getSlotsAction, submitBookingAction, type SlotDto } from "./actions";

type Step = "address" | "services" | "slot";

function formatEuros(cents: number): string {
  return `€${(cents / 100).toFixed(2)}`;
}

// Local calendar date, not UTC — toISOString() shifts by the browser's
// offset and can land on the wrong day near midnight in Europe/Madrid.
function toIsoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function BookingWizard({
  services,
  savedAddress,
}: {
  services: Service[];
  savedAddress?: GeocodeResult;
}) {
  const router = useRouter();
  const [step, setStep] = useState<Step>("address");

  const [selectedAddress, setSelectedAddress] = useState<GeocodeResult | null>(null);
  const [insideServiceArea, setInsideServiceArea] = useState<boolean | null>(null);
  const [checkingZone, setCheckingZone] = useState(false);
  const [addressPrefilled, setAddressPrefilled] = useState(false);

  const [quantities, setQuantities] = useState<Record<string, number>>({});

  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [slots, setSlots] = useState<SlotDto[] | null>(null);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [slotsError, setSlotsError] = useState<string | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<SlotDto | null>(null);

  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const lineItems = useMemo(
    () =>
      services
        .map((s) => ({ service: s, quantity: quantities[s.id] ?? 0 }))
        .filter((li) => li.quantity > 0),
    [services, quantities],
  );
  const totalDurationMinutes = lineItems.reduce((sum, li) => sum + li.service.durationMinutes * li.quantity, 0);
  const totalPriceCents = lineItems.reduce((sum, li) => sum + li.service.priceCents * li.quantity, 0);

  async function handleSelectAddress(result: GeocodeResult | null) {
    setSelectedAddress(result);
    setInsideServiceArea(null);
    if (!result) return;

    setCheckingZone(true);
    const { insideServiceArea: inside } = await checkZoneAction(result.latitude, result.longitude);
    setInsideServiceArea(inside);
    setCheckingZone(false);
  }

  function handleUseSavedAddress() {
    if (!savedAddress) return;
    setAddressPrefilled(true);
    void handleSelectAddress(savedAddress);
  }

  async function handleSelectDate(picked: Date | undefined) {
    setSelectedDate(picked);
    setSlots(null);
    setSelectedSlot(null);
    setSlotsError(null);
    if (!picked) return;

    setLoadingSlots(true);
    const result = await getSlotsAction(toIsoDate(picked), totalDurationMinutes);
    if (result.error) setSlotsError(result.error);
    else setSlots(result.slots ?? []);
    setLoadingSlots(false);
  }

  async function handleSubmit() {
    if (!selectedAddress || !selectedSlot) return;
    setSubmitting(true);
    setSubmitError(null);
    const result = await submitBookingAction({
      address: selectedAddress.formattedAddress,
      latitude: selectedAddress.latitude,
      longitude: selectedAddress.longitude,
      startAt: selectedSlot.startAt,
      serviceSelections: lineItems.map((li) => ({ serviceId: li.service.id, quantity: li.quantity })),
    });
    setSubmitting(false);
    if (result.error) {
      setSubmitError(result.error);
      return;
    }
    router.push(`/appointments/${result.appointmentId}`);
  }

  return (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-6 px-6 py-12">
      {step === "address" && (
        <section className="flex flex-col gap-3">
          <h1 className="text-xl font-semibold">Where should we come?</h1>
          {savedAddress && !addressPrefilled && (
            <button
              onClick={handleUseSavedAddress}
              className="self-start rounded-full border border-black/15 px-4 py-1.5 text-sm dark:border-white/20"
            >
              Use my address ({savedAddress.formattedAddress})
            </button>
          )}
          <AddressAutocomplete
            key={addressPrefilled ? "prefilled" : "empty"}
            search={searchAddressAction}
            onSelect={handleSelectAddress}
            placeholder="Calle Example 123, Madrid"
            showCoordinates={false}
            defaultValue={addressPrefilled ? savedAddress?.formattedAddress : undefined}
            defaultResult={addressPrefilled ? savedAddress : undefined}
          />

          {checkingZone && <p className="text-sm text-zinc-500">Checking service area...</p>}
          {!checkingZone && insideServiceArea === false && (
            <p className="text-sm text-red-600">We don&apos;t currently provide services at this address.</p>
          )}
          {!checkingZone && insideServiceArea && selectedAddress && (
            <div className="flex flex-col gap-2 rounded border border-green-600/30 bg-green-50 p-3 text-sm dark:bg-green-950">
              <p>This address is within our service area.</p>
              <p className="text-zinc-500">{selectedAddress.formattedAddress}</p>
              <button
                onClick={() => setStep("services")}
                className="self-start rounded bg-black px-4 py-2 text-white dark:bg-white dark:text-black"
              >
                Continue
              </button>
            </div>
          )}
        </section>
      )}

      {step === "services" && (
        <section className="flex flex-col gap-3">
          <h1 className="text-xl font-semibold">Select services</h1>
          {services.map((service) => (
            <div key={service.id} className="flex items-center justify-between border-b border-black/10 py-2 dark:border-white/10">
              <div>
                <p className="font-medium">{service.name}</p>
                <p className="text-sm text-zinc-500">
                  {service.durationMinutes} min · {formatEuros(service.priceCents)}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setQuantities((q) => ({ ...q, [service.id]: Math.max(0, (q[service.id] ?? 0) - 1) }))}
                  className="h-8 w-8 rounded border border-black/15 dark:border-white/20"
                >
                  -
                </button>
                <span className="w-6 text-center">{quantities[service.id] ?? 0}</span>
                <button
                  onClick={() => setQuantities((q) => ({ ...q, [service.id]: (q[service.id] ?? 0) + 1 }))}
                  className="h-8 w-8 rounded border border-black/15 dark:border-white/20"
                >
                  +
                </button>
              </div>
            </div>
          ))}

          {lineItems.length > 0 && (
            <div className="mt-4 flex flex-col gap-1 text-sm">
              <div className="flex justify-between font-medium">
                <span>Total</span>
                <span>{formatEuros(totalPriceCents)}</span>
              </div>
              <div className="flex justify-between text-zinc-500">
                <span>Duration</span>
                <span>{totalDurationMinutes} min</span>
              </div>
            </div>
          )}

          <div className="mt-4 flex gap-2">
            <button onClick={() => setStep("address")} className="rounded border border-black/15 px-4 py-2 text-sm dark:border-white/20">
              Back
            </button>
            <button
              onClick={() => setStep("slot")}
              disabled={lineItems.length === 0}
              className="rounded bg-black px-4 py-2 text-sm text-white disabled:opacity-50 dark:bg-white dark:text-black"
            >
              Continue
            </button>
          </div>
        </section>
      )}

      {step === "slot" && (
        <section className="flex flex-col gap-3">
          <h1 className="text-xl font-semibold">Pick a time</h1>
          <DayPicker
            mode="single"
            selected={selectedDate}
            onSelect={handleSelectDate}
            disabled={{ before: today }}
            className="self-start"
          />

          {loadingSlots && <p className="text-sm text-zinc-500">Loading times...</p>}
          {slotsError && <p className="text-sm text-red-600">{slotsError}</p>}
          {slots && slots.length === 0 && !slotsError && !loadingSlots && (
            <p className="text-sm text-zinc-500">There are no available appointments for this date.</p>
          )}
          {slots && slots.length > 0 && (
            <div className="grid grid-cols-4 gap-2">
              {slots.map((slot) => {
                const label = new Date(slot.startAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
                const isSelected = selectedSlot?.startAt === slot.startAt;
                return (
                  <button
                    key={slot.startAt}
                    onClick={() => setSelectedSlot(slot)}
                    className={`rounded border px-3 py-2 text-sm ${
                      isSelected ? "border-black bg-black text-white dark:border-white dark:bg-white dark:text-black" : "border-black/15 dark:border-white/20"
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          )}

          {selectedSlot && (
            <div className="mt-4 flex flex-col gap-2 rounded border border-black/10 p-3 text-sm dark:border-white/10">
              <p className="font-medium">Review</p>
              <p>{selectedAddress?.formattedAddress}</p>
              {lineItems.map((li) => (
                <p key={li.service.id}>
                  {li.service.name} × {li.quantity}
                </p>
              ))}
              <p>Total: {formatEuros(totalPriceCents)}</p>
              {submitError && <p className="text-red-600">{submitError}</p>}
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="mt-2 self-start rounded bg-black px-4 py-2 text-white disabled:opacity-50 dark:bg-white dark:text-black"
              >
                {submitting ? "Requesting..." : "Request appointment"}
              </button>
            </div>
          )}

          <button onClick={() => setStep("services")} className="mt-2 self-start rounded border border-black/15 px-4 py-2 text-sm dark:border-white/20">
            Back
          </button>
        </section>
      )}
    </div>
  );
}
