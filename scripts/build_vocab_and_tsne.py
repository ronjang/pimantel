#!/usr/bin/env python3.13
"""
Pimantel — Stage 1: Build vocabulary + precompute t-SNE angles (ONE-TIME)
=========================================================================
This is the expensive step. Run it ONCE (locally or in CI with caching).
It produces artifacts the daily job reuses:

  src/data/word_list_de.json   ← word list [word, frequency] for the React app
  scripts/data/angles.npy      ← per-word t-SNE angle θ (radians), aligned to word list
  scripts/data/vocab.json      ← ordered vocab words (for the daily job)

Run:
    ~/.pimantel-venv313/bin/python3.13 scripts/build_vocab_and_tsne.py

Cache the model (~/.cache/pimantel/german.model) and scripts/data/*
as CI artifacts so the daily job doesn't recompute t-SNE.
"""

import json
import math
import sys
from pathlib import Path

import numpy as np
from gensim.models import KeyedVectors
from huggingface_hub import hf_hub_download
from sklearn.manifold import TSNE
from tqdm import tqdm

# ── Configuration ──────────────────────────────────────────────────────────────

MIN_FREQUENCY = 50
MAX_VOCAB = 50_000  # keep the download small; t-SNE cost grows with this

REPO_ROOT = Path(__file__).parent.parent
OUT_WORD_LIST = REPO_ROOT / "src" / "data" / "word_list_de.json"
DATA_DIR = REPO_ROOT / "scripts" / "data"
OUT_ANGLES = DATA_DIR / "angles.npy"
OUT_VECTORS = DATA_DIR / "vectors.npy"
OUT_VOCAB = DATA_DIR / "vocab.json"
OUT_MODEL_KEYS = DATA_DIR / "model_keys.json"

MODEL_CACHE = Path.home() / ".cache" / "pimantel" / "german.model"

# ── Model loading ────────────────────────────────────────────────────────────

def load_model() -> KeyedVectors:
    MODEL_CACHE.parent.mkdir(parents=True, exist_ok=True)
    if not MODEL_CACHE.exists():
        print("Downloading German word2vec model (~704 MB) from HuggingFace ...")
        hf_path = hf_hub_download(
            repo_id="Word2vec/german_model",
            filename="german.model",
            local_dir=str(MODEL_CACHE.parent),
        )
        hf_path = Path(hf_path)
        if hf_path != MODEL_CACHE:
            hf_path.rename(MODEL_CACHE)
    print("Loading model into memory ...")
    kv = KeyedVectors.load_word2vec_format(
        str(MODEL_CACHE), binary=True, unicode_errors="ignore"
    )
    print(f"Model loaded: {len(kv)} words, {kv.vector_size}-dim")
    return kv

# ── Vocabulary ─────────────────────────────────────────────────────────────────

def normalize_german(word: str) -> str:
    """Match the frontend normalize.ts: lowercase + umlaut transliteration.
    The model is already transliterated, so this mainly lowercases."""
    return (
        word.lower()
        .replace("ä", "ae")
        .replace("ö", "oe")
        .replace("ü", "ue")
        .replace("ß", "ss")
    )


def build_vocab(kv: KeyedVectors) -> list[tuple[str, int, str]]:
    """
    Builds a deduplicated vocabulary.

    The model keeps case (Haus vs haus) and transliterates umlauts
    (Küche -> Kueche). We collapse case-variants to a single canonical
    entry (the highest-frequency spelling wins as the display form),
    keyed by the normalized (lowercase transliterated) form. This keeps
    the word list consistent with the frontend's normalizeGerman().

    Returns tuples of (display_word, count, model_key) where model_key is
    the actual key in the word2vec model (used to look up the vector).
    """
    print("Building vocabulary ...")
    # normalized_key -> (display_word, count, model_key)
    best: dict[str, tuple[str, int, str]] = {}

    for word in kv.index_to_key:
        if not word.isalpha():
            continue
        if len(word) < 2:
            continue
        if word.isupper() and len(word) > 2:
            continue
        try:
            count = kv.get_vecattr(word, "count")
        except Exception:
            count = 0
        if count <= 0:
            rank = kv.key_to_index[word]
            count = max(MIN_FREQUENCY, int(1_000_000 / (rank + 1)))

        key = normalize_german(word)
        # Display form: capitalize (German nouns look natural; harmless for others)
        display = key.capitalize()
        if key not in best or count > best[key][1]:
            best[key] = (display, int(count), word)

    entries = list(best.values())
    entries.sort(key=lambda x: x[1], reverse=True)
    if MAX_VOCAB:
        entries = entries[:MAX_VOCAB]
    print(f"Vocabulary size (deduplicated): {len(entries)}")
    # Return (display, count, model_key) tuples
    return entries

