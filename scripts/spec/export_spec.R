# -----------------------------------------------------------------------------
# Exports the "Coaching Log — Question Spec (FY27)" Google Sheet (the source of
# truth for the coach log form's questions) to
# app/components/coach-log/spec/coach-log.spec.json.
#
#   Rscript scripts/spec/export_spec.R
#
# Fails loudly — and writes nothing — if any rule doesn't parse or points at a
# missing/later question, an option text doesn't exist, or a column holds an
# unexpected value. Output is deterministic (questions by Order, options by
# Order, pretty-printed) so the git diff of the JSON reads as the spec change.
#
# Read-only on Google: it never writes to the sheet.
# -----------------------------------------------------------------------------

suppressPackageStartupMessages({
  library(googlesheets4)
  library(googledrive)
  library(jsonlite)
})

source("scripts/spec/rules.R")

SPREADSHEET_ID <- "1R-0ysOEsBjxcuDzNzwEXVN9_DamNSJaLo4VbpoNoM1M"
MASTER_SURVEY_LIST_ID <- "1hbs5d1uf2xqDvs0hG68hZG4ttmf7BhqKDuKCNNaYd54"
DISTRICT_SCHOOL_TAB_GID <- 2037785111
OUT <- "app/components/coach-log/spec/coach-log.spec.json"

TYPES <- c("single select", "multi select", "yes-no", "short text",
           "long text", "date", "repeating group")
OPTIONS_TAB <- "Options tab"

email <- Sys.getenv("GOOGLE_AUTH_EMAIL", "duncan.gates@teachinglab.org")
drive_auth(email = email, cache = TRUE)
gs4_auth(token = drive_token())

read_tab <- function(tab) {
  df <- read_sheet(SPREADSHEET_ID, sheet = tab, col_types = "c", .name_repair = "minimal")
  df[] <- lapply(df, function(x) ifelse(is.na(x), "", trimws(x)))
  as.data.frame(df, check.names = FALSE)
}

problems <- character(0)
problem <- function(...) problems <<- c(problems, sprintf(...))

yes_no <- function(x, where) {
  v <- tolower(x)
  bad <- !v %in% c("yes", "no")
  for (i in which(bad)) problem("%s: expected yes or no, found \"%s\"", where[i], x[i])
  v == "yes"
}

# --- Read the tabs -----------------------------------------------------------------
qs <- read_tab("Questions")
os <- read_tab("Options")
cl <- read_tab("Changelog")
lists <- read_tab("Lists")

qs <- qs[!(qs$ID == "" & qs$`Question text` == "" & qs$`Shows when` == ""), , drop = FALSE]
qs$row <- seq_len(nrow(qs)) + 1
os <- os[!(os$`Question ID` == "" & os$`Option text` == ""), , drop = FALSE]
os$row <- seq_len(nrow(os)) + 1
cl <- cl[cl$Version != "", , drop = FALSE]

for (i in which(qs$ID == "")) problem("Questions row %d: no ID (the tech team fills this in before export)", qs$row[i])
for (id in unique(qs$ID[duplicated(qs$ID) & qs$ID != ""])) problem("Questions: ID %s is used more than once", id)
qs$order_num <- suppressWarnings(as.numeric(qs$Order))
for (i in which(is.na(qs$order_num))) problem("%s: Order must be a number", qs$ID[i])
for (o in unique(qs$order_num[duplicated(qs$order_num) & !is.na(qs$order_num)])) {
  problem("Questions: Order %s is used by more than one question", o)
}
qs <- qs[order(qs$order_num), , drop = FALSE]
where_q <- sprintf("%s (row %d)", qs$ID, qs$row)

for (i in which(!qs$Type %in% TYPES)) problem("%s: unknown Type \"%s\"", where_q[i], qs$Type[i])
qs$required <- yes_no(qs$`Required when shown`, paste(where_q, "Required when shown"))
qs$max <- suppressWarnings(as.integer(qs$`Max selections`))
for (i in which(qs$`Max selections` != "" & (is.na(qs$max) | qs$max < 1))) {
  problem("%s: Max selections must be a whole number of at least 1", where_q[i])
}
for (i in which(!is.na(qs$max) & qs$Type != "multi select")) {
  problem("%s: Max selections only applies to multi select questions", where_q[i])
}

