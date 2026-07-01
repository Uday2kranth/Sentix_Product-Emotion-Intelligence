# ==============================================================================
# Standalone R Programming Pipeline for Academic Submission
# Project: Sentix - Product Emotion Intelligence Platform
# Project Domain: NLP / Sentiment & Emotion Analysis of Product Reviews
# Primary Dataset: amazon_comparative_output.csv
#
# RECONNAISSANCE FINDINGS:
# 1. Project Domain: NLP / Text Classification & Regression
# 2. Dataset: amazon_comparative_output.csv (4917 rows, 15 columns)
# 3. Target Column: Sentiment (Multiclass: Positive, Negative, Neutral)
# 4. Numeric Columns: overall, day_diff, helpful_yes, total_vote, Polarity, unixReviewTime
# 5. Categorical Columns: asin, Opinion_Type, Sentiment
# 6. Text Columns: reviewerID, reviewerName, reviewText, summary, reviewTime
# 7. Python ML Models: TF-IDF + Logistic Regression (SentixMLClassifier)
# ==============================================================================

# Add local r_libs folder to search path so that the script can load local packages without admin privileges
.libPaths(c("r_libs", .libPaths()))

# Suppress package startup messages
suppressPackageStartupMessages(library(dplyr))
suppressPackageStartupMessages(library(stats))

# Check if tidyr is available; if not, do not fail but use base R fallbacks
has_tidyr <- requireNamespace("tidyr", quietly = TRUE)

cat("\n======================================================================\n")
cat("      SENTIX: ACADEMIC R DATA ANALYSIS & CLEANING PIPELINE            \n")
cat("======================================================================\n\n")

# ==============================================================================
# SECTION 1: DATA LOADING & INSPECTION [1/5]
# ==============================================================================
cat("\n# === [1/5] SECTION 1: DATA LOADING & INSPECTION ===\n")

primary_file <- "../amazon_comparative_output.csv"
fallback_file <- "amazon_comparative_output.csv"
dataset_path <- ""

if (file.exists(primary_file)) {
  dataset_path <- primary_file
  cat("Loading dataset from parent directory:", primary_file, "\n")
} else if (file.exists(fallback_file)) {
  dataset_path <- fallback_file
  cat("Loading dataset from current directory:", fallback_file, "\n")
} else {
  stop("FATAL ERROR: Primary dataset 'amazon_comparative_output.csv' not found. Ensure it is in the project root or current directory.")
}

# Read CSV
df_raw <- read.csv(dataset_path, stringsAsFactors = FALSE)

# Initial Dimensions
dims <- dim(df_raw)
cat(sprintf("Initial dimensions: %d rows x %d columns\n", dims[1], dims[2]))

# Column Names and Types
cat("\nColumn Names and Data Types:\n")
col_types <- sapply(df_raw, class)
for (col_name in names(col_types)) {
  cat(sprintf(" - %-18s: %s\n", col_name, col_types[col_name]))
}

# Summary Statistics
cat("\nSummary Statistics of Numeric Columns:\n")
print(summary(df_raw[, sapply(df_raw, is.numeric)]))

# Missing Values Count
cat("\nMissing Values per Column:\n")
na_counts <- colSums(is.na(df_raw) | df_raw == "" | df_raw == "NULL")
print(na_counts)

# Duplicate Rows
dup_count <- sum(duplicated(df_raw))
cat(sprintf("\nDuplicate row count: %d\n", dup_count))


# ==============================================================================
# SECTION 2: DATA CLEANING [2/5]
# ==============================================================================
cat("\n# === [2/5] SECTION 2: DATA CLEANING ===\n")

# Drop rows with NA values in critical columns
cat("Dropping rows with missing critical features...\n")
if (has_tidyr) {
  df_cleaned <- df_raw %>% tidyr::drop_na(reviewText, overall, Sentiment, Polarity, day_diff)
} else {
  df_cleaned <- df_raw[!is.na(df_raw$reviewText) & 
                       !is.na(df_raw$overall) & 
                       !is.na(df_raw$Sentiment) & 
                       !is.na(df_raw$Polarity) & 
                       !is.na(df_raw$day_diff), ]
}

# Remove Duplicates
if (dup_count > 0) {
  cat("Removing duplicate rows...\n")
  df_cleaned <- unique(df_cleaned)
}

# IQR-based outlier removal for numeric columns
numeric_cols <- c("overall", "day_diff", "helpful_yes", "total_vote", "Polarity")
cat("Applying IQR-based outlier removal for numeric columns...\n")

row_mask <- rep(TRUE, nrow(df_cleaned))
for (col in numeric_cols) {
  q <- quantile(df_cleaned[[col]], probs = c(0.25, 0.75), na.rm = TRUE)
  iqr <- q[2] - q[1]
  lower_bound <- q[1] - 1.5 * iqr
  upper_bound <- q[2] + 1.5 * iqr
  
  # Identify outliers
  col_outliers <- df_cleaned[[col]] < lower_bound | df_cleaned[[col]] > upper_bound
  cat(sprintf(" - %s bounds: [%.2f, %.2f] | Outliers detected: %d\n", 
              col, lower_bound, upper_bound, sum(col_outliers, na.rm = TRUE)))
  
  # Update mask for columns that can have true outliers (e.g., day_diff, total_vote)
  if (col %in% c("day_diff", "total_vote")) {
    row_mask <- row_mask & !col_outliers
  }
}

