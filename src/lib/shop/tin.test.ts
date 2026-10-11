import { describe, expect, it } from "vitest";
import { formatTin, last4, maskedTin, validateEin, validateItin, validateSsn, validateTin } from "./tin";

describe("TIN validation", () => {
  it("accepts a well-formed SSN, with or without dashes", () => {
    expect(validateSsn("123-45-6789")).toBeNull();
    expect(validateSsn("123456789")).toBeNull();
  });
  it("rejects SSN areas that are never issued", () => {
    expect(validateSsn("000-12-3456")).toBe("ssnArea");
    expect(validateSsn("666-12-3456")).toBe("ssnArea");
    expect(validateSsn("900-12-3456")).toBe("ssnArea");
    expect(validateSsn("999-12-3456")).toBe("ssnArea");
    expect(validateSsn("123-00-4567")).toBe("ssnGroup");
    expect(validateSsn("123-45-0000")).toBe("ssnSerial");
  });
  it("requires exactly 9 digits", () => {
    expect(validateSsn("123-45-678")).toBe("length");
    expect(validateSsn("123-45-67890")).toBe("length");
    expect(validateEin("12-345678")).toBe("length");
  });
  it("treats 9xx numbers as ITINs with the published middle ranges", () => {
    expect(validateItin("912-70-1234")).toBeNull();
    expect(validateItin("912-50-1234")).toBeNull();
    expect(validateItin("912-93-1234")).toBe("itinRange");
    expect(validateItin("912-40-1234")).toBe("itinRange");
    expect(validateItin("123-70-1234")).toBe("itinRange");
  });
  it("checks EIN campus prefixes", () => {
    expect(validateEin("12-3456789")).toBeNull();
    expect(validateEin("98-7654321")).toBeNull();
    for (const bad of ["00", "07", "08", "09", "17", "18", "19", "28", "29", "49", "69", "70", "78", "79", "89", "96", "97"]) {
      expect(validateEin(`${bad}-1234567`)).toBe("einPrefix");
    }
  });
  it("requires the confirmation to match", () => {
    expect(validateTin("ssn", "123-45-6789", "123456789")).toBeNull();
    expect(validateTin("ssn", "123-45-6789", "123-45-6788")).toBe("mismatch");
    expect(validateTin("ein", "12-3456789", "12-3456789")).toBeNull();
  });
  it("formats and masks without ever showing more than four digits", () => {
    expect(formatTin("ssn", "123456789")).toBe("123-45-6789");
    expect(formatTin("ssn", "1234")).toBe("123-4");
    expect(formatTin("ein", "123456789")).toBe("12-3456789");
    expect(last4("123-45-6789")).toBe("6789");
    expect(maskedTin("ssn", "6789")).toBe("•••• 6789");
    expect(maskedTin("ein", "6789")).toBe("•••• 6789");
  });
});
