// @ts-ignore TS6133
import { expect, test } from "@jest/globals";

import { util } from "../helpers/util";
import * as z from "../index";

const minTwo = z.string().array().min(2);
const maxTwo = z.string().array().max(2);
const justTwo = z.string().array().length(2);
const intNum = z.string().array().nonempty();
const nonEmptyMax = z.string().array().nonempty().max(2);

type t1 = z.infer<typeof nonEmptyMax>;
util.assertEqual<[string, ...string[]], t1>(true);

type t2 = z.infer<typeof minTwo>;
util.assertEqual<string[], t2>(true);

test("passing validations", () => {
  minTwo.parse(["a", "a"]);
  minTwo.parse(["a", "a", "a"]);
  maxTwo.parse(["a", "a"]);
  maxTwo.parse(["a"]);
  justTwo.parse(["a", "a"]);
  intNum.parse(["a"]);
  nonEmptyMax.parse(["a"]);
});

test("failing validations", () => {
  expect(() => minTwo.parse(["a"])).toThrow();
  expect(() => maxTwo.parse(["a", "a", "a"])).toThrow();
  expect(() => justTwo.parse(["a"])).toThrow();
  expect(() => justTwo.parse(["a", "a", "a"])).toThrow();
  expect(() => intNum.parse([])).toThrow();
  expect(() => nonEmptyMax.parse([])).toThrow();
  expect(() => nonEmptyMax.parse(["a", "a", "a"])).toThrow();
});

test("parse empty array in nonempty", () => {
  expect(() =>
    z
      .array(z.string())
      .nonempty()
      .parse([] as any)
  ).toThrow();
});

test("get element", () => {
  justTwo.element.parse("asdf");
  expect(() => justTwo.element.parse(12)).toThrow();
});

test("continue parsing despite array size error", () => {
  const schema = z.object({
    people: z.string().array().min(2),
  });

  const result = schema.safeParse({
    people: [123],
  });
  expect(result.success).toEqual(false);
  if (!result.success) {
    expect(result.error.issues.length).toEqual(2);
  }
});

test("an upper size bound fails before any element is parsed", () => {
  let parsed = 0;
  const el = z.string().refine(() => ++parsed);
  let refined = 0;
  const schema = z
    .array(el)
    .max(2, "too many")
    .refine(() => ++refined);
  const summarize = (result: z.SafeParseReturnType<any, any>) =>
    result.error!.issues.map(({ code, path, message }) => ({
      code,
      path,
      message,
    }));
  expect(summarize(schema.safeParse(["a", "b", "c"]))).toEqual([
    { code: "too_big", path: [], message: "too many" },
  ]);
  const exact = z.array(el).length(2).safeParse(["a", "b", "c"]).error!.issues;
  expect(exact.length).toEqual(1);
  expect(exact[0].code).toEqual("too_big");
  expect((exact[0] as z.ZodTooBigIssue).exact).toEqual(true);
  expect(
    summarize(z.object({ a: z.array(el).max(1) }).safeParse({ a: ["a", "b"] }))
  ).toEqual([
    {
      code: "too_big",
      path: ["a"],
      message: "Array must contain at most 1 element(s)",
    },
  ]);
  expect([parsed, refined]).toEqual([0, 0]);
});

test("parse should fail given sparse array", () => {
  const schema = z.array(z.string()).nonempty().min(1).max(3);

  expect(() => schema.parse(new Array(3))).toThrow();
});
