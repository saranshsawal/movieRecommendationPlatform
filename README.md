# 🎬 Saransh's Movie Recommendation Platform

> **College Project Submission**  
> A 100% offline, client-side movie recommendation system utilizing multi-factor dynamic weighting, content similarity, and seed-movie matching across 4,740+ curated films.

---

## 🌟 Key Features

1. **Multi-Factor Explorer**:
   - Filter and rank movies across **7 custom factors**:
     - 🔮 **Mood / Vibe**: 6 curated emotional categories (*Mind-Bending*, *High Adrenaline*, *Feel-Good*, *Dark & Gritty*, *Deep & Emotional*, *Epic & Imaginative*).
     - 🎭 **Genres**: Multi-select across 20 distinct film genres.
     - ⏳ **Decade / Era**: Classics (<1970) through 2020s.
     - ⏱️ **Runtime Profile**: Quick (<90m), Standard (90–120m), Epic (>120m).
     - ⭐ **Rating Quality**: Real-time slider threshold with TMDB/IMDb vote scoring.
     - 🎬 **Director & Star Cast**: Filter by renowned filmmakers and lead actors.
2. **Dynamic Weight Normalization**:
   - The user can pick **any 1, 2, or more factors**.
   - The algorithm automatically normalizes active factor weights to **100%**, generating accurate match percentage badges.
3. **"More Like This" Seed Recommender**:
   - Search any reference film (e.g., *Inception*, *Interstellar*, *Pulp Fiction*).
   - Toggle individual factors on/off (`[✓] Same Mood`, `[✓] Same Director`, `[✓] Shared Genres`, `[✓] Plot Themes`) to customize what makes another movie "similar".
4. **"Why It Matched" Signal Badges**:
   - Every card displays the exact factors that contributed to its recommendation score.
5. **Local Watchlist**:
   - Save bookmarked films directly in browser `localStorage`.
6. **Zero External API Dependency**:
   - Completely offline dataset preprocessed from TMDB 5,000; instant sub-millisecond search & filtering.

---

## 📐 Mathematical Formulation (For Project Viva / Presentation)

### 1. Factor Explorer Scoring with Dynamic Normalization
When a user selects a subset of factors $F_{\text{active}} \subseteq \{ \text{mood}, \text{genre}, \text{era}, \text{runtime}, \text{rating}, \text{director}, \text{actor} \}$:

$$\text{Final Score}(M) = \frac{\sum_{f \in F_{\text{active}}} S_f(M) \cdot W_f}{\sum_{f \in F_{\text{active}}} W_f} \times 100\%$$

Where:
* $S_{\text{mood}}(M) = \frac{|\text{Moods}(M) \cap \text{Moods}_{\text{user}}|}{|\text{Moods}_{\text{user}}|}$
* $S_{\text{genre}}(M) = \frac{|\text{Genres}(M) \cap \text{Genres}_{\text{user}}|}{|\text{Genres}_{\text{user}}|}$ (Jaccard Overlap)
* $S_{\text{era}}(M) = \mathbb{I}(\text{Decade}(M) == \text{Decade}_{\text{user}})$
* $S_{\text{runtime}}(M) = \mathbb{I}(\text{RuntimeBucket}(M) == \text{RuntimeBucket}_{\text{user}})$
* $S_{\text{rating}}(M) = \min\left(1.0, \frac{\text{Rating}(M)}{8.5}\right)$
* $S_{\text{director}}(M) = \mathbb{I}(\text{Director}(M) == \text{Director}_{\text{user}})$
* $S_{\text{actor}}(M) = \mathbb{I}(\text{Actor}_{\text{user}} \in \text{Cast}(M))$

---

### 2. Seed Movie Similarity
Given a seed movie $S$ and candidate movie $M$:

$$\text{Similarity}(S, M) = \sum_{k \in \text{Toggled}} W_k \cdot \text{Overlap}_k(S, M)$$

Matches are ranked by descending similarity percentage, excluding the seed movie itself ($M \ne S$).

---

## 🗂️ Project Structure

```
├── .github/
│   └── workflows/
│       └── deploy.yml          # Automated GitHub Pages CI/CD workflow
├── data/
│   ├── movies.json             # 4,740 preprocessed movies (3.0 MB)
│   └── metadata_summary.json   # Aggregated genres, moods, top directors/actors
├── movieDataset/
│   ├── tmdb_5000_movies.csv    # Raw dataset (5.7 MB)
│   └── tmdb_5000_credits.csv   # Raw credits & cast dataset (40 MB)
├── index.html                  # Semantic responsive UI layout
├── styles.css                  # Modern cinematic dark mode design system
├── app.js                      # Client-side recommendation engine & state manager
├── preprocess.py               # One-time data cleaning & feature extraction script
└── README.md                   # Project documentation & viva guide
```

---

## 🚀 How to Run Locally

1. Open a terminal in the project folder (`e:\Saransh`).
2. Start Python's built-in local web server:
   ```bash
   python -m http.server 8000
   ```
3. Open your browser and navigate to:
   ```
   http://localhost:8000
   ```

---

## 🌐 Deploy to GitHub Pages (Automated via GitHub Actions)

1. Create a new repository on your GitHub account (e.g. `cinematch-recommender`).
2. Push this folder to your repository:
   ```bash
   git init
   git add .
   git commit -m "Initial commit: CineMatch AI Movie Recommender"
   git branch -M main
   git remote add origin https://github.com/saranshsawal/movieRecommendationPlatform.git
   git push -u origin main
   ```
3. In your GitHub repository:
   * Go to **Settings** $\rightarrow$ **Pages**.
   * Under **Build and deployment** $\rightarrow$ **Source**, choose **GitHub Actions**.
4. The workflow in `.github/workflows/deploy.yml` will automatically build and publish your website live to:
   ```
   https://saranshsawal.github.io/movieRecommendationPlatform/
   ```

---

## 🎓 Viva & Presentation Q&A Preparation

| Question | Recommended Answer |
| :--- | :--- |
| **Why use a client-side architecture instead of a backend server?** | For a curated catalog of ~5,000 movies, loading a preprocessed 3.0 MB JSON file delivers **instant sub-millisecond filtering and recommendation** with **zero server costs**, **zero latency**, and **100% offline availability** on GitHub Pages. |
| **How does this solve the Cold-Start problem?** | Since it uses a **Content & Metadata-Based Multi-Factor model**, it does not require prior user history or millions of ratings to make accurate recommendations. The user can start immediately by picking moods, genres, or seed movies. |
| **What happens if a user selects only 1 or 2 factors?** | The engine uses **Dynamic Weight Normalization**. It computes the sum of only the selected factor weights and normalizes the final score to 100%, preventing skewed or suppressed percentages. |
| **What dataset was used?** | The **TMDB 5,000 Movie Dataset**, joined with cast and crew credits to extract genres, director, lead actors, plot overviews, release dates, and story keywords. |
