# -----------------------------------------------------------------------------
# ONE-TIME BOOTSTRAP: creates the "Coaching Log — Question Spec (FY27)" Google
# Sheet from scripts/spec/bootstrap/seed.json, which was transcribed from the
# live coach log form (code on main at c02f21ab, Sep 2026).
#
# Once the sheet exists it is the source of truth — do NOT rerun this over it
# (it always creates a new spreadsheet, so stakeholder edits are never
# overwritten, but a rerun would fork the spec). It is kept so the sheet's
# structure (tabs, formulas, validation, formatting) is documented and could be
# rebuilt from an export if ever needed.
#
#   Rscript scripts/spec/build_sheet.R
#
# Auth: uses your cached Google OAuth token (googledrive/googlesheets4). If
# none is cached, run googledrive::drive_auth() interactively first.
# -----------------------------------------------------------------------------

suppressPackageStartupMessages({
  library(googlesheets4)
  library(googledrive)
  library(jsonlite)
})

source("scripts/spec/rules.R")

SHEET_NAME <- "Coaching Log — Question Spec (FY27)"
SPEC_VERSION <- "1.0.0"
MASTER_SURVEY_LIST_ID <- "1hbs5d1uf2xqDvs0hG68hZG4ttmf7BhqKDuKCNNaYd54"
DISTRICT_SCHOOL_TAB_GID <- 2037785111

email <- Sys.getenv("GOOGLE_AUTH_EMAIL", "duncan.gates@teachinglab.org")
drive_auth(email = email, cache = TRUE)
gs4_auth(token = drive_token())

seed <- fromJSON("scripts/spec/bootstrap/seed.json", simplifyDataFrame = TRUE)
questions <- seed$questions
options <- seed$options
discrepancies <- seed$discrepancies

# Every seed rule must parse before anything is created.
invisible(lapply(questions$showsWhen, rule_parse))

# --- Reference labels (district row + all schools) from the Master Survey List --
mst_tabs <- gs4_get(MASTER_SURVEY_LIST_ID)$sheets
mst_tab <- mst_tabs$name[mst_tabs$id == DISTRICT_SCHOOL_TAB_GID]
mst <- range_read(MASTER_SURVEY_LIST_ID, sheet = mst_tab, col_names = FALSE,
                  col_types = "c", .name_repair = "minimal")
district_labels <- sort(unique(na.omit(unlist(mst[1, ]))))
school_labels <- sort(unique(na.omit(unlist(mst[-1, ]))))

# --- Vocabularies (hidden Lists tab) ---------------------------------------------
TYPES <- c("single select", "multi select", "yes-no", "short text",
           "long text", "date", "repeating group")
YES_NO <- c("yes", "no")
OPTIONS_FROM <- c(
  "Options tab", "Master Survey List (district row)",
  "Master Survey List (schools under the district)", "Sub-school sheet",
  "Logistics Board dates", "Coachee roster (district + school)",
  "DBN list (schools in the chosen district)"
)
CHANGE_TYPES <- c("add question", "remove question", "reword",
                  "change options", "change logic", "other")
STATUSES <- c("requested", "accepted", "in PR", "live", "declined")
DECISIONS <- c("undecided", "keep the form (update the doc)",
               "change the form", "other (see notes)")
FACTS <- data.frame(
  name = "schoolHasSubSchools",
  description = "the sub-school sheet lists sub-schools for the chosen school"
)

pad <- function(x, n) c(x, rep(NA_character_, n - length(x)))
n_lists <- max(length(district_labels), length(school_labels), 10)
lists <- data.frame(
  `Types` = pad(TYPES, n_lists),
  `Yes/No` = pad(YES_NO, n_lists),
  `Change types` = pad(CHANGE_TYPES, n_lists),
  `Statuses` = pad(STATUSES, n_lists),
  `Decisions` = pad(DECISIONS, n_lists),
  `Question IDs (with NEW)` = NA_character_,   # formula, written below
  `District labels` = pad(district_labels, n_lists),
  `School labels` = pad(school_labels, n_lists),
  `Fact` = pad(FACTS$name, n_lists),
  `Fact means` = pad(FACTS$description, n_lists),
  `Options from` = pad(OPTIONS_FROM, n_lists),
  check.names = FALSE
)

