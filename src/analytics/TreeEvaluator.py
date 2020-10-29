import sys
import numpy as np
from sklearn.tree import DecisionTreeClassifier
from sklearn.metrics import roc_curve, auc
from matplotlib.legend_handler import HandlerLine2D
import matplotlib.pyplot as plt


def evaluate(data, x_train, x_test, y_train, y_test):
    # TUNING max_depth
    max_depths = np.linspace(1, 32, 32)
    train_results = []
    test_results = []
    y_train[:] = [1 if v == 'Yes' else 0 for v in y_train]
    for max_depth in max_depths:
        dt = DecisionTreeClassifier(max_depth=max_depth)
        dt.fit(x_train, y_train)
        train_pred = dt.predict(x_train)

        false_positive_rate, true_positive_rate, thresholds = roc_curve(
            y_train, train_pred)
        roc_auc = auc(false_positive_rate, true_positive_rate)

        # Add auc score to previous train results
        train_results.append(roc_auc)

        y_pred = dt.predict(x_test)

        false_positive_rate, true_positive_rate, thresholds = roc_curve(
            y_test, y_pred, pos_label='Yes')
        # print(thresholds)
        roc_auc = auc(false_positive_rate, true_positive_rate)

        # Add auc score to previous test results
        test_results.append(roc_auc)

    line1, = plt.plot(max_depths, train_results, 'b', label='Train AUC')
    line2, = plt.plot(max_depths, test_results, 'r', label='Test AUC')
    plt.legend(handler_map={line1: HandlerLine2D(numpoints=2)})
    plt.ylabel('AUC score')
    plt.xlabel('Tree depth')
    plt.show()

    # TUNING min_samples_split
    min_samples_splits = np.linspace(0.1, 1.0, 10, endpoint=True)
    train_results = []
    test_results = []
    for min_samples_split in min_samples_splits:
        dt = DecisionTreeClassifier(min_samples_split=min_samples_split)
        dt.fit(x_train, y_train)
        train_pred = dt.predict(x_train)

        false_positive_rate, true_positive_rate, thresholds = roc_curve(
            y_train, train_pred)
        roc_auc = auc(false_positive_rate, true_positive_rate)

        # Add auc score to previous train results
        train_results.append(roc_auc)

        y_pred = dt.predict(x_test)

        false_positive_rate, true_positive_rate, thresholds = roc_curve(
            y_test, y_pred, pos_label='Yes')
        roc_auc = auc(false_positive_rate, true_positive_rate)

        # Add auc score to previous test results
        test_results.append(roc_auc)

    line1, = plt.plot(min_samples_splits, train_results,
                      'b', label='Train AUC')
    line2, = plt.plot(min_samples_splits, test_results, 'r', label='Test AUC')
    plt.legend(handler_map={line1: HandlerLine2D(numpoints=2)})
    plt.ylabel('AUC score')
    plt.xlabel('Min samples split')
    plt.show()

    # TUNING min_samples_leaf
    min_samples_leafs = np.linspace(0.1, 0.5, 50, endpoint=True)
    train_results = []
    test_results = []
    for min_samples_leaf in min_samples_leafs:
        dt = DecisionTreeClassifier(min_samples_leaf=min_samples_leaf)
        dt.fit(x_train, y_train)
        train_pred = dt.predict(x_train)

        false_positive_rate, true_positive_rate, thresholds = roc_curve(
            y_train, train_pred)
        roc_auc = auc(false_positive_rate, true_positive_rate)

        # Add auc score to previous train results
        train_results.append(roc_auc)

        y_pred = dt.predict(x_test)

        false_positive_rate, true_positive_rate, thresholds = roc_curve(
            y_test, y_pred, pos_label='Yes')
        roc_auc = auc(false_positive_rate, true_positive_rate)

        # Add auc score to previous test results
        test_results.append(roc_auc)

    line1, = plt.plot(min_samples_leafs, train_results, 'b', label='Train AUC')
    line2, = plt.plot(min_samples_leafs, test_results, 'r', label='Test AUC')
    plt.legend(handler_map={line1: HandlerLine2D(numpoints=2)})
    plt.ylabel('AUC score')
    plt.xlabel('min samples leaf')
    plt.show()

    # TUNING max_features
    max_features = list(range(1, data.shape[1]))
    train_results = []
    test_results = []
    for max_feature in max_features:
        dt = DecisionTreeClassifier(max_features=max_feature)
        dt.fit(x_train, y_train)
        train_pred = dt.predict(x_train)

        false_positive_rate, true_positive_rate, thresholds = roc_curve(
            y_train, train_pred)
        roc_auc = auc(false_positive_rate, true_positive_rate)

        # Add auc score to previous train results
        train_results.append(roc_auc)

        y_pred = dt.predict(x_test)

        false_positive_rate, true_positive_rate, thresholds = roc_curve(
            y_test, y_pred, pos_label='Yes')
        roc_auc = auc(false_positive_rate, true_positive_rate)

        # Add auc score to previous test results
        test_results.append(roc_auc)

    line1, = plt.plot(max_features, train_results, 'b', label='Train AUC')
    line2, = plt.plot(max_features, test_results, 'r', label='Test AUC')
    plt.legend(handler_map={line1: HandlerLine2D(numpoints=2)})
    plt.ylabel('AUC score')
    plt.xlabel('Max features')
    plt.show()

    print('<br><br>')
    print("REACHED END OF PYTHON FILE")
    sys.stdout.flush()
