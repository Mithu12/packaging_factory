"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "@/components/ui/sonner";
import { ApiError } from "@/services/api";
import {
  CustomerOrdersApiService,
  FactoryCustomer,
} from "../services/customer-orders-api";

const DEFAULT_PAYMENT_TERMS = "cash_on_delivery";

export interface QuickAddCustomerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCustomerCreated?: (customer: FactoryCustomer) => void | Promise<void>;
}

/**
 * Minimal factory customer + address (order API requires non-empty shipping/billing fields).
 */
export function QuickAddCustomerDialog({
  open,
  onOpenChange,
  onCustomerCreated,
}: QuickAddCustomerDialogProps) {
  const [customerName, setCustomerName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [street, setStreet] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [country, setCountry] = useState("Bangladesh");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setCustomerName("");
      setEmail("");
      setPhone("");
      setStreet("");
      setCity("");
      setState("");
      setPostalCode("");
      setCountry("Bangladesh");
    }
  }, [open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = customerName.trim();
    const em = email.trim();
    const ph = phone.trim();

    if (!name) {
      toast.error("Customer name is required");
      return;
    }
    if (!em) {
      toast.error("Email is required");
      return;
    }
    if (!ph) {
      toast.error("Phone is required for orders (max 20 characters)");
      return;
    }
    if (ph.length > 20) {
      toast.error("Phone must be 20 characters or less (order validation)");
      return;
    }
    const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em);
    if (!emailOk) {
      toast.error("Enter a valid email address");
      return;
    }

    const st = street.trim();
    const ci = city.trim();
    const stt = state.trim();
    const zip = postalCode.trim();
    const co = country.trim();
    if (!st || !ci || !stt || !zip || !co) {
      toast.error("Complete the address (street, city, state, postal code, country)");
      return;
    }

    setIsSubmitting(true);
    try {
      const created = await CustomerOrdersApiService.createCustomer({
        name,
        email: em,
        phone: ph,
        payment_terms: DEFAULT_PAYMENT_TERMS,
        address: {
          street: st,
          city: ci,
          state: stt,
          postal_code: zip,
          country: co,
        },
      });

      toast.success("Customer created", {
        description: `${name} was added.`,
      });

      await Promise.resolve(onCustomerCreated?.(created));
      onOpenChange(false);
    } catch (error) {
      if (error instanceof ApiError) {
        toast.error("Failed to create customer", { description: error.message });
      } else {
        toast.error("Failed to create customer");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Quick add customer</DialogTitle>
          <DialogDescription>
            Contact details and a full address are required so orders can use
            shipping and billing addresses. You can edit the profile later in
            Customers.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="quick-cust-name">Name *</Label>
            <Input
              id="quick-cust-name"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              placeholder="Company or contact name"
              autoComplete="organization"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="quick-cust-email">Email *</Label>
            <Input
              id="quick-cust-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="orders@example.com"
              autoComplete="email"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="quick-cust-phone">Phone * (max 20)</Label>
            <Input
              id="quick-cust-phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value.slice(0, 20))}
              placeholder="+1 555 0100"
              autoComplete="tel"
              maxLength={20}
            />
          </div>

          <div className="space-y-3 rounded-md border p-3">
            <p className="text-sm font-medium">Address *</p>
            <div className="space-y-2">
              <Label htmlFor="quick-cust-street">Street</Label>
              <Input
                id="quick-cust-street"
                value={street}
                onChange={(e) => setStreet(e.target.value)}
                placeholder="Street address"
                maxLength={255}
                autoComplete="street-address"
              />
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="quick-cust-city">City</Label>
                <Input
                  id="quick-cust-city"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="City"
                  maxLength={100}
                  autoComplete="address-level2"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="quick-cust-state">State / region</Label>
                <Input
                  id="quick-cust-state"
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                  placeholder="State"
                  maxLength={100}
                  autoComplete="address-level1"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="quick-cust-zip">Postal code</Label>
                <Input
                  id="quick-cust-zip"
                  value={postalCode}
                  onChange={(e) => setPostalCode(e.target.value)}
                  placeholder="Postal code"
                  maxLength={20}
                  autoComplete="postal-code"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="quick-cust-country">Country</Label>
                <Input
                  id="quick-cust-country"
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                  placeholder="Country"
                  maxLength={100}
                  autoComplete="country"
                />
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Creating…" : "Create customer"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