# --- Tab data ---------------------------------------------------------------------
yn <- function(x) ifelse(x, "yes", "no")
q_df <- data.frame(
  `ID` = questions$id,
  `Short name` = questions$shortName,
  `Section` = questions$section,
  `Block / touchpoint` = questions$block,
  `Order` = questions$order,
  `Question text` = questions$text,
  `Helper note` = questions$helper,
  `Type` = questions$type,
  `Options from` = questions$optionsFrom,
  `Max selections` = questions$maxSelections,
  `Required when shown` = yn(questions$required),
  `Shows when` = questions$showsWhen,
  `Shows when (plain English)` = NA_character_,  # formula in the header cell
  `Rule check` = NA_character_,                  # formula in the header cell
  `Monday column` = questions$mondayColumn,
  `Notes` = questions$notes,
  check.names = FALSE
)
o_df <- data.frame(
  `Question ID` = options$questionId,
  `Option text` = options$text,
  `Order` = options$order,
  `Exclusive` = yn(options$exclusive),
  `Opens write-in` = yn(options$opensWriteIn),
  `Link` = options$link,
  `Question (short name)` = NA_character_,       # formula in the header cell
  check.names = FALSE
)
cr_df <- data.frame(
  `#` = NA_character_, `Question ID` = NA_character_, `Change type` = NA_character_,
  `Details — what should change` = NA_character_, `Why` = NA_character_,
  `Requested by` = NA_character_, `Date requested` = NA_character_,
  `Status` = NA_character_, `PR link` = NA_character_, `Released in version` = NA_character_,
  check.names = FALSE
)[0, ]
d_df <- data.frame(
  `#` = discrepancies$id,
  `Question ID` = discrepancies$questionId,
  `Topic` = discrepancies$topic,
  `What the doc says` = discrepancies$doc,
  `What the live form does` = discrepancies$code,
  `Suggested resolution` = discrepancies$suggestion,
  `Decision` = "undecided",
  `Decided by` = "",
  `Notes` = "",
  check.names = FALSE
)
cl_df <- data.frame(
  `Version` = SPEC_VERSION,
  `Date` = format(Sys.Date()),
  `Summary` = "First version of the spec, built from the live form (main @ c02f21ab). Differences from the FY27 Coaching Log doc are on the Discrepancies tab.",
  `PR link` = "",
  `Drive version` = "",
  `Named in version history?` = "no",
  check.names = FALSE
)

# --- Start here (column B = term/heading, C = explanation) ----------------------
start <- list(
  c("h1", "Coaching Log — Question Spec (FY27)"),
  c("p", "This sheet is the source of truth for the questions in the Coaching Log form: what each question says, its answer options, and when it appears. The tech team builds the form from it, and automated checks fail if the form and this sheet ever disagree."),
  c("h2", "The tabs"),
  c("row", "Questions", "One row per question, in the order the form asks them."),
  c("row", "Options", "One row per answer option, for questions with a fixed list of answers."),
  c("row", "Change requests", "Where you ask for a change. One row per request."),
  c("row", "Discrepancies", "Where the old FY27 Coaching Log doc and the live form disagree. Please pick a decision for each row."),
  c("row", "Changelog", "Every released version of the spec. The last row is what's live."),
  c("h2", "How to request a change"),
  c("p", "1. On Change requests, add a row: pick the question (or NEW for a new question), the kind of change, and describe it in plain words: what it should say, which options, when it should appear. Leave Status as \"requested\"."),
  c("p", "2. If it's easier to show than describe, you can also edit the Questions or Options tab directly. Still add a Change request row so the change gets picked up."),
  c("p", "3. The tech team moves the request to \"accepted\", then \"in PR\" (being built), then \"live\" once the form has changed, and adds a Changelog row. \"declined\" means it won't be done, with the reason in the row."),
  c("p", "Edits to Questions and Options are proposals until they're released. The Changelog shows what's live."),
  c("h2", "Questions tab columns"),
  c("row", "ID", "The question's name inside the form. Grey = filled by the tech team; please don't change it. A new question can have a blank ID; we'll fill it in."),
  c("row", "Short name", "A few words naming the question. Used in the plain-English column."),
  c("row", "Section / Block", "Where the question sits. Block is the touchpoint card it appears in (for example, \"Teacher team support\")."),
  c("row", "Order", "Position in the form. To insert a question between 120 and 130, use 125."),
  c("row", "Question text / Helper note", "Exactly what the coach sees. Links are written [link text](https://...)."),
  c("row", "Type", "single select, multi select, yes-no, short text, long text, date, or repeating group (a set of questions the coach can repeat, like one row per coachee)."),
  c("row", "Options from", "\"Options tab\" means the answers are listed on the Options tab. Anything else names where the form pulls the answers from (for example, the Master Survey List)."),
  c("row", "Max selections", "For multi select: the most answers a coach can pick. Blank = no limit."),
  c("row", "Required when shown", "yes = the coach must answer before submitting, whenever the question is on screen."),
  c("row", "Shows when", "The rule for when the question appears. See \"Writing a Shows when rule\" below."),
  c("row", "Shows when (plain English)", "Grey, automatic: the rule in words, to double-check it says what you mean."),
  c("row", "Rule check", "Grey, automatic: ✅ when the rule is valid, ❌ with the reason when it isn't. The full check also runs whenever the tech team exports the sheet."),
  c("row", "Monday column", "Grey, filled by the tech team: where the answer is saved on the Monday board."),
  c("h2", "Options tab columns"),
  c("row", "Exclusive", "yes = picking this answer clears the others, and picking another clears it (for example \"None of the above\")."),
  c("row", "Opens write-in", "yes = picking this answer shows a follow-up text box (for example \"Other\"). That text box is its own row on Questions."),
  c("row", "Link", "Optional link shown with the option."),
  c("h2", "Writing a Shows when rule"),
  c("p", "Use question IDs and the exact option text in straight or curly double quotes. Capital letters matter in option text, but not in the rule words (AND/and both work)."),
  c("row", "always", "Always shown."),
  c("row", "nycCoachType = \"Reads Coach\"", "Shown when the answer is exactly that option."),
  c("row", "canceled != \"Yes\"", "Shown when the answer is anything else, including not answered yet."),
  c("row", "district in [\"NY_D9\", \"NY_D75\"]", "Shown when the answer is one of the listed options."),
  c("row", "district not in [\"NY_D9\", \"NY_D75\"]", "Shown when the answer is none of them."),
  c("row", "readsTouchpointTypes includes \"Teacher team support\"", "For questions where several answers can be picked: shown when that answer is among them."),
  c("row", "solvesTouchpointTypes includes any of [\"A\", \"B\"]", "Shown when at least one of the listed answers was picked."),
  c("row", "groupTopic is answered  /  groupTopic is blank", "Shown when the question has (or hasn't) been answered."),
  c("row", "@schoolHasSubSchools", "A fact the form knows but isn't a question: the sub-school sheet lists sub-schools for the chosen school."),
  c("row", "AND, OR, NOT, ( )", "Combine tests. If a rule uses both AND and OR, add parentheses to say which goes together: a AND (b OR c). The check rejects a rule that mixes them without parentheses."),
  c("h2", "Three rules of thumb"),
  c("p", "1. A rule can only use questions that come earlier in the form (lower Order)."),
  c("p", "2. A hidden question counts as not answered. So a rule only needs its direct trigger: \"readsMajorityUsingHQIM = \"No\"\" is enough for the follow-up. If the teacher block is hidden, the HQIM question is too, so the follow-up stays hidden. This is also why canceled != \"Yes\" is true when canceled hasn't been asked."),
  c("p", "3. Answers in hidden questions are never saved."),
  c("h2", "Special cases"),
  c("row", "IDs with a dot", "sessionDate.pl and subSchool.schoolLevel are second versions of sessionDate and subSchool: same answer, different wording or options, shown in different situations. Only one version shows at a time. Rules use the name before the dot."),
  c("row", "Repeating group", "coacheeRows is the \"add another coachee\" group. Its questions (coacheeRows.coacheeName, …) repeat once per coachee, and other rules can't use them."),
  c("row", "District labels", "District rules use the district names exactly as they appear in the form's district dropdown (the Master Survey List), for example NY_D75."),
  c("h2", "Versions"),
  c("p", "Each release adds a Changelog row (version, date, summary, link to the code change) and names that version in File → Version history, so you can always see what the spec said at any release.")
)
start_df <- data.frame(
  ` ` = "",
  `Term` = vapply(start, `[`, "", 2),
  `Meaning` = vapply(start, function(x) if (length(x) >= 3) x[3] else "", ""),
  check.names = FALSE
)

