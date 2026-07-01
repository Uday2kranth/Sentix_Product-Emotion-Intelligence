You are tasked with creating a complete, standalone R programming pipeline and its accompanying README for an academic college project. This is for a university major project submission that requires a minimum of 5 advanced data analysis techniques implemented in R, separate from the Python application.

IMPORTANT CONTEXT — READ BEFORE DOING ANYTHING:
- This project has a React + Vite frontend and a FastAPI Python backend. You do NOT need to touch the frontend or backend UNLESS Phase 3 requires adding EDA visualizations.
- The project already has Python-based ML/DL/NLP/CV models running in the application. The R script is a SEPARATE academic deliverable.
- The R script must be completely standalone — it must run independently via `Rscript` from a terminal without needing the Python backend, the React frontend, or RStudio.
- There are at least 5 other sibling projects following this exact same structure. This prompt is generic and must NOT be hardcoded to any specific project name, domain, or dataset.

═══════════════════════════════════════════════════════════════════════
PHASE 0: RECONNAISSANCE — UNDERSTAND THE PROJECT BEFORE WRITING CODE
═══════════════════════════════════════════════════════════════════════

Before writing a single line of R code, you MUST:

1. Scan the project root directory and list all files and folders.
2. Identify ALL CSV/data files present in the project root (these are the datasets).
3. Read the first 20 rows and all column names of the PRIMARY dataset (the one the Python backend trains on — check app_fastapi.py or the equivalent backend entry point for which file it loads by default).
4. Determine the PROJECT DOMAIN by reading the project's existing README.md, Python model files, and backend code. Classify it as one of:
   - CLASSIFICATION (binary or multiclass) — e.g., disease diagnosis, sentiment analysis, spam detection
   - REGRESSION — e.g., price prediction, score estimation, demand forecasting
   - NLP — e.g., text classification, named entity recognition, topic modeling
   - COMPUTER VISION — e.g., image classification (the dataset may contain image metadata or extracted features)
   - TIME SERIES — e.g., stock prediction, sensor data, EEG/brain wave signals
   - MIXED — combination of the above
5. Identify the TARGET COLUMN (the column being predicted by the Python model).
6. Identify which columns are NUMERIC (continuous), which are CATEGORICAL (discrete/factors), and which are TEXT.
7. Identify what Python ML/DL models are already being used (e.g., XGBoost, Random Forest, LSTM, CNN, BERT, Logistic Regression, Linear Regression, etc.).

Document your findings as comments at the top of the R script before proceeding.

═══════════════════════════════════════════════════════════════════════
PHASE 1: CREATE THE R SCRIPT — academic_pipeline.R
═══════════════════════════════════════════════════════════════════════

Create a folder called `Rogramming for eda and data cleaning` in the project root (if it does not already exist). Inside it, create `academic_pipeline.R`.

The script MUST follow this exact sequential structure:

────────────────────────────────────────────
SECTION 1: DATA LOADING & INSPECTION
────────────────────────────────────────────
- Read the primary CSV dataset from the parent directory (`../filename.csv`) with a fallback to the current directory (`filename.csv`).
- Print initial dimensions (rows × columns).
- Print column names and data types.
- Print summary statistics using `summary()`.
- Check and report the count of missing values per column.
- Check and report duplicate row count.

────────────────────────────────────────────
SECTION 2: DATA CLEANING
────────────────────────────────────────────
- Drop rows with NA values using `tidyr::drop_na()` or equivalent.
- Remove duplicate rows if any exist.
- For NUMERIC continuous columns: apply IQR-based outlier removal (Q1 - 1.5*IQR to Q3 + 1.5*IQR).
- For TEXT columns (if NLP project): basic text normalization is acceptable (lowercasing, trimming whitespace) but do NOT attempt heavy NLP preprocessing in R — that is handled by Python.
- Print cleaned dimensions.
- Export the cleaned dataset as `cleaned_data.csv` to the parent directory (`../cleaned_data.csv`).

────────────────────────────────────────────
SECTION 3: DESCRIPTIVE STATISTICS
────────────────────────────────────────────
This counts as ADVANCED TECHNIQUE #1.
- For all numeric/continuous columns, compute and print a formatted table with:
  - Mean, Median, Variance, Standard Deviation, Skewness, Excess Kurtosis
