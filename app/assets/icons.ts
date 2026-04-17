import { IconType } from "react-icons";
import { RiSkipBackMiniFill, RiSettings4Fill } from "react-icons/ri";
import {
    IoMdArrowDropleftCircle,
    IoMdArrowDroprightCircle,
    IoMdArrowDropright,
    IoMdArrowDropleft,
    IoIosArrowForward,
} from "react-icons/io";
import {
    MdSkipPrevious,
    MdSkipNext,
    MdContentPaste,
    MdOutlineAccountTree,
} from "react-icons/md";

import { VscFeedback } from "react-icons/vsc";

import {
    FaSearch,
    FaCheckCircle,
    FaUserCircle,
    FaHome,
    FaRegCalendarPlus,
    FaRegCalendarMinus,
    FaClock,
    FaKeyboard,
    FaFolder,
    FaFileAlt,
    FaChartBar,
    FaChevronRight,
    FaBell,
    FaPlaneDeparture,
    FaTrashAlt,
    FaQuestion,
    FaChartPie,
    FaCheck,
} from "react-icons/fa";
import {
    FaCirclePlus,
    FaChevronDown,
    FaChevronUp,
    FaXmark,
    FaExclamation,
} from "react-icons/fa6";
import { BiSolidPencil, BiSolidReport } from "react-icons/bi";
import { IoDocument } from "react-icons/io5";

export const Icons: Record<string, IconType> = {
    pageLeft: RiSkipBackMiniFill,
    home: FaHome,
    pen: BiSolidPencil,
    user: FaUserCircle,
    setting: RiSettings4Fill,
    success: FaCheck,
    error: FaExclamation,
    xmark: FaXmark,
    confirm: FaQuestion,
};

export const DEFAULT_SIZE = 20;
export const DEFAULT_COLOR = "#666";