before_outlier_cnt <- nrow(df_cleaned)
df_cleaned <- df_cleaned[row_mask, ]
after_outlier_cnt <- nrow(df_cleaned)
cat(sprintf("Filtered out %d outlier rows based on tail distribution features.\n", 
            before_outlier_cnt - after_outlier_cnt))

# Basic Text Normalization (trim whitespace, lowercasing review text)
cat("Performing basic text normalization on review text...\n")
df_cleaned$reviewText <- trimws(df_cleaned$reviewText)
df_cleaned$review_length <- nchar(df_cleaned$reviewText)

# Export cleaned data
output_path <- "../cleaned_data.csv"
write.csv(df_cleaned, output_path, row.names = FALSE)
cat(sprintf("Cleaned dataset successfully exported to: %s\n", output_path))
cat(sprintf("Cleaned dimensions: %d rows x %d columns\n", nrow(df_cleaned), ncol(df_cleaned)))


# ==============================================================================
# SECTION 3: DESCRIPTIVE STATISTICS (ADVANCED TECHNIQUE #1) [3/5]
# ==============================================================================
cat("\n# === [3/5] SECTION 3: DESCRIPTIVE STATISTICS (ADVANCED TECHNIQUE #1) ===\n")
cat("Computing higher-order statistical moments using custom mathematical formulae...\n\n")

# Custom functions for Skewness and Excess Kurtosis using raw moment equations
# Skewness = m3 / (m2^1.5) where m_k = (1/n) * sum((x_i - mean)^k)
# Excess Kurtosis = (m4 / m2^2) - 3

calc_skewness <- function(x) {
  x <- x[!is.na(x)]
  n <- length(x)
  if (n < 3) return(NA)
  mean_val <- mean(x)
  m2 <- sum((x - mean_val)^2) / n
  m3 <- sum((x - mean_val)^3) / n
  if (m2 == 0) return(0)
  skew <- m3 / (m2^1.5)
  return(skew)
}

calc_kurtosis <- function(x) {
  x <- x[!is.na(x)]
  n <- length(x)
  if (n < 4) return(NA)
  mean_val <- mean(x)
  m2 <- sum((x - mean_val)^2) / n
  m4 <- sum((x - mean_val)^4) / n
  if (m2 == 0) return(0)
  kurt <- (m4 / (m2^2)) - 3
  return(kurt)
}

stats_summary <- data.frame(
  Feature = character(),
  Mean = numeric(),
  Median = numeric(),
  Variance = numeric(),
  StdDev = numeric(),
  Skewness = numeric(),
  Kurtosis = numeric(),
  stringsAsFactors = FALSE
)

target_stats_cols <- c("overall", "day_diff", "helpful_yes", "total_vote", "Polarity", "review_length")

for (col in target_stats_cols) {
  vals <- df_cleaned[[col]]
  stats_summary <- rbind(stats_summary, data.frame(
    Feature = col,
    Mean = mean(vals, na.rm = TRUE),
    Median = median(vals, na.rm = TRUE),
    Variance = var(vals, na.rm = TRUE),
    StdDev = sd(vals, na.rm = TRUE),
    Skewness = calc_skewness(vals),
    Kurtosis = calc_kurtosis(vals),
    stringsAsFactors = FALSE
  ))
}

# Print formatted table
cat(sprintf("%-15s | %-8s | %-8s | %-8s | %-8s | %-8s | %-8s\n", 
            "Feature", "Mean", "Median", "Variance", "StdDev", "Skewness", "Kurtosis"))
cat(paste(rep("-", 77), collapse = ""), "\n")
for (i in 1:nrow(stats_summary)) {
  cat(sprintf("%-15s | %8.3f | %8.3f | %8.3f | %8.3f | %8.3f | %8.3f\n",
              stats_summary$Feature[i],
              stats_summary$Mean[i],
              stats_summary$Median[i],
              stats_summary$Variance[i],
              stats_summary$StdDev[i],
              stats_summary$Skewness[i],
              stats_summary$Kurtosis[i]))
}


# ==============================================================================
# SECTION 4: HYPOTHESIS TESTING (ADAPTIVE) [4/5]
# ==============================================================================
cat("\n# === [4/5] SECTION 4: HYPOTHESIS TESTING ===\n")

# ------------------------------------------------------------------------------
# ADVANCED TECHNIQUE #2: Chi-Square Test of Independence
# Test association between Opinion_Type (Comparative vs Non-Comparative) and Sentiment
# ------------------------------------------------------------------------------
cat("\n--- ADVANCED TECHNIQUE #2: Chi-Square Test of Independence ---\n")
cat("Hypothesis: Is there an association between review style (Opinion_Type) and Sentiment class?\n")

