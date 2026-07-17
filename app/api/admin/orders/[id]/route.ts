import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/admin-auth";
import type { OrderStatus } from "@/lib/types";
import { ORDER_STATUS_OPTIONS } from "@/lib/constants";
import {
  requiresDeliveryDispatch,
  SELF_DELIVERY_VENDOR,
} from "@/lib/order-status-update";
import {
  canTransitionOrderStatus,
} from "@/lib/order-status-transitions";
import {
  fulfillPaidOrder,
  shouldFulfillOnStatusChange,
} from "@/lib/order-payment";
import { formatDispatchEtaFromWindow } from "@/lib/whatsapp/template-components";
import { notifyOrderStatusChange } from "@/lib/whatsapp/notifications";
import {
  listActiveDeliveryVendors,
  resolveDeliveryVendorName,
} from "@/lib/delivery-vendors";
import { getOrderAdminAlerts } from "@/lib/alerts/notify-admin";
import {
  ADMIN_ORDER_DETAIL_SELECT,
  ADMIN_ORDER_LIST_SELECT,
} from "@/lib/admin-orders-query";
// Borzo API auto-dispatch paused — restore these imports with the block below.
// import { getShopSettings } from "@/lib/data";
// import { isBorzoConfigured } from "@/lib/borzo/config";
// import { dispatchBorzoDelivery, isBorzoVendorName } from "@/lib/borzo/delivery";
// import { BorzoApiError } from "@/lib/borzo/client";
// import { BORZO_VENDOR_NAME } from "@/lib/order-status-update";

const VALID_STATUSES = new Set(ORDER_STATUS_OPTIONS.map((s) => s.key));

