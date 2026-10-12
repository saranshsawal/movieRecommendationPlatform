import csv
import json
import os
import sys

# Paths
INPUT_MOVIES = os.path.join("movieDataset", "tmdb_5000_movies.csv")
INPUT_CREDITS = os.path.join("movieDataset", "tmdb_5000_credits.csv")
OUTPUT_JSON = os.path.join("data", "movies.json")
OUTPUT_SUMMARY_JSON = os.path.join("data", "metadata_summary.json")

# Mood category keyword maps
MOOD_KEYWORDS = {
    "Mind-Bending": {
        "keywords": [
            "time travel", "artificial intelligence", "virtual reality", "parallel world",
            "dream", "memory", "dystopia", "matrix", "philosophy", "illusion", "psychological",
            "mystery", "puzzle", "dimension", "space travel", "cyberpunk", "simulation", "twist",
            "investigation", "amnesia", "hallucination", "subconscious"
        ],
        "genres": ["Mystery", "Science Fiction"]
    },
    "High Adrenaline": {
        "keywords": [
            "heist", "car chase", "superhero", "martial arts", "assassin", "spy", "explosion",
            "survival", "hostage", "escape", "combat", "thrill", "battle", "chase", "race",
            "secret agent", "mission", "gunfight", "soldier", "sniper"
        ],
        "genres": ["Action", "Thriller"]
    },
    "Feel-Good & Wholesome": {
        "keywords": [
            "friendship", "family", "dog", "pet", "musical", "road trip", "happy", "wholesome",
            "wedding", "holiday", "childhood", "school", "sports", "coach", "dance", "uplifting",
            "love", "romantic comedy"
        ],
        "genres": ["Comedy", "Animation", "Family"]
    },
    "Dark & Gritty": {
        "keywords": [
            "serial killer", "crime", "gangster", "mafia", "revenge", "noir", "murder",
            "corruption", "dark", "prison", "detective", "gore", "horror", "haunted",
            "demon", "zombie", "psycho", "terror", "underworld"
        ],
        "genres": ["Crime", "Horror"]
    },
    "Deep & Emotional": {
        "keywords": [
            "tragedy", "biography", "historical", "illness", "depression", "tearjerker",
            "sacrifice", "loss", "grief", "love story", "heartbreak", "war drama", "cancer",
            "father daughter", "mother son", "terminal illness", "struggle"
        ],
        "genres": ["Drama", "Romance", "History"]
    },
    "Epic & Imaginative": {
        "keywords": [
            "fantasy", "space", "alien", "magic", "supernatural", "mythology", "adventure",
            "galaxy", "monster", "kingdom", "dragon", "quest", "wizard", "supernatural",
            "legend", "spaceship", "planet", "empire"
        ],
        "genres": ["Adventure", "Fantasy"]
    }
}

def safe_parse_json(text):
    if not text:
        return []
    try:
        return json.loads(text)
    except Exception:
        return []

def get_decade(release_date_str):
    if not release_date_str or len(release_date_str) < 4:
        return "Unknown"
    try:
        year = int(release_date_str[:4])
        if year < 1970:
            return "Classic (<1970)"
        elif 1970 <= year < 1980:
            return "1970s"
        elif 1980 <= year < 1990:
            return "1980s"
        elif 1990 <= year < 2000:
            return "1990s"
        elif 2000 <= year < 2010:
            return "2000s"
        elif 2010 <= year < 2020:
            return "2010s"
        else:
            return "2020s"
    except Exception:
        return "Unknown"

def get_runtime_bucket(runtime_val):
    if not runtime_val:
        return "Standard (90-120m)"
    try:
        r = float(runtime_val)
        if r <= 0:
            return "Standard (90-120m)"
        if r < 90:
            return "Quick (<90m)"
        elif 90 <= r <= 125:
            return "Standard (90-120m)"
        else:
            return "Epic (>120m)"
    except Exception:
        return "Standard (90-120m)"

def determine_moods(genres, keywords, overview):
    assigned_moods = set()
    text_corpus = (overview + " " + " ".join(keywords)).lower()
    
    for mood, config in MOOD_KEYWORDS.items():
        # Check keyword matches
        for kw in config["keywords"]:
            if kw in text_corpus:
                assigned_moods.add(mood)
                break
        
        # If still not assigned, check if primary genres match
        if mood not in assigned_moods:
            for g in config["genres"]:
                if g in genres:
                    # Give it a chance if genre is prominent
                    assigned_moods.add(mood)
                    break
                    
    if not assigned_moods:
        # Default fallback
        if "Comedy" in genres:
            assigned_moods.add("Feel-Good & Wholesome")
        elif "Action" in genres:
            assigned_moods.add("High Adrenaline")
        else:
            assigned_moods.add("Deep & Emotional")

    return list(assigned_moods)