# Field: IDs with a dot are either a second version of a question
# ("sessionDate.pl" -> field sessionDate) or a question inside a repeating group
# ("coacheeRows.role", whose field is the full ID).
groups <- qs$ID[qs$Type == "repeating group"]
prefix <- ifelse(grepl(".", qs$ID, fixed = TRUE), sub("\\..*$", "", qs$ID), NA)
qs$repeating_group <- ifelse(!is.na(prefix) & prefix %in% groups, prefix, NA)
qs$field <- ifelse(!is.na(qs$repeating_group) | is.na(prefix), qs$ID, prefix)
for (i in which(!is.na(prefix) & is.na(qs$repeating_group) & !prefix %in% qs$ID)) {
  problem("%s: \"%s\" is a second version of %s, but there is no question %s", where_q[i], qs$ID[i], prefix[i], prefix[i])
}

# --- Options -------------------------------------------------------------------------
os$order_num <- suppressWarnings(as.numeric(os$Order))
where_o <- sprintf("Options row %d (%s)", os$row, os$`Question ID`)
for (i in which(!os$`Question ID` %in% qs$ID)) problem("%s: not a question ID", where_o[i])
for (i in which(os$`Option text` == "")) problem("%s: option text is blank", where_o[i])
for (i in which(grepl("\"", os$`Option text`))) problem("%s: option text can't contain a double quote", where_o[i])
for (i in which(is.na(os$order_num))) problem("%s: Order must be a number", where_o[i])
os$exclusive <- yes_no(os$Exclusive, paste(where_o, "Exclusive"))
os$write_in <- yes_no(os$`Opens write-in`, paste(where_o, "Opens write-in"))
dups <- duplicated(os[, c("Question ID", "Option text")])
for (i in which(dups)) problem("%s: option \"%s\" is listed twice", where_o[i], os$`Option text`[i])

for (i in seq_len(nrow(qs))) {
  n_opts <- sum(os$`Question ID` == qs$ID[i])
  if (qs$`Options from`[i] == OPTIONS_TAB) {
    if (!qs$Type[i] %in% c("single select", "multi select")) problem("%s: only select questions can use the Options tab", where_q[i])
    if (n_opts == 0) problem("%s: \"Options from\" is Options tab but it has no options there", where_q[i])
  } else if (n_opts > 0) {
    problem("%s: has options on the Options tab but \"Options from\" is \"%s\"", where_q[i], qs$`Options from`[i])
  }
}

# --- Reference labels (live Master Survey List) and facts -----------------------------
mst_tabs <- gs4_get(MASTER_SURVEY_LIST_ID)$sheets
mst <- range_read(MASTER_SURVEY_LIST_ID, sheet = mst_tabs$name[mst_tabs$id == DISTRICT_SCHOOL_TAB_GID],
                  col_names = FALSE, col_types = "c", .name_repair = "minimal")
reference_labels <- list(
  district = sort(unique(na.omit(unlist(mst[1, ], use.names = FALSE)))),
  school = sort(unique(na.omit(unlist(mst[-1, ], use.names = FALSE))))
)
snapshot <- list(district = lists$`District labels`[lists$`District labels` != ""],
                 school = lists$`School labels`[lists$`School labels` != ""])
for (k in names(reference_labels)) {
  if (!setequal(reference_labels[[k]], snapshot[[k]])) {
    message(sprintf("Note: the Lists tab's %s labels are out of date with the Master Survey List (the in-sheet Rule check uses them).", k))
  }
}
facts <- lists[lists$Fact != "", c("Fact", "Fact means"), drop = FALSE]

# --- Rules -------------------------------------------------------------------------------
allowed <- list()
for (f in unique(qs$field)) {
  rows <- qs[qs$field == f, , drop = FALSE]
  allowed[f] <- list(
    if (all(rows$Type == "yes-no")) c("Yes", "No")
    else if (!is.null(reference_labels[[f]])) reference_labels[[f]]
    else if (any(rows$`Options from` == OPTIONS_TAB)) os$`Option text`[os$`Question ID` %in% rows$ID]
    else NULL
  )
}
rule_questions <- data.frame(field = qs$field, type = qs$Type, repeating_group = qs$repeating_group)
asts <- vector("list", nrow(qs))
for (i in seq_len(nrow(qs))) {
  ast <- tryCatch(rule_parse(qs$`Shows when`[i]), rule_error = function(e) {
    problem("%s: Shows when \"%s\" — %s", where_q[i], qs$`Shows when`[i], conditionMessage(e))
    NULL
  })
  if (is.null(ast)) next
  asts[[i]] <- ast
  for (p in rule_check(ast, i, rule_questions, allowed, facts$Fact)) problem("%s: %s", where_q[i], p)
}

