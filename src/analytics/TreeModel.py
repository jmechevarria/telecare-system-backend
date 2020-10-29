import sys
import pandas as pd
import csv
import numpy as np
import pickle
from sklearn.tree import export_graphviz
from sklearn.tree import DecisionTreeClassifier
from sklearn.model_selection import train_test_split
from sklearn.model_selection import cross_val_score, cross_val_predict
from numpy import array
from sklearn.metrics import confusion_matrix


class TreeModel:
    def __init__(self, model: DecisionTreeClassifier = None, model_filename: str = None):
        if model != None:
            self.model = model
        elif model_filename != None:
            self.load_model(model_filename)
        else:
            self.initialize_new_model()

    def initialize_new_model(self) -> DecisionTreeClassifier:
        self.model = DecisionTreeClassifier(
            max_depth=8, min_samples_split=.3, min_samples_leaf=.2, max_features=5)

    def fit(self, dataFileName):
        physio = pd.read_csv('src/analytics/training_data/' + dataFileName + '.csv', header=None,
                             names=['Heart rate', 'Seconds', 'Sleep Status', 'Weight (KG)', 'Age', 'Danger'])

        # Prepare data for training models
        labels = physio.pop('Danger')

        label_mapping = {"Low": 0, "Normal": 1, "High": 2, "Too high": 3}
        physio = physio.replace({"Heart rate": label_mapping})

        # For testing, we choose to split our data to 75% train and 25% for test
        x_train, x_test, y_train, y_test = train_test_split(
            physio, labels, test_size=0.5)

        self.model.fit(x_train, y_train)
        self.save_model(dataFileName)
        export_graphviz(self.model, out_file=dataFileName + '.dot', feature_names=physio.columns.values,
                        class_names=['Yes', 'No'], filled=True, rounded=True)

        y_pred = self.model.predict(x_test)
        self.conf_matrix(y_test, y_pred)

    def save_model(self, filename):
        pickle.dump(self.model, open(filename + '.sav', 'wb'))

    def load_model(self, filename) -> DecisionTreeClassifier:
        self.model = pickle.load(open(filename + '.sav', 'rb'))

    def predict(self, data, model_filename):
        data = array(data.split(','))
        data = data.reshape(
            len(data)//self.model.max_features, self.model.max_features)

        results = []
        df = pd.DataFrame(data, columns=[
            'Heart rate', 'Seconds', 'Sleep Status', 'Weight (KG)', 'Age'])
        df = df.astype({
            'Seconds': int, 'Sleep Status': float, 'Weight (KG)': float, 'Age': int
        })

        label_mapping = {"Low": 0, "Normal": 1, "High": 2, "Too high": 3}
        df = df.replace({"Heart rate": label_mapping})

        predictions = self.model.predict(df)
        predict_probas = self.model.predict_proba(df)

        for i, v in enumerate(predictions):
            results.append(
                [v, predict_probas[i][self.model.classes_.tolist().index(v)]])

        return results

    def score(self, x_test, y_test):
        return self.model.score(x_test, y_test)

    @staticmethod
    def conf_matrix(y_true, y_pred):
        conf_matrix = confusion_matrix(
            y_true=y_true, y_pred=y_pred, labels=['Yes', 'No'])

        return conf_matrix
