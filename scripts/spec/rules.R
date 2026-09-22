# -----------------------------------------------------------------------------
# "Shows when" rule language for the Coach Log Question Spec sheet: R port of
# app/components/coach-log/spec/rules.ts. export_spec.R uses it to parse and
# check every rule; the vitest suite re-parses each rule in TypeScript and
# asserts the trees match, so the two parsers can't drift apart.
#
#   rule  := "always" | expr
#   expr  := unary ( (AND | OR) unary )*      AND/OR can't be mixed without ()
#   unary := NOT unary | "(" expr ")" | @fact | test
#   test  := field = "x" | field != "x" | field in [..] | field not in [..]
#          | field includes "x" | field includes any of [..]
#          | field is answered | field is blank
# -----------------------------------------------------------------------------

rule_keywords <- c(
  "ALWAYS", "AND", "OR", "NOT", "IN", "INCLUDES", "ANY", "OF", "IS",
  "ANSWERED", "BLANK"
)

rule_error <- function(msg) stop(structure(
  class = c("rule_error", "error", "condition"),
  list(message = msg, call = NULL)
))

rule_tokenize <- function(input) {
  text <- gsub("[“”„‟]", "\"", input)
  chars <- strsplit(text, "")[[1]]
  n <- length(chars)
  tokens <- list()
  push <- function(kind, value) tokens[[length(tokens) + 1]] <<- list(kind = kind, text = value)
  i <- 1
  while (i <= n) {
    ch <- chars[i]
    rest <- if (i <= n) paste(chars[i:n], collapse = "") else ""
    if (grepl("\\s", ch)) {
      i <- i + 1
    } else if (ch == "\"") {
      close <- if (i < n) which(chars[(i + 1):n] == "\"") else integer(0)
      if (length(close) == 0) rule_error("A quote is never closed")
      end <- i + close[1]
      push("string", if (end - 1 >= i + 1) paste(chars[(i + 1):(end - 1)], collapse = "") else "")
      i <- end + 1
    } else if (startsWith(rest, "!=")) {
      push("punct", "!=")
      i <- i + 2
    } else if (ch %in% c("=", "[", "]", "(", ")", ",")) {
      push("punct", ch)
      i <- i + 1
    } else if (ch == "@") {
      m <- regmatches(rest, regexpr("^@[A-Za-z_][A-Za-z0-9_]*", rest))
      if (length(m) == 0) rule_error("\"@\" must be followed by a fact name")
      push("fact", substring(m, 2))
      i <- i + nchar(m)
    } else {
      m <- regmatches(rest, regexpr("^[A-Za-z_][A-Za-z0-9_.]*", rest))
      if (length(m) == 0) rule_error(sprintf("Unexpected character \"%s\"", ch))
      if (toupper(m) %in% rule_keywords) push("keyword", toupper(m)) else push("ident", m)
      i <- i + nchar(m)
    }
  }
  tokens
}

