import { describe, expect, it } from "vitest";

import { createContext, isContext } from "./context.ts";

describe("context", () => {
  describe("createContext", () => {
    it("creates context with provided data", () => {
      const data = { name: "test", value: 42 };
      const ctx = createContext(data);

      expect(ctx.name).toBe("test");
      expect(ctx.value).toBe(42);
      expect(typeof ctx.with).toBe("function");
    });

    it("preserves all data properties", () => {
      const complexData = {
        string: "test",
        number: 42,
        boolean: true,
        array: [1, 2, 3],
        object: { nested: true },
        func: () => "test",
      };

      const ctx = createContext(complexData);

      expect(ctx.string).toBe("test");
      expect(ctx.number).toBe(42);
      expect(ctx.boolean).toBe(true);
      expect(ctx.array).toEqual([1, 2, 3]);
      expect(ctx.object).toEqual({ nested: true });
      expect(ctx.func()).toBe("test");
    });

    it("handles empty object", () => {
      const ctx = createContext({});

      expect(typeof ctx.with).toBe("function");
      expect(Object.keys(ctx).length).toBe(1);
    });
  });

  describe("with method", () => {
    it("extends context with new properties", () => {
      const ctx = createContext({ name: "test" });
      const extended = ctx.with({ age: 25, active: true });

      expect(extended.name).toBe("test");
      expect(extended.age).toBe(25);
      expect(extended.active).toBe(true);
    });

    it("overrides existing properties", () => {
      const ctx = createContext({ name: "original", value: 1 });
      const extended = ctx.with({ name: "updated", extra: "new" });

      expect(extended.name).toBe("updated");
      expect(extended.value).toBe(1);
      expect(extended.extra).toBe("new");
    });

    it("maintains immutability of original context", () => {
      const original = createContext({ name: "test", count: 1 });
      const extended = original.with({ name: "changed", count: 2, new: true });

      // Original should remain unchanged
      expect(original.name).toBe("test");
      expect(original.count).toBe(1);
      expect("new" in original).toBe(false);

      // Extended should have new values
      expect(extended.name).toBe("changed");
      expect(extended.count).toBe(2);
      expect(extended.new).toBe(true);
    });

    it("chains multiple with calls", () => {
      const ctx = createContext({ initial: true })
        .with({ step1: "first" })
        .with({ step2: "second" })
        .with({ step3: "third" });

      expect(ctx.initial).toBe(true);
      expect(ctx.step1).toBe("first");
      expect(ctx.step2).toBe("second");
      expect(ctx.step3).toBe("third");
    });

    it("handles complex data types in extensions", () => {
      const ctx = createContext({ base: true });
      const extended = ctx.with({
        array: [1, 2, 3],
        object: { nested: { deep: true } },
        func: (x: number) => x * 2,
        date: new Date("2023-01-01"),
      });

      expect(extended.array).toEqual([1, 2, 3]);
      expect(extended.object.nested.deep).toBe(true);
      expect(extended.func(5)).toBe(10);
      expect(extended.date.getFullYear()).toBe(2023);
    });

    it("preserves with function across extensions", () => {
      const ctx = createContext({ name: "test" });
      const extended = ctx.with({ age: 25 });
      const furtherExtended = extended.with({ active: true });

      expect(typeof ctx.with).toBe("function");
      expect(typeof extended.with).toBe("function");
      expect(typeof furtherExtended.with).toBe("function");
    });
  });

  describe("isContext", () => {
    it("identifies valid context objects", () => {
      const ctx = createContext({ name: "test" });
      expect(isContext(ctx)).toBe(true);
    });

    it("identifies extended context objects", () => {
      const ctx = createContext({ name: "test" }).with({ age: 25 });
      expect(isContext(ctx)).toBe(true);
    });

    it("identifies deeply extended context objects", () => {
      const ctx = createContext({ a: 1 })
        .with({ b: 2 })
        .with({ c: 3 })
        .with({ d: 4 });

      expect(isContext(ctx)).toBe(true);
    });

    it("rejects null and undefined", () => {
      expect(isContext(null)).toBe(false);
      expect(isContext(undefined)).toBe(false);
    });

    it("rejects primitive values", () => {
      expect(isContext("string")).toBe(false);
      expect(isContext(42)).toBe(false);
      expect(isContext(true)).toBe(false);
      expect(isContext(Symbol("test"))).toBe(false);
      expect(isContext(BigInt(123))).toBe(false);
    });

    it("rejects plain objects", () => {
      expect(isContext({})).toBe(false);
      expect(isContext({ name: "test" })).toBe(false);
      expect(isContext({ with: undefined })).toBe(false);
    });

    it("rejects arrays", () => {
      expect(isContext([])).toBe(false);
      expect(isContext([1, 2, 3])).toBe(false);
    });

    it("rejects objects with non-function 'with' property", () => {
      expect(isContext({ with: "not-function" })).toBe(false);
      expect(isContext({ with: 42 })).toBe(false);
      expect(isContext({ with: {} })).toBe(false);
      expect(isContext({ with: [] })).toBe(false);
      expect(isContext({ with: null })).toBe(false);
    });

    it("rejects functions", () => {
      expect(isContext(() => {})).toBe(false);
    });

    it("rejects objects with unbranded 'with' function", () => {
      const fake = {
        with: () => {},
        someData: true,
      };
      expect(isContext(fake)).toBe(false);
    });
  });

  describe("context behavior with router patterns", () => {
    it("works with typical router context data", () => {
      const request = new Request("http://localhost/api/users/123");
      const params = { id: "123" };

      const ctx = createContext({ params, request });

      expect(ctx.request).toBe(request);
      expect(ctx.params).toEqual(params);
    });

    it("supports middleware pattern extensions", () => {
      const request = new Request("http://localhost/api/users");
      const params = {};

      const ctx = createContext({ params, request })
        .with({ user: { id: "123", name: "John" } })
        .with({ permissions: ["read", "write"] })
        .with({ validated: true });

      expect(ctx.request).toBe(request);
      expect(ctx.user.name).toBe("John");
      expect(ctx.permissions).toEqual(["read", "write"]);
      expect(ctx.validated).toBe(true);
    });

    it("handles authentication flow context", () => {
      const ctx = createContext({
        params: {},
      })
        .with({ token: "jwt-token-123" })
        .with({ user: { id: "user-123", role: "admin" } })
        .with({ scopes: ["read:all", "write:all"] });

      expect(ctx.token).toBe("jwt-token-123");
      expect(ctx.user.role).toBe("admin");
      expect(ctx.scopes).toContain("read:all");
    });
  });

  describe("edge cases", () => {
    it("handles extending with empty object", () => {
      const ctx = createContext({ name: "test" });
      const extended = ctx.with({});

      expect(extended.name).toBe("test");
      expect(typeof extended.with).toBe("function");
    });

    it("handles falsy values in context data", () => {
      const ctx = createContext({
        zero: 0,
        emptyString: "",
        false: false,
        nullValue: null,
      });

      expect(ctx.zero).toBe(0);
      expect(ctx.emptyString).toBe("");
      expect(ctx.false).toBe(false);
      expect(ctx.nullValue).toBe(null);
    });

    it("handles extending with falsy values", () => {
      const ctx = createContext({ name: "test" });
      const extended = ctx.with({
        zero: 0,
        emptyString: "",
        false: false,
        nullValue: null,
      });

      expect(extended.name).toBe("test");
      expect(extended.zero).toBe(0);
      expect(extended.emptyString).toBe("");
      expect(extended.false).toBe(false);
      expect(extended.nullValue).toBe(null);
    });
  });
});