# ── t-SNE ───────────────────────────────────────────────────────────────────────

def compute_tsne_angles(vectors: np.ndarray) -> np.ndarray:
    """
    Runs 1D t-SNE over the whole vocabulary and maps the result to an angle
    in [0, 2π). Each word thus gets a FIXED angle on the circle, independent of
    any secret word. Combined with a rank-based radius in the daily job, this
    produces clean radial "arms" that always stay symmetric around the centre
    (the secret word), instead of a lopsided blob. Returns an (N,) float32
    array of angles in radians.
    """
    print("Running 1D t-SNE (this is the slow part) ...")
    tsne = TSNE(n_components=1, perplexity=30, max_iter=500, random_state=42, verbose=1)
    tsne_1d = tsne.fit_transform(vectors).flatten()

    lo, hi = tsne_1d.min(), tsne_1d.max()
    span = (hi - lo) or 1.0
    angles = (tsne_1d - lo) / span * (2 * math.pi)
    return angles.astype(np.float32)


def extract_vectors(kv: KeyedVectors, entries: list[tuple[str, int, str]]) -> np.ndarray:
    """Extracts the word2vec vectors for every vocab entry, in order."""
    model_keys = [mk for _, _, mk in entries]
    print(f"Extracting {len(model_keys)} vectors ...")
    return np.array(
        [kv[mk] for mk in tqdm(model_keys, desc="vectors")], dtype=np.float32
    )

# ── Main ───────────────────────────────────────────────────────────────────────

def main():
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    kv = load_model()
    entries = build_vocab(kv)
    vectors = extract_vectors(kv, entries)
    angles = compute_tsne_angles(vectors)

    # word_list_de.json for the React app: [display_word, frequency]
    word_list = [[display, count] for display, count, _ in entries]
    print(f"Writing {OUT_WORD_LIST} ...")
    with open(OUT_WORD_LIST, "w", encoding="utf-8") as f:
        json.dump(word_list, f, ensure_ascii=False)

    # vocab.json for the daily job: display words (same order as word_list)
    print(f"Writing {OUT_VOCAB} ...")
    with open(OUT_VOCAB, "w", encoding="utf-8") as f:
        json.dump([display for display, _, _ in entries], f, ensure_ascii=False)

    # model_keys.json: the model vocab key for each entry (kept for reference)
    print(f"Writing {OUT_MODEL_KEYS} ...")
    with open(OUT_MODEL_KEYS, "w", encoding="utf-8") as f:
        json.dump([mk for _, _, mk in entries], f, ensure_ascii=False)

    print(f"Writing {OUT_ANGLES} ...")
    np.save(OUT_ANGLES, angles)

    # vectors.npy: the word2vec vectors for the whole vocab. The daily job uses
    # these to compute cosine similarities WITHOUT needing the 704MB model.
    print(f"Writing {OUT_VECTORS} ...")
    np.save(OUT_VECTORS, vectors.astype(np.float16))

    print("\n✅ Stage 1 done. Artifacts to cache:")
    print(f"   {OUT_ANGLES}")
    print(f"   {OUT_VECTORS}")
    print(f"   {OUT_VOCAB}")
    print(f"   {OUT_MODEL_KEYS}")
    print(f"   {OUT_WORD_LIST}")

if __name__ == "__main__":
    main()