# --- Create the spreadsheet --------------------------------------------------------
ss <- gs4_create(SHEET_NAME, sheets = list(
  `Start here` = start_df,
  `Questions` = q_df,
  `Options` = o_df,
  `Change requests` = cr_df,
  `Discrepancies` = d_df,
  `Changelog` = cl_df,
  `Lists` = lists
))
tabs <- gs4_get(ss)$sheets
sid <- setNames(tabs$id, tabs$name)
nq <- nrow(q_df)
no <- nrow(o_df)
nd <- nrow(d_df)

# --- Formulas (one array formula per column, in the header cell) --------------------
Q <- "CHAR(34)"
# Outside-quote segments get IDs -> short names and operators -> words; quoted
# segments are kept as-is inside curly quotes. Every split part is prefixed with
# "¦" so SPLIT never turns "019" into the number 19.
plain_english <- paste0(
  '=VSTACK("Shows when (plain English)", LET(',
  'ids, FILTER($A$2:$A, $A$2:$A<>""), names, FILTER($B$2:$B, $A$2:$A<>""), ',
  'facts, FILTER(Lists!$I$2:$I, Lists!$I$2:$I<>""), factText, FILTER(Lists!$J$2:$J, Lists!$I$2:$I<>""), ',
  'MAP($A$2:$A, $L$2:$L, LAMBDA(id, raw, IF(AND(id="", raw=""), "", LET(',
  'rule, REGEXREPLACE(TO_TEXT(raw), "[“”]", ', Q, '), ',
  'parts, SPLIT("¦" & SUBSTITUTE(rule, ', Q, ', ', Q, ' & "¦"), ', Q, ', FALSE, FALSE), ',
  'segs, MAP(parts, SEQUENCE(1, COLUMNS(parts)), LAMBDA(p, i, LET(s, MID(p, 2, 100000), ',
  'IF(ISEVEN(i), "“" & s & "”", LET(',
  'm, REDUCE(s, SEQUENCE(ROWS(ids)), LAMBDA(acc, k, REGEXREPLACE(acc, ',
  '"(^|[^A-Za-z0-9_.@])" & REGEXREPLACE(INDEX(ids, k), "\\.", "\\\\.") & "($|[^A-Za-z0-9_.])", "$1⟦" & k & "⟧$2"))), ',
  'stepa, REGEXREPLACE(m, "(?i)\\bnot\\s+in\\b", " is not one of "), ',
  'stepb, REGEXREPLACE(stepa, "(?i)\\bin\\b", " is one of "), ',
  'stepc, SUBSTITUTE(SUBSTITUTE(stepb, "!=", " is not "), "=", " is "), ',
  'stepd, REGEXREPLACE(REGEXREPLACE(REGEXREPLACE(stepc, "(?i)\\band\\b", "and"), "(?i)\\bor\\b", "or"), "(?i)\\bnot\\b", "not"), ',
  'stepe, REGEXREPLACE(REGEXREPLACE(stepd, "(?i)\\bincludes\\s+any\\s+of\\b", "includes any of"), "[\\[\\]]", ""), ',
  'stepf, REDUCE(stepe, SEQUENCE(ROWS(facts)), LAMBDA(acc, k, SUBSTITUTE(acc, "@" & INDEX(facts, k), "(" & INDEX(factText, k) & ")"))), ',
  'REDUCE(stepf, SEQUENCE(ROWS(ids)), LAMBDA(acc, k, SUBSTITUTE(acc, "⟦" & k & "⟧", INDEX(names, k))))',
  '))))), ',
  'sentence, TRIM(REGEXREPLACE(JOIN("", segs), "\\s+", " ")), ',
  'IF(REGEXMATCH(sentence, "(?i)^always$"), "Always shown", "Shows when " & sentence)',
  '))))))'
)

