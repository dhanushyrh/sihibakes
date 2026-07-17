import { describe, expect, it } from "vitest";
import { normalizeIndianPhone } from "@/lib/checkout-validation";

describe("customer phone identity", () => {
  it("normalizes offline and online phone inputs to the same key", () => {
    expect(normalizeIndianPhone("9876543210")).toBe("9876543210");
    expect(normalizeIndianPhone("+91 98765 43210")).toBe("9876543210");
    expect(normalizeIndianPhone("919876543210")).toBe("9876543210");
  });
});
