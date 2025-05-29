from sklearn.datasets import fetch_20newsgroups
from sklearn.feature_extraction.text import CountVectorizer
import numpy as np

print("starting script...")

# Load only the 'sci.space' category from the 20 newsgroups dataset
print("Fetching 'sci.space' data...")
space_data = fetch_20newsgroups(subset='train', categories=['sci.space'], remove=('headers', 'footers', 'quotes'))
X_raw = space_data.data
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
print("Dictionary created with", len(word_freq_dict), "words.")

# Function to get utility score (frequency) for a word in the 'sci.space' class
def get_space_utility_score(word):
    word = word.lower()
    return word_freq_dict.get(word, 0)

# Example usage
word = 'monkey'
score = get_space_utility_score(word)
print(f"Utility score (frequency) of '{word}' in the 'sci.space' class: {score}")
