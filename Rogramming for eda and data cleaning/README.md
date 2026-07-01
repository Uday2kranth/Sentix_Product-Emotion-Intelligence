# Running the Academic R Pipeline — No RStudio Required

This directory contains the standalone R programming pipeline developed for the academic major project submission. The pipeline performs loading, robust cleaning, high-order statistical descriptive summarization, hypothesis testing, and binary logistic regression modeling.

---

## 1. What the Script Does

The pipeline executes the following 5 advanced data analysis techniques sequentially:
1. **Data Loading & Inspection**: Verifies and reads the `amazon_comparative_output.csv` primary dataset.
2. **Robust Data Cleaning**: Automatically handles missing values, deduplicates rows, performs IQR-based outlier removal on numeric features, and exports the clean dataset to `cleaned_data.csv`.
3. **Advanced Descriptive Statistics (Technique #1)**: Computes the mean, median, variance, standard deviation, skewness, and excess kurtosis of all numeric features. Higher-order statistical moments (skewness and kurtosis) are implemented from raw mathematical formulas without library dependencies.
4. **Adaptive Hypothesis Testing (Techniques #2, #3, #4)**:
   - **Chi-Square Test of Independence**: Tests association between the review style (`Opinion_Type` - Comparative vs Non-Comparative) and the multiclass target (`Sentiment` - Positive, Negative, Neutral).
   - **Welch's Independent Two-Sample t-test**: Compares the mean of the continuous `Polarity` score across review styles.
   - **One-Way ANOVA with Post-Hoc Tukey HSD**: Evaluates if the average review character length (`review_length`) differs significantly across the three sentiment groups.
5. **Supervised Machine Learning (Technique #5)**: Splits the data 80% train and 20% test, transforms `Sentiment` into a binary target (`is_positive`), fits a binomial Logistic Regression model (`glm`), and prints a complete Confusion Matrix along with accuracy, precision, recall, and F1-score.

---

## 2. Prerequisites Check

Before running the pipeline, check that R is installed and configured on your system's PATH.

Open a PowerShell or CMD window and run:
```bash
R --version
```

### Expected Output:
```text
R version 4.x.x (or higher) -- "..."
Copyright (C) 20xx The R Foundation for Statistical Computing
Platform: x86_64-w64-mingw32/x64
```

### If R is not found or not recognized:
Add R's bin folder to your Windows system PATH environment variable. By default, R installs to:
`C:\Program Files\R\R-4.x.x\bin` (Replace `R-4.x.x` with your actual version, e.g., `R-4.3.1`).

---

## 3. Option 1: Run from Windows Terminal or PowerShell (Recommended)

1. Open Windows Terminal (PowerShell or Command Prompt).
2. Navigate to this directory using the exact absolute path:
   ```powershell
   cd "d:\sem3\excel\numpy\Sentix_Product Emotion Intelligence\Rogramming for eda and data cleaning"
   ```
3. Install the required R dependency packages (only needed the first time):
   ```bash
   Rscript -e "install.packages('dplyr', repos='https://cloud.r-project.org')"
   ```
4. Execute the R pipeline script:
   ```bash
   Rscript academic_pipeline.R
   ```

---

## 4. Option 2: Run from VS Code Terminal

1. Launch VS Code and open the workspace folder `d:\sem3\excel\numpy\Sentix_Product Emotion Intelligence`.
2. Open the integrated terminal (`Ctrl + ~`).
3. Change directory to the R programming folder:
   ```bash
   cd "Rogramming for eda and data cleaning"
   ```
4. Run the script:
   ```bash
   Rscript academic_pipeline.R
   ```

> [!TIP]
> Install the **R extension** by Yuki Ueda in VS Code for code highlighting, linting, and one-click R script execution.

---

## 5. Option 3: Run from Windows Command Prompt (CMD)

1. Open Command Prompt (`cmd.exe`).
2. Run the directory change command pointing to the absolute path:
   ```cmd
   cd /d "d:\sem3\excel\numpy\Sentix_Product Emotion Intelligence\Rogramming for eda and data cleaning"
   ```
3. Run the pipeline script:
   ```cmd
   Rscript academic_pipeline.R
   ```

---

## 6. Expected Terminal Output

A successful run of the pipeline will print a structured output in the console:

```text
======================================================================
      SENTIX: ACADEMIC R DATA ANALYSIS & CLEANING PIPELINE            
======================================================================


# === [1/5] SECTION 1: DATA LOADING & INSPECTION ===
Loading dataset from parent directory: ../amazon_comparative_output.csv 
Initial dimensions: 4917 rows x 15 columns

Column Names and Data Types:
 - reviewerID        : character
 - asin              : character
 - reviewerName      : character
 - helpful           : character
 - reviewText        : character
 - overall           : numeric
 - summary           : character
 - unixReviewTime    : numeric
 - reviewTime        : character
 - day_diff          : numeric
 - helpful_yes       : numeric
 - total_vote        : numeric
 - Opinion_Type      : character
 - Polarity          : numeric
 - Sentiment         : character

# === [2/5] SECTION 2: DATA CLEANING ===
Dropping rows with missing critical features...
Applying IQR-based outlier removal for numeric columns...
 - overall bounds: [4.00, 6.00] | Outliers detected: XX
 - day_diff bounds: [XX.XX, XX.XX] | Outliers detected: XX
 - helpful_yes bounds: [0.00, 0.00] | Outliers detected: XX
 - total_vote bounds: [0.00, 0.00] | Outliers detected: XX
 - Polarity bounds: [XX.XX, XX.XX] | Outliers detected: XX
Filtered out XX outlier rows based on tail distribution features.
Performing basic text normalization on review text...
Cleaned dataset successfully exported to: ../cleaned_data.csv
Cleaned dimensions: XXXX rows x 16 columns

# === [3/5] SECTION 3: DESCRIPTIVE STATISTICS (ADVANCED TECHNIQUE #1) ===
Computing higher-order statistical moments using custom mathematical formulae...

Feature         | Mean     | Median   | Variance | StdDev   | Skewness | Kurtosis
-----------------------------------------------------------------------------
overall         |    X.XXX |    X.XXX |    X.XXX |    X.XXX |   -X.XXX |    X.XXX
day_diff        |  XXX.XXX |  XXX.XXX | XXXX.XXX |   XX.XXX |    X.XXX |   -X.XXX
helpful_yes     |    X.XXX |    X.XXX |    X.XXX |    X.XXX |    X.XXX |    X.XXX
total_vote      |    X.XXX |    X.XXX |    X.XXX |    X.XXX |    X.XXX |    X.XXX
Polarity        |    X.XXX |    X.XXX |    X.XXX |    X.XXX |   -X.XXX |    X.XXX
review_length   |  XXX.XXX |  XXX.XXX | XXXX.XXX |  XXX.XXX |    X.XXX |    X.XXX

# === [4/5] SECTION 4: HYPOTHESIS TESTING ===

--- ADVANCED TECHNIQUE #2: Chi-Square Test of Independence ---
Hypothesis: Is there an association between review style (Opinion_Type) and Sentiment class?

Contingency Table (Opinion_Type vs Sentiment):
                 Negative Neutral Positive
  Comparative          XX      XX      XXX
  Non-Comparative     XXX     XXX     XXXX

	Pearson's Chi-squared test
data:  contingency_table
X-squared = XX.XXX, df = 2, p-value = X.XXXXe-XX

--- ADVANCED TECHNIQUE #3: Welch's Independent Two-Sample t-test ---
Hypothesis: Does review style (Opinion_Type) impact average sentiment polarity?
Comparative Reviews Count: XXX | Mean Polarity: 0.XXXX
Non-Comparative Reviews Count: XXXX | Mean Polarity: 0.XXXX

	Welch Two Sample t-test
data:  comparative_polarity and non_comparative_polarity
t = X.XXX, df = XXX.XX, p-value = X.XXXe-XX
alternative hypothesis: true difference in means is not equal to 0

--- ADVANCED TECHNIQUE #4: One-Way ANOVA ---
Hypothesis: Do reviewer lengths differ significantly across Sentiment classes (Positive, Negative, Neutral)?
            Df    Sum Sq Mean Sq F value Pr(>F)    
Sentiment    2   XXXXXXX  XXXXXX   XX.XX <2e-16 ***
Residuals XXXX  XXXXXXXX   XXXXX                   

Pairwise Comparisons (Tukey HSD):
  Tukey multiple comparisons of means
    95% family-wise confidence level
$Sentiment
                      diff        lwr        upr     p adj
Neutral-Negative   -XX.XXX   -XX.XXX   -XX.XXX  0.XXXXXX
Positive-Negative  -XX.XXX   -XX.XXX   -XX.XXX  0.XXXXXX
Positive-Neutral   -XX.XXX   -XX.XXX   -XX.XXX  0.XXXXXX

# === [5/5] SECTION 5: MACHINE LEARNING MODEL IN R ===
Building a binomial logistic regression model to predict positive sentiment...
Predictors: overall, day_diff, helpful_yes, Polarity, review_length
Training samples: XXXX | Testing samples: XXX

Model Summary:
Coefficients:
              Estimate Std. Error z value Pr(>|z|)    
(Intercept)   -X.XXXXX    0.XXXXX  -X.XXX 0.XXXXXX
overall        X.XXXXX    0.XXXXX  XX.XXX  < 2e-16 ***
Polarity      XX.XXXXX    0.XXXXX  XX.XXX  < 2e-16 ***
...

Confusion Matrix on Test Dataset:
      Predicted
Actual   0   1
     0 XXX  XX
     1  XX XXX

Performance Evaluation Metrics:
 - Accuracy  : 0.XXXX
 - Precision : 0.XXXX
 - Recall    : 0.XXXX
 - F1-Score  : 0.XXXX

======================================================================
      SUCCESS: ACADEMIC PIPELINE COMPLETE AND DATA EXPORTED           
======================================================================
```

---

## 7. Output Files Generated

| Output File Name | Target Directory | Description |
| :--- | :--- | :--- |
| `cleaned_data.csv` | `d:\sem3\excel\numpy\Sentix_Product Emotion Intelligence\cleaned_data.csv` | The clean dataset exported after dropping empty entries, deduplication, and outlier removal. |

---

## 8. Troubleshooting

### Case 1: `'Rscript' is not recognized as an internal or external command, operable program or batch file.`
* **Cause**: R is not installed, or R's `bin` folder is missing from your system's PATH variable.
* **Solution**: Check if R is installed. Find R's installation path (usually `C:\Program Files\R\R-4.x.x\bin`) and add this folder path to your user/system PATH environment variables. Restart the terminal.

### Case 2: `Error in library(dplyr) : there is no package called 'dplyr'`
* **Cause**: The library `dplyr` was not installed for this R environment.
* **Solution**: Run this command to install the package automatically from the public CRAN repository:
  ```bash
  Rscript -e "install.packages('dplyr', repos='https://cloud.r-project.org')"
  ```

### Case 3: `cannot open file '../amazon_comparative_output.csv': No such file or directory`
* **Cause**: The terminal is run from the wrong working directory. The script expects to read the dataset from the parent directory `../` or current directory.
* **Solution**: Ensure you run `cd` into the folder `d:\sem3\excel\numpy\Sentix_Product Emotion Intelligence\Rogramming for eda and data cleaning` before executing the script.

### Case 4: `Rtools is required to build R packages but is not installed`
* **Cause**: R is displaying a warning that the Rtools compiler suite is missing.
* **Solution**: **Safe to ignore.** The script only requires precompiled packages (like `dplyr` and built-in `stats`). It runs perfectly fine without Rtools.
