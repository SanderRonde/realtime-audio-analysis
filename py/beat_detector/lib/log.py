"""Allows logging with time"""
from typing import Callable, Optional, TextIO, Union
from io import TextIOWrapper
import datetime
import sys

DEBUG_COLOR_PREFIX = "\x1b[0;37;42m"
ERROR_COLOR_PREFIX = "\x1b[0;37;41m"
WARNING_COLOR_PREFIX = "\x1b[0;37;43m"
COLOR_POSTFIX = "\x1b[0m"

group_length = 0


def print_prefix(
    output: Union[TextIOWrapper, TextIO] = sys.stdout,
    debug_mode: bool = False,
    error_mode: bool = False,
    warning_mode: bool = False,
    prefix: Optional[int] = None,
    indent: bool = True,
):
    """Prints a prefix for logging"""
    if prefix is None:
        prefix = group_length
    if group_length > 0:
        # print('prefix length is', prefix)
        data_prefix = ((prefix - 1) * " ") + ("|" if indent else "")
    else:
        data_prefix = ""
    if indent:
        data_prefix = data_prefix + " "
    if debug_mode:
        time_str = "%H:%M:%S D"
    elif warning_mode:
        time_str = "%H:%M:%S W"
    elif error_mode:
        time_str = "%H:%M:%S E"
    else:
        time_str = "%H:%M:%S |"
    output.write(datetime.datetime.now().strftime(time_str + data_prefix))
    return True


def logline(
    *args: object,
    output: Union[TextIOWrapper, TextIO] = sys.stdout,
    spaces_between: bool = True,
    end_line: bool = True,
    debug_mode: bool = False,
    warning_mode: bool = False,
    error_mode: bool = False,
    indent: bool = True
):
    """Logs a line with given arguments"""
    # Get the current time
    print_prefix(output=output, debug_mode=debug_mode, error_mode=error_mode, warning_mode=warning_mode, indent=indent)
    is_first = True

    if debug_mode:
        prefix = DEBUG_COLOR_PREFIX
    elif error_mode:
        prefix = ERROR_COLOR_PREFIX
    elif warning_mode:
        prefix = WARNING_COLOR_PREFIX
    else:
        prefix = ""
    postfix = COLOR_POSTFIX if debug_mode or error_mode or warning_mode else ""
    for word in args:
        if not is_first and spaces_between:
            output.write(prefix + " " + postfix)
        output.write(prefix + str(word) + postfix)

        is_first = False
    if end_line:
        output.write("\n")


def debug(*args: object, output: TextIO = sys.stdout, spaces_between: bool = True, end_line: bool = True):
    """Outputs a debug message"""
    logline(*args, output=output, spaces_between=spaces_between, end_line=end_line, debug_mode=True)

def warn(*args: object, output: TextIO = sys.stdout, spaces_between: bool = True, end_line: bool = True):
    """Outputs a warning message"""
    logline(*args, output=output, spaces_between=spaces_between, end_line=end_line, warning_mode=True)


def error(*args: object, output: TextIO = sys.stdout, spaces_between: bool = True, end_line: bool = True):
    """Outputs an error message"""
    logline(*args, output=output, spaces_between=spaces_between, end_line=end_line, error_mode=True)


def enter_group():
    """Enter an indentation group"""
    logline("\\", indent=False)
    global group_length
    group_length = group_length + 1


def exit_group():
    """Exits an indentation group"""
    global group_length
    group_length = group_length - 1
    if group_length < 0:
        group_length = 0
        error("Attempting to reduce groups even though you're already at root")
    logline("/", indent=False)


def logline_proxy(
    log_file: TextIOWrapper,
    *args: object,
    spaces_between: bool = True,
    end_line: bool = True,
    is_debug: bool = False,
    is_error: bool = False,
    is_warning: bool = False
):
    """Logs to both file and output"""
    logline(
        *args,
        spaces_between=spaces_between,
        end_line=end_line,
        output=log_file,
        debug_mode=is_debug,
        error_mode=is_error,
        warning_mode=is_warning
    )
    logline(
        *args,
        spaces_between=spaces_between,
        end_line=end_line,
        output=sys.stdout,
        debug_mode=is_debug,
        error_mode=is_error,
        warning_mode=is_warning
    )


def gen_proxy(
    log_file: TextIOWrapper, is_debug: bool = False, is_error: bool = False, is_warning: bool = False
) -> Callable[[object], None]:
    """Generates a single function for logging to file and stdout"""

    def wrapper(*args: object, spaces_between: bool = True, end_line: bool = True):
        return logline_proxy(
            log_file,
            *args,
            spaces_between=spaces_between,
            end_line=end_line,
            is_debug=is_debug,
            is_error=is_error,
            is_warning=is_warning
        )

    return wrapper


def close_logs_file(file: TextIOWrapper):
    """Closes the logs file"""
    print_prefix(prefix=0)
    print("Finishing logs...")
    file.write("\nEnd of log entry\n")
    file.close()
    print_prefix(prefix=0)
    print("Done writing logs")


def logline_to_folder(
    folder_loc: Optional[str] = None, file_name: Optional[str] = None, path: str = "", start: int = 0, end: int = 100
):
    """Sets up logging to a folder"""
    if (folder_loc is None or file_name is None) and path is "":
        return logline, debug, error, lambda: None
    else:
        if folder_loc:
            if not folder_loc.endswith("/"):
                folder_loc = folder_loc + "/"

            path = folder_loc + "main_logs.log"

        if start is None:
            start = 0
        if end is None:
            end = 100
        if (start != 0 or end != 100) and folder_loc:
            path = folder_loc + "main_logs" + "." + str(start) + "." + str(end) + ".log"

        file = open(path, "a+")

        file.write("\n\n\nNew Log Entry\n\n")
        return (
            gen_proxy(file),
            gen_proxy(file, is_debug=True),
            gen_proxy(file, is_error=True),
            gen_proxy(file, is_warning=True),
            lambda: close_logs_file(file),
        )
