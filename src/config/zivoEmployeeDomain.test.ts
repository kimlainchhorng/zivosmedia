import { describe, expect, it } from "vitest";

import {
  ZIVO_EMPLOYEE_HOME_PATH,
  ZIVO_EMPLOYEE_HOSTS,
  ZIVO_EMPLOYEE_ORIGIN,
  isZivoEmployeeHost,
  isZivoEmployeePath,
} from "./zivoEmployeeDomain";

describe("zivo employee domain config", () => {
  it("recognizes apex and www zivoemployee hosts only", () => {
    expect(isZivoEmployeeHost("zivoemployee.com")).toBe(true);
    expect(isZivoEmployeeHost("www.zivoemployee.com")).toBe(true);
    expect(isZivoEmployeeHost("ZIVOEMPLOYEE.COM")).toBe(true);
    expect(isZivoEmployeeHost("zivosmedia.com")).toBe(false);
    expect(isZivoEmployeeHost("zivobusiness.com")).toBe(false);
    expect(isZivoEmployeeHost("zivosoftware.com")).toBe(false);
    expect(isZivoEmployeeHost("preview.zivoemployee.com")).toBe(false);
    expect(isZivoEmployeeHost("")).toBe(false);
    expect(isZivoEmployeeHost(null)).toBe(false);
    expect(isZivoEmployeeHost(undefined)).toBe(false);
  });

  it("uses zivoemployee.com as the employee origin and home", () => {
    expect(ZIVO_EMPLOYEE_ORIGIN).toBe("https://zivoemployee.com");
    expect(ZIVO_EMPLOYEE_HOME_PATH).toBe("/");
    expect(ZIVO_EMPLOYEE_HOSTS.has("zivoemployee.com")).toBe(true);
    expect(ZIVO_EMPLOYEE_HOSTS.has("www.zivoemployee.com")).toBe(true);
  });

  it("allows the employee landing, account, and shared identity surfaces", () => {
    expect(isZivoEmployeePath("/")).toBe(true);
    expect(isZivoEmployeePath("/account")).toBe(true);
    expect(isZivoEmployeePath("/account/profile-edit")).toBe(true);
    expect(isZivoEmployeePath("/support")).toBe(true);
    expect(isZivoEmployeePath("/login")).toBe(true);
    expect(isZivoEmployeePath("/legal/privacy")).toBe(true);
    expect(isZivoEmployeePath("/assets/logo.png")).toBe(true);
    expect(isZivoEmployeePath("/favicon.ico")).toBe(true);
    expect(isZivoEmployeePath("/manifest.webmanifest")).toBe(true);
  });

  it("blocks the generic super-app feed and surfaces owned by other hosts", () => {
    expect(isZivoEmployeePath("/feed")).toBe(false);
    expect(isZivoEmployeePath("/flights")).toBe(false);
    expect(isZivoEmployeePath("/hotels")).toBe(false);
    expect(isZivoEmployeePath("/chat")).toBe(false);
    expect(isZivoEmployeePath("/driver")).toBe(false);
    expect(isZivoEmployeePath("/reels")).toBe(false);
    // employee is staff-facing only: the business owner surfaces are not its routes
    expect(isZivoEmployeePath("/business")).toBe(false);
    expect(isZivoEmployeePath("/business/dashboard")).toBe(false);
  });
});