- Implement skewness and kurtosis using RAW MOMENT FORMULAE (do NOT use external packages like `e1071` or `moments`). Write custom `calc_skewness(x)` and `calc_kurtosis(x)` functions using:
  - Skewness = m3 / (m2^1.5) where m_k = (1/n) * Σ(x_i - x̄)^k
  - Excess Kurtosis = (m4 / m2²) − 3
- This demonstrates understanding of statistical foundations without hiding behind library calls.

────────────────────────────────────────────
SECTION 4: HYPOTHESIS TESTING (ADAPTIVE)
────────────────────────────────────────────
Select the APPROPRIATE hypothesis tests based on the data types and domain discovered in Phase 0. You MUST include at least 2 hypothesis tests from this menu. Each counts as an advanced technique.

IF the project has a BINARY CATEGORICAL target (e.g., 0/1, Yes/No, Positive/Negative):
  - ADVANCED TECHNIQUE #2: Chi-Square Test of Independence — test association between a binned/categorical predictor and the binary target. Create categorical bins from a continuous variable if needed (e.g., Age → Young/Middle/Senior).
  - ADVANCED TECHNIQUE #3: Welch's Independent Two-Sample t-test — compare the mean of the strongest continuous predictor between the two target groups.
  - (Optional) Mann-Whitney U Test — if the data is clearly non-normal, use `wilcox.test()` as a non-parametric alternative.

IF the project has a MULTICLASS CATEGORICAL target (3+ classes):
  - ADVANCED TECHNIQUE #2: Chi-Square Test — association between a categorical feature and the multiclass target.
  - ADVANCED TECHNIQUE #3: One-Way ANOVA — compare means of a continuous feature across all target classes.
  - (Optional) Kruskal-Wallis Test — non-parametric ANOVA alternative using `kruskal.test()`.

IF the project is REGRESSION (continuous target):
  - ADVANCED TECHNIQUE #2: Pearson Correlation Test — `cor.test()` between the target and the top continuous predictor.
  - ADVANCED TECHNIQUE #3: One-Way ANOVA — bin the target into quantile groups and compare a predictor across groups using `aov()`.
  - (Optional) Shapiro-Wilk Normality Test — test whether the target column follows a normal distribution.

IF the project is NLP / TEXT-BASED:
  - ADVANCED TECHNIQUE #2: Chi-Square Test — association between text length categories (short/medium/long) and the target label.
  - ADVANCED TECHNIQUE #3: Welch's t-test — compare mean text length between two target classes (or ANOVA if multiclass).
  - (Optional) Word count distribution comparison across classes.

IF the project is TIME SERIES / BRAIN WAVES / SENSOR DATA:
  - ADVANCED TECHNIQUE #2: Paired t-test or Wilcoxon Signed-Rank Test — compare measurements across conditions or time windows.
  - ADVANCED TECHNIQUE #3: One-Way ANOVA — compare signal features (mean amplitude, frequency band power) across groups/conditions.
  - (Optional) Correlation test between signal features and outcome.

For ALL TYPES, ALSO include:
  - ADVANCED TECHNIQUE #4: One-Way ANOVA comparing a continuous feature across a grouped categorical variable. If no natural grouping exists, bin a continuous variable into 3 quantile-based groups (Low/Medium/High) and test another continuous feature across those groups.

────────────────────────────────────────────
SECTION 5: MACHINE LEARNING MODEL IN R
────────────────────────────────────────────
ADVANCED TECHNIQUE #5 (and possibly #6).

Check the count of advanced techniques so far (descriptive stats + hypothesis tests). If the total is already ≥ 5, this section is OPTIONAL but recommended. If the total is < 5, this section is MANDATORY.

Choose the appropriate R model based on the task type:

IF CLASSIFICATION (binary or multiclass):
  - Fit a Logistic Regression model using `glm(target ~ ., data = train_data, family = binomial)` (binary) or `nnet::multinom()` (multiclass).
  - Split data 80/20 train/test.
  - Print confusion matrix, accuracy, precision, recall.
  - This is ADVANCED TECHNIQUE #5.