contingency_table <- table(df_cleaned$Opinion_Type, df_cleaned$Sentiment)
cat("\nContingency Table (Opinion_Type vs Sentiment):\n")
print(contingency_table)

chisq_res <- chisq.test(contingency_table)
print(chisq_res)

# ------------------------------------------------------------------------------
# ADVANCED TECHNIQUE #3: Welch's Independent Two-Sample t-test
# Compare mean Polarity score between Comparative and Non-Comparative review styles
# ------------------------------------------------------------------------------
cat("\n--- ADVANCED TECHNIQUE #3: Welch's Independent Two-Sample t-test ---\n")
cat("Hypothesis: Does review style (Opinion_Type) impact average sentiment polarity?\n")

comparative_polarity <- df_cleaned$Polarity[df_cleaned$Opinion_Type == "Comparative"]
non_comparative_polarity <- df_cleaned$Polarity[df_cleaned$Opinion_Type == "Non-Comparative"]

cat(sprintf("Comparative Reviews Count: %d | Mean Polarity: %.4f\n", 
            length(comparative_polarity), mean(comparative_polarity, na.rm=TRUE)))
cat(sprintf("Non-Comparative Reviews Count: %d | Mean Polarity: %.4f\n", 
            length(non_comparative_polarity), mean(non_comparative_polarity, na.rm=TRUE)))

t_test_res <- t.test(comparative_polarity, non_comparative_polarity, alternative = "two.sided", var.equal = FALSE)
print(t_test_res)

# ------------------------------------------------------------------------------
# ADVANCED TECHNIQUE #4: One-way ANOVA
# Compare the continuous feature 'review_length' across Sentiment target categories
# ------------------------------------------------------------------------------
cat("\n--- ADVANCED TECHNIQUE #4: One-Way ANOVA ---\n")
cat("Hypothesis: Do reviewer lengths differ significantly across Sentiment classes (Positive, Negative, Neutral)?\n")

anova_fit <- aov(review_length ~ Sentiment, data = df_cleaned)
anova_summary <- summary(anova_fit)
print(anova_summary)

# Post-Hoc Analysis to find pairwise differences
cat("\nPairwise Comparisons (Tukey HSD):\n")
print(TukeyHSD(anova_fit))


# ==============================================================================
# SECTION 5: MACHINE LEARNING MODEL IN R (ADVANCED TECHNIQUE #5) [5/5]
# ==============================================================================
cat("\n# === [5/5] SECTION 5: MACHINE LEARNING MODEL IN R ===\n")
cat("Building a binomial logistic regression model to predict positive sentiment...\n")

# Prepare target: Binary classification: Positive (1) vs Non-Positive (0)
df_cleaned$is_positive <- ifelse(df_cleaned$Sentiment == "Positive", 1, 0)

# Select features
features <- c("overall", "day_diff", "helpful_yes", "Polarity", "review_length")
cat("Predictors: overall, day_diff, helpful_yes, Polarity, review_length\n")

# Split 80/20 train/test
set.seed(42)
train_idx <- sample(seq_len(nrow(df_cleaned)), size = 0.8 * nrow(df_cleaned))
train_data <- df_cleaned[train_idx, ]
test_data <- df_cleaned[-train_idx, ]

cat(sprintf("Training samples: %d | Testing samples: %d\n", nrow(train_data), nrow(test_data)))

# Fit Logistic Regression
lr_model <- glm(is_positive ~ overall + day_diff + helpful_yes + Polarity + review_length, 
                data = train_data, family = binomial)

# Print Summary
cat("\nModel Summary:\n")
print(summary(lr_model))

# Predictions
probs <- predict(lr_model, newdata = test_data, type = "response")
preds <- ifelse(probs >= 0.5, 1, 0)
actuals <- test_data$is_positive

# Confusion Matrix
conf_matrix <- table(Actual = actuals, Predicted = preds)
cat("\nConfusion Matrix on Test Dataset:\n")
print(conf_matrix)

# Metrics
tp <- sum(preds == 1 & actuals == 1)
fp <- sum(preds == 1 & actuals == 0)
fn <- sum(preds == 0 & actuals == 1)
tn <- sum(preds == 0 & actuals == 0)

accuracy <- (tp + tn) / length(actuals)
precision <- ifelse((tp + fp) > 0, tp / (tp + fp), 0)
recall <- ifelse((tp + fn) > 0, tp / (tp + fn), 0)
f1_score <- ifelse((precision + recall) > 0, 2 * (precision * recall) / (precision + recall), 0)

cat("\nPerformance Evaluation Metrics:\n")
cat(sprintf(" - Accuracy  : %.4f\n", accuracy))
cat(sprintf(" - Precision : %.4f\n", precision))
cat(sprintf(" - Recall    : %.4f\n", recall))
cat(sprintf(" - F1-Score  : %.4f\n", f1_score))

cat("\n======================================================================\n")
cat("      SUCCESS: ACADEMIC PIPELINE COMPLETE AND DATA EXPORTED           \n")
cat("======================================================================\n")
