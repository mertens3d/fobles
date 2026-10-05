import type { HighlightStyle } from "../CONST.Types";
import { _SITECORE_COLORS } from "./_sc-colors";



export const _TESTING_MOUSE = {
    ROOT: {
      HOVER_CLEARANCE_PX: 24,
      SPEED_MULTIPLIER: 1,
      UPDATE_HZ: 60,
    },
    PATH: {
      ANIMATION_DURATION_MS: 3_000,
      COLOR: "#474747",
      DEBUG_LINE_ID: "__fobles-debug-line",
      ENDPOINT_FILL: "lime",
      ENDPOINT_RADIUS: "8",
      SVG_NAMESPACE: "http://www.w3.org/2000/svg",
      STROKE_WIDTH: "2",
      OPACITY: "0.8",
      TAGS: {
        CIRCLE: "circle",
        LINE: "line",
        SVG: "svg",
      },
      VIEWPORT_STYLE: {
        HEIGHT: "100vh",
        LEFT: "0",
        POINTER_EVENTS: "none",
        POSITION: "fixed",
        TOP: "0",
        WIDTH: "100vw",
        Z_INDEX: "2147483647",
      },
      LINE_ATTRIBUTES: {
        X1: "x1",
        X2: "x2",
        Y1: "y1",
        Y2: "y2",
        STROKE: "stroke",
        STROKE_WIDTH: "stroke-width",
      },
      ENDPOINT_ATTRIBUTES: {
        CX: "cx",
        CY: "cy",
        FILL: "fill",
        RADIUS: "r",
      },
    },
    PROXY: {
      CORNER: {
        CENTER: "center",
        TOP_LEFT: "top-left",
      },
      DEFAULT_LABELS: {
        CENTER_OF_MONITOR: "center of monitor",
        MOUSE_TO_DEFAULT: "Mouse to default",
      },
      ERROR_MESSAGES: {
        COULD_NOT_GET_BOUNDING_BOX: "Could not get bounding box for mouse target",
        COULD_NOT_LOCATE_HOVER_REGION: "Could not locate Fobles hover region",
        COULD_NOT_LOCATE_TARGET: "Could not locate mouse target",
        COULD_NOT_MEASURE_BUTTON: "Could not measure the hovered toolbar button",
        COULD_NOT_READ_VIEWPORT: "Could not read viewport size",
        LABEL_NOT_DEFINED: "Label is not defined",
        MOUSE_TARGET_NOT_VISIBLE: "Mouse target is not visible",
        NO_MOUSE_TARGET_PROVIDED: "no mouse target provided",
        PAGE_NOT_DEFINED: "Page is not defined",
        TARGET_NOT_VISIBLE_PREFIX: "Target is not visible for label: ",
        TARGET_NOT_PROVIDED_PREFIX: "no mouse target provided for '",
      },
      EXCLUDED_FRAME_URL_FRAGMENT: "sitecore/shell/Applications/-/media",
      HIGHLIGHT: {
        VISIBLE_DELAY_MS: 500,
        RESTORE_DELAY_MS: 1_000,
        STYLES: {
          SCREEN_SHOT: {
            BACKGROUND_COLOR: _SITECORE_COLORS.scSoftYellow,
            COLOR: "black",
            OUTLINE: "5px solid " + _SITECORE_COLORS.scSoftYellow,
            OUTLINE_OFFSET: "2px",
            RESTORE_DELAY_MS: 2_000,
            TRANSITION: "background-color 0.5s ease, outline-color 0.5s ease",
            VISIBLE_DELAY_MS: 500,
          } satisfies HighlightStyle,
          CLICK: {
            BACKGROUND_COLOR: "none",
            COLOR: "black",
            OUTLINE: "5px solid " + _SITECORE_COLORS.scRed,
            OUTLINE_OFFSET: "2px",
            RESTORE_DELAY_MS: 2_000,
            TRANSITION: "background-color 0.5s ease, outline-color 0.5s ease",
            VISIBLE_DELAY_MS: 500,
          } satisfies HighlightStyle,
        },
      },
      HTML_TAG: "html",
      OPEN_DIALOG_SELECTOR: "dialog[open]",
      PREFLIGHT_POSITION: "100px",
      PREFLIGHT_POSITION_PX: 100,
      PREFLIGHT_TRANSITION: "none",
      RACE_TIMEOUT_MS: 1_000,
      SELECTOR_PREFIX: "#",
    },
    MARKER: {
      CSS_TEXT: [
        "position: fixed",
        "left: 0px",
        "top: 0px",
        "z-index: 2147483647",
        "width: 12px",
        "height: 12px",
        "border: 2px solid #fff",
        "border-radius: 50%",
        "background: " + _SITECORE_COLORS.scRed,
        "box-shadow: 0 0 0 2px " +
        _SITECORE_COLORS.scRed +
        ", 0 2px 6px rgba(0, 0, 0, .45)",
        "pointer-events: none",
        "transform: translate(-50%, -50%)",
        "transition: left 16ms linear, top 16ms linear",
        "display: block !important",
        "visibility: visible !important",
        "opacity: 1 !important",
      ],
      ID: "playwright-mouse-marker",
    }
  }