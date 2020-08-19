from typing import List, Dict, Any, Iterable, Optional
from lib.io import IO
import wave
import json

from lib.log import logline, warn


class JSONTimestamp:
    """A single beat"""

    def __init__(self, json_obj: Dict[str, Any]):
        self._json_obj = json_obj

    @property
    def timestamp(self) -> float:
        """When this beat happened"""
        return self._json_obj["start"]

    @property
    def length(self) -> float:
        """How long this beat lasted"""
        return self._json_obj["duration"]

    @property
    def confidence(self) -> float:
        """Confidence of this beat"""
        return self._json_obj["confidence"]


class BinsDescriptor:
    """A descriptor for the bins file"""

    def __init__(self, json_obj: List[List[float]]):
        self.bins = json_obj


class TrackAnalysis:
    """A single track's analysis"""

    def __init__(self, contents: Dict[str, Any]):
        self.name: str = contents["name"]
        self.uri: str = contents["uri"]

        analysis: Dict[str, Any] = contents["analysis"]
        self.beats = list(map(lambda x: JSONTimestamp(x), analysis["beats"]))


class MarkedAudioFile:
    """A single marked audio file"""

    def __init__(self, wav_path: str, track: "TrackAnalysis"):
        self.base_name = ".".join(wav_path.split(".")[0:-1])
        self.name = self.base_name.split("/")[-1]

        self.wav_file = self._get_wav_file(wav_path)
        self.bins_file = self._get_bins_file(wav_path)
        self.timestamps = track.beats

    def _get_wav_file(self, wav_path: str) -> wave.Wave_read:
        return wave.open(wav_path, "rb")

    def _get_bins_file(self, wav_path: str) -> BinsDescriptor:
        json_path = "{}.bins.json".format(self.base_name)
        with open(json_path, "rb") as json_str:
            return BinsDescriptor(json.load(json_str))

    def close(self):
        self.wav_file.close()


class AnalysisFile:
    """The entire analysis file"""

    def __init__(self, file_path: str):
        contents: List[Dict[str, Any]] = self._parse_contents(file_path)

        self.tracks = list(map(lambda track_contents: TrackAnalysis(track_contents), contents))

    def _parse_contents(self, file_path: str):
        with open(file_path, "rb") as analysis_json:
            return json.load(analysis_json)

    def find_track(self, name: str) -> Optional[TrackAnalysis]:
        for track in self.tracks:
            if track.name == name:
                return track
        return None


def collect_input_paths(io: IO) -> List[str]:
    """Turn the input glob into file paths"""
    all_files = list(set(io.get("input_files")))
    wav_files = list(filter(lambda in_file: in_file.split(".")[-1] == "wav", all_files))

    return wav_files


def match_files(io: IO, input_paths: List[str]):
    """Match found files to analysis file contents"""
    analysis_file = io.get("analysis")
    logline(analysis_file)

    analysis = AnalysisFile(analysis_file)

    mapped: Dict[str, str] = {}
    reverse_map: Dict[str, str] = {}
    for in_path in input_paths:
        file_name = in_path.split("/")[-1].split(".")[0]
        for track_analysis in analysis.tracks:
            if track_analysis.name.lower() in file_name.lower():
                mapped[in_path] = track_analysis.name
                reverse_map[track_analysis.name] = file_name
                break

    logline("came up with the following mapping:")
    logline("")
    for file_name in mapped:
        logline('"{}" -> "{}"'.format(file_name, mapped[file_name]))

    unmapped_amount: int = 0
    for in_path in input_paths:
        if in_path not in mapped:
            warn('input file "{}" not mapped'.format(in_path))
            unmapped_amount += 1
    for track_analysis in analysis.tracks:
        if track_analysis.name not in reverse_map:
            warn('analysed file "{}" not mapped'.format(track_analysis.name))
            unmapped_amount += 1
    logline("")
    if unmapped_amount > 0:
        try:
            correct = input("is this correct? Y/n")
            if correct.lower() == "n":
                return None
        except KeyboardInterrupt:
            return None

    return analysis, mapped


def get_files(input_paths: List[str], analysis: AnalysisFile, mapped: Dict[str, str]) -> Iterable[MarkedAudioFile]:
    """Read all input files"""
    for in_file in input_paths:
        found_track = analysis.find_track(mapped[in_file])
        if not found_track:
            continue
        yield MarkedAudioFile(in_file, found_track)
