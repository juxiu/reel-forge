import fs from "node:fs";

/**
 * contracts/*.schema.json 用的**最小** JSON Schema 校验器（纯 stdlib，无依赖）。
 *
 * 为什么要自己写：`npm run verify:contracts` 原来只把 17 个 schema 逐个 JSON.parse 一遍 ——
 * 那证明的是「文件是合法 JSON」，不是「产物符合契约」。契约文件最容易烂成的就是这个样子：
 * 看着有、一条断言都没执行过，于是它比没有契约更危险（下一个人会以为有人在管）。
 *
 * 支持的关键字就是这批 schema 实际用到的那些。⚠ 遇到不认识的关键字一律**抛错**而不是忽略：
 * 静默忽略一个约束，正好复刻了上面那个假门禁 —— 而且是朝着「绿」的方向复刻。
 */

const KEYWORDS = new Set([
  "$schema", "type", "required", "properties", "additionalProperties", "items",
  "minItems", "maxItems", "minimum", "maximum", "exclusiveMinimum", "exclusiveMaximum",
  "const", "enum", "pattern", "allOf", "anyOf", "if", "then", "minProperties",
]);

function typeName(v) {
  if (Array.isArray(v)) return "array";
  if (v === null) return "null";
  if (Number.isInteger(v)) return "integer";
  if (typeof v === "number") return "number";
  return typeof v;
}

function typeMatches(value, type) {
  const actual = typeName(value);
  if (type === "number") return actual === "number" || actual === "integer";
  if (type === "integer") return actual === "integer";
  return actual === type;
}

/**
 * @returns 违规字符串数组；空数组 = 通过。
 * 一次性收集所有违规而不是首个就抛：改产物的人要一次看全，不该来回跑三遍。
 */
/** 纯注记关键字：带它们不校验，但也不许因此以为「这条契约生效了」。 */
const ANNOTATIONS = new Set(["$schema", "description"]);

export function validate(schema, value, at = "$", errors = []) {
  for (const key of Object.keys(schema)) {
    if (ANNOTATIONS.has(key)) continue; // 声明草案版本 / 给人读的说明，都不是约束
    if (!KEYWORDS.has(key)) throw new Error(`${at} 用了本校验器不支持的关键字 "${key}"：要么补进 src/contracts/validate.mjs，要么改契约，绝不能当它不存在`);
  }

  if (schema.type) {
    const types = Array.isArray(schema.type) ? schema.type : [schema.type];
    if (!types.some((t) => typeMatches(value, t))) {
      errors.push(`${at}：类型应为 ${types.join("/")}，实际 ${typeName(value)}`);
      return errors; // 类型都不对，继续查子字段只会刷无关错误
    }
  }

  if ("const" in schema && value !== schema.const) errors.push(`${at}：应为 ${JSON.stringify(schema.const)}，实际 ${JSON.stringify(value)}`);
  if (schema.enum && !schema.enum.includes(value)) errors.push(`${at}：应属于 ${JSON.stringify(schema.enum)}，实际 ${JSON.stringify(value)}`);

  if (typeof value === "number") {
    if ("minimum" in schema && value < schema.minimum) errors.push(`${at}：${value} 小于最小值 ${schema.minimum}`);
    if ("maximum" in schema && value > schema.maximum) errors.push(`${at}：${value} 大于最大值 ${schema.maximum}`);
    if ("exclusiveMinimum" in schema && value <= schema.exclusiveMinimum) errors.push(`${at}：${value} 不大于 ${schema.exclusiveMinimum}`);
    if ("exclusiveMaximum" in schema && value >= schema.exclusiveMaximum) errors.push(`${at}：${value} 不小于 ${schema.exclusiveMaximum}`);
  }

  if (typeof value === "string" && schema.pattern && !new RegExp(schema.pattern).test(value)) {
    errors.push(`${at}：「${value}」不匹配 /${schema.pattern}/`);
  }

  if (Array.isArray(value)) {
    if ("minItems" in schema && value.length < schema.minItems) errors.push(`${at}：只有 ${value.length} 项，需要 ≥ ${schema.minItems}`);
    if ("maxItems" in schema && value.length > schema.maxItems) errors.push(`${at}：有 ${value.length} 项，需要 ≤ ${schema.maxItems}`);
    // items 既可以是单个 schema 也可以是元组；这批 schema 只用单个，元组写法照样支持。
    if (schema.items) {
      const specs = Array.isArray(schema.items) ? schema.items : null;
      value.forEach((item, index) => validate(specs ? (specs[index] || true) : schema.items, item, `${at}[${index}]`, errors));
    }
  }

  if (value && typeof value === "object" && !Array.isArray(value)) {
    const keys = Object.keys(value);
    for (const need of schema.required || []) {
      if (!(need in value)) errors.push(`${at}：缺必填字段 "${need}"`);
    }
    if ("minProperties" in schema && keys.length < schema.minProperties) errors.push(`${at}：只有 ${keys.length} 个字段，需要 ≥ ${schema.minProperties}`);
    const props = schema.properties || {};
    for (const key of keys) {
      if (props[key]) validate(props[key], value[key], `${at}.${key}`, errors);
      else if (schema.additionalProperties === false) errors.push(`${at}：契约里没有的字段 "${key}"（additionalProperties:false）`);
      else if (typeof schema.additionalProperties === "object") validate(schema.additionalProperties, value[key], `${at}.${key}`, errors);
    }
  }

  // allOf / anyOf / if-then：子 schema 同样走「不认识就抛」这条路。
  // validate 不会改动 value，所以判定时可以直接复用同一个对象，只要把 errors 换成临时数组。
  for (const sub of schema.allOf || []) validate(sub, value, at, errors);
  if (schema.anyOf && !schema.anyOf.some((sub) => validate(sub, value, at, []).length === 0)) {
    errors.push(`${at}：anyOf 的每一个分支都不满足`);
  }
  if (schema.if) {
    // if 的判定不能污染 errors：命中与否只是选择走哪个 then/else。
    const matched = validate(schema.if, value, at, []).length === 0;
    if (matched && schema.then) validate(schema.then, value, at, errors);
  }
  return errors;
}

/** 读文件 → 校验，返回 {ok, errors}；文件缺失由调用方决定是「跳过」还是「失败」。 */
export function validateFile(schemaPath, valuePath) {
  const schema = JSON.parse(fs.readFileSync(schemaPath, "utf8"));
  const value = JSON.parse(fs.readFileSync(valuePath, "utf8"));
  return {errors: validate(schema, value, valuePath), schema: schemaPath, file: valuePath};
}