rule_parse <- function(input) {
  tokens <- rule_tokenize(input)
  pos <- 1
  peek <- function() if (pos <= length(tokens)) tokens[[pos]] else NULL
  describe <- function(t) {
    if (is.null(t)) "the end of the rule"
    else if (t$kind == "string") sprintf("\"%s\"", t$text)
    else t$text
  }
  is_kw <- function(t, kw) !is.null(t) && t$kind == "keyword" && t$text == kw
  is_punct <- function(t, p) !is.null(t) && t$kind == "punct" && t$text == p
  expect_kw <- function(kw) {
    if (!is_kw(peek(), kw)) rule_error(sprintf("Expected %s but found %s", kw, describe(peek())))
    pos <<- pos + 1
  }
  expect_punct <- function(p) {
    if (!is_punct(peek(), p)) rule_error(sprintf("Expected \"%s\" but found %s", p, describe(peek())))
    pos <<- pos + 1
  }
  expect_string <- function() {
    t <- peek()
    if (is.null(t) || t$kind != "string") {
      rule_error(sprintf("Expected quoted option text but found %s", describe(t)))
    }
    pos <<- pos + 1
    t$text
  }
  parse_list <- function() {
    expect_punct("[")
    values <- expect_string()
    while (is_punct(peek(), ",")) {
      pos <<- pos + 1
      values <- c(values, expect_string())
    }
    expect_punct("]")
    I(values)
  }
  node_value <- function(field, op, value) list(type = "test", field = field, op = op, value = value)
  node_values <- function(field, op, values) list(type = "test", field = field, op = op, values = values)

  parse_test <- function() {
    t <- peek()
    if (is.null(t) || t$kind != "ident") {
      rule_error(sprintf("Expected a question ID but found %s", describe(t)))
    }
    pos <<- pos + 1
    field <- t$text
    nxt <- peek()
    if (is_punct(nxt, "=")) { pos <<- pos + 1; return(node_value(field, "=", expect_string())) }
    if (is_punct(nxt, "!=")) { pos <<- pos + 1; return(node_value(field, "!=", expect_string())) }
    if (is_kw(nxt, "IN")) { pos <<- pos + 1; return(node_values(field, "in", parse_list())) }
    if (is_kw(nxt, "NOT")) {
      pos <<- pos + 1
      expect_kw("IN")
      return(node_values(field, "not in", parse_list()))
    }
    if (is_kw(nxt, "INCLUDES")) {
      pos <<- pos + 1
      if (is_kw(peek(), "ANY")) {
        pos <<- pos + 1
        expect_kw("OF")
        return(node_values(field, "includes any of", parse_list()))
      }
      return(node_value(field, "includes", expect_string()))
    }
    if (is_kw(nxt, "IS")) {
      pos <<- pos + 1
      if (is_kw(peek(), "ANSWERED")) { pos <<- pos + 1; return(list(type = "test", field = field, op = "is answered")) }
      if (is_kw(peek(), "BLANK")) { pos <<- pos + 1; return(list(type = "test", field = field, op = "is blank")) }
      rule_error(sprintf("Expected \"answered\" or \"blank\" after \"is\" but found %s", describe(peek())))
    }
    rule_error(sprintf(
      "Expected =, !=, in, not in, includes or is after %s but found %s", field, describe(nxt)
    ))
  }

  parse_unary <- function() {
    t <- peek()
    if (is_kw(t, "NOT")) { pos <<- pos + 1; return(list(type = "not", arg = parse_unary())) }
    if (is_punct(t, "(")) {
      pos <<- pos + 1
      inner <- parse_expr()
      expect_punct(")")
      return(inner)
    }
    if (!is.null(t) && t$kind == "fact") { pos <<- pos + 1; return(list(type = "fact", name = t$text)) }
    if (is_kw(t, "ALWAYS")) rule_error("\"always\" must be the whole rule on its own")
    parse_test()
  }

  parse_expr <- function() {
    args <- list(parse_unary())
    connector <- NULL
    while (is_kw(peek(), "AND") || is_kw(peek(), "OR")) {
      kw <- peek()$text
      if (!is.null(connector) && connector != kw) {
        rule_error("Use parentheses when mixing AND and OR, e.g. a AND (b OR c)")
      }
      connector <- kw
      pos <<- pos + 1
      args[[length(args) + 1]] <- parse_unary()
    }
    if (is.null(connector)) return(args[[1]])
    list(type = tolower(connector), args = args)
  }

  if (length(tokens) == 0) rule_error("The rule is empty (write \"always\")")
  if (length(tokens) == 1 && is_kw(tokens[[1]], "ALWAYS")) return(list(type = "always"))
  node <- parse_expr()
  if (pos <= length(tokens)) {
    rule_error(sprintf("Unexpected %s after the end of the rule", describe(peek())))
  }
  node
}

# Walks a parsed rule, calling `f` on every test node.
rule_walk_tests <- function(node, f) {
  if (node$type %in% c("and", "or")) for (a in node$args) rule_walk_tests(a, f)
  else if (node$type == "not") rule_walk_tests(node$arg, f)
  else if (node$type == "test") f(node)
  invisible(NULL)
}

rule_facts <- function(node) {
  if (node$type %in% c("and", "or")) unique(unlist(lapply(node$args, rule_facts)))
  else if (node$type == "not") rule_facts(node$arg)
  else if (node$type == "fact") node$name
  else character(0)
}

# Checks one parsed rule against the questions above it. `questions` is the
# full Questions data frame (id, field, type, order, repeating_group);
# `allowed` maps a field to its allowed option text (NULL = anything).
# Returns a character vector of problems.
rule_check <- function(ast, question_index, questions, allowed, fact_names) {
  problems <- character(0)
  earlier <- questions[seq_len(question_index - 1), , drop = FALSE]
  rule_walk_tests(ast, function(node) {
    field <- node$field
    prior <- earlier[earlier$field == field, , drop = FALSE]
    if (nrow(prior) == 0) {
      problems <<- c(problems, if (field %in% questions$field) {
        sprintf("rule refers to %s, which comes later in the form", field)
      } else {
        sprintf("rule refers to %s, which is not a question ID", field)
      })
      return()
    }
    if (any(!is.na(prior$repeating_group))) {
      problems <<- c(problems, sprintf("rules can't refer to a question inside a repeating group (%s)", field))
    }
    multi <- prior$type[1] == "multi select"
    list_op <- node$op %in% c("includes", "includes any of")
    value_op <- !node$op %in% c("is answered", "is blank")
    if (value_op && multi && !list_op) {
      problems <<- c(problems, sprintf("%s allows several answers - use \"includes\" instead of \"%s\"", field, node$op))
    }
    if (list_op && !multi) {
      problems <<- c(problems, sprintf("%s has one answer - use \"=\" or \"in\" instead of \"%s\"", field, node$op))
    }
    texts <- c(node$value, unclass(node$values))
    ok <- allowed[[field]]
    if (!is.null(ok)) {
      for (t in setdiff(texts, ok)) {
        problems <<- c(problems, sprintf("\"%s\" is not an option of %s", t, field))
      }
    }
  })
  for (f in setdiff(rule_facts(ast), fact_names)) {
    problems <- c(problems, sprintf("unknown fact @%s", f))
  }
  unique(problems)
}