# Lightweight in-sheet check: quotes/brackets balance, IDs exist and come
# earlier, facts exist, quoted text is a known option or label. The export runs
# the full parser (AND/OR mixing, operator vs question type) and fails loudly.
rule_check <- paste0(
  '=VSTACK("Rule check", LET(',
  'kw, {"ALWAYS";"AND";"OR";"NOT";"IN";"INCLUDES";"ANY";"OF";"IS";"ANSWERED";"BLANK"}, ',
  'opts, Options!$A$2:$A, optText, Options!$B$2:$B, ',
  'labels, TOCOL(VSTACK(Lists!$G$2:$G, Lists!$H$2:$H), 1), ',
  'MAP($A$2:$A, $L$2:$L, $E$2:$E, LAMBDA(id, raw, ord, IF(AND(id="", raw=""), "", ',
  'IF(TRIM(TO_TEXT(raw))="", "⚠️ Write a rule (or always)", LET(',
  'rule, REGEXREPLACE(TO_TEXT(raw), "[“”]", ', Q, '), ',
  'nq, LEN(rule) - LEN(SUBSTITUTE(rule, ', Q, ', "")), ',
  'outside, REGEXREPLACE(rule, ', Q, ' & "[^" & ', Q, ' & "]*" & ', Q, ', " "), ',
  'cnt, LAMBDA(t, c, LEN(t) - LEN(SUBSTITUTE(t, c, ""))), ',
  'IF(ISODD(nq), "❌ A quote is never closed", ',
  'IF(cnt(outside, "(") <> cnt(outside, ")"), "❌ Parentheses ( ) don\'t match", ',
  'IF(cnt(outside, "[") <> cnt(outside, "]"), "❌ Square brackets [ ] don\'t match", LET(',
  'words, TOCOL(SPLIT("¦" & SUBSTITUTE(TRIM(REGEXREPLACE(outside, "[^A-Za-z0-9_.@]+", " ")), " ", " ¦"), " "), 1), ',
  'toks, MAP(words, LAMBDA(w, MID(w, 2, 1000))), ',
  'names, FILTER(toks, ISNA(MATCH(UPPER(toks), kw, 0)), LEFT(toks, 1) <> "@", toks <> ""), ',
  'factToks, IFERROR(FILTER(toks, LEFT(toks, 1) = "@"), ""), ',
  'unknown, IFERROR(FILTER(names, ISNA(MATCH(names, $A$2:$A, 0))), ""), ',
  'later, IFERROR(FILTER(names, ISNUMBER(MATCH(names, $A$2:$A, 0)), XLOOKUP(names, $A$2:$A, $E$2:$E, 0) >= ord), ""), ',
  'badFacts, IFERROR(FILTER(factToks, factToks <> "", ISNA(MATCH(MID(factToks, 2, 1000), Lists!$I$2:$I, 0))), ""), ',
  'parts, SPLIT("¦" & SUBSTITUTE(rule, ', Q, ', ', Q, ' & "¦"), ', Q, ', FALSE, FALSE), ',
  'quoted, IFERROR(FILTER(MAP(parts, LAMBDA(p, MID(p, 2, 100000))), ISEVEN(SEQUENCE(1, COLUMNS(parts)))), ""), ',
  'allowed, VSTACK({"Yes";"No"}, labels, IFERROR(FILTER(TO_TEXT(optText), ISNUMBER(MATCH(opts, names, 0))), "")), ',
  'badText, IFERROR(FILTER(TOCOL(quoted), TOCOL(quoted) <> "", ISNA(MATCH(TOCOL(quoted), allowed, 0))), ""), ',
  'msgs, TEXTJOIN("; ", TRUE, ',
  'IF(TEXTJOIN("", TRUE, unknown) = "", "", "not a question ID: " & TEXTJOIN(", ", TRUE, UNIQUE(TOCOL(unknown, 1)))), ',
  'IF(TEXTJOIN("", TRUE, later) = "", "", "comes later in the form: " & TEXTJOIN(", ", TRUE, UNIQUE(TOCOL(later, 1)))), ',
  'IF(TEXTJOIN("", TRUE, badFacts) = "", "", "unknown fact: " & TEXTJOIN(", ", TRUE, UNIQUE(TOCOL(badFacts, 1)))), ',
  'IF(TEXTJOIN("", TRUE, badText) = "", "", "not an option: " & TEXTJOIN(", ", TRUE, MAP(UNIQUE(TOCOL(badText, 1)), LAMBDA(t, "“" & t & "”"))))), ',
  'IF(msgs = "", "✅ OK", "❌ " & msgs)',
  ')))))))))))'
)

