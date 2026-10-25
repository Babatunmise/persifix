#!/usr/bin/env Rscript
suppressPackageStartupMessages({
  library(jsonlite)
  library(digest)
  library(WHORiskCalculator)
})

OUT_DIR       <- "golden_out"
SEED          <- 20261023L
N_RANDOM      <- 5000L
AGES          <- 40:74
SEXES         <- c("male", "female")
SMOKER        <- c(0L, 1L)
SBP_GRID      <- c(seq(90L, 180L, by = 10L), 179L)
BMI_GRID      <- c(18, 22, 25, 30, 35, 40)
SBP_FINE      <- 90:180
BMI_FINE      <- seq(16, 45, by = 1)

BAND_THRESHOLDS <- c(0.05, 0.10, 0.20, 0.30)
BOUNDARY_WINDOW <- 0.0025

RISK_SCALE    <- "fraction"
PKG_NAME      <- "WHORiskCalculator"

oracle_regions <- function() {
  # Let the official package define the 21 regions
  get_regions()
}

oracle_risk <- function(df) {
  mapply(function(a, s, sbp, bmi, smk, reg) {
    calculate_who_risk_nonlab(
      age = a, 
      sex = s, 
      sbp = sbp, 
      bmi = bmi, 
      smoking = smk == 1L, # Pass TRUE/FALSE, not "yes"/"no"
      region = reg
    )
  }, df$age, df$sex, df$sbp, df$bmi, df$smoker, df$region)
}
to_fraction <- function(x) if (RISK_SCALE == "percent") x / 100 else x
risk_fraction <- function(df) to_fraction(as.numeric(oracle_risk(df)))
near_threshold <- function(r) Reduce(`|`, lapply(BAND_THRESHOLDS, function(t) abs(r - t) <= BOUNDARY_WINDOW))
band_of <- function(r) findInterval(r, BAND_THRESHOLDS) + 1L

make_grid <- function(regions, ages, sbp, bmi) {
  expand.grid(region = regions, age = ages, sex = SEXES, smoker = SMOKER,
              sbp = sbp, bmi = bmi, KEEP.OUT.ATTRS = FALSE, stringsAsFactors = FALSE)
}

self_test <- function(regions) {
  stopifnot(length(regions) == 21L, !anyDuplicated(regions))
  probe <- data.frame(region = regions[1], age = c(45L, 60L, 70L), sex = "male",
                      smoker = 0L, sbp = 130, bmi = 25, stringsAsFactors = FALSE)
  r <- risk_fraction(probe)
  stopifnot(length(r) == 3L, is.numeric(r), !anyNA(r), all(r > 0 & r < 1), all(diff(r) > 0))
  hi <- transform(probe[2, ], sbp = 170); lo <- transform(probe[2, ], sbp = 110)
  stopifnot(risk_fraction(hi) > risk_fraction(lo))
  smk <- transform(probe[2, ], smoker = 1L)
  stopifnot(risk_fraction(smk) > risk_fraction(probe[2, ]))
}

RNGkind("Mersenne-Twister", "Inversion", "Rejection")
set.seed(SEED)
dir.create(OUT_DIR, showWarnings = FALSE, recursive = TRUE)

regions <- oracle_regions()
self_test(regions)
message("Adapter self-test passed.")

grid <- make_grid(regions, AGES, SBP_GRID, BMI_GRID)
grid$set <- "grid"

boundary <- vector("list", length(regions))
for (i in seq_along(regions)) {
  g <- make_grid(regions[i], AGES, SBP_FINE, BMI_FINE)
  r <- risk_fraction(g)
  boundary[[i]] <- g[near_threshold(r), , drop = FALSE]
}
boundary <- do.call(rbind, boundary)
boundary$set <- "boundary"

rand <- data.frame(
  region = sample(regions, N_RANDOM, replace = TRUE),
  age    = sample(AGES,    N_RANDOM, replace = TRUE),
  sex    = sample(SEXES,   N_RANDOM, replace = TRUE),
  smoker = sample(SMOKER,  N_RANDOM, replace = TRUE),
  sbp    = sample(90:180,  N_RANDOM, replace = TRUE),
  bmi    = round(runif(N_RANDOM, 15, 45), 1),
  stringsAsFactors = FALSE
)
rand$set <- "random"

all <- rbind(grid, boundary, rand)
key <- with(all, paste(region, age, sex, smoker, sbp, bmi, sep = "|"))
all <- all[!duplicated(key), , drop = FALSE]
all <- all[order(all$region, all$age, all$sex, all$smoker, all$sbp, all$bmi), ]
rownames(all) <- NULL

all$risk <- NA_real_
for (rg in regions) {
  idx <- which(all$region == rg)
  all$risk[idx] <- risk_fraction(all[idx, c("region", "age", "sex", "smoker", "sbp", "bmi")])
}

all$band <- band_of(all$risk)
all$id   <- seq_len(nrow(all))
all$smoker <- as.integer(all$smoker)

git_commit <- tryCatch(system("git rev-parse HEAD", intern = TRUE, ignore.stderr = TRUE), error = function(e) NA_character_, warning = function(w) NA_character_)

meta <- list(
  generated_utc    = format(Sys.time(), tz = "UTC", usetz = TRUE),
  generator_git    = if (length(git_commit)) git_commit[1] else NA_character_,
  r_version        = R.version.string,
  oracle_package   = PKG_NAME,
  oracle_version   = tryCatch(as.character(packageVersion(PKG_NAME)), error = function(e) NA_character_),
  seed             = SEED,
  risk_unit        = "fraction (0-1), converted from package scale",
  package_scale    = RISK_SCALE,
  band_thresholds  = BAND_THRESHOLDS,
  boundary_window  = BOUNDARY_WINDOW,
  counts           = as.list(table(all$set)),
  total_rows       = nrow(all),
  regions          = regions
)

out <- list(meta = meta, vectors = all[, c("id", "set", "region", "age", "sex", "smoker", "sbp", "bmi", "risk", "band")])

json_path <- file.path(OUT_DIR, "golden.json")
write_json(out, json_path, digits = NA, auto_unbox = TRUE, dataframe = "rows")

sha <- digest(file = json_path, algo = "sha256")
writeLines(sprintf("%s  golden.json", sha), file.path(OUT_DIR, "golden.json.sha256"))
writeLines(capture.output(sessionInfo()), file.path(OUT_DIR, "sessionInfo.txt"))
write_json(c(meta, list(sha256 = sha)), file.path(OUT_DIR, "manifest.json"), auto_unbox = TRUE, pretty = TRUE, digits = NA)

message(sprintf("Done. %d vectors. sha256=%s", nrow(all), sha))