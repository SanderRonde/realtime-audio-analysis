"""Main entrypoint for testing mode"""

from ..features import Preprocessed, Features, OUT_VEC_SIZE, is_in_range
from lib.log import debug, logline, enter_group, exit_group
from ..model import create_model, apply_weights
from sklearn.metrics import mean_squared_error
from typing import Any, List, Dict, Tuple, Union
from lib.io import IO, IOInput
from lib.timer import Timer
import numpy as np
import warnings
import pathlib
import pickle
import time
import json
import os

with warnings.catch_warnings():
    warnings.filterwarnings("ignore", category=FutureWarning)
    from tensorflow.keras.models import Sequential


def get_io() -> IO:
    return IO(
        {
            "i": IOInput(
                "./data/preprocessed.pickle",
                str,
                has_input=True,
                arg_name="input_preprocessed",
                descr="Input preprocessed file",
                alias="input_preprocessed",
                is_generic=True,
            ),
            "iw": IOInput(
                "./data/weights.h5",
                str,
                has_input=True,
                arg_name="input_weights",
                descr="Input weights file",
                alias="input_weights",
            ),
            "it": IOInput(
                "./data/train_config.json",
                str,
                has_input=True,
                arg_name="input_train",
                descr="Input file for the train config",
                alias="input_train",
            ),
            "o": IOInput(
                "./data/annotated/",
                str,
                has_input=True,
                arg_name="output_annotated",
                descr="Directory where annotated files are stored",
                alias="output_annotated",
            ),
            "n": IOInput(
                50, int, has_input=True, arg_name="interval", descr="Interval at which data is sent", alias="interval"
            ),
        }
    )


def read_test_files(io: IO) -> List[Preprocessed]:
    with open(io.get("input_preprocessed"), "rb") as preprocessed_file:
        file_configs = pickle.load(preprocessed_file)
        with open(io.get("input_train"), "rb") as train_config_file:
            train_config = json.load(train_config_file)
            test_files_names = train_config["test_set"]

            preprocessed = map(lambda x: Preprocessed(x), file_configs)
            test_files = list(filter(lambda x: x.file_name in test_files_names, preprocessed))
            return test_files


def get_test_params(file: Preprocessed) -> Tuple[np.ndarray, np.ndarray]:
    test_x = file.features
    test_y = file.outputs

    x_np = np.array(test_x)
    y_np = np.array(test_y)

    x_np = np.reshape(x_np, (x_np.shape[0], x_np.shape[1], 1))

    assert len(x_np.shape) == 3
    assert len(y_np.shape) == 2

    x_shape_1, x_shape_2, _ = x_np.shape
    y_shape_1, y_shape_2 = y_np.shape

    assert x_shape_1 == y_shape_1
    assert x_shape_2 == Features.length()
    assert y_shape_2 == OUT_VEC_SIZE

    return x_np, y_np


def predictions_to_out_file(predictions: np.array, io: IO):
    obj: Dict[str, Any] = {"items": [], "genre": {"hard": 0.5, "uptempo": 0.5}}
    interval = io.get("interval")

    cur_time = 0
    for i in range(len(predictions)):
        prediction: Tuple[float] = predictions[i]
        confidence: float = prediction[0]

        if is_in_range(confidence):
            cur_obj = {}
            cur_obj["type"] = "beat"
            cur_obj["time"] = cur_time
            obj["items"].append(cur_obj)

        cur_time += interval

    return obj


def run_tests(io: IO, model: Sequential, test_files: List[Preprocessed]):
    model.reset_states()

    for file in test_files:
        logline("creating test params for {}".format(file.file_name))
        test_x, test_y = get_test_params(file)

        logline("making predictions")
        predictions: List[List[float]] = model.predict(test_x, batch_size=1, verbose=1)
        model.reset_states()

        mse_total: List[float] = list()
        correct = 0
        diff_score = 0
        for i in range(len(predictions)):
            prediction = predictions[i]
            actual: List[float] = test_y[i]

            diff = abs(actual[0] - prediction[0])
            diff_score += diff
            if is_in_range(diff):
                correct += 1

            mse_total.append(mean_squared_error(actual, prediction))

        logline(
            "predicted {}/{} within range ({}%) correct, score was {}/{}, mse was {}".format(
                correct,
                len(predictions),
                round(correct / len(predictions) * 100, 2),
                diff_score,
                len(predictions),
                round(sum(mse_total) / len(predictions), 4),
            )
        )

        out_obj = predictions_to_out_file(predictions, io)

        pathlib.Path(io.get("output_annotated")).mkdir(parents=True, exist_ok=True)
        out_path = os.path.join(io.get("output_annotated"), "{}.json".format(file.file_name))
        with open(out_path, "w+") as out_file:
            json.dump(out_obj, out_file)
            logline("wrote object to {}".format(out_path))


def mode_test():
    """The main testing mode entrypoint"""

    start_time = time.time()

    io = get_io()

    logline("test")
    enter_group()

    logline("reconstructing model")
    model = create_model(1)

    logline("applying learned weights")
    model = apply_weights(model, io)

    logline("reading testing files")
    test_files = read_test_files(io)

    logline("running testing data")
    enter_group()
    run_tests(io, model, test_files)
    exit_group()

    exit_group()
    logline("done testing, runtime is {}".format(Timer.stringify_time(Timer.format_time(time.time() - start_time))))
