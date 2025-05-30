import sys
import json
import os
from sklearn.feature_extraction.text import CountVectorizer
from sklearn.feature_selection import mutual_info_classif, chi2
import numpy as np

def analyze_top_words(category, user_word, top_k=5):
    print("Starting script...")
    print(f"Category: {category}, Word: {user_word}")

    # Paths
    base_dir = os.path.dirname(os.path.abspath(__file__))
    data_root = os.path.normpath(os.path.join(base_dir, '..', 'public', 'documents'))
    category_dir = os.path.join(data_root, category)

    if not os.path.isdir(category_dir):
        raise FileNotFoundError(f"Category directory '{category_dir}' does not exist.")

    # Load in-category documents
    X_pos = []
    for filename in os.listdir(category_dir):
        file_path = os.path.join(category_dir, filename)
        if os.path.isfile(file_path):
            with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
                X_pos.append(f.read())
    if not X_pos:
        raise ValueError(f"No documents found in '{category_dir}'.")

    # Load out-of-category documents
    X_neg = []
    for other_category in os.listdir(data_root):
        other_dir = os.path.join(data_root, other_category)
        if other_category != category and os.path.isdir(other_dir):
            for filename in os.listdir(other_dir):
                file_path = os.path.join(other_dir, filename)
                if os.path.isfile(file_path):
                    with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
                        X_neg.append(f.read())

    print(f"Loaded {len(X_pos)} positive and {len(X_neg)} negative documents.")

    # Combine data and labels
    X_all = X_pos + X_neg
    y = np.array([1] * len(X_pos) + [0] * len(X_neg))  # 1 = in-category, 0 = out

    # Vectorize
    print("Vectorizing...")
    vectorizer = CountVectorizer(stop_words='english')
    X = vectorizer.fit_transform(X_all)
    feature_names = vectorizer.get_feature_names_out()

    print("Computing metrics...")
    mi_scores = mutual_info_classif(X, y, discrete_features=True)
    chi2_scores, _ = chi2(X, y)

    # In-category frequencies
    freq_vectorizer = CountVectorizer(stop_words='english', vocabulary=feature_names)
    X_pos_matrix = freq_vectorizer.fit_transform(X_pos)
    frequencies = np.asarray(X_pos_matrix.sum(axis=0)).flatten()

    # Combine all word data
    word_data = []
    word_index_map = {word: i for i, word in enumerate(feature_names)}

    for word, idx in word_index_map.items():
        word_data.append({
            "word": word,
            "mutual_information": float(mi_scores[idx]),
            "chi_squared": float(chi2_scores[idx]),
            "frequency": int(frequencies[idx])
        })

    # Top 5 by each measure
    top_mi = sorted(word_data, key=lambda x: x["mutual_information"], reverse=True)[:top_k]
    top_chi2 = sorted(word_data, key=lambda x: x["chi_squared"], reverse=True)[:top_k]
    top_freq = sorted(word_data, key=lambda x: x["frequency"], reverse=True)[:top_k]

    # Add the user word
    user_word = user_word.lower()
    if user_word in word_index_map:
        idx = word_index_map[user_word]
        user_word_data = {
            "word": user_word,
            "mutual_information": float(mi_scores[idx]),
            "chi_squared": float(chi2_scores[idx]),
            "frequency": int(frequencies[idx])
        }
    else:
        user_word_data = {
            "word": user_word,
            "mutual_information": 0.0,
            "chi_squared": 0.0,
            "frequency": 0
        }

    return {
        "category": category,
        "top_words": {
            "mi": top_mi,
            "chi2": top_chi2,
            "frequency": top_freq
        },
        "input_word": user_word_data
    }


if __name__ == "__main__":
    if len(sys.argv) != 3:
        print("Usage: python analyze_word.py <category> <word>")
        sys.exit(1)

    category = sys.argv[1]
    user_word = sys.argv[2]

    try:
        result = analyze_top_words(category, user_word)
        print("RESULT:" + json.dumps(result))
    except Exception as e:
        print(f"Error: {str(e)}")
        print("RESULT:" + json.dumps({
            "category": category,
            "top_words": [],
            "input_word": {"word": user_word, "mutual_information": 0.0, "chi_squared": 0.0, "frequency": 0},
            "error": str(e)
        }))