option_question <- paste0(
  '=VSTACK("Question (short name)", MAP($A$2:$A, LAMBDA(id, IF(id = "", "", ',
  'XLOOKUP(id, Questions!$A$2:$A, Questions!$B$2:$B, "⚠️ not a question ID")))))'
)
lists_ids <- '=VSTACK("Question IDs (with NEW)", "NEW", FILTER(Questions!$A$2:$A, Questions!$A$2:$A <> ""))'
cr_numbers <- '=VSTACK("#", MAP($B$2:$B, $D$2:$D, LAMBDA(b, d, IF(AND(b = "", d = ""), "", ROW(b) - 1))))'

# Array formulas spill down from the header, so the cells below must be empty.
range_clear(ss, sheet = "Questions", range = "M2:N2000", reformat = FALSE)
range_clear(ss, sheet = "Options", range = "G2:G5000", reformat = FALSE)
range_clear(ss, sheet = "Lists", range = "F2:F2000", reformat = FALSE)
range_write(ss, data.frame(x = gs4_formula(plain_english)), sheet = "Questions", range = "M1", col_names = FALSE, reformat = FALSE)
range_write(ss, data.frame(x = gs4_formula(rule_check)), sheet = "Questions", range = "N1", col_names = FALSE, reformat = FALSE)
range_write(ss, data.frame(x = gs4_formula(option_question)), sheet = "Options", range = "G1", col_names = FALSE, reformat = FALSE)
range_write(ss, data.frame(x = gs4_formula(lists_ids)), sheet = "Lists", range = "F1", col_names = FALSE, reformat = FALSE)
range_write(ss, data.frame(x = gs4_formula(cr_numbers)), sheet = "Change requests", range = "A1", col_names = FALSE, reformat = FALSE)

# --- Formatting, validation, protection (one batchUpdate) ----------------------------
rgb <- function(hex) {
  v <- strtoi(c(substr(hex, 2, 3), substr(hex, 4, 5), substr(hex, 6, 7)), 16L) / 255
  list(red = v[1], green = v[2], blue = v[3])
}
TL_BLUE <- "#0053B3"
INK <- "#1F2A37"
MUTED <- "#5F6B7A"
SECTION_COLORS <- c(
  "Session details" = "#E8F0FB", "Cancellation" = "#FDEFE3",
  "1:1 coaching" = "#E7F5EC", "Group coaching" = "#F1F8E6",
  "ELA Early Childhood" = "#F3ECFA", "NYC Reads" = "#E4F4F6",
  "NYC Solves" = "#FFF5DC"
)

grid <- function(sheet, r1 = NULL, r2 = NULL, c1 = NULL, c2 = NULL) {
  g <- list(sheetId = sid[[sheet]])
  if (!is.null(r1)) g$startRowIndex <- r1
  if (!is.null(r2)) g$endRowIndex <- r2
  if (!is.null(c1)) g$startColumnIndex <- c1
  if (!is.null(c2)) g$endColumnIndex <- c2
  g
}
repeat_cell <- function(range, format, fields) list(repeatCell = list(
  range = range, cell = list(userEnteredFormat = format), fields = fields
))
col_width <- function(sheet, col, px) list(updateDimensionProperties = list(
  range = list(sheetId = sid[[sheet]], dimension = "COLUMNS", startIndex = col, endIndex = col + 1),
  properties = list(pixelSize = px), fields = "pixelSize"
))
freeze <- function(sheet, rows, cols = 0) list(updateSheetProperties = list(
  properties = list(sheetId = sid[[sheet]], gridProperties = list(frozenRowCount = rows, frozenColumnCount = cols)),
  fields = "gridProperties.frozenRowCount,gridProperties.frozenColumnCount"
))
header_style <- function(sheet, ncol) repeat_cell(
  grid(sheet, 0, 1, 0, ncol),
  list(backgroundColor = rgb(TL_BLUE), wrapStrategy = "WRAP", verticalAlignment = "MIDDLE",
       textFormat = list(foregroundColor = rgb("#FFFFFF"), bold = TRUE, fontSize = 10)),
  "userEnteredFormat(backgroundColor,textFormat,wrapStrategy,verticalAlignment)"
)
body_style <- function(sheet, ncol) repeat_cell(
  grid(sheet, 1, NULL, 0, ncol),
  list(wrapStrategy = "WRAP", verticalAlignment = "TOP",
       textFormat = list(foregroundColor = rgb(INK), fontSize = 10)),
  "userEnteredFormat(wrapStrategy,verticalAlignment,textFormat)"
)
machine_col <- function(sheet, col) repeat_cell(
  grid(sheet, 1, NULL, col, col + 1),
  list(textFormat = list(foregroundColor = rgb(MUTED), italic = TRUE, fontSize = 10)),
  "userEnteredFormat.textFormat"
)
machine_header <- function(sheet, col) repeat_cell(
  grid(sheet, 0, 1, col, col + 1),
  list(backgroundColor = rgb(MUTED)), "userEnteredFormat.backgroundColor"
)
mono_col <- function(sheet, col) repeat_cell(
  grid(sheet, 1, NULL, col, col + 1),
  list(textFormat = list(fontFamily = "Roboto Mono", fontSize = 9, foregroundColor = rgb(INK))),
  "userEnteredFormat.textFormat"
)
text_format_col <- function(sheet, col) repeat_cell(
  grid(sheet, 1, NULL, col, col + 1),
  list(numberFormat = list(type = "TEXT")), "userEnteredFormat.numberFormat"
)
dropdown <- function(range, values = NULL, source = NULL, strict = TRUE) {
  condition <- if (!is.null(values)) {
    list(type = "ONE_OF_LIST", values = lapply(values, function(v) list(userEnteredValue = v)))
  } else {
    list(type = "ONE_OF_RANGE", values = list(list(userEnteredValue = source)))
  }
  list(setDataValidation = list(range = range, rule = list(
    condition = condition, strict = strict, showCustomUi = TRUE
  )))
}
protect <- function(range, description) list(addProtectedRange = list(protectedRange = list(
  range = range, description = description, warningOnly = TRUE
)))
cf_formula <- function(range, formula, bg = NULL, fg = NULL, bold = FALSE) {
  fmt <- list()
  if (!is.null(bg)) fmt$backgroundColor <- rgb(bg)
  if (!is.null(fg) || bold) {
    fmt$textFormat <- list(bold = bold)
    if (!is.null(fg)) fmt$textFormat$foregroundColor <- rgb(fg)
  }
  list(addConditionalFormatRule = list(index = 0, rule = list(
    ranges = list(range),
    booleanRule = list(
      condition = list(type = "CUSTOM_FORMULA", values = list(list(userEnteredValue = formula))),
      format = fmt
    )
  )))
}
cf_text_eq <- function(range, text, bg, fg = INK) list(addConditionalFormatRule = list(index = 0, rule = list(
  ranges = list(range),
  booleanRule = list(
    condition = list(type = "TEXT_EQ", values = list(list(userEnteredValue = text))),
    format = list(backgroundColor = rgb(bg), textFormat = list(foregroundColor = rgb(fg)))
  )
)))
basic_filter <- function(sheet, ncol) list(setBasicFilter = list(filter = list(range = grid(sheet, 0, NULL, 0, ncol))))
row_heights <- function(sheet, r1, r2, px) list(updateDimensionProperties = list(
  range = list(sheetId = sid[[sheet]], dimension = "ROWS", startIndex = r1, endIndex = r2),
  properties = list(pixelSize = px), fields = "pixelSize"
))