def main():
    print("Reading credits dataset...")
    credits_map = {}
    with open(INPUT_CREDITS, mode="r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            m_id = row.get("movie_id")
            if not m_id:
                continue
            
            cast_raw = safe_parse_json(row.get("cast", ""))
            crew_raw = safe_parse_json(row.get("crew", ""))
            
            top_cast = [c["name"] for c in cast_raw[:4] if "name" in c]
            
            director = "Unknown"
            for member in crew_raw:
                if member.get("job") == "Director":
                    director = member.get("name", "Unknown")
                    break
                    
            credits_map[m_id] = {
                "cast": top_cast,
                "director": director
            }
            
    print(f"Loaded credits for {len(credits_map)} movies.")

    print("Reading and processing movies dataset...")
    processed_movies = []
    all_genres = set()
    all_directors = set()
    all_actors = set()
    all_decades = set()

    with open(INPUT_MOVIES, mode="r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            m_id = row.get("id")
            title = row.get("title", "").strip()
            if not m_id or not title:
                continue

            # Basic stats
            try:
                vote_avg = round(float(row.get("vote_average", 0)), 1)
            except Exception:
                vote_avg = 0.0

            try:
                vote_cnt = int(row.get("vote_count", 0))
            except Exception:
                vote_cnt = 0

            # Filter out obscure movies with zero votes/runtime if desired, or keep vote_cnt > 10
            if vote_cnt < 5 and vote_avg == 0:
                continue

            try:
                runtime = int(float(row.get("runtime", 0)))
            except Exception:
                runtime = 0

            release_date = row.get("release_date", "")
            decade = get_decade(release_date)
            runtime_bucket = get_runtime_bucket(runtime)
            overview = row.get("overview", "").strip()

            # Genres
            genres_raw = safe_parse_json(row.get("genres", ""))
            genres = [g["name"] for g in genres_raw if "name" in g]
            for g in genres:
                all_genres.add(g)

            # Keywords
            keywords_raw = safe_parse_json(row.get("keywords", ""))
            keywords = [k["name"] for k in keywords_raw if "name" in k]

            # Credits
            cred = credits_map.get(m_id, {"cast": [], "director": "Unknown"})
            director = cred["director"]
            cast = cred["cast"]

            if director != "Unknown":
                all_directors.add(director)
            for a in cast:
                all_actors.add(a)
            all_decades.add(decade)

            # Moods
            moods = determine_moods(genres, keywords, overview)

            # Build compact movie item
            movie_obj = {
                "id": int(m_id),
                "title": title,
                "overview": overview[:280] + ("..." if len(overview) > 280 else ""),
                "genres": genres,
                "keywords": keywords[:6], # Top 6 keywords
                "director": director,
                "cast": cast,
                "release_year": int(release_date[:4]) if len(release_date) >= 4 and release_date[:4].isdigit() else None,
                "decade": decade,
                "runtime": runtime,
                "runtime_bucket": runtime_bucket,
                "rating": vote_avg,
                "votes": vote_cnt,
                "moods": moods
            }
            processed_movies.append(movie_obj)

    # Sort by popularity/votes so top movies appear first in default catalog
    processed_movies.sort(key=lambda x: (x["votes"], x["rating"]), reverse=True)

    print(f"Total processed clean movies: {len(processed_movies)}")

    os.makedirs("data", exist_ok=True)

    # Save compact movies.json
    with open(OUTPUT_JSON, mode="w", encoding="utf-8") as f:
        json.dump(processed_movies, f, separators=(',', ':'))

    size_mb = os.path.getsize(OUTPUT_JSON) / (1024 * 1024)
    print(f"Saved {OUTPUT_JSON} (File size: {size_mb:.2f} MB)")

    # Save metadata summary for UI filters
    # Get top 50 directors and top 100 actors by movie count
    director_counts = {}
    actor_counts = {}
    for m in processed_movies:
        if m["director"] != "Unknown":
            director_counts[m["director"]] = director_counts.get(m["director"], 0) + 1
        for a in m["cast"]:
            actor_counts[a] = actor_counts.get(a, 0) + 1

    top_directors = sorted([d for d, c in director_counts.items() if c >= 3], key=lambda x: director_counts[x], reverse=True)[:40]
    top_actors = sorted([a for a, c in actor_counts.items() if c >= 4], key=lambda x: actor_counts[x], reverse=True)[:60]

    metadata_summary = {
        "total_movies": len(processed_movies),
        "genres": sorted(list(all_genres)),
        "moods": list(MOOD_KEYWORDS.keys()),
        "decades": ["Classic (<1970)", "1970s", "1980s", "1990s", "2000s", "2010s", "2020s"],
        "runtime_buckets": ["Quick (<90m)", "Standard (90-120m)", "Epic (>120m)"],
        "top_directors": top_directors,
        "top_actors": top_actors
    }

    with open(OUTPUT_SUMMARY_JSON, mode="w", encoding="utf-8") as f:
        json.dump(metadata_summary, f, indent=2)

    print(f"Saved {OUTPUT_SUMMARY_JSON}")

if __name__ == "__main__":
    main()
