import sys
from TreeModel import TreeModel
# import pandas as pd

try:
    if sys.argv[1] == 'predict':
        tm = TreeModel(model_filename='physio_features')
        tm.fit(sys.argv[3])
        results = tm.predict(sys.argv[2], sys.argv[3])
        averageProb = 0
        for classification, probability in results:
            if classification == 'Yes':
                averageProb += probability
        averageProb = averageProb / len(results)

        print(averageProb)
except Exception as e:
    print(e)

sys.stdout.flush()
