# Pimantel – Scripts

## generate_german_puzzles.py

Generates the German word2vec data (word list + puzzle `.bin` files).

### First run (one-time setup)

The venv and dependencies are already set up at `~/.pimantel-venv313`.  
If you need to recreate it:

```bash
python3.13 -m venv ~/.pimantel-venv313
~/.pimantel-venv313/bin/pip install gensim scikit-learn numpy huggingface_hub tqdm
```

### Running the pipeline

```bash
~/.pimantel-venv313/bin/python3.13 scripts/generate_german_puzzles.py
```

This will:
1. Download the German word2vec model (~704MB, cached to `~/.cache/pimantel/`)
2. Build `src/data/word_list_de.json` (~150k German words with frequencies)
3. Run 1D t-SNE on the full vocabulary (takes ~10–30 min)
4. Generate `public/secret_words_de/secret_word_N.bin` for each word in `SECRET_WORDS`

**The t-SNE only needs to run once.** After that, adding new secret words is fast.

### Adding new secret words

Edit `SECRET_WORDS` in `generate_german_puzzles.py` and re-run.  
New puzzle numbers start where you left off (index in the list = puzzle number).

### Deploying

```bash
npm run deploy
```

This builds and pushes to GitHub Pages → pimantel.de.
