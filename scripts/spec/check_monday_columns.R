# -----------------------------------------------------------------------------
# Checks that every Monday column the coach log spec writes to exists on the
# live Coach Log board (parent columns) and its subitems board (subitem
# columns). Not run in CI; run it by hand after changing a "Monday column":
#
#   Rscript scripts/spec/check_monday_columns.R
#
# Reads MONDAY_API_KEY from the environment (e.g. ~/.Renviron) and never prints
# it. Read-only on Monday. Exits non-zero listing every missing column.
# -----------------------------------------------------------------------------

suppressPackageStartupMessages({
  library(httr2)
  library(jsonlite)
})

BOARD_ID <- "18416482214" # COACH_LOG_BOARD_ID
SPEC <- "app/components/coach-log/spec/coach-log.spec.json"

# "Monday column" values that aren't a column id on the board.
NOT_A_COLUMN <- c("not saved", "folded into parent", "subitems (one per coachee)")

api_key <- Sys.getenv("MONDAY_API_KEY")
if (!nzchar(api_key)) stop("MONDAY_API_KEY is not set (add it to ~/.Renviron).")

monday <- function(query) {
  resp <- request("https://api.monday.com/v2") |>
    req_headers(Authorization = api_key, `API-Version` = "2024-10") |>
    req_body_json(list(query = query)) |>
    req_perform()
  body <- resp_body_json(resp, simplifyVector = TRUE)
  if (!is.null(body$errors)) stop("Monday API error: ", toJSON(body$errors, auto_unbox = TRUE))
  body$data
}

board_columns <- function(board_id) {
  data <- monday(sprintf(
    "{ boards(ids: [%s]) { name columns { id title type settings_str } } }", board_id
  ))
  if (length(data$boards) == 0 || nrow(data$boards) == 0) stop("Board ", board_id, " not found.")
  list(name = data$boards$name[[1]], columns = data$boards$columns[[1]])
}

spec <- fromJSON(SPEC, simplifyVector = TRUE)
questions <- spec$questions
cols <- questions$mondayColumn
used <- !cols %in% NOT_A_COLUMN
is_sub <- startsWith(cols, "subitem: ")
wanted <- data.frame(
  question = questions$id[used],
  column = sub("^subitem: ", "", cols[used]),
  subitem = is_sub[used]
)

parent <- board_columns(BOARD_ID)
subitems_col <- parent$columns[parent$columns$type == "subtasks", ]
if (nrow(subitems_col) == 0) stop("Board ", BOARD_ID, " has no subitems column.")
sub_board_id <- fromJSON(subitems_col$settings_str[[1]])$boardIds[[1]]
sub <- board_columns(sub_board_id)

on_board <- ifelse(wanted$subitem,
                   wanted$column %in% sub$columns$id,
                   wanted$column %in% parent$columns$id)

cat(sprintf("Spec %s: %d questions write to %d distinct columns.\n",
            spec$specVersion, nrow(wanted), length(unique(paste(wanted$subitem, wanted$column)))))
cat(sprintf("Parent board %s (%s): %d columns. Subitems board %s (%s): %d columns.\n",
            BOARD_ID, parent$name, nrow(parent$columns),
            sub_board_id, sub$name, nrow(sub$columns)))

missing <- wanted[!on_board, ]
if (nrow(missing) > 0) {
  cat("\nMissing columns:\n")
  for (i in seq_len(nrow(missing))) {
    cat(sprintf("  %s%s  (question %s)\n",
                if (missing$subitem[i]) "subitem: " else "", missing$column[i], missing$question[i]))
  }
  quit(status = 1)
}

# Show the board's title for each column so a mismatched id is easy to spot.
title_of <- function(column, subitem) {
  cs <- if (subitem) sub$columns else parent$columns
  cs$title[match(column, cs$id)]
}
wanted$title <- mapply(title_of, wanted$column, wanted$subitem)
cat("\nAll spec columns exist:\n")
for (i in seq_len(nrow(wanted))) {
  cat(sprintf("  %-45s %s%-16s %s\n", wanted$question[i],
              if (wanted$subitem[i]) "subitem: " else "", wanted$column[i], wanted$title[i]))
}