# Every write-in option needs a follow-up question shown exactly when it's picked.
for (i in which(os$write_in)) {
  parent_field <- qs$field[qs$ID == os$`Question ID`[i]]
  has_follow_up <- any(vapply(asts, function(a) {
    !is.null(a) && a$type == "test" && identical(a$field, parent_field) &&
      a$op %in% c("includes", "=") && identical(a$value, os$`Option text`[i])
  }, logical(1)))
  if (!has_follow_up) problem("%s: \"%s\" opens a write-in, but no question shows when it is picked", where_o[i], os$`Option text`[i])
}

if (nrow(cl) == 0) problem("Changelog: add a row with the version being released")

if (length(problems) > 0) {
  message("\nThe spec can't be exported until these are fixed in the sheet:\n")
  message(paste0("  - ", unique(problems), collapse = "\n"))
  quit(status = 1)
}

# --- Build the JSON --------------------------------------------------------------------
options_for <- function(id) {
  o <- os[os$`Question ID` == id, , drop = FALSE]
  o <- o[order(o$order_num), , drop = FALSE]
  lapply(seq_len(nrow(o)), function(j) list(
    text = o$`Option text`[j], order = as.integer(o$order_num[j]),
    exclusive = o$exclusive[j], opensWriteIn = o$write_in[j], link = o$Link[j]
  ))
}
questions <- lapply(seq_len(nrow(qs)), function(i) list(
  id = qs$ID[i],
  field = qs$field[i],
  repeatingGroup = if (is.na(qs$repeating_group[i])) NULL else qs$repeating_group[i],
  shortName = qs$`Short name`[i],
  section = qs$Section[i],
  block = qs$`Block / touchpoint`[i],
  order = qs$order_num[i],
  text = qs$`Question text`[i],
  helper = qs$`Helper note`[i],
  type = qs$Type[i],
  optionsFrom = qs$`Options from`[i],
  maxSelections = if (is.na(qs$max[i])) NULL else qs$max[i],
  required = qs$required[i],
  showsWhen = list(text = qs$`Shows when`[i], ast = asts[[i]]),
  mondayColumn = qs$`Monday column`[i],
  notes = qs$Notes[i],
  options = options_for(qs$ID[i])
))

meta <- drive_get(as_id(SPREADSHEET_ID))$drive_resource[[1]]
spec <- list(
  specVersion = cl$Version[nrow(cl)],
  source = list(
    spreadsheetId = SPREADSHEET_ID,
    spreadsheetUrl = sprintf("https://docs.google.com/spreadsheets/d/%s/edit", SPREADSHEET_ID),
    driveVersion = as.character(meta$version),
    modifiedTime = meta$modifiedTime
  ),
  exportedAt = format(Sys.time(), "%Y-%m-%dT%H:%M:%SZ", tz = "UTC"),
  facts = lapply(seq_len(nrow(facts)), function(i) list(name = facts$Fact[i], description = facts$`Fact means`[i])),
  referenceLabels = lapply(reference_labels, I),
  questions = questions,
  changelog = lapply(seq_len(nrow(cl)), function(i) list(
    version = cl$Version[i], date = cl$Date[i], summary = cl$Summary[i], prLink = cl$`PR link`[i]
  ))
)

# NULLs become JSON null (repeatingGroup/maxSelections); keep them as keys.
json <- toJSON(spec, auto_unbox = TRUE, pretty = 2, null = "null", digits = NA)
writeLines(json, OUT, useBytes = TRUE)
cat(sprintf("Wrote %s — spec %s, %d questions, %d options (sheet version %s).\n",
            OUT, spec$specVersion, length(questions), nrow(os), spec$source$driveVersion))
