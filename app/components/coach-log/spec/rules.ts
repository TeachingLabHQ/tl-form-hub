// ---------------------------------------------------------------------------
// "Shows when" rule language for the Coach Log Question Spec sheet.
//
// The sheet is the source of truth for the form's questions; each question has
// a rule saying when it appears. scripts/spec/export_spec.R parses those rules
// (with an R port of this parser) into coach-log.spec.json, and the tests check
// that this parser produces the same tree, so the two can't drift apart.
//
//   rule      := "always" | expr
//   expr      := unary ( (AND | OR) unary )*    -- AND and OR can't be mixed
//                                                  without parentheses
//   unary     := NOT unary | "(" expr ")" | @fact | test
//   test      := field = "text" | field != "text"
//              | field in [..] | field not in [..]
//              | field includes "text" | field includes any of [..]
//              | field is answered | field is blank
//
// Keywords are case-insensitive; option text is exact. Curly quotes (which
// Sheets auto-corrects to) count as straight quotes.
//
// Semantics: rules are evaluated in form order, and a question that is hidden
// counts as blank for every later rule. A rule therefore only names its
// immediate trigger — hiding a parent hides everything that hangs off it.
// ---------------------------------------------------------------------------

export type RuleNode =
  | { type: "always" }
  | { type: "and" | "or"; args: RuleNode[] }
  | { type: "not"; arg: RuleNode }
  | { type: "fact"; name: string }
  | { type: "test"; field: string; op: "=" | "!=" | "includes"; value: string }
  | {
      type: "test";
      field: string;
      op: "in" | "not in" | "includes any of";
      values: string[];
    }
  | { type: "test"; field: string; op: "is answered" | "is blank" };

export type TestNode = Extract<RuleNode, { type: "test" }>;

export class RuleSyntaxError extends Error {}

type Token =
  | { kind: "string"; text: string }
  | { kind: "ident"; text: string }
  | { kind: "fact"; text: string }
  | { kind: "keyword"; text: string }
  | { kind: "punct"; text: string };

const KEYWORDS = new Set([
  "ALWAYS",
  "AND",
  "OR",
  "NOT",
  "IN",
  "INCLUDES",
  "ANY",
  "OF",
  "IS",
  "ANSWERED",
  "BLANK",
]);

const normalizeQuotes = (text: string) => text.replace(/[“”„‟]/g, '"');

export function tokenize(input: string): Token[] {
  const text = normalizeQuotes(input);
  const tokens: Token[] = [];
  let i = 0;
  while (i < text.length) {
    const ch = text[i]!;
    if (/\s/.test(ch)) {
      i++;
    } else if (ch === '"') {
      const end = text.indexOf('"', i + 1);
      if (end === -1) throw new RuleSyntaxError("A quote is never closed");
      tokens.push({ kind: "string", text: text.slice(i + 1, end) });
      i = end + 1;
    } else if (text.startsWith("!=", i)) {
      tokens.push({ kind: "punct", text: "!=" });
      i += 2;
    } else if ("=[](),".includes(ch)) {
      tokens.push({ kind: "punct", text: ch });
      i++;
    } else if (ch === "@") {
      const m = /^@[A-Za-z_][A-Za-z0-9_]*/.exec(text.slice(i));
      if (!m) throw new RuleSyntaxError('"@" must be followed by a fact name');
      tokens.push({ kind: "fact", text: m[0].slice(1) });
      i += m[0].length;
    } else {
      const m = /^[A-Za-z_][A-Za-z0-9_.]*/.exec(text.slice(i));
      if (!m) throw new RuleSyntaxError(`Unexpected character "${ch}"`);
      const upper = m[0].toUpperCase();
      tokens.push(
        KEYWORDS.has(upper)
          ? { kind: "keyword", text: upper }
          : { kind: "ident", text: m[0] }
      );
      i += m[0].length;
    }
  }
  return tokens;
}

const describe = (t: Token | undefined) =>
  !t ? "the end of the rule" : t.kind === "string" ? `"${t.text}"` : t.text;