reqs <- list()
add <- function(...) reqs <<- c(reqs, list(...))

# Tab colors + hide Lists
tab_color <- function(sheet, hex) list(updateSheetProperties = list(
  properties = list(sheetId = sid[[sheet]], tabColorStyle = list(rgbColor = rgb(hex))),
  fields = "tabColorStyle"
))
add(tab_color("Start here", TL_BLUE), tab_color("Questions", "#1B998B"), tab_color("Options", "#1B998B"),
    tab_color("Change requests", "#F28C28"), tab_color("Discrepancies", "#D1495B"),
    tab_color("Changelog", MUTED))
add(list(updateSheetProperties = list(properties = list(sheetId = sid[["Lists"]], hidden = TRUE), fields = "hidden")))

# Questions ---------------------------------------------------------------------
QC <- c(ID = 0, Short = 1, Section = 2, Block = 3, Order = 4, Text = 5, Helper = 6, Type = 7,
        From = 8, Max = 9, Required = 10, Rule = 11, Plain = 12, Check = 13, Monday = 14, Notes = 15)
add(header_style("Questions", 16), body_style("Questions", 16), freeze("Questions", 1, 1),
    row_heights("Questions", 0, 1, 44))
widths <- c(210, 150, 120, 170, 60, 360, 300, 110, 170, 80, 90, 380, 360, 230, 150, 320)
for (i in seq_along(widths)) add(col_width("Questions", i - 1, widths[i]))
for (col in QC[c("ID", "Plain", "Check", "Monday")]) add(machine_col("Questions", col), machine_header("Questions", col))
add(mono_col("Questions", QC[["Rule"]]))
add(repeat_cell(grid("Questions", 1, NULL, QC[["ID"]], QC[["ID"]] + 1),
                list(textFormat = list(bold = TRUE, italic = FALSE, fontFamily = "Roboto Mono", fontSize = 9, foregroundColor = rgb(MUTED))),
                "userEnteredFormat.textFormat"))
add(repeat_cell(grid("Questions", 1, NULL, QC[["Order"]], QC[["Max"]] + 2),
                list(horizontalAlignment = "CENTER"), "userEnteredFormat.horizontalAlignment"))
add(repeat_cell(grid("Questions", 1, NULL, QC[["Order"]], QC[["Order"]] + 1),
                list(horizontalAlignment = "CENTER"), "userEnteredFormat.horizontalAlignment"))
add(repeat_cell(grid("Questions", 1, NULL, QC[["Type"]], QC[["From"]] + 1),
                list(horizontalAlignment = "LEFT"), "userEnteredFormat.horizontalAlignment"))
