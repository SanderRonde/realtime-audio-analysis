"""Main entrypoint for preprocess mode"""

from .files import get_files, collect_input_paths, MarkedAudioFile, match_files
from modes.features import Features, ExpectedOutput, OUT_VEC_SIZE
from lib.log import logline, error, enter_group, exit_group
from lib.io import IO, IOInput
from lib.timer import Timer
from typing import Iterator, List
from glob import glob
import numpy as np
import pathlib
import pickle
import time
import os

# Take a (somehow) set of wav files, each
# annotated by a JSON file containing an array
# of "beats". Each beat is marked at a given time
# for a given length and a "type" of this beat.
# It can either be a beat beat or a melody-type beat
# Use of those two is yet to be determined but it's
# handy to train on it


def get_io() -> IO:
    return IO(
        {
            "i": IOInput(
                glob("../../data/tracks/*.wav"),
                list,
                has_input=True,
                arg_name="input_files",
                descr="Input .wav files",
                alias="input_files",
                is_generic=True,
            ),
            "a": IOInput(
                "../../data/analysis.json",
                str,
                has_input=True,
                arg_name="analysis",
                descr="Analysis JSON file",
                alias="analysis",
            ),
            "o": IOInput(
                "../../data/preprocessed.pickle",
                str,
                has_input=True,
                arg_name="output_file",
                descr="File in which the features and outputs get placed",
                alias="output_file",
            ),
            "n": IOInput(
                50, int, has_input=True, arg_name="interval", descr="Interval at which data is sent", alias="interval"
            ),
        }
    )


def gen_features(file: MarkedAudioFile) -> Iterator[Features]:
    """Gen features based on the file"""
    bins = file.bins_file.bins

    return map(lambda bin_set: Features(bin_set), bins)


def get_closest(timestamp_time: float, io: IO) -> int:
    """Get the closest multiple of INTERVAL to the timestamp"""
    interval = io.get("interval")
    lowerbound = (timestamp_time // interval) * interval
    upperbound = lowerbound + interval

    lowerbound_diff = timestamp_time - lowerbound
    upperbound_diff = upperbound - timestamp_time

    return lowerbound if lowerbound_diff <= upperbound_diff else upperbound


def gen_outputs(file: MarkedAudioFile, io: IO) -> List[ExpectedOutput]:
    """Gen a list of marked outputs for given file"""
    out_len = len(file.bins_file.bins)
    # TODO: change
    outputs = [ExpectedOutput(0) for _ in range(out_len)]

    interval = io.get("interval")
    for timestamp in file.timestamps:
        # Round it to the range
        timestamp_time = timestamp.timestamp * 1000
        closest = get_closest(timestamp_time, io)

        timestamp_index = int(closest / interval)

        if timestamp_index >= out_len:
            continue

        output_mark = outputs[timestamp_index]
        output_mark.beat_confidence = timestamp.confidence

    return outputs


def mode_preprocess() -> int:
    """The main preprocessing entrypoint"""
    start_time = time.time()

    preprocessed = []

    io = get_io()
    logline("preprocessing")
    enter_group()
    logline("reading input paths")
    enter_group()

    input_paths = collect_input_paths(io)
    for input_path in input_paths:
        logline('found path: "{}"'.format(input_path))

    exit_group()

    logline("matching")
    enter_group()

    matching = match_files(io, input_paths)
    if matching is None:
        return 0

    analysis, mapping = matching

    exit_group()

    logline("iterating files")
    enter_group()
    for file in get_files(input_paths, analysis, mapping):
        if not file:
            error("no files")
            return 1

        features = gen_features(file)
        outputs = gen_outputs(file, io)

        feature_arr = list(map(lambda x: x.to_arr(), features))
        output_arr = list(map(lambda x: x.to_arr(), outputs))

        assert np.array(feature_arr).shape[1] == Features.length()
        assert np.array(output_arr).shape[1] == OUT_VEC_SIZE

        preprocessed.append({"file_name": file.name, "features": feature_arr, "outputs": output_arr})
        logline('done with file: "{}"'.format(file.name))
        file.close()

    exit_group()
    logline("done iterating files")

    pathlib.Path(os.path.dirname(io.get("output_file"))).mkdir(parents=True, exist_ok=True)
    with open(io.get("output_file"), "wb+") as file:
        pickle.dump(preprocessed, file)
        logline("wrote output to file: {}".format(io.get("output_file")))

    exit_group()
    logline(
        "done preprocessing, runtime is {}".format(Timer.stringify_time(Timer.format_time(time.time() - start_time)))
    )

    return 0
