#!/usr/bin/env python3.13
"""
Pimantel — Stage 2: Generate one daily puzzle (.bin) (DAILY)
============================================================
Fast per-word step. Reuses the cached model + precomputed t-SNE angles.

Picks the secret word DETERMINISTICALLY from a curated pool based on the
puzzle number (days since epoch), so the same day always yields the same
word and no state needs to be stored.

Run:
    ~/.pimantel-venv313/bin/python3.13 scripts/generate_daily_puzzle.py [PUZZLE_NUMBER]

If PUZZLE_NUMBER is omitted, it is computed as days since PIMANTEL_EPOCH.
It generates the puzzle for the current day AND a few days ahead (LOOKAHEAD),
so the site never 404s if a daily run is missed.
"""

import json
import math
import struct
import sys
from datetime import datetime, timezone
from pathlib import Path

import numpy as np

# ── Configuration ──────────────────────────────────────────────────────────────

# Must match the epoch in src/App.tsx (pimantleEpoch)
PIMANTEL_EPOCH = datetime(2026, 7, 7, 3, 0, 0, tzinfo=timezone.utc)

# Generate today's puzzle plus this many days ahead (safety buffer)
LOOKAHEAD = 3

# Bonus ("Zufälliges Quiz") puzzles: a fixed block of extra puzzles a player
# can play after solving the daily one. High numbers so they never collide
# with real daily puzzles.
BONUS_START = 900000
BONUS_COUNT = 10

# Spiral twist factor in radians. The outermost ring is rotated by this many
# radians relative to the centre, curving the semantic arms into a galaxy-like
# spiral. ~6 rad ≈ one full turn across the disk; tune freely.
TWIST = 6.0

REPO_ROOT = Path(__file__).parent.parent
DATA_DIR = REPO_ROOT / "scripts" / "data"
ANGLES_FILE = DATA_DIR / "angles.npy"
VECTORS_FILE = DATA_DIR / "vectors.npy"
VOCAB_FILE = DATA_DIR / "vocab.json"
SECRET_POOL_FILE = DATA_DIR / "secret_pool_de.json"
OUT_SECRET_DIR = REPO_ROOT / "public" / "secret_words_de"
# shields.io endpoint badge showing the current daily puzzle number
BADGE_FILE = REPO_ROOT / ".github" / "badge" / "daily.json"

# ── Helpers ────────────────────────────────────────────────────────────────────

def puzzle_number_for_today() -> int:
    now = datetime.now(timezone.utc)
    return (now - PIMANTEL_EPOCH).days

def pick_secret_word(puzzle_number: int, pool: list[str]) -> str:
    """
    Deterministic pick: walk the pool in a fixed pseudo-random order.
    Using a large stride coprime with len(pool) spreads words out so
    consecutive days feel unrelated, while remaining fully reproducible.
    """
    n = len(pool)
    stride = 7919  # prime; coprime with almost any pool size
    return pool[(puzzle_number * stride) % n]

def normalize_german(word: str) -> str:
    return (
        word.lower()
        .replace("ä", "ae")
        .replace("ö", "oe")
        .replace("ü", "ue")
        .replace("ß", "ss")
    )


def float16_bytes(value: float) -> bytes:
    return np.array([value], dtype=np.float16).tobytes()