add(dropdown(grid("Questions", 1, 1000, QC[["Type"]], QC[["Type"]] + 1), values = TYPES))
add(dropdown(grid("Questions", 1, 1000, QC[["Required"]], QC[["Required"]] + 1), values = YES_NO))
add(dropdown(grid("Questions", 1, 1000, QC[["From"]], QC[["From"]] + 1), source = "=Lists!$K$2:$K", strict = FALSE))
add(dropdown(grid("Questions", 1, 1000, QC[["Section"]], QC[["Section"]] + 1), values = names(SECTION_COLORS), strict = FALSE))
add(list(setDataValidation = list(
  range = grid("Questions", 1, 1000, QC[["Max"]], QC[["Max"]] + 1),
  rule = list(condition = list(type = "NUMBER_GREATER_THAN_EQ", values = list(list(userEnteredValue = "1"))),
              strict = TRUE, inputMessage = "Most answers a coach can pick (multi select only). Blank = no limit.")
)))
for (s in names(SECTION_COLORS)) {
  add(cf_formula(grid("Questions", 1, 1000, 0, 16), sprintf('=$C2="%s"', s), bg = SECTION_COLORS[[s]]))
}
add(cf_formula(grid("Questions", 1, 1000, QC[["Check"]], QC[["Check"]] + 1), '=LEFT($N2,1)="❌"', bg = "#FBE3E6", fg = "#A4161A", bold = TRUE))
add(cf_formula(grid("Questions", 1, 1000, QC[["Check"]], QC[["Check"]] + 1), '=LEFT($N2,1)="⚠"', bg = "#FFF1D6", fg = "#8A5A00", bold = TRUE))
add(cf_formula(grid("Questions", 1, 1000, QC[["Check"]], QC[["Check"]] + 1), '=LEFT($N2,1)="✅"', fg = "#1E7B4F"))
# Row groups per section (collapsible) — Session details stays expanded
sections <- rle(q_df$Section)
ends <- cumsum(sections$lengths)
starts <- ends - sections$lengths + 1
for (i in seq_along(starts)) {
  add(list(addDimensionGroup = list(range = list(
    sheetId = sid[["Questions"]], dimension = "ROWS", startIndex = starts[i], endIndex = ends[i] + 1
  ))))
}
add(basic_filter("Questions", 16))
add(protect(grid("Questions", 0, NULL, QC[["ID"]], QC[["ID"]] + 1), "ID — filled by the tech team (it's the form's field name)"))
add(protect(grid("Questions", 0, NULL, QC[["Plain"]], QC[["Check"]] + 1), "Automatic — plain English and rule check formulas"))
add(protect(grid("Questions", 0, NULL, QC[["Monday"]], QC[["Monday"]] + 1), "Monday column — filled by the tech team"))
add(list(updateCells = list(
  range = grid("Questions", 0, 1, QC[["Rule"]], QC[["Rule"]] + 1),
  rows = list(list(values = list(list(note = "When this question appears. See \"Writing a Shows when rule\" on the Start here tab.")))),
  fields = "note"
)))

# Options -------------------------------------------------------------------------
add(header_style("Options", 7), body_style("Options", 7), freeze("Options", 1, 1), row_heights("Options", 0, 1, 36))
for (i in seq_along(c(260, 480, 60, 90, 110, 300, 220))) add(col_width("Options", i - 1, c(260, 480, 60, 90, 110, 300, 220)[i]))
add(repeat_cell(grid("Options", 1, NULL, 0, 1),
                list(textFormat = list(fontFamily = "Roboto Mono", fontSize = 9, foregroundColor = rgb(INK), bold = TRUE)),
                "userEnteredFormat.textFormat"))
add(text_format_col("Options", 1))
add(repeat_cell(grid("Options", 1, NULL, 2, 5), list(horizontalAlignment = "CENTER"), "userEnteredFormat.horizontalAlignment"))
add(machine_col("Options", 6), machine_header("Options", 6))
add(dropdown(grid("Options", 1, 2000, 0, 1), source = "=Questions!$A$2:$A"))
add(dropdown(grid("Options", 1, 2000, 3, 4), values = YES_NO), dropdown(grid("Options", 1, 2000, 4, 5), values = YES_NO))
add(cf_formula(grid("Options", 1, 2000, 0, 7), '=AND($A2<>"", ISODD(COUNTUNIQUE($A$2:$A2)))', bg = "#EEF3FA"))
add(cf_formula(grid("Options", 1, 2000, 3, 5), '=D2="yes"', fg = "#1E7B4F", bold = TRUE))
add(basic_filter("Options", 7))
add(protect(grid("Options", 0, NULL, 6, 7), "Automatic — looks up the question's short name"))

# Change requests -------------------------------------------------------------------
add(header_style("Change requests", 10), body_style("Change requests", 10), freeze("Change requests", 1, 0),
    row_heights("Change requests", 0, 1, 36))
cr_w <- c(50, 230, 140, 420, 300, 150, 120, 110, 220, 120)
for (i in seq_along(cr_w)) add(col_width("Change requests", i - 1, cr_w[i]))
add(dropdown(grid("Change requests", 1, 1000, 1, 2), source = "=Lists!$F$2:$F"))
add(dropdown(grid("Change requests", 1, 1000, 2, 3), values = CHANGE_TYPES))
add(dropdown(grid("Change requests", 1, 1000, 7, 8), values = STATUSES))
add(list(setDataValidation = list(
  range = grid("Change requests", 1, 1000, 6, 7),
  rule = list(condition = list(type = "DATE_IS_VALID"), strict = TRUE)
)))
add(repeat_cell(grid("Change requests", 1, 1000, 6, 7),
                list(numberFormat = list(type = "DATE", pattern = "yyyy-mm-dd")), "userEnteredFormat.numberFormat"))
status_colors <- list(requested = "#E8F0FB", accepted = "#FFF1D6", `in PR` = "#EDE4F7", live = "#DDF3E6", declined = "#ECEEF1")
for (s in names(status_colors)) add(cf_text_eq(grid("Change requests", 1, 1000, 7, 8), s, status_colors[[s]]))
add(machine_col("Change requests", 0), machine_header("Change requests", 0))
add(basic_filter("Change requests", 10))
add(protect(grid("Change requests", 0, NULL, 0, 1), "Automatic — request number"))