export function parseRule(input: string): RuleNode {
  const tokens = tokenize(input);
  let pos = 0;
  const peek = () => tokens[pos];
  const isKw = (t: Token | undefined, kw: string) =>
    t?.kind === "keyword" && t.text === kw;
  const isPunct = (t: Token | undefined, p: string) =>
    t?.kind === "punct" && t.text === p;
  const expectKw = (kw: string) => {
    if (!isKw(peek(), kw))
      throw new RuleSyntaxError(`Expected ${kw} but found ${describe(peek())}`);
    pos++;
  };
  const expectPunct = (p: string) => {
    if (!isPunct(peek(), p))
      throw new RuleSyntaxError(`Expected "${p}" but found ${describe(peek())}`);
    pos++;
  };
  const expectString = (): string => {
    const t = peek();
    if (t?.kind !== "string")
      throw new RuleSyntaxError(
        `Expected quoted option text but found ${describe(t)}`
      );
    pos++;
    return t.text;
  };
  const list = (): string[] => {
    expectPunct("[");
    const values = [expectString()];
    while (isPunct(peek(), ",")) {
      pos++;
      values.push(expectString());
    }
    expectPunct("]");
    return values;
  };

  const test = (): RuleNode => {
    const t = peek();
    if (t?.kind !== "ident")
      throw new RuleSyntaxError(
        `Expected a question ID but found ${describe(t)}`
      );
    pos++;
    const field = t.text;
    const next = peek();
    if (isPunct(next, "=")) {
      pos++;
      return { type: "test", field, op: "=", value: expectString() };
    }
    if (isPunct(next, "!=")) {
      pos++;
      return { type: "test", field, op: "!=", value: expectString() };
    }
    if (isKw(next, "IN")) {
      pos++;
      return { type: "test", field, op: "in", values: list() };
    }
    if (isKw(next, "NOT")) {
      pos++;
      expectKw("IN");
      return { type: "test", field, op: "not in", values: list() };
    }
    if (isKw(next, "INCLUDES")) {
      pos++;
      if (isKw(peek(), "ANY")) {
        pos++;
        expectKw("OF");
        return { type: "test", field, op: "includes any of", values: list() };
      }
      return { type: "test", field, op: "includes", value: expectString() };
    }
    if (isKw(next, "IS")) {
      pos++;
      if (isKw(peek(), "ANSWERED")) {
        pos++;
        return { type: "test", field, op: "is answered" };
      }
      if (isKw(peek(), "BLANK")) {
        pos++;
        return { type: "test", field, op: "is blank" };
      }
      throw new RuleSyntaxError(
        `Expected "answered" or "blank" after "is" but found ${describe(peek())}`
      );
    }
    throw new RuleSyntaxError(
      `Expected =, !=, in, not in, includes or is after ${field} but found ${describe(next)}`
    );
  };

  const unary = (): RuleNode => {
    const t = peek();
    if (isKw(t, "NOT")) {
      pos++;
      return { type: "not", arg: unary() };
    }
    if (isPunct(t, "(")) {
      pos++;
      const inner = expr();
      expectPunct(")");
      return inner;
    }
    if (t?.kind === "fact") {
      pos++;
      return { type: "fact", name: t.text };
    }
    if (isKw(t, "ALWAYS"))
      throw new RuleSyntaxError('"always" must be the whole rule on its own');
    return test();
  };

  const expr = (): RuleNode => {
    const args = [unary()];
    let connector: "AND" | "OR" | null = null;
    while (isKw(peek(), "AND") || isKw(peek(), "OR")) {
      const kw = peek()!.text as "AND" | "OR";
      if (connector && connector !== kw)
        throw new RuleSyntaxError(
          "Use parentheses when mixing AND and OR, e.g. a AND (b OR c)"
        );
      connector = kw;
      pos++;
      args.push(unary());
    }
    if (!connector) return args[0]!;
    return { type: connector === "AND" ? "and" : "or", args };
  };

  if (tokens.length === 0)
    throw new RuleSyntaxError('The rule is empty (write "always")');
  if (tokens.length === 1 && isKw(tokens[0], "ALWAYS")) return { type: "always" };
  const node = expr();
  if (pos < tokens.length)
    throw new RuleSyntaxError(`Unexpected ${describe(peek())} after the end of the rule`);
  return node;
}

// --- Evaluation --------------------------------------------------------------

export type Answer = string | string[] | undefined;

export const isBlankAnswer = (v: Answer) =>
  v === undefined || v === "" || (Array.isArray(v) && v.length === 0);

/** Evaluates a parsed rule. `get` returns a field's answer as later rules see
 * it (i.e. blank when that field's question is hidden). */
export function evaluateRule(
  node: RuleNode,
  get: (field: string) => Answer,
  facts: Record<string, boolean>
): boolean {
  switch (node.type) {
    case "always":
      return true;
    case "and":
      return node.args.every((a) => evaluateRule(a, get, facts));
    case "or":
      return node.args.some((a) => evaluateRule(a, get, facts));
    case "not":
      return !evaluateRule(node.arg, get, facts);
    case "fact":
      return facts[node.name] === true;
    case "test": {
      const v = get(node.field);
      switch (node.op) {
        case "=":
          return typeof v === "string" && v === node.value;
        case "!=":
          return !(typeof v === "string" && v === node.value);
        case "in":
          return typeof v === "string" && node.values.includes(v);
        case "not in":
          return !(typeof v === "string" && node.values.includes(v));
        case "includes":
          return Array.isArray(v) && v.includes(node.value);
        case "includes any of":
          return Array.isArray(v) && node.values.some((x) => v.includes(x));
        case "is answered":
          return !isBlankAnswer(v);
        case "is blank":
          return isBlankAnswer(v);
      }
    }
  }
}

/** Every field and fact a rule mentions. */
export function ruleReferences(node: RuleNode): {
  fields: Set<string>;
  facts: Set<string>;
} {
  const fields = new Set<string>();
  const facts = new Set<string>();
  const walk = (n: RuleNode) => {
    if (n.type === "and" || n.type === "or") n.args.forEach(walk);
    else if (n.type === "not") walk(n.arg);
    else if (n.type === "fact") facts.add(n.name);
    else if (n.type === "test") fields.add(n.field);
  };
  walk(node);
  return { fields, facts };
}

/** Every (field, option text) pair a rule compares against. */
export function ruleLiterals(node: RuleNode): { field: string; text: string }[] {
  const out: { field: string; text: string }[] = [];
  const walk = (n: RuleNode) => {
    if (n.type === "and" || n.type === "or") n.args.forEach(walk);
    else if (n.type === "not") walk(n.arg);
    else if (n.type === "test") {
      if ("value" in n) out.push({ field: n.field, text: n.value });
      if ("values" in n) n.values.forEach((text) => out.push({ field: n.field, text }));
    }
  };
  walk(node);
  return out;
}