function parseDeliveryEtaDisplay(body: {
  delivery_eta_date?: string;
  delivery_eta_window_start?: string;
  delivery_eta_window_end?: string;
}): string | null {
  const date = body.delivery_eta_date?.trim();
  const windowStart = body.delivery_eta_window_start?.trim();
  const windowEnd = body.delivery_eta_window_end?.trim();
  if (!date || !windowStart || !windowEnd) return null;
  return formatDispatchEtaFromWindow(date, windowStart, windowEnd);
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;

  const { id } = await params;
  const admin = createAdminClient();

  const [{ data, error }, adminAlerts] = await Promise.all([
    admin
      .from("orders")
      .select(ADMIN_ORDER_DETAIL_SELECT)
      .eq("id", id)
      .single(),
    getOrderAdminAlerts(id),
  ]);

  if (error || !data) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  return NextResponse.json({ ...data, admin_alerts: adminAlerts });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;

  const { id } = await params;
  const body = await request.json();
  const {
    status,
    dispatch_mode,
    delivery_partner_order_id,
    delivery_vendor,
    delivery_otp,
    delivery_partner_name,
    delivery_eta_date,
    delivery_eta_window_start,
    delivery_eta_window_end,
  } = body as {
    status?: OrderStatus;
    dispatch_mode?: "partner" | "self";
    delivery_partner_order_id?: string;
    delivery_vendor?: string;
    delivery_otp?: string;
    delivery_partner_name?: string;
    delivery_eta_date?: string;
    delivery_eta_window_start?: string;
    delivery_eta_window_end?: string;
  };

  if (!status || !VALID_STATUSES.has(status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  if (status === "cancelled") {
    return NextResponse.json(
      { error: "Use cancel with cancellation notes" },
      { status: 400 }
    );
  }

  const admin = createAdminClient();
  const { data: order } = await admin
    .from("orders")
    .select("*")
    .eq("id", id)
    .single();

  if (!order) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  if (order.status === "cancelled") {
    return NextResponse.json({ error: "Cannot update a cancelled order" }, { status: 400 });
  }

  const transition = canTransitionOrderStatus(
    order.status as OrderStatus,
    status,
    order.payment_status,
    order.order_source
  );
  if (!transition.ok) {
    return NextResponse.json({ error: transition.error }, { status: 400 });
  }

  if (
    order.payment_status === "pending" &&
    order.order_source !== "offline" &&
    status !== "pending"
  ) {
    return NextResponse.json(
      { error: "Cannot advance fulfillment until payment is received" },
      { status: 400 }
    );
  }

  const fulfilling = shouldFulfillOnStatusChange(
    order.status as OrderStatus,
    status,
    order.payment_status,
    order.order_source
  );

  if (fulfilling) {
    await fulfillPaidOrder(id);
  }

  if (requiresDeliveryDispatch(status)) {
    const deliveryEtaDisplay = parseDeliveryEtaDisplay({
      delivery_eta_date,
      delivery_eta_window_start,
      delivery_eta_window_end,
    });

    if (!deliveryEtaDisplay) {
      return NextResponse.json(
        { error: "Delivery ETA date and time window are required" },
        { status: 400 }
      );
    }

    const isSelfDispatch = dispatch_mode === "self";

    if (isSelfDispatch) {
      const { data, error } = await admin
        .from("orders")
        .update({
          status,
          delivery_vendor: SELF_DELIVERY_VENDOR,
          delivery_partner_order_id: null,
          delivery_otp: null,
          delivery_partner_name: null,
          delivery_eta_display: deliveryEtaDisplay,
          out_for_delivery_at: new Date().toISOString(),
        })
        .eq("id", id)
        .select(ADMIN_ORDER_LIST_SELECT)
        .single();

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      if (order.status !== status) {
        void notifyOrderStatusChange(id, status, {
          estimatedArrival: deliveryEtaDisplay,
        });
      }

      return NextResponse.json(data);
    }

    const vendorInput = delivery_vendor?.trim();
    const vendors = await listActiveDeliveryVendors(admin);

    if (!vendorInput) {
      return NextResponse.json(
        { error: "Select a delivery vendor for out for delivery" },
        { status: 400 }
      );
    }

    const vendor = resolveDeliveryVendorName(vendors, vendorInput);
    if (!vendor) {
      return NextResponse.json(
        { error: "Select a valid delivery vendor" },
        { status: 400 }
      );
    }

    const partnerOrderId = delivery_partner_order_id?.trim();
    const otp = delivery_otp?.trim();
    const partnerName = delivery_partner_name?.trim();

    if (!partnerOrderId || !otp || !partnerName) {
      return NextResponse.json(
        {
          error:
            "Order ID, OTP, and delivery partner name are required for out for delivery",
        },
        { status: 400 }
      );
    }

    // Borzo API auto-dispatch paused — treat Borzo like Rapido / other vendors
    // (manual Order ID, OTP, partner name). Re-enable by restoring the block below.
    //
    // if (isBorzoVendorName(vendor.name)) {
    //   if (!isBorzoConfigured()) {
    //     return NextResponse.json(
    //       { error: "Borzo delivery is not configured on the server" },
    //       { status: 503 }
    //     );
    //   }
    //
    //   const settings = await getShopSettings();
    //   if (!settings) {
    //     return NextResponse.json({ error: "Shop not configured" }, { status: 500 });
    //   }
    //
    //   let borzoDispatch;
    //   try {
    //     borzoDispatch = await dispatchBorzoDelivery(order, settings, {
    //       deliveryOtp: otp,
    //       partnerName,
    //     });
    //   } catch (err) {
    //     console.error("Borzo dispatch failed:", err);
    //     const message =
    //       err instanceof BorzoApiError
    //         ? err.message
    //         : err instanceof Error
    //           ? err.message
    //           : "Failed to create Borzo delivery";
    //     return NextResponse.json({ error: message }, { status: 502 });
    //   }
    //
    //   const { data, error } = await admin
    //     .from("orders")
    //     .update({
    //       status,
    //       delivery_partner_order_id: borzoDispatch.borzo_order_id,
    //       delivery_vendor: BORZO_VENDOR_NAME,
    //       delivery_otp: otp,
    //       delivery_partner_name: partnerName,
    //       delivery_eta_display: deliveryEtaDisplay,
    //       out_for_delivery_at: new Date().toISOString(),
    //     })
    //     .eq("id", id)
    //     .select(ADMIN_ORDER_LIST_SELECT)
    //     .single();
    //
    //   if (error) {
    //     return NextResponse.json({ error: error.message }, { status: 500 });
    //   }
    //
    //   if (order.status !== status) {
    //     void notifyOrderStatusChange(id, status, {
    //       estimatedArrival: deliveryEtaDisplay,
    //     });
    //   }
    //
    //   return NextResponse.json(data);
    // }

    const { data, error } = await admin
      .from("orders")
      .update({
        status,
        delivery_partner_order_id: partnerOrderId,
        delivery_vendor: vendor.name,
        delivery_otp: otp,
        delivery_partner_name: partnerName,
        delivery_eta_display: deliveryEtaDisplay,
        out_for_delivery_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select(ADMIN_ORDER_LIST_SELECT)
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (order.status !== status) {
      void notifyOrderStatusChange(id, status, {
        estimatedArrival: deliveryEtaDisplay,
      });
    }

    return NextResponse.json(data);
  }

  const { data, error } = await admin
    .from("orders")
    .update({ status })
    .eq("id", id)
    .select(ADMIN_ORDER_LIST_SELECT)
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (order.status !== status) {
    void notifyOrderStatusChange(id, status);
  }

  return NextResponse.json(data);
}