def generate_bin(
    secret_display: str,
    vocab: list[str],
    display_to_idx: dict[str, int],
    vectors: np.ndarray,
    angles: np.ndarray,
    out_path: Path,
):
    if secret_display not in display_to_idx:
        print(f"  ⚠ '{secret_display}' not in vocabulary — skipping")
        return False

    secret_idx = display_to_idx[secret_display]

    # Vectorized cosine similarity of the secret vs the whole vocab, using the
    # precomputed word2vec vectors (no 704MB model needed at runtime).
    all_vecs = vectors
    secret_vec = vectors[secret_idx]

    norms = np.linalg.norm(all_vecs, axis=1)
    secret_norm = np.linalg.norm(secret_vec)
    denom = norms * secret_norm
    denom[denom == 0] = 1e-9
    sims = all_vecs.dot(secret_vec) / denom  # shape (vocab,)

    # Rank words by similarity (descending). Rank 0 = the secret itself.
    order = np.argsort(-sims)  # array of word indices, best first
    n = len(order)

    # ANGLE (theta): each word's FIXED angle from the global 1D t-SNE. This is
    # independent of the secret, so the arms stay symmetric around the centre
    # (the secret always renders at the exact middle of the cloud). Words that
    # are semantically related sit at similar angles → radial "arms".
    base_theta = angles.astype(np.float64)

    # RADIUS (r): driven by RANK. This guarantees monotonic convergence — the
    # closer a word ranks, the closer to the centre it sits — so the secret is
    # the gravitational centre at r=0 and the cloud fans outward from it.
    rank_of = np.empty(n, dtype=np.float64)
    rank_of[order] = np.arange(n)

    r_max = 1.0
    radius_exponent = 1.0
    radii = r_max * np.power(rank_of / max(n - 1, 1), radius_exponent)

    # Spiral twist: rotate each point by an amount proportional to its radius
    # so the arms curve into a galaxy-like spiral.
    twisted = base_theta + TWIST * radii

    out_path.parent.mkdir(parents=True, exist_ok=True)
    with open(out_path, "wb") as f:
        f.write(struct.pack("<I", secret_idx))
        for word_idx in order:
            sim = float(sims[word_idx])
            r = float(radii[word_idx])
            th = float(twisted[word_idx])
            x = r * math.cos(th)
            y = r * math.sin(th)
            f.write(struct.pack("<I", int(word_idx)))
            f.write(struct.pack("<f", x))
            f.write(struct.pack("<f", y))
            f.write(float16_bytes(sim))

    print(f"  ✓ {out_path.name}: secret='{secret_display}' (top sim={sims[order[0]]:.4f})")
    return True

# ── Main ───────────────────────────────────────────────────────────────────────

def main():
    for required in (ANGLES_FILE, VECTORS_FILE, VOCAB_FILE, SECRET_POOL_FILE):
        if not required.exists():
            print(f"Missing artifact: {required}")
            print("Run scripts/build_vocab_and_tsne.py first (and create the secret pool).")
            sys.exit(1)

    angles = np.load(ANGLES_FILE)
    vectors = np.load(VECTORS_FILE).astype(np.float32)
    vocab = json.loads(VOCAB_FILE.read_text(encoding="utf-8"))
    raw_pool = json.loads(SECRET_POOL_FILE.read_text(encoding="utf-8"))
    display_to_idx = {w: i for i, w in enumerate(vocab)}

    # Normalize pool words to the display form (capitalized, transliterated),
    # keeping only those present in the vocabulary.
    pool = []
    skipped = []
    for w in raw_pool:
        display = normalize_german(w).capitalize()
        if display in display_to_idx:
            pool.append(display)
        else:
            skipped.append(w)
    if skipped:
        print(f"⚠ {len(skipped)} pool words not in vocab, skipped: {skipped}")
    if not pool:
        print("No valid secret words in the pool. Aborting.")
        sys.exit(1)
    print(f"Secret pool: {len(pool)} valid words")

    if len(sys.argv) > 1:
        base = int(sys.argv[1])
    else:
        base = puzzle_number_for_today()

    print(f"Generating puzzles {base}..{base + LOOKAHEAD} ...")
    for p in range(base, base + LOOKAHEAD + 1):
        secret = pick_secret_word(p, pool)
        out_path = OUT_SECRET_DIR / f"secret_word_{p}.bin"
        generate_bin(secret, vocab, display_to_idx, vectors, angles, out_path)

    # Bonus puzzles for the "Zufälliges Quiz" button. Generated once (they are
    # stable), each drawn from the pool with an offset so they differ from the
    # daily words. Only regenerate if missing to keep daily runs fast.
    print(f"Ensuring {BONUS_COUNT} bonus puzzles ({BONUS_START}..{BONUS_START + BONUS_COUNT - 1}) ...")
    for i in range(BONUS_COUNT):
        bonus_num = BONUS_START + i
        out_path = OUT_SECRET_DIR / f"secret_word_{bonus_num}.bin"
        if out_path.exists():
            continue
        secret = pick_secret_word(bonus_num, pool)
        generate_bin(secret, vocab, display_to_idx, vectors, angles, out_path)

    # Write the shields.io endpoint badge for the current daily puzzle number.
    BADGE_FILE.parent.mkdir(parents=True, exist_ok=True)
    badge = {
        "schemaVersion": 1,
        "label": "Pimantel des Tages",
        "message": f"#{base}",
        "color": "brightgreen",
    }
    with open(BADGE_FILE, "w", encoding="utf-8") as f:
        json.dump(badge, f)
    print(f"Wrote badge: {BADGE_FILE} (#{base})")

    print("\n✅ Daily generation done.")

if __name__ == "__main__":
    main()
