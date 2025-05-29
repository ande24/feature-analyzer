import sys
import json
from sklearn.datasets import fetch_20newsgroups
from sklearn.feature_extraction.text import CountVectorizer
import numpy as np

def analyze_word(category, word):
    print("starting script...")
    
    # Map frontend categories to 20newsgroups categories
    category_mapping = {
        'space': ['sci.space'],
        'sports': ['rec.sport.baseball', 'rec.sport.hockey'],
        'animals': ['sci.med']  # Using medical as proxy for animals/biology
    }
    
    if category not in category_mapping:
        print(f"Error: Unknown category '{category}'")
        return 0
    
    categories = category_mapping[category]
    
    # Load the specified category from the 20 newsgroups dataset
    print(f"Fetching '{category}' data...")
    data = fetch_20newsgroups(subset='train', categories=categories, remove=('headers', 'footers', 'quotes'))
    X_raw = data.data
    print(f"Fetched {len(X_raw)} documents.")

    # Convert to bag-of-words representation
    print("Vectorizing text data...")
    vectorizer = CountVectorizer(stop_words='english')
    X = vectorizer.fit_transform(X_raw)
    feature_names = vectorizer.get_feature_names_out()
    print(f"Vectorized to {X.shape[0]} documents and {X.shape[1]} features.")

    # Sum up the frequencies for each word
    print("Calculating word frequencies...")
    word_frequencies = np.asarray(X.sum(axis=0)).flatten()
    print("Word frequencies calculated.")

    # Create a dictionary mapping words to their frequencies
    print("Creating word-frequency dictionary...")
    word_freq_dict = dict(zip(feature_names, word_frequencies))
    print(f"Dictionary created with {len(word_freq_dict)} words.")

    # Get utility score for the word
    word_lower = word.lower()
    score = word_freq_dict.get(word_lower, 0)
    print(f"Utility score (frequency) of '{word}' in the '{category}' class: {score}")
    
    return score

if __name__ == "__main__":
    if len(sys.argv) != 3:
        print("Usage: python analyze_word.py <category> <word>")
        sys.exit(1)
    
    category = sys.argv[1]
    word = sys.argv[2]
    
    try:
        score = analyze_word(category, word)
        # Output final result as JSON for easy parsing
        result = {"score": int(score), "word": word, "category": category}
        print("RESULT:" + json.dumps(result))
    except Exception as e:
        print(f"Error: {str(e)}")
        print("RESULT:" + json.dumps({"score": 0, "word": word, "category": category, "error": str(e)}))
