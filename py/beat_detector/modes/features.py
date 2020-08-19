from typing import Any, List, Dict
import numpy as np

# Interval in milliseconds
INTERVAL = 50

# The amount of bins into which the sound spectrum is divided
BINS = 100

# Padding from spectrum description
FEATURE_LEN = BINS

# prediction is of whether this is a beat
OUT_VEC_SIZE = 1

# Range that it needs to be correct
CORRECT_RANGE = 0.2


class Features:
    """A set of features describing one time unit of sound"""

    def __init__(self, spectrum_bins: List[float]):
        self.spectrum_bins = spectrum_bins

    def to_arr(self) -> List[float]:
        """A feature array"""
        return self.spectrum_bins

    @staticmethod
    def length():
        return FEATURE_LEN


class ExpectedOutput:
    """A class describing the expected output at a given time unit of sound"""

    def __init__(self, beat_confidence: float):
        self.beat_confidence = beat_confidence

    def to_arr(self):
        """Convert to an array"""
        return [self.beat_confidence]


class Preprocessed:
    """Preprocessed data"""

    def __init__(self, preprocessed_json: Dict[str, Any]):
        self.file_name: str = preprocessed_json["file_name"]
        self.features: List[float] = preprocessed_json["features"]
        self.outputs: List[float] = preprocessed_json["outputs"]

        assert np.array(self.features).shape[1] == Features.length()
        assert np.array(self.outputs).shape[1] == OUT_VEC_SIZE


def is_in_range(diff: float):
    return abs(diff) <= CORRECT_RANGE