# Discrepancies ----------------------------------------------------------------------
add(header_style("Discrepancies", 9), body_style("Discrepancies", 9), freeze("Discrepancies", 1, 2),
    row_heights("Discrepancies", 0, 1, 36))
d_w <- c(50, 230, 220, 380, 380, 320, 200, 130, 260)
for (i in seq_along(d_w)) add(col_width("Discrepancies", i - 1, d_w[i]))
add(dropdown(grid("Discrepancies", 1, 500, 6, 7), values = DECISIONS))
add(dropdown(grid("Discrepancies", 1, 500, 1, 2), source = "=Lists!$F$2:$F", strict = FALSE))
add(cf_text_eq(grid("Discrepancies", 1, 500, 6, 7), "undecided", "#FFF1D6", "#8A5A00"))
add(cf_formula(grid("Discrepancies", 1, 500, 6, 7), '=AND($G2<>"", $G2<>"undecided")', bg = "#DDF3E6", fg = "#1E7B4F"))
add(repeat_cell(grid("Discrepancies", 1, NULL, 1, 2),
                list(textFormat = list(fontFamily = "Roboto Mono", fontSize = 9, foregroundColor = rgb(INK), bold = TRUE)),
                "userEnteredFormat.textFormat"))
add(basic_filter("Discrepancies", 9))

# Changelog ----------------------------------------------------------------------------
add(header_style("Changelog", 6), body_style("Changelog", 6), freeze("Changelog", 1, 0), row_heights("Changelog", 0, 1, 36))
cl_w <- c(90, 110, 520, 280, 120, 170)
for (i in seq_along(cl_w)) add(col_width("Changelog", i - 1, cl_w[i]))
add(text_format_col("Changelog", 0), text_format_col("Changelog", 1), text_format_col("Changelog", 4))
add(dropdown(grid("Changelog", 1, 500, 5, 6), values = YES_NO))

# Lists -------------------------------------------------------------------------------
add(header_style("Lists", 11), text_format_col("Lists", 6), text_format_col("Lists", 7))
add(protect(grid("Lists"), "Dropdown sources — maintained by the tech team"))

# Start here -----------------------------------------------------------------------------
add(col_width("Start here", 0, 28), col_width("Start here", 1, 330), col_width("Start here", 2, 700))
add(list(updateSheetProperties = list(
  properties = list(sheetId = sid[["Start here"]], gridProperties = list(hideGridlines = TRUE, frozenRowCount = 0)),
  fields = "gridProperties.hideGridlines,gridProperties.frozenRowCount"
)))
add(list(deleteDimension = list(range = list(sheetId = sid[["Start here"]], dimension = "ROWS", startIndex = 0, endIndex = 1))))
add(repeat_cell(grid("Start here", 0, length(start) + 5, 0, 3),
                list(wrapStrategy = "WRAP", verticalAlignment = "TOP", backgroundColor = rgb("#FFFFFF"),
                     textFormat = list(fontSize = 11, foregroundColor = rgb(INK))),
                "userEnteredFormat(wrapStrategy,verticalAlignment,backgroundColor,textFormat)"))
for (i in seq_along(start)) {
  r <- i - 1  # header row deleted above, so data row i sits at index i - 1
  kind <- start[[i]][1]
  if (kind %in% c("h1", "h2", "p")) {
    add(list(mergeCells = list(range = grid("Start here", r, r + 1, 1, 3), mergeType = "MERGE_ALL")))
  }
  if (kind == "h1") {
    add(repeat_cell(grid("Start here", r, r + 1, 1, 3),
                    list(textFormat = list(fontSize = 20, bold = TRUE, foregroundColor = rgb(TL_BLUE)), verticalAlignment = "MIDDLE"),
                    "userEnteredFormat(textFormat,verticalAlignment)"),
        row_heights("Start here", r, r + 1, 56))
  } else if (kind == "h2") {
    add(repeat_cell(grid("Start here", r, r + 1, 1, 3),
                    list(textFormat = list(fontSize = 13, bold = TRUE, foregroundColor = rgb("#FFFFFF")),
                         backgroundColor = rgb(TL_BLUE), verticalAlignment = "MIDDLE"),
                    "userEnteredFormat(textFormat,backgroundColor,verticalAlignment)"),
        row_heights("Start here", r, r + 1, 34))
  } else if (kind == "row") {
    add(repeat_cell(grid("Start here", r, r + 1, 1, 2),
                    list(textFormat = list(bold = TRUE, fontSize = 10, fontFamily = "Roboto Mono", foregroundColor = rgb(TL_BLUE)),
                         backgroundColor = rgb("#F4F7FB")),
                    "userEnteredFormat(textFormat,backgroundColor)"))
  }
}

resp <- googlesheets4::request_make(googlesheets4::request_generate(
  "sheets.spreadsheets.batchUpdate",
  params = list(spreadsheetId = as.character(ss), requests = reqs)
))
invisible(gargle::response_process(resp))

# Start on the Start here tab; record the Drive version on the first Changelog row.
meta <- drive_get(as_id(ss))$drive_resource[[1]]
range_write(ss, data.frame(v = as.character(meta$version)), sheet = "Changelog", range = "E2",
            col_names = FALSE, reformat = FALSE)

cat("Created:", sprintf("https://docs.google.com/spreadsheets/d/%s/edit", as.character(ss)), "\n")