IF REGRESSION:
  - Fit a Simple Linear Regression using `lm(target ~ top_predictor, data = train_data)`.
  - Print R², Adjusted R², coefficients, and p-values via `summary()`.
  - This is ADVANCED TECHNIQUE #5.
  - (Optional TECHNIQUE #6) Fit a Multiple Linear Regression with the top 3 predictors.

IF NLP:
  - Compute a word frequency table and fit a logistic regression on text length + word count as predictors.
  - This is ADVANCED TECHNIQUE #5.

IF TIME SERIES / SENSOR:
  - Fit a simple linear regression on extracted signal features.
  - This is ADVANCED TECHNIQUE #5.

IMPORTANT R ML RULES:
- Use ONLY base R and `stats` package functions for modeling. Do NOT require `caret`, `tidymodels`, `randomForest`, or any heavy ML package. The only allowed external package is `dplyr` (and `tidyr` if needed for cleaning).
- If you need `nnet` for multiclass logistic regression, that is acceptable as it is a recommended package bundled with R.
- Print all model results clearly with labeled sections.

────────────────────────────────────────────
SCRIPT FORMATTING RULES
────────────────────────────────────────────
- Use `cat()` for all printed output — never rely on implicit `print()` for section headers.
- Use clear section separators with `# ====` comment blocks.
- Number all sections as [1/N], [2/N], etc. in the console output.
- Print a final success banner at the end.
- The script should complete in under 30 seconds on any modern machine.
- Only require `library(dplyr)` and `library(stats)` at the top. If absolutely needed, `library(tidyr)` is acceptable.
- Include error handling for the file read (check if file exists before reading, stop with a clear message if not found).

═══════════════════════════════════════════════════════════════════════
PHASE 2: CREATE THE R FOLDER README — README.md
═══════════════════════════════════════════════════════════════════════

Inside the `Rogramming for eda and data cleaning/` folder, create a `README.md` file that serves as a complete standalone guide for running the R script WITHOUT RStudio.

The README MUST contain ALL of the following sections:

1. **Title**: "Running the Academic R Pipeline — No RStudio Required"

2. **What the Script Does**: A numbered list of everything the script performs (data loading, cleaning, descriptive stats, each hypothesis test by name, ML model if included).

3. **Prerequisites Check**: Show how to verify R is installed (`R --version`), with expected output and instructions if R is not found on PATH (including the default Windows install path `C:\Program Files\R\R-4.x.x\bin`).

4. **Option 1: Run from Windows Terminal or PowerShell (Recommended)**:
   - Step 1: Navigate to the folder (with the exact `cd` command using the project's actual path)
   - Step 2: Install required packages (first time only) — `Rscript -e "install.packages('dplyr', repos='https://cloud.r-project.org')"`
   - Step 3: Run the script — `Rscript academic_pipeline.R`

5. **Option 2: Run from VS Code Terminal**:
   - Open folder in VS Code
   - Open integrated terminal
   - Install packages + run script
   - Tip about the R extension for one-click execution

6. **Option 3: Run from Windows Command Prompt (CMD)**:
   - `cd /d "path"` + `Rscript academic_pipeline.R`

7. **Expected Terminal Output**: Show a realistic preview of what the console output looks like when the script runs (with placeholder values like `XX.XX` for statistics).

8. **Output Files Generated**: Table showing `cleaned_data.csv` location and description.

9. **Troubleshooting** section with these exact 4 cases:
   - `'Rscript' is not recognized` → PATH fix instructions
   - `there is no package called 'dplyr'` → install command
   - `cannot open file '../dataset.csv': No such file or directory` → wrong directory fix
   - `Rtools warning appears but script still runs` → safe to ignore explanation

═══════════════════════════════════════════════════════════════════════
PHASE 3: VERIFY & IMPLEMENT PYTHON EDA VISUALIZATIONS
═══════════════════════════════════════════════════════════════════════

Before touching the main README, you MUST audit the existing backend and frontend for data visualization coverage.

STEP 1 — AUDIT THE BACKEND:
- Read the FastAPI backend entry point (e.g., `app_fastapi.py` or equivalent).
- Search for any endpoint that generates plots, charts, or visualizations related to:
  - Dataset distribution plots (histograms, box plots, violin plots)
  - Correlation heatmaps
  - Model prediction visualizations (confusion matrix, ROC curve, regression scatter, residual plots)
  - Feature importance charts
  - Any Base64-encoded image generation using Matplotlib, Seaborn, or Plotly
- List every visualization endpoint you find and what it generates.

STEP 2 — AUDIT THE FRONTEND:
- Read the React components to check if they display:
  - EDA charts or plots (either from backend Base64 images or client-side charting libraries)
  - Model performance visuals (accuracy charts, prediction vs actual plots)
  - Any Recharts, Chart.js, D3, or other visualization components
- List every visualization component you find.

STEP 3 — GAP ANALYSIS:
Compare what exists against this minimum EDA visualization checklist:
  ☐ Distribution plot for at least 2 key features (histogram or density plot)
  ☐ Correlation heatmap of numeric features
  ☐ Model prediction visualization (confusion matrix heatmap for classification, OR predicted vs actual scatter for regression)

STEP 4 — IMPLEMENT MISSING VISUALIZATIONS:
If ANY of the 3 items above are missing from the backend, implement them:
- Add a new endpoint or extend the existing EDA endpoint in the Python backend.
- Generate the plots using Matplotlib (preferred) or Seaborn.
- Encode them as Base64 PNG strings and return them in the JSON response.
- If the frontend already has an EDA section, make sure the new plots are wired up to display there.
- If the frontend does NOT have an EDA section, create a simple component or card that renders the Base64 images.

If ALL 3 visualization types already exist:
- Do nothing. Print a confirmation of what you found and move on to Phase 4.

IMPORTANT: Do NOT break any existing functionality. If you add new endpoints, use new route paths. If you modify existing endpoints, only ADD to the response — never remove existing fields.

═══════════════════════════════════════════════════════════════════════
PHASE 4: UPDATE THE MAIN PROJECT README.md
═══════════════════════════════════════════════════════════════════════

After completing Phases 1–3, update the main project `README.md`:

1. In the **Repository Directory Structure** section, add the `Rogramming for eda and data cleaning/` folder with both files listed:
├── Rogramming for eda and data cleaning/ │ ├── academic_pipeline.R ← Standalone R script: [brief description of what it does] │ └── README.md ← Guide to running the R pipeline locally without RStudio


2. If there is a section about running the R pipeline, add a TIP callout linking to the R folder's README.md:




3. If you added new EDA visualization endpoints or components in Phase 3, document them:
- Add the new endpoint(s) to the API Reference table (if one exists).
- Mention the new visualization(s) in the relevant component breakdown section.
- If you created a new frontend component, add it to the component listing in the directory structure.

═══════════════════════════════════════════════════════════════════════
FINAL CHECKLIST — VERIFY BEFORE FINISHING
═══════════════════════════════════════════════════════════════════════

Before declaring the task complete, verify:

☐ The R script runs end-to-end without errors when executed via `Rscript academic_pipeline.R` from the R folder
☐ The script reads the correct dataset file (the same primary dataset used by the Python backend)
☐ The script exports `cleaned_data.csv` to the parent directory
☐ At least 5 distinct advanced data analysis techniques are implemented:
1. Descriptive Statistics (Mean, Median, Variance, Skewness, Kurtosis)
2. Hypothesis Test #1 (e.g., Chi-Square / Correlation Test)
3. Hypothesis Test #2 (e.g., t-test / ANOVA / Mann-Whitney)
4. Hypothesis Test #3 (e.g., ANOVA / Kruskal-Wallis / Shapiro-Wilk)
5. ML Model (Logistic Regression / Linear Regression / Multiple Regression)
☐ The R folder README.md has all 3 run methods (PowerShell, VS Code, CMD) and all 4 troubleshooting cases
☐ The Python backend has at least: 2 distribution plots + 1 correlation heatmap + 1 model prediction visual (or you added them in Phase 3)
☐ The main project README.md directory structure includes the R folder and both files
☐ Any new EDA endpoints or components added in Phase 3 are documented in the main README
☐ No external R packages beyond `dplyr`, `stats`, `tidyr`, and `nnet` (if multiclass) are required
☐ All file paths in the README use the actual project directory path, not placeholders
