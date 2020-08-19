#!/usr/bin/python
"""Main file used for launching everything"""

from modes.realtime_test.realtime_test import mode_realtime_test
from modes.preprocess.preprocess import mode_preprocess
from modes.train.train import mode_train
from typing_extensions import Literal
from modes.test.test import mode_test
from typing import Any, Union
from lib.log import logline
import sys


def run_mode(mode: Union[Literal["preprocess"], Literal["train"], Literal["test"], Literal["realtime_test"]]) -> int:
    if mode == "preprocess":
        return mode_preprocess()
    elif mode == "train":
        return mode_train() or 0
    elif mode == "test":
        return mode_test() or 0
    elif mode == "realtime_test":
        return mode_realtime_test() or 0
    else:
        if mode == "":
            logline("No mode supplied. Choose one of:")
        else:
            logline("Unknown mode. Choose one of:")
        logline("")
        logline("\tpreprocess	- preprocess and extract features")
        logline("\ttrain		- train on given features")
        logline("\ttest		- test trained model")
        logline("\trealtime_test	- do a realtime test by listening to music")
        return 1


def get_mode() -> Any:
    if len(sys.argv) > 1:
        return sys.argv[1]
    return ""


def main():
    return run_mode(get_mode())


if __name__ == "__main__":
    exit(main())
